import { APP_CONFIG } from '@/app/config';
import AppLogo from '@/features/layout/AppLogo';

/** Tarjeta centrada para las pantallas sin menú (login, cambio de clave) */
const AuthCard = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-niebla flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm bg-hoja border border-trazo rounded-lg shadow-sm p-8 sm:p-10">
      <div className="flex flex-col items-center mb-8 text-center">
        <AppLogo className="w-12 h-12 text-lg mb-3" />
        <h1 className="text-[26px] leading-tight font-semibold text-grafito">{title || APP_CONFIG.name}</h1>
        {subtitle && <p className="text-sm text-pizarra mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

export default AuthCard;
