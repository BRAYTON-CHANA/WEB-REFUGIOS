const getEnvValue = (value, fallback) => value?.trim() || fallback;

/** Marca de la app (frontend/.env.local) */
export const APP_CONFIG = {
  name: getEnvValue(import.meta.env.VITE_APP_NAME, 'Web Template'),
  description: getEnvValue(
    import.meta.env.VITE_APP_DESCRIPTION,
    'Una base modular para iniciar tu aplicación.'
  ),
  logo: import.meta.env.VITE_APP_LOGO?.trim() || '',
};
