import { apiFetch } from '@/shared/api';

/** Resumen de las views V_RESUMEN_* (lib/handlers/expedientes.js → resumen) */
export const reportesService = {
  resumen: ({ anio, tramite } = {}) => {
    const p = new URLSearchParams();
    if (anio) p.set('anio', anio);
    if (tramite) p.set('tramite', tramite);
    const qs = p.toString();
    return apiFetch(`/expedientes/resumen${qs ? `?${qs}` : ''}`);
  },
};

/** Avisa que cambiaron expedientes (alta, edición, baja) para refrescar resúmenes */
export const EVENTO_CAMBIO = 'expedientes:cambio';
export const avisarCambioExpedientes = () => window.dispatchEvent(new Event(EVENTO_CAMBIO));
