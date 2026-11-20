import { Pencil, Trash2, FileText, StickyNote } from 'lucide-react';
import DropdownMenu from '@/shared/components/DropdownMenu';
import { IconButton } from '@/shared/components/ui';
import { formatFecha } from '@/shared/utils/format';
import { COLUMNAS, agruparPorExpediente } from '../utils/registro';
import { tinteEstado } from '../utils/personas';

const sexo = (s) => (s === 'F' ? 'Femenino' : s === 'M' ? 'Masculino' : '—');

/** Contenido de una celda por persona */
const celdaPersona = (key, r) => {
  switch (key) {
    case 'FECHA_SOLICITUD':
    case 'FECHA_NACIMIENTO': return formatFecha(r[key]);
    case 'SEXO': return sexo(r.SEXO);
    case 'ESTADO':
      return r.ESTADO ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/15" style={{ backgroundColor: r.ESTADO_COLOR }} aria-hidden />
          {r.ESTADO}
        </span>
      ) : <span className="text-pizarra">Sin estado</span>;
    default: return r[key] ?? '—';
  }
};

const Observaciones = ({ texto }) => (
  <DropdownMenu
    menuClassName="w-80 max-w-[90vw]"
    align="right"
    trigger={({ triggerRef, open, toggle }) => (
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-expanded={open}
        title="Ver observaciones"
        className="flex items-start gap-1.5 text-left text-[13px] text-pizarra hover:text-grafito max-w-[16rem]"
      >
        <StickyNote size={14} className="shrink-0 mt-0.5" aria-hidden />
        <span className="line-clamp-2">{texto}</span>
      </button>
    )}
  >
    <p className="px-3 py-2.5 text-sm text-grafito whitespace-pre-line break-words max-h-72 overflow-y-auto">{texto}</p>
  </DropdownMenu>
);

const th = 'sticky top-0 z-20 bg-hoja border-b border-trazo px-3 py-2.5 text-left text-[13px] font-medium text-pizarra whitespace-nowrap';

/**
 * Tabla tipo Excel: una fila por persona, teñida con el color de su estado. Nº de
 * expediente, PDF, observaciones y acciones van "combinados" (rowSpan) por expediente.
 */
const RegistroTabla = ({ rows, puedeEditar, puedeEliminar, onEditar, onEliminar, onVerArchivo }) => {
  const grupos = agruparPorExpediente(rows);

  return (
    <div className="bg-hoja border border-trazo rounded-lg overflow-auto max-h-[calc(100vh-17rem)] min-h-[16rem]">
      <table className="min-w-full text-[13px] border-separate border-spacing-0">
        <thead>
          <tr>
            {COLUMNAS.map((c, i) => (
              <th key={c.key} scope="col" className={`${th} ${i === 0 ? 'left-0 z-30' : ''} ${c.numero ? 'text-right' : ''}`}>{c.label}</th>
            ))}
            {(puedeEditar || puedeEliminar) && <th scope="col" className={th}><span className="sr-only">Acciones</span></th>}
          </tr>
        </thead>
        <tbody>
          {grupos.map(({ id, filas }) => filas.map((r, idx) => {
            const span = filas.length;
            const borde = idx === 0 ? 'border-t border-t-grafito/25' : 'border-t border-t-trazo/70';
            const fondo = { backgroundColor: tinteEstado(r.ESTADO_COLOR) };
            const texto = r.ES_TITULAR ? 'font-semibold text-grafito' : 'text-grafito';
            const exp = filas[0];

            return (
              <tr key={r.ID_PERSONA}>
                {COLUMNAS.map((c, i) => {
                  if (c.grupo) {
                    if (idx > 0) return null;
                    let contenido;
                    if (c.key === 'NRO_EXPEDIENTE') {
                      contenido = exp.NRO_EXPEDIENTE
                        ? <span className="font-semibold cifras text-grafito">{exp.NRO_EXPEDIENTE}</span>
                        : <span className="text-pizarra">Sin número</span>;
                    } else if (c.key === 'ARCHIVO_RUTA') {
                      contenido = exp.ARCHIVO_RUTA ? (
                        <button
                          type="button"
                          onClick={() => onVerArchivo(id)}
                          title={`Abrir ${exp.ARCHIVO_NOMBRE || 'archivo'}`}
                          className="inline-flex items-center gap-1 text-foco hover:underline"
                        >
                          <FileText size={15} aria-hidden /> PDF
                        </button>
                      ) : <span className="text-pizarra">—</span>;
                    } else {
                      contenido = exp.OBSERVACIONES ? <Observaciones texto={exp.OBSERVACIONES} /> : <span className="text-pizarra">—</span>;
                    }
                    return (
                      <td key={c.key} rowSpan={span} className={`${borde} border-l border-l-trazo/70 bg-hoja px-3 py-2 align-middle ${c.key === 'OBSERVACIONES' ? '' : 'text-center whitespace-nowrap'}`}>
                        {contenido}
                      </td>
                    );
                  }
                  const primera = i === 0;
                  return (
                    <td
                      key={c.key}
                      style={primera ? { ...fondo, boxShadow: r.ESTADO_COLOR ? `inset 4px 0 0 ${r.ESTADO_COLOR}` : undefined } : fondo}
                      className={`${borde} px-3 h-9 py-1.5 whitespace-nowrap ${texto} ${primera ? 'sticky left-0 z-10 pl-4' : ''} ${c.numero ? 'text-right cifras' : ''} ${c.fecha || c.key === 'NRO_DOCUMENTO' ? 'cifras' : ''}`}
                    >
                      {celdaPersona(c.key, r)}
                    </td>
                  );
                })}
                {(puedeEditar || puedeEliminar) && idx === 0 && (
                  <td rowSpan={span} className={`${borde} border-l border-l-trazo/70 bg-hoja px-1.5 align-middle whitespace-nowrap`}>
                    {puedeEditar && (
                      <IconButton title={`Editar expediente ${exp.NRO_EXPEDIENTE || 'sin número'}`} onClick={() => onEditar(id)}>
                        <Pencil size={15} />
                      </IconButton>
                    )}
                    {puedeEliminar && (
                      <IconButton title={`Eliminar expediente ${exp.NRO_EXPEDIENTE || 'sin número'}`} onClick={() => onEliminar(exp)} className="hover:text-red-700">
                        <Trash2 size={15} />
                      </IconButton>
                    )}
                  </td>
                )}
              </tr>
            );
          }))}
        </tbody>
      </table>
    </div>
  );
};

export default RegistroTabla;
