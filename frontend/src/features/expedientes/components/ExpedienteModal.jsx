import { useState, useEffect } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { Modal, Button, Field, Input, Select, Textarea, ErrorAlert, IconButton } from '@/shared/components/ui';
import { expedientesService } from '../services/expedientesService';
import { TRAMITES, edad } from '../utils/personas';

const hoy = () => new Date().toISOString().slice(0, 10);

const personaVacia = (idParentesco = '') => ({
  ID_PERSONA: null, ID_PARENTESCO: idParentesco, APELLIDO_PATERNO: '', APELLIDO_MATERNO: '', NOMBRES: '',
  SEXO: '', ID_NACIONALIDAD: '', FECHA_NACIMIENTO: '', ID_TIPO_DOCUMENTO: '', NRO_DOCUMENTO: '',
});

const aFormulario = (exp, cat) => {
  const titular = cat.parentescos.find((p) => p.ES_TITULAR)?.ID_PARENTESCO ?? '';
  if (!exp) {
    return {
      NRO_EXPEDIENTE: '', ID_ORIGEN: cat.origenes[0]?.ID_ORIGEN ?? '', FECHA_SOLICITUD: hoy(),
      TIPO_TRAMITE: 'SOLICITUD', URL_PDF: '', OBSERVACIONES: '',
      personas: [personaVacia(titular)],
    };
  }
  const v = (x) => x ?? '';
  return {
    NRO_EXPEDIENTE: v(exp.NRO_EXPEDIENTE), ID_ORIGEN: exp.ID_ORIGEN, FECHA_SOLICITUD: v(exp.FECHA_SOLICITUD),
    TIPO_TRAMITE: exp.TIPO_TRAMITE, URL_PDF: v(exp.URL_PDF), OBSERVACIONES: v(exp.OBSERVACIONES),
    personas: exp.PERSONAS.map((p) => ({
      ID_PERSONA: p.ID_PERSONA, ID_PARENTESCO: p.ID_PARENTESCO, APELLIDO_PATERNO: v(p.APELLIDO_PATERNO),
      APELLIDO_MATERNO: v(p.APELLIDO_MATERNO), NOMBRES: v(p.NOMBRES), SEXO: v(p.SEXO),
      ID_NACIONALIDAD: v(p.ID_NACIONALIDAD), FECHA_NACIMIENTO: v(p.FECHA_NACIMIENTO),
      ID_TIPO_DOCUMENTO: v(p.ID_TIPO_DOCUMENTO), NRO_DOCUMENTO: v(p.NRO_DOCUMENTO),
    })),
  };
};

