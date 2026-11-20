export const TRAMITES = [
  { value: 'SOLICITUD', label: 'Solicitud' },
  { value: 'ACTUALIZACION', label: 'Actualización' },
  { value: 'RENUNCIA', label: 'Renuncia' },
];

/** Edad en años cumplidos desde 'YYYY-MM-DD' (no se guarda en BD) */
export function edad(fechaNacimiento, hoy = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaNacimiento || '');
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let años = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) años--;
  return años >= 0 ? años : null;
}

export const apellidos = (p) => [p.APELLIDO_PATERNO, p.APELLIDO_MATERNO].filter(Boolean).join(' ');

export const nombreCompleto = (p) => [apellidos(p), p.NOMBRES].filter(Boolean).join(', ');
