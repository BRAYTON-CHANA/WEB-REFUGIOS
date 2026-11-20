import { useEffect } from 'react';

/** Clases base de inputs/selects/textarea (para usarlas en elementos nativos) */
export const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ' +
  'disabled:opacity-60 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100';

export const Spinner = ({ className = '' }) => (
  <div className={`animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 ${className || 'w-5 h-5'}`} />
);

export const EmptyState = ({ icon: Icon, title, subtitle, children }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && <Icon size={40} className="text-slate-300 dark:text-slate-600 mb-3" />}
    <p className="text-slate-600 dark:text-slate-300 font-medium">{title}</p>
    {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    {children}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none transition-colors">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const Badge = ({ color = '#64748b', children }) => (
  <span
    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white shadow-sm mr-1"
    style={{ backgroundColor: color }}
  >
    {children}
  </span>
);

export const Paginacion = ({ page, total, pageSize, onPage }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const btn = 'px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active-press';
  return (
    <div className="flex items-center justify-center gap-3 mt-4 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn} aria-label="Anterior">←</button>
      <span className="text-slate-500 font-medium">{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className={btn} aria-label="Siguiente">→</button>
    </div>
  );
};

export const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-xl transition-all active-press focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus-visible:ring-slate-500 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-500 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-2.5 text-base' };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', ...props }) => (
  <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl ${className}`} {...props}>
    {children}
  </div>
);

/** Etiqueta + control + ayuda */
export const Field = ({ label, required, help, children }) => (
  <div>
    {label && <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}{required ? ' *' : ''}</label>}
    {children}
    {help && <p className="text-[11px] text-slate-400 mt-0.5">{help}</p>}
  </div>
);

export const Input = ({ className = '', ...props }) => <input className={`${inputCls} ${className}`} {...props} />;

export const Select = ({ className = '', children, ...props }) => (
  <select className={`${inputCls} ${className}`} {...props}>{children}</select>
);

export const Textarea = ({ className = '', rows = 3, ...props }) => (
  <textarea rows={rows} className={`${inputCls} ${className}`} {...props} />
);

export const ErrorAlert = ({ children }) => (children ? (
  <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 text-sm rounded-xl px-4 py-3 mb-4">
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
  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
          {columns.map((c) => <th key={c.label} className={`py-2.5 px-4 font-medium ${c.className || ''}`}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Tr = ({ inactivo, children }) => (
  <tr className={`border-b border-slate-50 dark:border-slate-700/60 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 ${inactivo ? 'opacity-50' : ''}`}>
    {children}
  </tr>
);

export const Td = ({ className = '', children }) => (
  <td className={`py-2.5 px-4 text-slate-700 dark:text-slate-200 ${className}`}>{children}</td>
);

/** Botón de icono para acciones de fila */
export const IconButton = ({ title, className = '', children, ...props }) => (
  <button title={title} aria-label={title} className={`p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors ${className}`} {...props}>
    {children}
  </button>
);

/** Encabezado de página: título (con icono opcional) y acciones a la derecha */
export const PageHeader = ({ icon: Icon, title, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
    <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
      {Icon && <Icon size={20} />} {title}
    </h1>
    {children && <div className="flex items-center gap-3">{children}</div>}
  </div>
);
