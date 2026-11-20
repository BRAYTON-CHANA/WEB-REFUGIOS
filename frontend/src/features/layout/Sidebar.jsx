import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

/**
 * Páginas de la sección activa. En escritorio se retrae a iconos (botón al pie o ☰ del
 * navbar; se recuerda en localStorage); en móvil es un cajón que además muestra las
 * secciones (en el navbar no caben).
 */
const Sidebar = ({ secciones, activa, collapsed, onToggleCollapsed, open, onClose }) => {
  const oculto = collapsed ? 'lg:sr-only' : '';

  const linkCls = ({ isActive }) =>
    `relative flex items-center gap-3 h-9 px-3 rounded-md text-sm transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
      isActive
        ? 'bg-niebla text-grafito font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-grafito'
        : 'text-pizarra hover:text-grafito hover:bg-niebla/70'
    }`;

  const items = activa?.items ?? [];

  return (
    <>
      <aside
        aria-label={`Páginas de ${activa?.title ?? 'la sección'}`}
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-hoja border-r border-trazo flex flex-col shrink-0
          transition-[width,transform] duration-200 lg:translate-x-0 ${collapsed ? 'lg:w-16' : 'lg:w-60'}
          ${open ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full'}`}
      >
        {/* Solo móvil: secciones (en el navbar no caben) */}
        <div className="md:hidden p-3 border-b border-trazo">
          <div className="flex gap-1" role="tablist" aria-label="Secciones">
            {secciones.map((s) => (
              <NavLink
                key={s.id}
                to={s.to}
                onClick={onClose}
                className={`flex-1 text-center py-1.5 rounded-md text-sm ${s.id === activa?.id ? 'bg-grafito text-hoja font-medium' : 'text-pizarra hover:bg-niebla'}`}
              >
                {s.title}
              </NavLink>
            ))}
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 px-3 ${collapsed ? 'lg:px-2' : ''}`}>
          {items.map(({ to, label, icon: Icon, sub }, i) => (
            <div key={to}>
              {sub && sub !== items[i - 1]?.sub && (
                collapsed
                  ? <div className={`hidden lg:block mx-2 border-t border-trazo ${i ? 'my-3' : 'mb-3'}`} />
                  : null
              )}
              {sub && sub !== items[i - 1]?.sub && (
                <p className={`px-3 text-xs font-medium text-pizarra ${i ? 'mt-5' : ''} mb-1.5 ${collapsed ? 'lg:hidden' : ''}`}>{sub}</p>
              )}
              <NavLink to={to} className={linkCls} title={collapsed ? label : undefined} onClick={onClose}>
                <Icon size={17} className="shrink-0" aria-hidden />
                <span className={oculto}>{label}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        <div className={`hidden lg:block border-t border-trazo p-3 ${collapsed ? 'lg:px-2' : ''}`}>
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expandir menú' : 'Retraer menú'}
            aria-label={collapsed ? 'Expandir menú' : 'Retraer menú'}
            aria-expanded={!collapsed}
            className={`w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm text-pizarra hover:text-grafito hover:bg-niebla transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
            <span className={oculto}>Retraer menú</span>
          </button>
        </div>
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-grafito/40 animate-fade-in" onClick={onClose} aria-hidden />
      )}
    </>
  );
};

export default Sidebar;
