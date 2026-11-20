import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Select, Spinner, ErrorAlert } from '@/shared/components/ui';
import { formatFecha } from '@/shared/utils/format';
import { TRAMITES, TRAMITE_LABEL } from '@/shared/constants/tramites';
import { useResumen } from '../hooks/useResumen';
import EstadosFranja from './EstadosFranja';

const sumar = (rows, campo) => rows.reduce((s, r) => s + (r[campo] ?? 0), 0);

/** Enlace a la tabla con los filtros del reporte más los dados */
const enlace = (filtros, extra) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filtros, ...extra })) if (v) p.set(k, v);
  return `/expedientes?${p}`;
};

const Seccion = ({ titulo, detalle, children, className = '' }) => (
  <section className={`bg-hoja border border-trazo rounded-lg p-5 ${className}`}>
    <h2 className="text-base font-semibold text-grafito">{titulo}</h2>
    {detalle && <p className="text-[13px] text-pizarra mt-0.5">{detalle}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const th = 'py-2 pr-4 text-left text-[13px] font-medium text-pizarra';
const td = 'py-2 pr-4 cifras';

/** Tabla corta con barra de proporción (origen, nacionalidad) */
const TablaProporcion = ({ filas, etiqueta, valor, extra, enlazar }) => {
  const max = Math.max(1, ...filas.map((f) => f[valor]));
  return (
    <table className="w-full text-sm">
      <tbody>
        {filas.map((f) => {
          const to = enlazar?.(f);
          return (
          <tr key={f[etiqueta]} className="border-t border-trazo/70 first:border-0">
            <td className="py-2 pr-3 text-grafito">
              {to ? <Link to={to} className="hover:underline">{f[etiqueta]}</Link> : f[etiqueta]}
            </td>
            <td className="py-2 w-[40%]">
              <div className="h-2 rounded-sm bg-grafito/80" style={{ width: `${(f[valor] / max) * 100}%` }} />
            </td>
            <td className="py-2 pl-3 text-right cifras font-semibold text-grafito">{f[valor]}</td>
            {extra && <td className="py-2 pl-3 text-right cifras text-pizarra text-[13px] whitespace-nowrap">{extra(f)}</td>}
          </tr>
          );
        })}
      </tbody>
    </table>
  );
};

/** Reportes: resumen de las views SQL (estados, trámites, pendientes, origen, nacionalidad) */
const Reportes = () => {
  const [filtros, setFiltros] = useState({ anio: '', tramite: '' });
  const { data, error } = useResumen(filtros);
  const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

  const personasTotal = data ? sumar(data.estados, 'PERSONAS') : 0;
  const expedientesTotal = data ? sumar(data.tramites, 'EXPEDIENTES') : 0;

  return (
    <div className="p-4 sm:p-6 lg:px-8 max-w-6xl">
      <PageHeader title="Reportes">
        <Select value={filtros.anio} onChange={set('anio')} className="w-auto" aria-label="Año">
          <option value="">Todos los años</option>
          {data?.anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={filtros.tramite} onChange={set('tramite')} className="w-auto" aria-label="Trámite">
          <option value="">Todos los trámites</option>
          {TRAMITES.map((t) => <option key={t.value} value={t.value}>{t.plural}</option>)}
        </Select>
      </PageHeader>

      <ErrorAlert>{error}</ErrorAlert>

      {!data ? <div className="py-16"><Spinner /></div> : (
        <div className="space-y-5">
          <Seccion
            titulo="Personas por estado"
            detalle={`${personasTotal} ${personasTotal === 1 ? 'persona' : 'personas'} en ${expedientesTotal} ${expedientesTotal === 1 ? 'expediente' : 'expedientes'}. Elige un estado para ver sus filas.`}
          >
            <EstadosFranja estados={data.estados} variante="grande" filtros={filtros} />
          </Seccion>

          <div className="grid gap-5 lg:grid-cols-5">
            <Seccion titulo="Expedientes por año y trámite" className="lg:col-span-3">
              {!data.tramites.length ? <p className="text-sm text-pizarra">Sin expedientes en este periodo.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-trazo">
                        <th className={th}>Año</th>
                        <th className={th}>Trámite</th>
                        <th className={`${th} text-right`}>Expedientes</th>
                        <th className={`${th} text-right`}>Personas</th>
                        <th className={`${th} text-right`}>Menores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tramites.map((t) => (
                        <tr key={`${t.ANIO}-${t.TIPO_TRAMITE}`} className="border-b border-trazo/60">
                          <td className={`${td} text-grafito`}>{t.ANIO}</td>
                          <td className="py-2 pr-4">
                            <Link to={enlace({}, { anio: t.ANIO, tramite: t.TIPO_TRAMITE })} className="text-grafito hover:underline">
                              {TRAMITE_LABEL[t.TIPO_TRAMITE] ?? t.TIPO_TRAMITE}
                            </Link>
                          </td>
                          <td className={`${td} text-right font-semibold`}>{t.EXPEDIENTES}</td>
                          <td className={`${td} text-right`}>{t.PERSONAS}</td>
                          <td className={`${td} text-right text-pizarra`}>{t.MENORES}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold text-grafito">
                        <td className="py-2 pr-4" colSpan={2}>Total</td>
                        <td className={`${td} text-right`}>{expedientesTotal}</td>
                        <td className={`${td} text-right`}>{sumar(data.tramites, 'PERSONAS')}</td>
                        <td className={`${td} text-right`}>{sumar(data.tramites, 'MENORES')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Seccion>

            <Seccion titulo="Pendientes" detalle="Expedientes a los que les falta el número o el archivo." className="lg:col-span-2">
              <div className="flex gap-6">
                <Link to={enlace(filtros, { sinnro: '1' })} className="group">
                  <span className="block text-[26px] leading-none font-bold cifras text-grafito group-hover:underline">{data.pendientes.sinNro}</span>
                  <span className="text-[13px] text-pizarra">sin número</span>
                </Link>
                <Link to={enlace(filtros, { sinarchivo: '1' })} className="group">
                  <span className="block text-[26px] leading-none font-bold cifras text-grafito group-hover:underline">{data.pendientes.sinArchivo}</span>
                  <span className="text-[13px] text-pizarra">sin archivo</span>
                </Link>
              </div>
              {data.pendientes.lista.length > 0 && (
                <ul className="mt-4 divide-y divide-trazo/70 text-sm">
                  {data.pendientes.lista.map((p) => (
                    <li key={p.ID_EXPEDIENTE} className="py-2 flex items-baseline gap-3">
                      <span className="flex-1 min-w-0 truncate text-grafito">
                        {[p.TITULAR_APELLIDOS, p.TITULAR_NOMBRES].filter(Boolean).join(', ')}
                      </span>
                      <span className="text-xs text-pizarra whitespace-nowrap">
                        {[p.SIN_NRO && 'sin nº', p.SIN_ARCHIVO && 'sin archivo'].filter(Boolean).join(' y ')}
                      </span>
                      <span className="text-xs text-pizarra cifras whitespace-nowrap">{formatFecha(p.FECHA_SOLICITUD)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Seccion titulo="Por origen" detalle="Personas según por dónde ingresó la solicitud.">
              <TablaProporcion
                filas={data.origenes}
                etiqueta="ORIGEN"
                valor="PERSONAS"
                extra={(f) => `${f.EXPEDIENTES} exp.`}
                enlazar={(f) => enlace(filtros, { origen: f.ID_ORIGEN })}
              />
            </Seccion>
            <Seccion titulo="Por nacionalidad" detalle="Personas y, aparte, cuántas son menores de edad.">
              <TablaProporcion
                filas={data.nacionalidades}
                etiqueta="NACIONALIDAD"
                valor="PERSONAS"
                extra={(f) => `${f.MENORES} menores`}
                enlazar={(f) => (f.ID_NACIONALIDAD ? enlace(filtros, { nacionalidad: f.ID_NACIONALIDAD }) : null)}
              />
            </Seccion>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reportes;
