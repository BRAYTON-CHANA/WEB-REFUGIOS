import { APP_CONFIG } from '@/app/config';
import AppLogo from '@/features/layout/AppLogo';

/** Tarjeta centrada para las pantallas sin menú (login, cambio de clave) */
const AuthCard = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-8 sm:p-10">
      <div className="flex flex-col items-center mb-8 text-center">
        <AppLogo className="w-12 h-12 text-lg mb-3" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title || APP_CONFIG.name}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

export default AuthCard;
