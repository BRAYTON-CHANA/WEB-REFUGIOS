/** Tipos de trámite (EXPEDIENTES.TIPO_TRAMITE); reemplazan las hojas del Excel */
export const TRAMITES = [
  { value: 'SOLICITUD', label: 'Solicitud', plural: 'Solicitudes' },
  { value: 'ACTUALIZACION', label: 'Actualización', plural: 'Actualizaciones' },
  { value: 'RENUNCIA', label: 'Renuncia', plural: 'Renuncias' },
];

export const TRAMITE_LABEL = Object.fromEntries(TRAMITES.map((t) => [t.value, t.label]));
