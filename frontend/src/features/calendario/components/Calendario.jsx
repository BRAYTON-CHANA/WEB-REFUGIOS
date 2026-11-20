import { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { Calendar } from '@/shared/components/calendario';
import {
  Modal, Button, Field, Input, Textarea, ErrorAlert, PageHeader, Card,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';
import { formatFechaHora } from '@/shared/utils/format';
import { eventosService } from '../services/eventosService';
import { FRANJAS, HORA_INICIO, eventosAFranjas, aInputLocal } from '../utils/franjas';

const VACIO = { TITULO: '', DESCRIPCION: '', INICIO: '', FIN: '', TODO_EL_DIA: false, COLOR: '#2563eb' };

/** Ejemplo de uso del calendario compartido con un CRUD por endpoint propio */
const Calendario = () => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [fecha, setFecha] = useState(new Date());
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const { toast, avisar } = useToast();

  const cargar = useCallback(async () => {
    try {
      setRows(await eventosService.listar());
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const eventos = useMemo(() => eventosAFranjas(rows), [rows]);

  const delDia = useMemo(() => {
    const dia = fecha.toDateString();
    return eventos.filter((e) => e.date.toDateString() === dia).map((e) => e.data);
  }, [eventos, fecha]);

  const abrir = (ev = null) => {
    setEditando(ev);
    if (ev) {
      setForm({ ...VACIO, ...ev, INICIO: aInputLocal(ev.INICIO), FIN: aInputLocal(ev.FIN), DESCRIPCION: ev.DESCRIPCION || '', TODO_EL_DIA: Boolean(ev.TODO_EL_DIA) });
    } else {
      const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), Math.max(new Date().getHours() + 1, HORA_INICIO));
      setForm({ ...VACIO, INICIO: aInputLocal(inicio), FIN: aInputLocal(new Date(inicio.getTime() + 3600e3)) });
    }
    setModal(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const body = {
        TITULO: form.TITULO.trim(),
        DESCRIPCION: form.DESCRIPCION || null,
        INICIO: new Date(form.INICIO).toISOString(),
        FIN: new Date(form.FIN).toISOString(),
        TODO_EL_DIA: form.TODO_EL_DIA,
        COLOR: form.COLOR,
      };
      if (editando) await eventosService.actualizar(editando.ID_EVENTO, body);
      else await eventosService.crear(body);
      setModal(false);
      avisar(editando ? 'Evento actualizado' : 'Evento creado');
      cargar();
    } catch (e) {
      avisar(e.message, true);
    } finally { setGuardando(false); }
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar "${editando.TITULO}"?`)) return;
    try {
      await eventosService.eliminar(editando.ID_EVENTO);
      setModal(false);
      avisar('Evento eliminado');
      cargar();
    } catch (e) { avisar(e.message, true); }
  };

  const set = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={CalendarDays} title="Calendario">
        <Button onClick={() => abrir()}><Plus size={15} /> Nuevo evento</Button>
      </PageHeader>

      <ErrorAlert>{error}</ErrorAlert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <Calendar
            customBlocks={FRANJAS}
            startHour={HORA_INICIO}
            events={eventos}
            selectedDate={fecha}
            onDateSelect={setFecha}
            onEventClick={(ev) => abrir(ev.data)}
            initialView="week"
          />
        </div>

        <Card className="p-4 h-fit">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 first-letter:uppercase">
            {fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {delDia.length === 0 ? (
            <p className="text-sm text-slate-400">Sin eventos este día.</p>
          ) : (
            <ul className="space-y-2">
              {delDia.map((ev) => (
                <li key={ev.ID_EVENTO}>
                  <button onClick={() => abrir(ev)} className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 flex gap-2">
                    <span className="w-1 rounded-full shrink-0" style={{ backgroundColor: ev.COLOR || '#2563eb' }} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{ev.TITULO}</span>
                      <span className="block text-xs text-slate-500">
                        {ev.TODO_EL_DIA ? 'Todo el día' : `${formatFechaHora(ev.INICIO)} – ${formatFechaHora(ev.FIN)}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar evento' : 'Nuevo evento'}>
        <div className="space-y-3">
          <Field label="Título" required>
            <Input value={form.TITULO} onChange={set('TITULO')} autoFocus />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Inicio" required>
              <Input type="datetime-local" value={form.INICIO} onChange={set('INICIO')} />
            </Field>
            <Field label="Fin" required>
              <Input type="datetime-local" value={form.FIN} onChange={set('FIN')} />
            </Field>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="w-4 h-4" checked={form.TODO_EL_DIA} onChange={set('TODO_EL_DIA')} />
              Todo el día
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              Color
              <input type="color" className="w-10 h-8 border border-slate-200 dark:border-slate-700 rounded cursor-pointer" value={form.COLOR || '#2563eb'} onChange={set('COLOR')} />
            </label>
          </div>
          <Field label="Descripción">
            <Textarea rows={2} value={form.DESCRIPCION} onChange={set('DESCRIPCION')} />
          </Field>
          <div className="flex items-center justify-between gap-2 pt-2">
            {editando ? (
              <Button variant="ghost" className="text-red-600" onClick={eliminar}><Trash2 size={14} /> Eliminar</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
              <Button onClick={guardar} disabled={guardando || !form.TITULO.trim() || !form.INICIO || !form.FIN}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default Calendario;
