import {
  Users, ShieldCheck, FolderOpen, MapPin, HeartHandshake, IdCard, Flag, Palette, ChartColumn,
} from 'lucide-react';

/**
 * Navegación en dos niveles:
 *   - navbar: las secciones (`title`; clic va a `to`)
 *   - sidebar: las páginas (`items`) de la sección activa (la que tiene un prefijo de
 *     `match` que coincide con la ruta actual)
 * Sección: { id, title, to, match: ['/prefijo'], soloAdmin?, items: [{ to, label, icon, sub? }] }
 * `sub` agrupa ítems bajo un subtítulo dentro del sidebar.
 * Para agregar una página: componente en features/<dominio>, página en app/views/<ruta>/index.jsx,
 * su <Route> en App.jsx y su ítem aquí.
 * El calendario de ejemplo del template no está en el menú (la ruta /calendario sigue).
 */
export const NAV_SECTIONS = [
  {
    id: 'inicio',
    title: 'Inicio',
    to: '/expedientes',
    match: ['/expedientes', '/reportes'],
    items: [
      { to: '/expedientes', label: 'Expedientes', icon: FolderOpen },
      { to: '/reportes', label: 'Reportes', icon: ChartColumn },
    ],
  },
  {
    id: 'config',
    title: 'Configuración',
    to: '/config/usuarios',
    match: ['/config'],
    soloAdmin: true,
    items: [
      { to: '/config/usuarios', label: 'Usuarios', icon: Users, sub: 'Acceso' },
      { to: '/config/roles', label: 'Roles', icon: ShieldCheck, sub: 'Acceso' },
      { to: '/config/origenes', label: 'Orígenes', icon: MapPin, sub: 'Catálogos' },
      { to: '/config/parentescos', label: 'Parentescos', icon: HeartHandshake, sub: 'Catálogos' },
      { to: '/config/tipos-documento', label: 'Tipos de documento', icon: IdCard, sub: 'Catálogos' },
      { to: '/config/nacionalidades', label: 'Nacionalidades', icon: Flag, sub: 'Catálogos' },
      { to: '/config/estados', label: 'Estados', icon: Palette, sub: 'Catálogos' },
    ],
  },
];

/** Secciones visibles para el usuario */
export const seccionesVisibles = (isAdmin) => NAV_SECTIONS.filter((s) => !s.soloAdmin || isAdmin);

/** Sección a la que pertenece la ruta (por defecto la primera) */
export const seccionActiva = (pathname, secciones = NAV_SECTIONS) =>
  secciones.find((s) => s.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))) ?? secciones[0];
