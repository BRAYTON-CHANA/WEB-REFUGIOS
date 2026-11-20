export { TRAMITES, TRAMITE_LABEL } from '@/shared/constants/tramites';

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

export const MAX_OBSERVACIONES = 4000;

/**
 * Fondo de fila según el color del estado (como el color de fila del Excel).
 * Opaco (mezcla con --hoja) para que las columnas fijas no dejen ver lo de abajo;
 * 20% de tinte mantiene el texto legible en claro y oscuro.
 */
export const tinteEstado = (color) => (color ? `color-mix(in srgb, ${color} 20%, var(--hoja))` : 'var(--hoja)');
export const estadoStyle = (color) => ({ backgroundColor: tinteEstado(color) });
