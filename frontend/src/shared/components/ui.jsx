import { useEffect, useState } from 'react';
import { Eye, EyeOff, ChevronLeft, ChevronRight, X } from 'lucide-react';

/*
 * UI compartida. Colores por tokens de index.css (grafito, pizarra, niebla, hoja, trazo,
 * foco): cambian solos con el tema claro/oscuro. Los colores vivos se reservan para
 * los estados (ESTADOS.COLOR).
 */

/** Clases base de inputs/selects/textarea, sin ancho (para usarlas en elementos nativos) */
export const inputCls =
  'px-3 py-2 text-sm rounded-md border border-trazo bg-hoja text-grafito placeholder:text-pizarra/70 ' +
  'focus:outline-none focus:border-foco focus:ring-2 focus:ring-foco/25 transition-colors ' +
  'disabled:opacity-60';

export const Spinner = ({ className = '' }) => (
  <div className={`animate-spin rounded-full border-2 border-trazo border-t-grafito ${className || 'w-5 h-5'}`} />
);

export const EmptyState = ({ icon: Icon, title, subtitle, children }) => (
  <div className="flex flex-col items-start py-12 px-1 max-w-md">
    {Icon && <Icon size={28} className="text-pizarra mb-3" aria-hidden />}
    <p className="text-grafito font-semibold">{title}</p>
    {subtitle && <p className="text-pizarra text-sm mt-1">{subtitle}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);

export const Modal = ({ open, onClose, title, children, wide }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-grafito/40 animate-fade-in" onClick={onClose} />
      <div className={`relative bg-hoja border border-trazo rounded-lg shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto animate-scale-in`}>
        <div className="sticky top-0 z-10 bg-hoja flex items-center justify-between px-6 py-4 border-b border-trazo">
          <h3 className="text-base font-semibold text-grafito">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 rounded text-pizarra hover:text-grafito hover:bg-niebla">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const Badge = ({ color = '#55646F', children }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-white mr-1"
    style={{ backgroundColor: color }}
  >
    {children}
  </span>
);

export const Paginacion = ({ page, total, pageSize, onPage }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const btn = 'p-1.5 rounded-md border border-trazo bg-hoja text-grafito disabled:opacity-40 hover:bg-niebla transition-colors';
  return (
    <div className="flex items-center gap-3 mt-4 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn} aria-label="Página anterior"><ChevronLeft size={16} /></button>
      <span className="text-pizarra cifras">Página {page} de {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className={btn} aria-label="Página siguiente"><ChevronRight size={16} /></button>
    </div>
  );
};

export const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors active-press disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary: 'bg-grafito text-hoja hover:bg-grafito/85',
    secondary: 'bg-hoja text-grafito border border-trazo hover:bg-niebla',
    ghost: 'bg-transparent text-pizarra hover:text-grafito hover:bg-niebla',
    danger: 'bg-red-700 text-white hover:bg-red-800',
  };
  const sizes = { sm: 'px-2.5 py-1.5 text-[13px]', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', ...props }) => (
  <div className={`bg-hoja border border-trazo rounded-lg ${className}`} {...props}>
    {children}
  </div>
);

/** Etiqueta + control + ayuda */
export const Field = ({ label, required, help, children }) => (
  <div>
    {label && <label className="block text-[13px] font-medium text-pizarra mb-1">{label}{required ? ' *' : ''}</label>}
    {children}
    {help && <p className="text-xs text-pizarra/80 mt-1">{help}</p>}
  </div>
);

/** Ancho completo salvo que className traiga su propio w-… */
const conAncho = (className) => (/(^|\s)w-/.test(className) ? className : `w-full ${className}`);

export const Input = ({ className = '', ...props }) => <input className={`${inputCls} ${conAncho(className)}`} {...props} />;

/** Input de contraseña con botón para mostrarla/ocultarla */
export const PasswordInput = ({ className = '', ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputCls} pr-10 ${conAncho(className)}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-pizarra hover:text-grafito"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

export const Select = ({ className = '', children, ...props }) => (
  <select className={`${inputCls} ${conAncho(className)}`} {...props}>{children}</select>
);

export const Textarea = ({ className = '', rows = 3, ...props }) => (
  <textarea rows={rows} className={`${inputCls} ${conAncho(className)}`} {...props} />
);

export const ErrorAlert = ({ children }) => (children ? (
  <div role="alert" className="border-l-4 border-red-600 bg-red-50 text-red-800 text-sm rounded-md px-4 py-3 mb-4">
    {children}
  </div>
) : null);

/**
 * Tabla simple. columns: [{ label, className? }]
 *   <Table columns={[{label:'Nombre'}, {label:'Acciones', className:'text-right'}]}>
 *     <Tr key=.. inactivo={!row.ACTIVO}><Td>..</Td></Tr>
 *   </Table>
 */
export const Table = ({ columns, children }) => (
  <div className="bg-hoja border border-trazo rounded-lg overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[13px] text-pizarra border-b border-trazo bg-niebla/60">
          {columns.map((c) => <th key={c.label} className={`py-2.5 px-4 font-medium ${c.className || ''}`}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Tr = ({ inactivo, children }) => (
  <tr className={`border-b border-trazo/70 last:border-0 hover:bg-niebla/60 ${inactivo ? 'opacity-50' : ''}`}>
    {children}
  </tr>
);

export const Td = ({ className = '', children }) => (
  <td className={`py-2.5 px-4 text-grafito ${className}`}>{children}</td>
);

/** Botón de icono para acciones de fila */
export const IconButton = ({ title, className = '', children, ...props }) => (
  <button title={title} aria-label={title} className={`p-1.5 text-pizarra hover:text-grafito hover:bg-niebla rounded-md transition-colors ${className}`} {...props}>
    {children}
  </button>
);

/** Encabezado de página: título y acciones a la derecha (el icono es opcional y discreto) */
export const PageHeader = ({ icon: Icon, title, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
    <h1 className="text-[26px] leading-tight font-semibold text-grafito flex items-center gap-2.5">
      {Icon && <Icon size={22} className="text-pizarra" aria-hidden />} {title}
    </h1>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);
