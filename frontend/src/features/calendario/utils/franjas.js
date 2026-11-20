/** Franjas horarias del calendario: una por hora entre HORA_INICIO y HORA_FIN */
export const HORA_INICIO = 7;
export const HORA_FIN = 21;

const pad = (n) => String(n).padStart(2, '0');

export const FRANJAS = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => ({
  duration: 60,
  type: 'bloque',
  label: `${pad(HORA_INICIO + i)}:00`,
}));

const inicioDelDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Filas de EVENTOS → eventos del <Calendar> (una pieza por día que ocupa).
 * Las horas fuera de HORA_INICIO..HORA_FIN se recortan al borde.
 */
export function eventosAFranjas(rows) {
  const out = [];
  for (const ev of rows) {
    const inicio = new Date(ev.INICIO);
    const fin = new Date(ev.FIN);
    for (let dia = inicioDelDia(inicio); dia <= fin; dia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1)) {
      if (dia > inicio && dia.getTime() === fin.getTime()) break; // termina justo a medianoche
      let indices;
      if (ev.TODO_EL_DIA) {
        indices = FRANJAS.map((_, i) => i);
      } else {
        const desde = dia.getTime() === inicioDelDia(inicio).getTime() ? inicio.getHours() + inicio.getMinutes() / 60 : 0;
        const hasta = dia.getTime() === inicioDelDia(fin).getTime() ? fin.getHours() + fin.getMinutes() / 60 : 24;
        const a = Math.max(Math.floor(desde), HORA_INICIO) - HORA_INICIO;
        const b = Math.min(Math.ceil(hasta), HORA_FIN) - HORA_INICIO; // exclusivo
        indices = [];
        for (let i = a; i < Math.max(b, a + 1) && i < FRANJAS.length; i++) indices.push(i);
      }
      if (indices.length) {
        out.push({
          id: `${ev.ID_EVENTO}-${dia.toDateString()}`,
          date: dia,
          blockIndices: indices,
          title: ev.TITULO,
          description: ev.DESCRIPCION || undefined,
          color: ev.COLOR || '#2563eb',
          type: 'evento',
          data: ev,
        });
      }
    }
  }
  return out;
}

/** Date → valor de <input type="datetime-local"> en hora local */
export const aInputLocal = (d) => {
  const f = new Date(d);
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}T${pad(f.getHours())}:${pad(f.getMinutes())}`;
};
