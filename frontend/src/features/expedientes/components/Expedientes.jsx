import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Plus, Pencil, Trash2, FileText, Search, Star } from 'lucide-react';
import { useAuthContext } from '@/shared/context/AuthContext';
import {
  Button, Input, Select, ErrorAlert, PageHeader, Spinner, EmptyState, IconButton, Paginacion,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';
import { formatFecha } from '@/shared/utils/format';
import { expedientesService } from '../services/expedientesService';
import { TRAMITES, edad, apellidos } from '../utils/personas';
import ExpedienteModal from './ExpedienteModal';

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 10 }, (_, i) => ANIO_ACTUAL - i);
const TRAMITE_LABEL = Object.fromEntries(TRAMITES.map((t) => [t.value, t.label]));

const th = 'py-2.5 px-3 font-medium text-left';
const td = 'py-2 px-3 align-top';

/** Fila de una persona dentro del bloque de su expediente */
const FilaPersona = ({ p }) => {
  const años = edad(p.FECHA_NACIMIENTO);
  return (
    <tr className={p.ES_TITULAR ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}>
      <td className={`${td} ${p.ES_TITULAR ? '' : 'pl-8'}`}>
        <span className="inline-flex items-center gap-1">
          {p.ES_TITULAR && <Star size={12} className="text-blue-600 shrink-0" />}
          {p.PARENTESCO}
        </span>
      </td>
      <td className={td}>{apellidos(p) || '—'}</td>
      <td className={td}>{p.NOMBRES}</td>
      <td className={`${td} hidden md:table-cell`}>{p.SEXO === 'F' ? 'F' : p.SEXO === 'M' ? 'M' : '—'}</td>
      <td className={`${td} hidden lg:table-cell`}>{formatFecha(p.FECHA_NACIMIENTO)}</td>
      <td className={`${td} text-right`}>{años ?? '—'}</td>
      <td className={`${td} hidden md:table-cell text-xs`}>{p.TIPO_DOCUMENTO || '—'}</td>
      <td className={`${td} font-mono text-xs`}>{p.NRO_DOCUMENTO || '—'}</td>
    </tr>
  );
};

/** Expedientes: cada bloque = datos del expediente + titular y familiares */
const Expedientes = () => {
  const { roles, isAdmin } = useAuthContext();
  const puedeEditar = isAdmin || roles.includes('editor');

  const [filtros, setFiltros] = useState({ q: '', anio: '', tramite: '' });
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ open: false, expediente: null });
  const { toast, avisar } = useToast();

  const cargar = useCallback(async () => {
    try {
      setData(await expedientesService.listar({ ...filtros, page }));
      setError(null);
    } catch (e) { setError(e.message); }
  }, [filtros, page]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    expedientesService.catalogos().then(setCatalogos).catch((e) => setError(e.message));
  }, []);

  // Búsqueda con espera para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.q === busqueda ? f : { ...f, q: busqueda }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const setFiltro = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setPage(1);
  };

  const eliminar = async (exp) => {
    if (!window.confirm(`¿Eliminar el expediente ${exp.NRO_EXPEDIENTE || 'sin número'} y su grupo familiar?`)) return;
    try {
      await expedientesService.eliminar(exp.ID_EXPEDIENTE);
      avisar('Expediente eliminado');
      cargar();
    } catch (e) { avisar(e.message, true); }
  };

  const onGuardado = () => {
    avisar(modal.expediente ? 'Expediente actualizado' : 'Expediente registrado');
    setModal({ open: false, expediente: null });
    cargar();
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={FolderOpen} title="Expedientes">
        {puedeEditar && (
          <Button onClick={() => setModal({ open: true, expediente: null })} disabled={!catalogos}>
            <Plus size={16} /> Nuevo expediente
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nº de expediente, nombre, apellido o documento"
            className="pl-9"
          />
        </div>
        <Select value={filtros.anio} onChange={setFiltro('anio')} className="w-auto">
          <option value="">Todos los años</option>
          {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={filtros.tramite} onChange={setFiltro('tramite')} className="w-auto">
          <option value="">Todos los trámites</option>
          {TRAMITES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </div>

      <ErrorAlert>{error}</ErrorAlert>

      {!data ? <div className="flex justify-center py-16"><Spinner /></div> : !data.rows.length ? (
        <EmptyState icon={FolderOpen} title="Sin expedientes" subtitle="Prueba con otros filtros o registra uno nuevo." />
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-2">{data.total} expediente(s)</p>
          <div className="space-y-3">
            {data.rows.map((exp) => (
              <div key={exp.ID_EXPEDIENTE} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 text-sm">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {exp.NRO_EXPEDIENTE ? `Exp. ${exp.NRO_EXPEDIENTE}` : <span className="text-amber-600">Sin nº de expediente</span>}
                  </span>
                  <span className="text-slate-500">{formatFecha(exp.FECHA_SOLICITUD)}</span>
                  <span className="text-slate-500">{exp.ORIGEN}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {TRAMITE_LABEL[exp.TIPO_TRAMITE] || exp.TIPO_TRAMITE}
                  </span>
                  <span className="text-xs text-slate-400">{exp.PERSONAS.length} persona(s)</span>
                  <div className="ml-auto flex items-center gap-1">
                    {exp.URL_PDF && (
                      <a href={exp.URL_PDF} target="_blank" rel="noopener noreferrer" title="Abrir PDF"
                        className="p-1.5 text-red-500 hover:text-red-700 rounded-lg">
                        <FileText size={16} />
                      </a>
                    )}
                    {puedeEditar && (
                      <IconButton title="Editar" onClick={() => setModal({ open: true, expediente: exp })} disabled={!catalogos}>
                        <Pencil size={15} />
                      </IconButton>
                    )}
                    {isAdmin && (
                      <IconButton title="Eliminar" onClick={() => eliminar(exp)} className="hover:text-red-600">
                        <Trash2 size={15} />
                      </IconButton>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate-400">
                        <th className={th}>Parentesco</th>
                        <th className={th}>Apellidos</th>
                        <th className={th}>Nombres</th>
                        <th className={`${th} hidden md:table-cell`}>Sexo</th>
                        <th className={`${th} hidden lg:table-cell`}>Nacimiento</th>
                        <th className={`${th} text-right`}>Edad</th>
                        <th className={`${th} hidden md:table-cell`}>Tipo doc.</th>
                        <th className={th}>Nº doc.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {exp.PERSONAS.map((p) => <FilaPersona key={p.ID_PERSONA} p={p} />)}
                    </tbody>
                  </table>
                </div>
                {exp.OBSERVACIONES && (
                  <p className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-700">{exp.OBSERVACIONES}</p>
                )}
              </div>
            ))}
          </div>
          <Paginacion page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
        </>
      )}

      <ExpedienteModal
        open={modal.open}
        expediente={modal.expediente}
        catalogos={catalogos}
        onClose={() => setModal({ open: false, expediente: null })}
        onGuardado={onGuardado}
      />
      <Toast toast={toast} />
    </div>
  );
};

export default Expedientes;
