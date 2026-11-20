import { apiFetch } from '@/shared/api';

/** API de expedientes (lib/handlers/expedientes.js) */
export const expedientesService = {
  catalogos: () => apiFetch('/expedientes/catalogos'),
  listar: ({ q, anio, tramite, page = 1 } = {}) => {
    const p = new URLSearchParams({ page: String(page) });
    if (q?.trim()) p.set('q', q.trim());
    if (anio) p.set('anio', anio);
    if (tramite) p.set('tramite', tramite);
    return apiFetch(`/expedientes?${p}`);
  },
  obtener: (id) => apiFetch(`/expedientes/${id}`),
  crear: (expediente) => apiFetch('/expedientes', { method: 'POST', body: expediente }),
  actualizar: (id, expediente) => apiFetch(`/expedientes/${id}`, { method: 'PUT', body: expediente }),
  eliminar: (id) => apiFetch(`/expedientes/${id}`, { method: 'DELETE' }),
};
