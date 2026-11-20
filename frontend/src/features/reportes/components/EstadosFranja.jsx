import { Link } from 'react-router-dom';

const SIN_ESTADO = { nombre: 'Sin estado', color: 'var(--trazo)' };

/** Enlace a la tabla de expedientes filtrada por ese estado (y año/trámite si vienen) */
export const enlaceEstado = (idEstado, { anio, tramite } = {}) => {
  const p = new URLSearchParams({ estado: idEstado == null ? 'sin' : String(idEstado) });
  if (anio) p.set('anio', anio);
  if (tramite) p.set('tramite', tramite);
  return `/expedientes?${p}`;
};

const segmentos = (estados = []) => {
  const total = estados.reduce((s, e) => s + e.PERSONAS, 0);
  return {
    total,
    items: estados.filter((e) => e.PERSONAS > 0).map((e) => ({
      ...e,
      nombre: e.ESTADO ?? SIN_ESTADO.nombre,
      color: e.COLOR ?? SIN_ESTADO.color,
      pct: total ? (e.PERSONAS / total) * 100 : 0,
    })),
  };
};

const personas = (n) => `${n} ${n === 1 ? 'persona' : 'personas'}`;

/**
 * Franja de estados: los colores de fila del Excel, con ancho proporcional a las personas
 * en cada estado. Cada tramo lleva a la tabla filtrada.
 *   variante="fina"   → bajo el navbar, en todas las páginas
 *   variante="grande" → Reportes, con leyenda y conteos
 */
const EstadosFranja = ({ estados, variante = 'fina', filtros }) => {
  const { total, items } = segmentos(estados);
  const grande = variante === 'grande';

  if (!total) {
    return grande
      ? <p className="text-sm text-pizarra">Todavía no hay personas registradas en este periodo.</p>
      : <div className="h-1.5 bg-trazo/60" aria-hidden />;
  }

  const barra = (
    <div
      className={grande
        ? 'flex h-7 w-full overflow-hidden rounded-md border border-trazo franja-crece'
        : 'group flex h-1.5 hover:h-3 focus-within:h-3 w-full transition-[height] duration-150 franja-crece'}
      role="list"
      aria-label="Personas por estado"
    >
      {items.map((e) => (
        <Link
          key={e.ID_ESTADO ?? 'sin'}
          role="listitem"
          to={enlaceEstado(e.ID_ESTADO, filtros)}
          title={`${e.nombre}: ${personas(e.PERSONAS)}`}
          aria-label={`${e.nombre}: ${personas(e.PERSONAS)}. Ver en expedientes`}
          className="block h-full min-w-[3px] hover:brightness-95 focus-visible:outline-offset-[-2px]"
          style={{ width: `${e.pct}%`, backgroundColor: e.color }}
        />
      ))}
    </div>
  );

  if (!grande) return barra;

  return (
    <div>
      {barra}
      <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
        {items.map((e) => (
          <li key={e.ID_ESTADO ?? 'sin'}>
            <Link
              to={enlaceEstado(e.ID_ESTADO, filtros)}
              className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-md hover:bg-niebla"
            >
              <span className="w-3.5 h-3.5 rounded-sm shrink-0 ring-1 ring-black/10" style={{ backgroundColor: e.color }} />
              <span className="flex-1 min-w-0 text-sm text-grafito truncate">{e.nombre}</span>
              <span className="cifras text-sm font-semibold text-grafito">{e.PERSONAS}</span>
              <span className="cifras text-xs text-pizarra w-10 text-right">{Math.round(e.pct)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EstadosFranja;
