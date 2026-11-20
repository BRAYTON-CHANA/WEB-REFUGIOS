const getEnvValue = (value, fallback) => value?.trim() || fallback;

/** Marca de la app (frontend/.env.local) */
export const APP_CONFIG = {
  name: getEnvValue(import.meta.env.VITE_APP_NAME, 'Refugios'),
  description: getEnvValue(
    import.meta.env.VITE_APP_DESCRIPTION,
    'Expedientes de solicitud de refugio: titulares y familiares.'
  ),
  logo: import.meta.env.VITE_APP_LOGO?.trim() || '',
};
