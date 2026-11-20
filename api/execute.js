import DatabaseManager from '../lib/database/DatabaseManager.js';
import { withAuth } from '../lib/middleware/auth.js';
import { cors, soloMetodo, esAdmin } from '../lib/shared/http.js';
import { LECTURA_USUARIO, ALTA_USUARIO, ACCIONES_LECTURA } from '../lib/config/permisos.js';

/**
 * CRUD genérico: POST { functionName, params } → DatabaseManager[functionName].
 * Admin: cualquier método (incluido SQL libre con query/rawSelect).
 * Resto: solo lo que permite lib/config/permisos.js.
 */
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Métodos internos que nunca se exponen
const BLOQUEADOS = new Set(['connect', 'close', 'transaction', 'loadDriver', 'assertIdent', 'buildWhere']);

/** null si está permitido; mensaje de rechazo en caso contrario */
function rechazoUsuario(functionName, params) {
  const tabla = String(params.table || '');
  if (!IDENT.test(tabla)) return 'Parámetros no válidos';
  if (ACCIONES_LECTURA.has(functionName) && LECTURA_USUARIO.has(tabla.toUpperCase())) return null;
  if (functionName === 'insert' && ALTA_USUARIO.has(tabla.toUpperCase())) return null;
  return 'Operación permitida solo para administración';
}

async function handler(req, res) {
  if (cors(req, res)) return;
  if (!soloMetodo(req, res, 'POST')) return;

  const { functionName } = req.body || {};
  const params = req.body?.params || {};

  try {
    const func = typeof functionName === 'string' && /^[A-Za-z_]+$/.test(functionName) && !BLOQUEADOS.has(functionName)
      ? DatabaseManager[functionName]
      : null;
    if (typeof func !== 'function') {
      return res.status(400).json({ success: false, message: `Función ${functionName} no existe` });
    }

    if (!esAdmin(req.user)) {
      const motivo = rechazoUsuario(functionName, params);
      if (motivo) return res.status(403).json({ success: false, message: motivo });
    }

    // Filtros en array solo con '=' → objeto plano
    if (Array.isArray(params.filters) && params.filters.every((f) => f.op === '=' || f.op === undefined)) {
      params.filters = Object.fromEntries(params.filters.map((f) => [f.field, f.value]));
    }

    // query/rawSelect: { sql, params: [...] } → (sql, ...params)
    const args = (functionName === 'rawSelect' || functionName === 'query') && Array.isArray(params.params)
      ? [params.sql, ...params.params]
      : Object.values(params);

    const result = await func(...args);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(`[execute] Error en ${functionName}:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}

export default withAuth(handler);
