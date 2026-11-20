import DatabaseManager, { DB_CLIENT } from '../lib/database/DatabaseManager.js';
import { cors, soloMetodo } from '../lib/shared/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (!soloMetodo(req, res, 'GET', 'POST')) return;

  try {
    await DatabaseManager.query('SELECT 1 AS "STATUS"');
    res.json({ success: true, status: 'ok', database: DB_CLIENT, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[health] Error:', error.message);
    res.status(500).json({ success: false, status: 'error', database: DB_CLIENT, message: error.message });
  }
}
