import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react';
import { db } from '@/shared/api';
import { authService } from '@/features/login';
import { useAuthContext } from '@/shared/context/AuthContext';
import {
  Modal, Spinner, EmptyState, Badge, Button, Field, Input, ErrorAlert, PageHeader, Table, Tr, Td, IconButton,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';

// Nunca traer PASSWORD_HASH al navegador
const CAMPOS_USUARIO = ['ID_USUARIO', 'USUARIO', 'NOMBRES', 'APELLIDOS', 'EMAIL', 'ACTIVO', 'REQUIERE_CAMBIO_PASSWORD'];

const COLUMNAS = [
  { label: 'Usuario' }, { label: 'Nombre' }, { label: 'Email', className: 'hidden md:table-cell' },
  { label: 'Roles' }, { label: 'Estado' }, { label: 'Acciones', className: 'text-right' },
];

const Usuarios = () => {
  const { user: yo } = useAuthContext();
  const [rows, setRows] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [rolesSel, setRolesSel] = useState(new Set());
  const [guardando, setGuardando] = useState(false);
  const [temporal, setTemporal] = useState(null); // { usuario, clave } tras restablecer
  const { toast, avisar } = useToast();

  const cargar = useCallback(async () => {
    try {
      const [usuarios, asignaciones, todosRoles] = await Promise.all([
        db.selectWithOrderBy('USUARIOS', 'NOMBRES', 'ASC', {}, CAMPOS_USUARIO),
        db.select('USUARIO_ROL', {}, ['ID_USUARIO', 'ID_ROL']),
        db.select('ROLES'),
      ]);
      const nombreRol = Object.fromEntries(todosRoles.map((r) => [r.ID_ROL, r.NOMBRE_ROL]));
      setRows(usuarios.map((u) => ({
        ...u,
        ROLES: asignaciones.filter((a) => a.ID_USUARIO === u.ID_USUARIO).map((a) => nombreRol[a.ID_ROL]).filter(Boolean),
      })));
      setRoles(todosRoles.filter((r) => r.ACTIVO));
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));

  const abrir = async (row = null) => {
    setEditando(row);
    setForm(row
      ? { usuario: row.USUARIO, nombres: row.NOMBRES, apellidos: row.APELLIDOS || '', email: row.EMAIL || '' }
      : {});
    setRolesSel(new Set());
    if (row) {
      try {
        const ur = await db.select('USUARIO_ROL', { ID_USUARIO: row.ID_USUARIO });
        setRolesSel(new Set(ur.map((r) => r.ID_ROL)));
      } catch { /* sin roles */ }
    }
    setModal(true);
  };

  const toggleRol = (id) => {
    const s = new Set(rolesSel);
    if (s.has(id)) s.delete(id); else s.add(id);
    setRolesSel(s);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      if (editando) {
        await db.update('USUARIOS', editando.ID_USUARIO, {
          NOMBRES: form.nombres,
          APELLIDOS: form.apellidos || null,
          EMAIL: form.email || null,
          FECHA_EDICION: new Date().toISOString(),
        }, 'ID_USUARIO');
        // Sincronizar roles
        const actuales = await db.select('USUARIO_ROL', { ID_USUARIO: editando.ID_USUARIO });
        for (const ur of actuales) {
          if (!rolesSel.has(ur.ID_ROL)) await db.delete('USUARIO_ROL', ur.ID_USUARIO_ROL, 'ID_USUARIO_ROL');
        }
        for (const idRol of rolesSel) {
          if (!actuales.some((ur) => ur.ID_ROL === idRol)) {
            await db.insert('USUARIO_ROL', { ID_USUARIO: editando.ID_USUARIO, ID_ROL: idRol, ASIGNADO_POR: yo?.id_usuario });
          }
        }
        avisar('Usuario actualizado');
      } else {
        await authService.register({
          usuario: form.usuario?.trim(),
          nombres: form.nombres,
          apellidos: form.apellidos,
          email: form.email,
          password: form.password,
          id_roles: [...rolesSel],
        });
        avisar('Usuario creado — deberá cambiar su clave al entrar');
      }
      setModal(false);
      cargar();
    } catch (e) {
      avisar(e.message, true);
    } finally { setGuardando(false); }
  };

  const toggleActivo = async (row) => {
    if (row.ID_USUARIO === yo?.id_usuario) return avisar('No puedes desactivar tu propio usuario', true);
    try {
      await db.update('USUARIOS', row.ID_USUARIO, { ACTIVO: !row.ACTIVO }, 'ID_USUARIO');
      cargar();
    } catch (e) { avisar(e.message, true); }
  };

  const resetClave = async (row) => {
    if (!window.confirm(`¿Restablecer la clave de ${row.USUARIO}? Se generará una clave temporal.`)) return;
    try {
      const { passwordTemporal } = await authService.resetPasswordAdmin(row.ID_USUARIO);
      setTemporal({ usuario: row.USUARIO, clave: passwordTemporal });
      cargar();
    } catch (e) { avisar(e.message, true); }
  };

  const puedeGuardar = form.nombres && (editando || (form.usuario?.trim() && (form.password || '').length >= 8));

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={Users} title="Usuarios">
        <Button onClick={() => abrir()}><Plus size={15} /> Nuevo usuario</Button>
      </PageHeader>

      <ErrorAlert>{error}</ErrorAlert>

      {rows === null ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Sin usuarios" />
      ) : (
        <Table columns={COLUMNAS}>
          {rows.map((u) => (
            <Tr key={u.ID_USUARIO} inactivo={!u.ACTIVO}>
              <Td className="font-mono text-xs">{u.USUARIO}</Td>
              <Td>
                <span className="font-medium">{u.NOMBRES} {u.APELLIDOS || ''}</span>
                {u.REQUIERE_CAMBIO_PASSWORD ? <span className="block text-[10px] text-amber-600">Debe cambiar clave</span> : null}
              </Td>
              <Td className="hidden md:table-cell text-slate-500">{u.EMAIL || '—'}</Td>
              <Td>
                {u.ROLES.length
                  ? u.ROLES.map((r) => <Badge key={r} color={r === 'admin' ? '#dc2626' : '#2563eb'}>{r}</Badge>)
                  : <span className="text-slate-400 text-xs">sin rol</span>}
              </Td>
              <Td><Badge color={u.ACTIVO ? '#16a34a' : '#64748b'}>{u.ACTIVO ? 'Activo' : 'Inactivo'}</Badge></Td>
              <Td className="text-right whitespace-nowrap">
                <IconButton title="Editar" onClick={() => abrir(u)}><Pencil size={14} /></IconButton>
                <IconButton title="Restablecer clave" className="hover:text-amber-600" onClick={() => resetClave(u)}><KeyRound size={14} /></IconButton>
                <IconButton title={u.ACTIVO ? 'Desactivar' : 'Activar'} className="hover:text-amber-600" onClick={() => toggleActivo(u)}>
                  {u.ACTIVO ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} />}
                </IconButton>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar usuario' : 'Nuevo usuario'}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Usuario" required>
              <Input value={form.usuario || ''} disabled={Boolean(editando)} onChange={set('usuario')} placeholder="jperez" autoComplete="off" />
            </Field>
            {!editando && (
              <Field label="Clave inicial" required help="Mínimo 8 caracteres">
                <Input type="password" value={form.password || ''} onChange={set('password')} autoComplete="new-password" />
              </Field>
            )}
            <Field label="Nombres" required>
              <Input value={form.nombres || ''} onChange={set('nombres')} />
            </Field>
            <Field label="Apellidos">
              <Input value={form.apellidos || ''} onChange={set('apellidos')} />
            </Field>
          </div>
          <Field label="Email">
            <Input type="email" value={form.email || ''} onChange={set('email')} />
          </Field>
          <Field label="Roles">
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <label key={r.ID_ROL} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer ${
                  rolesSel.has(r.ID_ROL)
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}>
                  <input type="checkbox" className="hidden" checked={rolesSel.has(r.ID_ROL)} onChange={() => toggleRol(r.ID_ROL)} />
                  {r.NOMBRE_ROL}
                </label>
              ))}
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando || !puedeGuardar}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(temporal)} onClose={() => setTemporal(null)} title="Clave temporal">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Entrégale esta clave a <strong>{temporal?.usuario}</strong>. Se muestra una sola vez y deberá cambiarla al entrar.
        </p>
        <p className="font-mono text-lg text-center bg-slate-100 dark:bg-slate-900 rounded-xl py-3 select-all">{temporal?.clave}</p>
        <div className="flex justify-end pt-4"><Button onClick={() => setTemporal(null)}>Listo</Button></div>
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default Usuarios;