/** Alta/edición de un expediente con su grupo familiar (titular + familiares) */
const ExpedienteModal = ({ open, expediente, catalogos, onClose, onGuardado }) => {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open && catalogos) {
      setForm(aFormulario(expediente, catalogos));
      setError(null);
    }
  }, [open, expediente, catalogos]);

  if (!open || !form) return null;

  const idTitular = catalogos.parentescos.find((p) => p.ES_TITULAR)?.ID_PARENTESCO;
  const idFamiliar = catalogos.parentescos.find((p) => !p.ES_TITULAR)?.ID_PARENTESCO ?? '';
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const setPersona = (i, campo) => (e) => setForm((f) => ({
    ...f, personas: f.personas.map((p, j) => (j === i ? { ...p, [campo]: e.target.value } : p)),
  }));
  const agregar = () => setForm((f) => ({ ...f, personas: [...f.personas, personaVacia(idFamiliar)] }));
  const quitar = (i) => setForm((f) => ({ ...f, personas: f.personas.filter((_, j) => j !== i) }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const guardado = expediente
        ? await expedientesService.actualizar(expediente.ID_EXPEDIENTE, form)
        : await expedientesService.crear(form);
      onGuardado(guardado);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} wide title={expediente ? 'Editar expediente' : 'Nuevo expediente'}>
      <form onSubmit={guardar} className="space-y-5">
        <ErrorAlert>{error}</ErrorAlert>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nº de expediente (Q2)" help="Vacío si aún no tiene número">
            <Input value={form.NRO_EXPEDIENTE} onChange={set('NRO_EXPEDIENTE')} maxLength={30} />
          </Field>
          <Field label="Fecha de solicitud" required>
            <Input type="date" value={form.FECHA_SOLICITUD} onChange={set('FECHA_SOLICITUD')} required />
          </Field>
          <Field label="Origen / ODE" required>
            <Select value={form.ID_ORIGEN} onChange={set('ID_ORIGEN')} required>
              <option value="">Elegir…</option>
              {catalogos.origenes.map((o) => <option key={o.ID_ORIGEN} value={o.ID_ORIGEN}>{o.NOMBRE}</option>)}
            </Select>
          </Field>
          <Field label="Trámite" required>
            <Select value={form.TIPO_TRAMITE} onChange={set('TIPO_TRAMITE')}>
              {TRAMITES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Acceso digital (enlace al PDF)">
              <Input type="url" value={form.URL_PDF} onChange={set('URL_PDF')} placeholder="https://…" maxLength={500} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observaciones">
              <Textarea value={form.OBSERVACIONES} onChange={set('OBSERVACIONES')} rows={2} maxLength={1000} />
            </Field>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Grupo familiar ({form.personas.length})
            </h4>
            <Button type="button" size="sm" variant="secondary" onClick={agregar}><Plus size={14} /> Familiar</Button>
          </div>

          <div className="space-y-3">
            {form.personas.map((p, i) => {
              const esTitular = String(p.ID_PARENTESCO) === String(idTitular);
              const años = edad(p.FECHA_NACIMIENTO);
              return (
                <div
                  key={p.ID_PERSONA ?? `n${i}`}
                  className={`rounded-xl border p-3 ${esTitular
                    ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      {esTitular && <Star size={12} className="text-blue-600" />}
                      Persona {i + 1}{años != null ? ` · ${años} años` : ''}
                    </span>
                    {form.personas.length > 1 && (
                      <IconButton type="button" title="Quitar" onClick={() => quitar(i)} className="hover:text-red-600">
                        <Trash2 size={15} />
                      </IconButton>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Field label="Parentesco" required>
                      <Select value={p.ID_PARENTESCO} onChange={setPersona(i, 'ID_PARENTESCO')} required>
                        <option value="">Elegir…</option>
                        {catalogos.parentescos.map((x) => <option key={x.ID_PARENTESCO} value={x.ID_PARENTESCO}>{x.NOMBRE}</option>)}
                      </Select>
                    </Field>
                    <Field label="Apellido paterno">
                      <Input value={p.APELLIDO_PATERNO} onChange={setPersona(i, 'APELLIDO_PATERNO')} maxLength={80} />
                    </Field>
                    <Field label="Apellido materno">
                      <Input value={p.APELLIDO_MATERNO} onChange={setPersona(i, 'APELLIDO_MATERNO')} maxLength={80} />
                    </Field>
                    <Field label="Nombres" required>
                      <Input value={p.NOMBRES} onChange={setPersona(i, 'NOMBRES')} required maxLength={120} />
                    </Field>
                    <Field label="Sexo">
                      <Select value={p.SEXO} onChange={setPersona(i, 'SEXO')}>
                        <option value="">—</option>
                        <option value="F">Femenino</option>
                        <option value="M">Masculino</option>
                      </Select>
                    </Field>
                    <Field label="Fecha de nacimiento">
                      <Input type="date" value={p.FECHA_NACIMIENTO} onChange={setPersona(i, 'FECHA_NACIMIENTO')} max={hoy()} />
                    </Field>
                    <Field label="Nacionalidad">
                      <Select value={p.ID_NACIONALIDAD} onChange={setPersona(i, 'ID_NACIONALIDAD')}>
                        <option value="">—</option>
                        {catalogos.nacionalidades.map((x) => <option key={x.ID_NACIONALIDAD} value={x.ID_NACIONALIDAD}>{x.NOMBRE}</option>)}
                      </Select>
                    </Field>
                    <Field label="Tipo de documento">
                      <Select value={p.ID_TIPO_DOCUMENTO} onChange={setPersona(i, 'ID_TIPO_DOCUMENTO')}>
                        <option value="">—</option>
                        {catalogos.tiposDocumento.map((x) => <option key={x.ID_TIPO_DOCUMENTO} value={x.ID_TIPO_DOCUMENTO}>{x.NOMBRE}</option>)}
                      </Select>
                    </Field>
                    <Field label="Nº de documento" help="Tal cual: con ceros o letras">
                      <Input value={p.NRO_DOCUMENTO} onChange={setPersona(i, 'NRO_DOCUMENTO')} maxLength={30} className="font-mono" />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ExpedienteModal;
