import { COLUMNAS, agruparPorExpediente } from './registro';

const argb = (hex) => `FF${String(hex || '').replace('#', '').toUpperCase().padEnd(6, 'F').slice(0, 6)}`;

/** 'YYYY-MM-DD' → Date (mediodía local, sin corrimiento de zona horaria) */
const aFecha = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null;
};

const borde = { style: 'thin', color: { argb: 'FFB9C2CA' } };
const bordes = { top: borde, left: borde, bottom: borde, right: borde };

/**
 * Genera el .xlsx con las filas filtradas: misma tabla que en pantalla, fila con el
 * color de su estado (como el Excel original), celdas de expediente combinadas por
 * grupo y hoja "Leyenda". El archivo no se enlaza (los enlaces firmados caducan): solo
 * se marca "Adjunto". exceljs se carga solo al exportar.
 */
export async function exportarExcel(rows, estados = [], nombreArchivo = 'expedientes.xlsx') {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.created = new Date();

  const hoja = libro.addWorksheet('Expedientes', { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] });
  hoja.columns = COLUMNAS.map((c) => ({ header: c.label, key: c.key, width: c.ancho }));

  const cab = hoja.getRow(1);
  cab.height = 30;
  cab.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2A32' } };
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    celda.border = bordes;
  });

  let filaExcel = 2;
  for (const grupo of agruparPorExpediente(rows)) {
    const desde = filaExcel;
    for (const r of grupo.filas) {
      const fila = hoja.getRow(filaExcel);
      COLUMNAS.forEach((c, i) => {
        const celda = fila.getCell(i + 1);
        let v = c.valor ? c.valor(r) : r[c.key];
        if (c.fecha) v = aFecha(v);
        celda.value = v ?? null;
        if (c.fecha) celda.numFmt = 'dd/mm/yyyy';
        celda.alignment = { vertical: 'middle', horizontal: c.key === 'OBSERVACIONES' ? 'left' : 'center', wrapText: true };
        celda.border = bordes;
        if (r.ES_TITULAR && !c.grupo) celda.font = { bold: true };
        // Color de fila = estado de la persona (las celdas combinadas quedan sin color)
        if (r.ESTADO_COLOR && !c.grupo) {
          celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(r.ESTADO_COLOR) } };
        }
      });
      // NRO_DOCUMENTO siempre como texto (ceros a la izquierda)
      fila.getCell(COLUMNAS.findIndex((c) => c.key === 'NRO_DOCUMENTO') + 1).numFmt = '@';
      filaExcel++;
    }
    const hasta = filaExcel - 1;
    if (hasta > desde) {
      COLUMNAS.forEach((c, i) => {
        if (c.grupo) hoja.mergeCells(desde, i + 1, hasta, i + 1);
      });
    }
  }
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length } };

  const leyenda = libro.addWorksheet('Leyenda');
  leyenda.columns = [{ header: 'Color', key: 'c', width: 10 }, { header: 'Estado', key: 'e', width: 45 }];
  leyenda.getRow(1).font = { bold: true };
  [...estados, { NOMBRE: 'SIN ESTADO', COLOR: '#FFFFFF' }].forEach((e, i) => {
    const fila = leyenda.getRow(i + 2);
    fila.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(e.COLOR) } };
    fila.getCell(1).border = bordes;
    fila.getCell(2).value = e.NOMBRE;
  });

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
