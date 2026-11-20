import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderOpen, Search, SlidersHorizontal, FileSpreadsheet, Plus, X } from 'lucide-react';
import { useAuthContext } from '@/shared/context/AuthContext';
import {
  Button, Input, Select, ErrorAlert, PageHeader, Spinner, EmptyState, Paginacion,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';
import { avisarCambioExpedientes } from '@/features/reportes';
import { expedientesService, FILTROS_REGISTRO } from '../services/expedientesService';
import { TRAMITES } from '../utils/personas';
import { exportarExcel } from '../utils/exportarExcel';
import { abrirArchivo } from '../utils/archivo';
import ExpedienteModal from './ExpedienteModal';
import RegistroTabla from './RegistroTabla';

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 8 }, (_, i) => ANIO_ACTUAL - i);
const MAS_FILTROS = ['parentesco', 'nacionalidad', 'tipodoc', 'sexo', 'edad', 'sinnro', 'sinarchivo'];

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Chip de la leyenda de estados (filtra al hacer clic) */
const ChipEstado = ({ color, nombre, activo, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={activo}
    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs border transition-colors ${activo
      ? 'border-grafito bg-grafito text-hoja'
      : 'border-trazo bg-hoja text-grafito hover:border-pizarra'}`}
  >
    <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/15" style={{ backgroundColor: color }} aria-hidden />
    {nombre}
  </button>
);

const Casilla = ({ checked, onChange, children }) => (
  <label className="inline-flex items-center gap-2 text-sm text-grafito cursor-pointer select-none">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-[var(--grafito)]" />
    {children}
  </label>
);

/** Expedientes como el Excel: una fila por persona, con filtros (en la URL) y exportación */
const Expedientes = () => {
  const { roles, isAdmin } = useAuthContext();
  const puedeEditar = isAdmin || roles.includes('editor');
  const [params, setParams] = useSearchParams();
  const { toast, avisar } = useToast();

  const filtros = useMemo(
    () => Object.fromEntries(FILTROS_REGISTRO.map((k) => [k, params.get(k) ?? ''])),
    [params],
  );
  const page = Math.max(1, Number(params.get('page')) || 1);
  const claveDatos = useMemo(() => JSON.stringify({ ...filtros, page }), [filtros, page]);

  const [busqueda, setBusqueda] = useState(filtros.q);
  const [data, setData] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [error, setError] = useState(null);
  const [verMas, setVerMas] = useState(() => MAS_FILTROS.some((k) => params.get(k)));
  const [modal, setModal] = useState({ open: false, expediente: null });
  const [exportando, setExportando] = useState(false);

  /** Cambia filtros en la URL (vuelve a la página 1) */
  const setFiltros = useCallback((cambios) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(cambios)) {
        if (v === '' || v == null) p.delete(k); else p.set(k, String(v));
      }
      if (!('page' in cambios)) p.delete('page');
      return p;
    }, { replace: true });
  }, [setParams]);

  const cargar = useCallback(async () => {
    try {
      const { page: pagina, ...f } = JSON.parse(claveDatos);
      setData(await expedientesService.registro(f, pagina));
      setError(null);
    } catch (e) { setError(e.message); }
  }, [claveDatos]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    expedientesService.catalogos().then(setCatalogos).catch((e) => setError(e.message));
  }, []);

  // La búsqueda del navbar cambia ?q=: reflejarla en el campo
  useEffect(() => { setBusqueda(filtros.q); }, [filtros.q]);

  // Búsqueda con espera para no consultar en cada tecla
  useEffect(() => {
    if (busqueda === filtros.q) return undefined;
    const t = setTimeout(() => setFiltros({ q: busqueda.trim() }), 350);
    return () => clearTimeout(t);
  }, [busqueda, filtros.q, setFiltros]);

  const editar = async (id) => {
    try {
      setModal({ open: true, expediente: await expedientesService.obtener(id) });
    } catch (e) { avisar(e.message, true); }
  };

  const eliminar = async (exp) => {
    if (!window.confirm(`¿Eliminar el expediente ${exp.NRO_EXPEDIENTE || 'sin número'} y su grupo familiar?`)) return;
    try {
      await expedientesService.eliminar(exp.ID_EXPEDIENTE);
      avisar('Expediente eliminado');
      avisarCambioExpedientes();
      cargar();
    } catch (e) { avisar(e.message, true); }
  };

  /** aviso: el expediente se guardó pero falló el archivo */
  const onGuardado = (_guardado, aviso) => {
    avisar(aviso ?? (modal.expediente ? 'Expediente guardado' : 'Expediente registrado'), Boolean(aviso));
    setModal({ open: false, expediente: null });
    avisarCambioExpedientes();
    cargar();
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const { rows } = await expedientesService.registroCompleto(filtros);
      if (!rows.length) { avisar('No hay filas para exportar con estos filtros', true); return; }
      const sufijo = [filtros.tramite?.toLowerCase(), filtros.anio].filter(Boolean).join('_');
      const hoy = new Date().toISOString().slice(0, 10);
      await exportarExcel(rows, catalogos?.estados, `expedientes${sufijo ? `_${sufijo}` : ''}_${hoy}.xlsx`);
      avisar('Excel descargado');
    } catch (e) {
      avisar(e.message, true);
    } finally {
      setExportando(false);
    }
  };

  const masActivos = MAS_FILTROS.filter((k) => filtros[k]).length + (filtros.grupo === '0' ? 1 : 0);
  const hayFiltros = FILTROS_REGISTRO.some((k) => filtros[k]);
  const limpiar = () => { setBusqueda(''); setParams(new URLSearchParams(), { replace: true }); };
  const set = (k) => (e) => setFiltros({ [k]: e.target.value });
  const alternarEstado = (valor) => setFiltros({ estado: filtros.estado === valor ? '' : valor });

  return (
    <div className="p-4 sm:p-6 lg:px-8">
      <PageHeader title="Expedientes">
        <Button variant="secondary" onClick={exportar} disabled={exportando || !data?.total}>
          <FileSpreadsheet size={16} /> {exportando ? 'Exportando…' : 'Exportar a Excel'}
        </Button>
        {puedeEditar && (
          <Button onClick={() => setModal({ open: true, expediente: null })} disabled={!catalogos}>
            <Plus size={16} /> Nuevo expediente
          </Button>
        )}
      </PageHeader>

      {/* Todos los filtros en un solo panel: búsqueda y periodo arriba, detalle y estado debajo */}
      <section aria-label="Filtros" className="bg-hoja border border-trazo rounded-lg mb-3">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pizarra pointer-events-none" aria-hidden />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nº de expediente, nombre, apellido o documento"
              aria-label="Buscar"
              className="pl-9"
            />
          </div>
          <Select value={filtros.anio} onChange={set('anio')} className="w-auto" aria-label="Año de solicitud">
            <option value="">Todos los años</option>
            {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select value={filtros.tramite} onChange={set('tramite')} className="w-auto" aria-label="Trámite">
            <option value="">Todos los trámites</option>
            {TRAMITES.map((t) => <option key={t.value} value={t.value}>{t.plural}</option>)}
          </Select>
          <Select value={filtros.origen} onChange={set('origen')} className="w-auto max-w-[14rem]" aria-label="Origen">
            <option value="">Todos los orígenes</option>
            {catalogos?.origenes.map((o) => <option key={o.ID_ORIGEN} value={o.ID_ORIGEN}>{o.NOMBRE}</option>)}
          </Select>
          <Button variant={verMas || masActivos ? 'secondary' : 'ghost'} onClick={() => setVerMas((v) => !v)} aria-expanded={verMas}>
            <SlidersHorizontal size={15} /> Más filtros{masActivos ? ` (${masActivos})` : ''}
          </Button>
        </div>

        {verMas && (
          <div className="border-t border-trazo p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={filtros.parentesco} onChange={set('parentesco')} aria-label="Parentesco">
              <option value="">Cualquier parentesco</option>
              {catalogos?.parentescos.map((x) => <option key={x.ID_PARENTESCO} value={x.ID_PARENTESCO}>{x.NOMBRE}</option>)}
            </Select>
            <Select value={filtros.nacionalidad} onChange={set('nacionalidad')} aria-label="Nacionalidad">
              <option value="">Cualquier nacionalidad</option>
              {catalogos?.nacionalidades.map((x) => <option key={x.ID_NACIONALIDAD} value={x.ID_NACIONALIDAD}>{x.NOMBRE}</option>)}
            </Select>
            <Select value={filtros.tipodoc} onChange={set('tipodoc')} aria-label="Tipo de documento">
              <option value="">Cualquier documento</option>
              {catalogos?.tiposDocumento.map((x) => <option key={x.ID_TIPO_DOCUMENTO} value={x.ID_TIPO_DOCUMENTO}>{x.NOMBRE}</option>)}
            </Select>
            <Select value={filtros.sexo} onChange={set('sexo')} aria-label="Sexo">
              <option value="">Ambos sexos</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </Select>
            <Select value={filtros.edad} onChange={set('edad')} aria-label="Edad">
              <option value="">Todas las edades</option>
              <option value="menores">Menores de 18</option>
              <option value="adultos">18 o más</option>
            </Select>
            <div className="sm:col-span-2 lg:col-span-5 flex flex-wrap gap-x-6 gap-y-2 pt-1">
              <Casilla checked={filtros.sinnro === '1'} onChange={(v) => setFiltros({ sinnro: v ? '1' : '' })}>Sin número de expediente</Casilla>
              <Casilla checked={filtros.sinarchivo === '1'} onChange={(v) => setFiltros({ sinarchivo: v ? '1' : '' })}>Sin archivo</Casilla>
              <Casilla checked={filtros.grupo !== '0'} onChange={(v) => setFiltros({ grupo: v ? '' : '0' })}>
                Mostrar el grupo familiar completo
              </Casilla>
            </div>
          </div>
        )}

        {/* Estado = colores de fila del Excel; clic filtra, otro clic quita */}
        {catalogos?.estados.length > 0 && (
          <div className="border-t border-trazo px-3 py-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por estado">
            <span className="text-[13px] text-pizarra mr-1">Estado</span>
            {catalogos.estados.map((e) => (
              <ChipEstado
                key={e.ID_ESTADO}
                color={e.COLOR}
                nombre={e.NOMBRE}
                activo={filtros.estado === String(e.ID_ESTADO)}
                onClick={() => alternarEstado(String(e.ID_ESTADO))}
              />
            ))}
            <ChipEstado color="var(--hoja)" nombre="Sin estado" activo={filtros.estado === 'sin'} onClick={() => alternarEstado('sin')} />
          </div>
        )}
      </section>

      <ErrorAlert>{error}</ErrorAlert>

      {!data ? <div className="py-16"><Spinner /></div> : !data.rows.length ? (
        <EmptyState
          icon={FolderOpen}
          title={hayFiltros ? 'Ningún expediente coincide con estos filtros' : 'Todavía no hay expedientes'}
          subtitle={hayFiltros ? 'Quita alguno o registra un expediente nuevo.' : 'Registra el primero con «Nuevo expediente».'}
        >
          {hayFiltros && <Button variant="secondary" onClick={limpiar}>Quitar filtros</Button>}
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 min-h-8">
            <p className="text-[13px] text-pizarra cifras">
              {plural(data.total, 'expediente', 'expedientes')}, {plural(data.personas, 'persona coincide', 'personas coinciden')}
            </p>
            {hayFiltros && <Button variant="ghost" size="sm" onClick={limpiar}><X size={14} /> Quitar filtros</Button>}
          </div>
          <RegistroTabla
            rows={data.rows}
            puedeEditar={puedeEditar && Boolean(catalogos)}
            puedeEliminar={isAdmin}
            onEditar={editar}
            onEliminar={eliminar}
            onVerArchivo={(id) => abrirArchivo(id).catch((e) => avisar(e.message, true))}
          />
          <Paginacion page={data.page} total={data.total} pageSize={data.pageSize} onPage={(p) => setFiltros({ page: p })} />
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
