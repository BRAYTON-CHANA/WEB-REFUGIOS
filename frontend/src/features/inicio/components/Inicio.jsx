import { Link } from 'react-router-dom';
import { CalendarDays, Users, FolderOpen } from 'lucide-react';
import { useAuthContext } from '@/shared/context/AuthContext';
import { Card } from '@/shared/components/ui';
import { APP_CONFIG } from '@/app/config';

/** Página de inicio: accesos rápidos */
const Inicio = () => {
  const { user, isAdmin } = useAuthContext();

  const accesos = [
    { to: '/expedientes', label: 'Expedientes', desc: 'Titulares y familiares por expediente', icon: FolderOpen },
    { to: '/calendario', label: 'Calendario', desc: 'Tus eventos por día, semana, mes o año', icon: CalendarDays },
    ...(isAdmin ? [{ to: '/config/usuarios', label: 'Usuarios', desc: 'Altas, roles y claves', icon: Users }] : []),
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hola, {user?.nombres}</h1>
      <p className="text-slate-500 mt-1">{APP_CONFIG.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {accesos.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="p-5 hover-lift h-full">
              <Icon size={22} className="text-blue-600 mb-3" />
              <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
              <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Inicio;
