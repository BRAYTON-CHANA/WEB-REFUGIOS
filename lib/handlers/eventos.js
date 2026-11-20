import DatabaseManager from '../database/DatabaseManager.js';
import { esAdmin } from '../shared/http.js';

/**
 * Eventos del calendario (ejemplo de endpoint dedicado con reglas propias):
 * cada usuario ve y edita solo sus eventos; el admin, todos.
 *
 *   GET    /api/eventos?desde=ISO&hasta=ISO
 *   POST   /api/eventos          { TITULO, INICIO, FIN, DESCRIPCION?, TODO_EL_DIA?, COLOR? }
 *   PUT    /api/eventos/:id      (mismos campos)
 *   DELETE /api/eventos/:id      (baja lógica: ACTIVO = false)
 */
const CAMPOS = ['TITULO', 'DESCRIPCION', 'INICIO', 'FIN', 'TODO_EL_DIA', 'COLOR'];

function leerEvento(body = {}) {
  const data = {};
  for (const c of CAMPOS) if (body[c] !== undefined) data[c] = body[c];
  if ('INICIO' in data) data.INICIO = new Date(data.INICIO);
  if ('FIN' in data) data.FIN = new Date(data.FIN);
  if ('TODO_EL_DIA' in data) data.TODO_EL_DIA = Boolean(data.TODO_EL_DIA);
  return data;
}

function validar(data, parcial = false) {
  if (!parcial || 'TITULO' in data) {
    if (!String(data.TITULO || '').trim()) return 'El título es obligatorio';
  }
  for (const c of ['INICIO', 'FIN']) {
    if ((!parcial || c in data) && Number.isNaN(data[c]?.getTime?.())) return `Fecha ${c.toLowerCase()} no válida`;
  }
  if (data.INICIO && data.FIN && data.FIN < data.INICIO) return 'El fin no puede ser antes del inicio';
  return null;
}

async function eventoEditable(user, id) {
  const ev = await DatabaseManager.getById('EVENTOS', id, 'ID_EVENTO');
  if (!ev || !ev.ACTIVO) return { error: 404, message: 'Evento no encontrado' };
  if (!esAdmin(user) && ev.ID_USUARIO !== user.id_usuario) return { error: 403, message: 'No puedes modificar este evento' };
  return { ev };
}

export default async function handler(req, res, segments) {
  const id = segments[0] ? Number(segments[0]) : null;

  try {
    if (req.method === 'GET' && !id) {
      const filtros = [{ field: 'ACTIVO', op: '=', value: true }];
      if (!esAdmin(req.user)) filtros.push({ field: 'ID_USUARIO', op: '=', value: req.user.id_usuario });
      if (req.query?.hasta) filtros.push({ field: 'INICIO', op: '<=', value: new Date(req.query.hasta) });
      if (req.query?.desde) filtros.push({ field: 'FIN', op: '>=', value: new Date(req.query.desde) });
      const rows = await DatabaseManager.selectWithOrderBy('EVENTOS', 'INICIO', 'ASC', filtros);
      return res.json({ success: true, data: rows });
    }

    if (req.method === 'POST' && !id) {
      const data = leerEvento(req.body);
      const error = validar(data);
      if (error) return res.status(400).json({ success: false, message: error });
      const [row] = await DatabaseManager.insert('EVENTOS', { ...data, ID_USUARIO: req.user.id_usuario, ACTIVO: true });
      return res.json({ success: true, data: row });
    }

    if (id && (req.method === 'PUT' || req.method === 'DELETE')) {
      const { error, message } = await eventoEditable(req.user, id);
      if (error) return res.status(error).json({ success: false, message });

      if (req.method === 'DELETE') {
        await DatabaseManager.update('EVENTOS', id, { ACTIVO: false }, 'ID_EVENTO');
        return res.json({ success: true });
      }
      const data = leerEvento(req.body);
      const msg = validar(data, true);
      if (msg) return res.status(400).json({ success: false, message: msg });
      const [row] = await DatabaseManager.update('EVENTOS', id, data, 'ID_EVENTO');
      return res.json({ success: true, data: row });
    }

    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
  } catch (error) {
    console.error('[eventos] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
