import { apiFetch } from '@/shared/api';

/** Parámetros de filtro de la tabla (iguales a los de la URL y a los de la API) */
export const FILTROS_REGISTRO = [
  'q', 'anio', 'tramite', 'origen', 'estado', 'parentesco', 'nacionalidad', 'tipodoc',
  'sexo', 'edad', 'sinnro', 'sinarchivo', 'grupo',
];

const query = (filtros, extra = {}) => {
  const p = new URLSearchParams();
  for (const k of FILTROS_REGISTRO) {
    const v = filtros?.[k];
    if (v != null && String(v).trim() !== '') p.set(k, String(v).trim());
  }
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
};

/** API de expedientes (lib/handlers/expedientes.js) */
export const expedientesService = {
  catalogos: () => apiFetch('/expedientes/catalogos'),
  /** Filas tipo Excel (view V_PERSONAS_REGISTRO), paginadas por expediente */
  registro: (filtros = {}, page = 1) => apiFetch(`/expedientes/registro?${query(filtros, { page })}`),
  /** Todas las filas filtradas, para exportar (tope en el servidor) */
  registroCompleto: (filtros = {}) => apiFetch(`/expedientes/registro?${query(filtros, { todo: 1 })}`),
  obtener: (id) => apiFetch(`/expedientes/${id}`),
  crear: (expediente) => apiFetch('/expedientes', { method: 'POST', body: expediente }),
  actualizar: (id, expediente) => apiFetch(`/expedientes/${id}`, { method: 'PUT', body: expediente }),
  eliminar: (id) => apiFetch(`/expedientes/${id}`, { method: 'DELETE' }),
  /** Archivo del expediente (uno, PDF) en Supabase Storage vía la API */
  archivo: {
    enlace: (id, { descargar = false } = {}) => apiFetch(`/expedientes/${id}/archivo${descargar ? '?descargar=1' : ''}`),
    subir: (id, file) => apiFetch(`/expedientes/${id}/archivo`, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'application/pdf', 'X-Nombre-Archivo': encodeURIComponent(file.name) },
    }),
    quitar: (id) => apiFetch(`/expedientes/${id}/archivo`, { method: 'DELETE' }),
  },
};
