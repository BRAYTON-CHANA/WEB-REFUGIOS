import {
  Home, CalendarDays, Users, ShieldCheck, FolderOpen, MapPin, HeartHandshake, IdCard, Flag,
} from 'lucide-react';

/**
 * Menú lateral. Cada sección: { title, soloAdmin?, items: [{ to, label, icon, end?, sub? }] }
 * `sub` agrupa ítems bajo un subtítulo dentro de la sección.
 * Para agregar una página: componente en features/<dominio>, página en app/views/<ruta>/index.jsx,
 * su <Route> en App.jsx y su ítem aquí.
 */
export const NAV_SECTIONS = [
  {
    title: 'General',
    items: [
      { to: '/', label: 'Inicio', icon: Home, end: true },
      { to: '/expedientes', label: 'Expedientes', icon: FolderOpen },
      { to: '/calendario', label: 'Calendario', icon: CalendarDays },
    ],
  },
  {
    title: 'Configuración',
    soloAdmin: true,
    items: [
      { to: '/config/usuarios', label: 'Usuarios', icon: Users, sub: 'Acceso' },
      { to: '/config/roles', label: 'Roles', icon: ShieldCheck, sub: 'Acceso' },
      { to: '/config/origenes', label: 'Orígenes', icon: MapPin, sub: 'Catálogos' },
      { to: '/config/parentescos', label: 'Parentescos', icon: HeartHandshake, sub: 'Catálogos' },
      { to: '/config/tipos-documento', label: 'Tipos de documento', icon: IdCard, sub: 'Catálogos' },
      { to: '/config/nacionalidades', label: 'Nacionalidades', icon: Flag, sub: 'Catálogos' },
    ],
  },
];
