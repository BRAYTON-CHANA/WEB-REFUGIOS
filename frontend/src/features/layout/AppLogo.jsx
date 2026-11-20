import { APP_CONFIG } from '@/app/config';

/** Logo de VITE_APP_LOGO o, si no hay, la inicial del nombre de la app */
const AppLogo = ({ className = 'w-9 h-9' }) =>
  APP_CONFIG.logo ? (
    <img src={APP_CONFIG.logo} alt={APP_CONFIG.name} className={`${className} object-contain rounded-xl shrink-0`} />
  ) : (
    <div className={`${className} rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0`}>
      {APP_CONFIG.name[0]}
    </div>
  );

export default AppLogo;
