import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, Moon, Sun } from 'lucide-react';
import { useAuthContext } from '@/shared/context/AuthContext';
import { useTheme } from '@/shared/context/ThemeContext';
import { APP_CONFIG } from '@/app/config';
import { NAV_SECTIONS } from '@/app/navigation';
import AppLogo from './AppLogo';

const NAV_COLLAPSED_KEY = 'app.nav.collapsed';

const leerColapsado = () => {
  try { return localStorage.getItem(NAV_COLLAPSED_KEY) === '1'; } catch { return false; }
};

/** Menú lateral (colapsable en escritorio, cajón en móvil) + contenido */
const AppLayout = () => {
  const { user, roles, isAdmin, logout } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(leerColapsado);

  useEffect(() => {
    try { localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* sin storage */ }
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hide = collapsed ? 'lg:hidden' : '';

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
      collapsed ? 'lg:justify-center lg:px-0' : ''
    } ${
      isActive ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
    }`;

  const footerBtn = 'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors';

  const Section = ({ title, items }) => (
    <div>
      {collapsed && <div className="hidden lg:block mx-1 mb-2 border-t border-slate-800" />}
      <p className={`px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${hide}`}>{title}</p>
      {items.map(({ to, label, icon: Icon, end, sub }, i) => (
        <div key={to}>
          {sub && sub !== items[i - 1]?.sub && (
            <p className={`px-3 mt-2 mb-0.5 text-[10px] font-medium text-slate-600 ${hide}`}>{sub}</p>
          )}
          <NavLink to={to} end={end} className={linkCls} title={collapsed ? label : undefined} onClick={() => setOpen(false)}>
            <Icon size={17} className="shrink-0" />
            <span className={hide}>{label}</span>
          </NavLink>
        </div>
      ))}
    </div>
  );

  const nombre = [user?.nombres, user?.apellidos].filter(Boolean).join(' ');

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex">
      {/* Botón de menú (móvil) */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
        aria-label="Menú"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 flex flex-col shrink-0 transform transition-[width,transform] duration-200 lg:translate-x-0 ${
          collapsed ? 'lg:w-17' : ''
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`py-5 border-b border-slate-800 flex items-center justify-between gap-2 px-5 ${collapsed ? 'lg:px-0 lg:flex-col lg:justify-center' : ''}`}>
          <div className="flex items-center gap-3 min-w-0 pl-10 lg:pl-0">
            <AppLogo />
            <div className={`min-w-0 ${hide}`}>
              <h2 className="text-base font-bold text-white leading-tight truncate">{APP_CONFIG.name}</h2>
              <p className="text-xs text-slate-400 truncate">{APP_CONFIG.description}</p>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-100 bg-white/10 hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto px-3 py-4 space-y-5 ${collapsed ? 'lg:px-2' : ''}`}>
          {NAV_SECTIONS.filter((s) => !s.soloAdmin || isAdmin).map((s) => (
            <Section key={s.title} title={s.title} items={s.items} />
          ))}
        </nav>

        <div className={`px-4 py-3 border-t border-slate-800 space-y-2 ${collapsed ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center gap-2 min-w-0 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div
              className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0"
              title={collapsed ? `${nombre} · ${roles[0] || 'sin rol'}` : undefined}
            >
              {(user?.nombres || 'U')[0]}
            </div>
            <div className={`min-w-0 ${hide}`}>
              <p className="text-sm text-slate-200 truncate">{nombre}</p>
              <p className="text-xs text-slate-500 truncate">{roles.join(', ') || 'sin rol'}</p>
            </div>
          </div>
          <div className={`flex gap-2 ${collapsed ? 'lg:flex-col lg:gap-1' : ''}`}>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'} className={footerBtn}>
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />} <span className={hide}>Tema</span>
            </button>
            <NavLink to="/cambiar-contrasena" title="Cambiar clave" className={footerBtn}>
              <KeyRound size={13} /> <span className={hide}>Clave</span>
            </NavLink>
            <button onClick={handleLogout} title="Cerrar sesión" className={footerBtn}>
              <LogOut size={13} /> <span className={hide}>Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Fondo del cajón en móvil */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
      )}

      <main className="flex-1 min-w-0 h-full overflow-y-auto pt-12 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
