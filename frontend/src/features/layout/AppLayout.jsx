import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/shared/context/AuthContext';
import { seccionesVisibles, seccionActiva } from '@/app/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const NAV_COLLAPSED_KEY = 'app.nav.collapsed';

const leerColapsado = () => {
  try { return localStorage.getItem(NAV_COLLAPSED_KEY) === '1'; } catch { return false; }
};

const esEscritorio = () => window.matchMedia('(min-width: 1024px)').matches;

/**
 * Navbar (secciones) + sidebar retraíble (páginas de la sección) + contenido.
 * ☰: en escritorio colapsa el sidebar a iconos; en móvil abre el cajón.
 */
const AppLayout = () => {
  const { isAdmin } = useAuthContext();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(leerColapsado);

  const secciones = seccionesVisibles(isAdmin);
  const activa = seccionActiva(pathname, secciones);

  useEffect(() => {
    try { localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* sin storage */ }
  }, [collapsed]);

  useEffect(() => { setOpen(false); }, [pathname]);

  const alternarMenu = () => (esEscritorio() ? setCollapsed((c) => !c) : setOpen((o) => !o));

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-niebla">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-3 focus:py-2 focus:bg-hoja focus:rounded-md">
        Saltar al contenido
      </a>
      <Navbar secciones={secciones} activa={activa} onMenu={alternarMenu} />
      {/* Franja de estados bajo el navbar: oculta por ahora (FranjaGlobal en features/reportes) */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          secciones={secciones}
          activa={activa}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          open={open}
          onClose={() => setOpen(false)}
        />
        <main id="contenido" className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
