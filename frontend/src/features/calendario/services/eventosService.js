import { apiFetch } from '@/shared/api';

/** API de eventos (lib/handlers/eventos.js): cada usuario ve los suyos */
export const eventosService = {
  listar: ({ desde, hasta } = {}) => {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde.toISOString());
    if (hasta) q.set('hasta', hasta.toISOString());
    return apiFetch(`/eventos${q.size ? `?${q}` : ''}`);
  },
  crear: (evento) => apiFetch('/eventos', { method: 'POST', body: evento }),
  actualizar: (id, evento) => apiFetch(`/eventos/${id}`, { method: 'PUT', body: evento }),
  eliminar: (id) => apiFetch(`/eventos/${id}`, { method: 'DELETE' }),
};
