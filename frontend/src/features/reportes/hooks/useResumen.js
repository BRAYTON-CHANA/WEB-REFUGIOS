import { useState, useEffect, useCallback } from 'react';
import { reportesService, EVENTO_CAMBIO } from '../services/reportesService';

/** Resumen por año/trámite; se vuelve a pedir cuando se guarda o elimina un expediente */
export function useResumen({ anio = '', tramite = '' } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setData(await reportesService.resumen({ anio, tramite }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [anio, tramite]);

  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_CAMBIO, cargar);
    return () => window.removeEventListener(EVENTO_CAMBIO, cargar);
  }, [cargar]);

  return { data, error, recargar: cargar };
}
