import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { db } from '@/shared/api';
import {
  Modal, Spinner, EmptyState, Badge, Button, Field, Input, Select, Textarea,
  ErrorAlert, PageHeader, Table, Tr, Td, IconButton,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';

/**
 * CRUD genérico por configuración (ver configs.js):
 * {
 *   table, pk, title,
 *   columns: [{ key, label, type?: 'badge'|'color', mono?, truncate?, render?(row) }],
 *   fields:  [{ name, label, type?: 'text'|'textarea'|'select'|'checkbox'|'number'|'date'|'color',
 *               required?, default?, placeholder?, help?, onlyCreate?, min?, max?,
 *               options?: [{ value, label }],
 *               optionsFrom?: { table, key, label, filters?: { COL: valor }, orderBy? } }],
 *   listQuery?: SQL (solo admin) para listar con JOINs,
 *   extraActions?: (row, recargar) => ReactNode,
 * }
 * Si la tabla tiene ACTIVO, la baja es lógica (activar/desactivar).
 */
const GenericCrud = ({ config }) => {
  const { table, pk, title, columns, fields, listQuery, extraActions } = config;
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null); // fila en edición o null = crear
  const [form, setForm] = useState({});
  const [opciones, setOpciones] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  const { toast, avisar } = useToast();
  const tieneActivo = fields.some((f) => f.name === 'ACTIVO');

  const cargar = useCallback(async () => {
    try {
      const data = listQuery
        ? await db.query(listQuery)
        : await db.select(table, tieneActivo && !verInactivos ? { ACTIVO: true } : {});
      setRows(listQuery && tieneActivo && !verInactivos ? data.filter((r) => r.ACTIVO) : data);
      setError(null);
    } catch (e) { setError(e.message); }
  }, [table, listQuery, verInactivos, tieneActivo]);

  useEffect(() => { setRows(null); cargar(); }, [cargar]);

  // Opciones de selects desde otras tablas
  useEffect(() => {
    const cargarOpciones = async () => {
      const nuevo = {};
      for (const f of fields) {
        if (f.type !== 'select' || !f.optionsFrom) continue;
        const { table: t, key, label, filters, orderBy } = f.optionsFrom;
        try {
          const data = await db.selectWithOrderBy(t, orderBy || label, 'ASC', filters || {}, [key, label]);
          nuevo[f.name] = data.map((r) => ({ value: r[key], label: r[label] }));
        } catch { nuevo[f.name] = []; }
      }
      setOpciones(nuevo);
    };
    cargarOpciones();
  }, [fields]);

  const abrir = (row = null) => {
    setEditando(row);
    const base = {};
    for (const f of fields) base[f.name] = row ? (row[f.name] ?? '') : (f.default ?? '');
    setForm(base);
    setModal(true);
  };

  const guardar = async () => {
    const faltantes = fields.filter((f) => f.required && (form[f.name] === '' || form[f.name] == null));
    if (faltantes.length) return avisar(`Falta: ${faltantes.map((f) => f.label).join(', ')}`, true);

    setGuardando(true);
    try {
      const payload = {};
      for (const f of fields) {
        if (f.onlyCreate && editando) continue;
        let v = form[f.name];
        if (v === '') v = null;
        if (f.type === 'number' && v != null) v = Number(v);
        if (f.type === 'checkbox') v = Boolean(v);
        payload[f.name] = v;
      }
      if (editando) {
        await db.update(table, editando[pk], payload, pk);
        avisar('Registro actualizado');
      } else {
        await db.insert(table, payload);
        avisar('Registro creado');
      }
      setModal(false);
      cargar();
    } catch (e) {
      avisar(e.message, true);
    } finally { setGuardando(false); }
  };

  const toggleActivo = async (row) => {
    try {
      await db.update(table, row[pk], { ACTIVO: !row.ACTIVO }, pk);
      cargar();
    } catch (e) { avisar(e.message, true); }
  };

  const renderCell = (row, col) => {
    const v = col.render ? col.render(row) : row[col.key];
    if (col.type === 'badge') return <Badge color={v ? '#16a34a' : '#64748b'}>{v ? 'Activo' : 'Inactivo'}</Badge>;
    if (col.type === 'color' && v) {
      return <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: v }} /> {v}</span>;
    }
    return v ?? '—';
  };

  const renderControl = (f) => {
    const val = form[f.name];
    const setV = (v) => setForm((prev) => ({ ...prev, [f.name]: v }));
    switch (f.type) {
      case 'textarea':
        return <Textarea rows={f.rows || 2} value={val ?? ''} onChange={(e) => setV(e.target.value)} />;
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 text-sm text-grafito">
            <input type="checkbox" className="w-4 h-4" checked={Boolean(val)} onChange={(e) => setV(e.target.checked)} />
            {f.checkLabel || 'Sí'}
          </label>
        );
      case 'select':
        return (
          <Select value={val ?? ''} onChange={(e) => setV(e.target.value === '' ? null : e.target.value)}>
            <option value="">—</option>
            {(f.options || opciones[f.name] || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        );
      case 'date':
        return <Input type="date" value={val ? String(val).slice(0, 10) : ''} onChange={(e) => setV(e.target.value)} />;
      case 'number':
        return <Input type="number" value={val ?? ''} onChange={(e) => setV(e.target.value)} min={f.min} max={f.max} />;
      case 'color':
        return (
          <input type="color" className="w-16 h-9 border border-trazo rounded-md cursor-pointer"
            value={val || '#2563eb'} onChange={(e) => setV(e.target.value)} />
        );
      default:
        return <Input type={f.type || 'text'} value={val ?? ''} onChange={(e) => setV(e.target.value)} placeholder={f.placeholder} />;
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title={title}>
        {tieneActivo && (
          <label className="text-xs text-pizarra flex items-center gap-1.5">
            <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
            Ver inactivos
          </label>
        )}
        <Button onClick={() => abrir()}><Plus size={15} /> Nuevo</Button>
      </PageHeader>

      <ErrorAlert>{error}</ErrorAlert>

      {rows === null ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Plus} title={`Sin ${title.toLowerCase()}`} subtitle="Crea el primer registro con el botón Nuevo" />
      ) : (
        <Table columns={[...columns, { label: 'Acciones', className: 'text-right' }]}>
          {rows.map((row) => (
            <Tr key={row[pk]} inactivo={row.ACTIVO === false || row.ACTIVO === 0}>
              {columns.map((c) => (
                <Td key={c.key} className={`${c.mono ? 'font-mono text-xs' : ''} ${c.truncate ? 'truncate max-w-[240px]' : ''}`}>
                  {renderCell(row, c)}
                </Td>
              ))}
              <Td className="text-right whitespace-nowrap">
                {extraActions?.(row, cargar)}
                <IconButton title="Editar" onClick={() => abrir(row)}><Pencil size={14} /></IconButton>
                {row.ACTIVO !== undefined && (
                  <IconButton title={row.ACTIVO ? 'Desactivar' : 'Activar'} className="hover:text-amber-600" onClick={() => toggleActivo(row)}>
                    {row.ACTIVO ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} />}
                  </IconButton>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={`${editando ? 'Editar' : 'Nuevo'} — ${title}`}>
        <div className="space-y-3">
          {fields.map((f) => (f.onlyCreate && editando ? null : (
            <Field key={f.name} label={f.label} required={f.required} help={f.help}>{renderControl(f)}</Field>
          )))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default GenericCrud;
