import { verifyToken } from '../../middleware/auth.js';
import { soloMetodo } from '../../shared/http.js';

/** GET — devuelve el payload del JWT si es válido */
export default async function handler(req, res) {
  if (!soloMetodo(req, res, 'GET')) return;
  try {
    res.json({ success: true, data: verifyToken(req) });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
}
