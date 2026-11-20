/**
 * Columnas de la tabla tipo Excel (mismo orden que la hoja original) y agrupado por
 * expediente. Las usan la tabla en pantalla y la exportación a .xlsx.
 * `grupo: true` = celda "combinada" (una por expediente, como en el Excel).
 */
const sexo = (s) => (s === 'F' ? 'Femenino' : s === 'M' ? 'Masculino' : '');

export const COLUMNAS = [
  { key: 'APELLIDO_PATERNO', label: 'Apellido paterno', ancho: 18 },
  { key: 'APELLIDO_MATERNO', label: 'Apellido materno', ancho: 18 },
  { key: 'NOMBRES', label: 'Nombres', ancho: 26 },
  { key: 'PARENTESCO', label: 'Parentesco', ancho: 13 },
  { key: 'ORIGEN', label: 'Origen', ancho: 24 },
  { key: 'FECHA_SOLICITUD', label: 'Fecha de solicitud', ancho: 13, fecha: true },
  { key: 'NRO_EXPEDIENTE', label: 'Nº de expediente', ancho: 15, grupo: true },
  { key: 'ARCHIVO_RUTA', label: 'Archivo', ancho: 12, grupo: true, valor: (r) => (r.ARCHIVO_RUTA ? 'Adjunto' : '') },
  { key: 'SEXO', label: 'Sexo', ancho: 11, valor: (r) => sexo(r.SEXO) },
  { key: 'NACIONALIDAD', label: 'Nacionalidad', ancho: 14 },
  { key: 'FECHA_NACIMIENTO', label: 'Fecha de nacimiento', ancho: 13, fecha: true },
  { key: 'EDAD', label: 'Edad', ancho: 7, numero: true },
  { key: 'TIPO_DOCUMENTO', label: 'Tipo de documento', ancho: 22 },
  { key: 'NRO_DOCUMENTO', label: 'Nº de documento', ancho: 15 },
  { key: 'ESTADO', label: 'Estado', ancho: 30 },
  { key: 'OBSERVACIONES', label: 'Observaciones', ancho: 40, grupo: true },
];

/** Agrupa filas consecutivas del mismo expediente: [{ id, filas: [...] }] */
export function agruparPorExpediente(rows = []) {
  const grupos = [];
  for (const r of rows) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.id === r.ID_EXPEDIENTE) ultimo.filas.push(r);
    else grupos.push({ id: r.ID_EXPEDIENTE, filas: [r] });
  }
  return grupos;
}
