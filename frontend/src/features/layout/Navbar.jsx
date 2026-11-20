import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, KeyRound, LogOut } from 'lucide-react';
import { useAuthContext } from '@/shared/context/AuthContext';
import DropdownMenu from '@/shared/components/DropdownMenu';
import { APP_CONFIG } from '@/app/config';
import AppLogo from './AppLogo';

const iniciales = (user) => [user?.nombres, user?.apellidos].filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || 'U';

/** Barra superior: menú, marca, secciones y usuario */
const Navbar = ({ secciones, activa, onMenu }) => {
  const { user, roles, logout } = useAuthContext();
  const navigate = useNavigate();
  const nombre = [user?.nombres, user?.apellidos].filter(Boolean).join(' ');

  const salir = () => {
    logout();
    navigate('/login');
  };

  const icono = 'p-2 rounded-md text-pizarra hover:text-grafito hover:bg-niebla transition-colors';
  const itemMenu = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-grafito hover:bg-niebla focus:bg-niebla focus:outline-none';

  return (
    <header className="h-14 shrink-0 bg-hoja border-b border-trazo flex items-center gap-2 sm:gap-4 px-2 sm:px-4">
      <button onClick={onMenu} className={icono} aria-label="Mostrar u ocultar menú lateral">
        <Menu size={20} />
      </button>

      <NavLink to="/expedientes" className="flex items-center gap-2.5 min-w-0 shrink-0">
        <AppLogo className="w-8 h-8" />
        <span className="hidden sm:block text-[15px] font-semibold text-grafito truncate max-w-[12rem]">{APP_CONFIG.name}</span>
      </NavLink>

      <nav aria-label="Secciones" className="hidden md:flex items-stretch self-stretch gap-1 ml-2">
        {secciones.map((s) => {
          const esActiva = s.id === activa?.id;
          return (
            <NavLink
              key={s.id}
              to={s.to}
              aria-current={esActiva ? 'page' : undefined}
              className={`flex items-center px-3 text-sm border-b-2 -mb-px transition-colors ${esActiva
                ? 'border-grafito text-grafito font-semibold'
                : 'border-transparent text-pizarra hover:text-grafito'}`}
            >
              {s.title}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex items-center gap-1 ml-auto">
        <DropdownMenu
          menuClassName="w-60"
          trigger={({ triggerRef, open, toggle }) => (
            <button
              ref={triggerRef}
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label={`Cuenta de ${nombre || 'usuario'}`}
              className="ml-1 w-9 h-9 rounded-full bg-niebla border border-trazo text-grafito text-[13px] font-semibold flex items-center justify-center hover:border-pizarra"
            >
              {iniciales(user)}
            </button>
          )}
        >
          {({ close }) => (
            <>
              <div className="px-3 py-2.5 border-b border-trazo">
                <p className="text-sm font-semibold text-grafito truncate">{nombre || user?.usuario}</p>
                <p className="text-xs text-pizarra truncate">{roles.join(', ') || 'sin rol'}</p>
              </div>
              <button className={itemMenu} role="menuitem" onClick={() => { close(); navigate('/cambiar-contrasena'); }}>
                <KeyRound size={15} className="text-pizarra" /> Cambiar contraseña
              </button>
              <button className={itemMenu} role="menuitem" onClick={() => { close(); salir(); }}>
                <LogOut size={15} className="text-pizarra" /> Cerrar sesión
              </button>
            </>
          )}
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Navbar;
