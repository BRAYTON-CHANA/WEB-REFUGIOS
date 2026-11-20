/**
 * Utilidades comunes de los handlers (req, res) estilo Vercel.
 */

/** Cabeceras CORS. Devuelve true si era un preflight OPTIONS (ya respondido). */
export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/** Responde 405 y devuelve false si el método no está permitido */
export function soloMetodo(req, res, ...metodos) {
  if (metodos.includes(req.method)) return true;
  res.status(405).json({ success: false, message: 'Método no permitido' });
  return false;
}

/**
 * Segmentos de ruta de un catch-all `[...path].js`.
 * Vercel los pasa en req.query['...path']; en Express (app.use) req.url ya
 * viene sin el prefijo montado.
 */
export function parseSegments(req) {
  const raw = req.query?.['...path'] ?? req.query?.path;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw) return raw.split('/').filter(Boolean);
  return (req.url || '').split('?')[0].split('/').filter(Boolean);
}

export function esAdmin(user) {
  return Array.isArray(user?.roles) && user.roles.includes('admin');
}

/** true si el usuario tiene alguno de los roles (admin siempre pasa) */
export function tieneRol(user, ...roles) {
  return esAdmin(user) || (Array.isArray(user?.roles) && roles.some((r) => user.roles.includes(r)));
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.socket?.remoteAddress || null;
}
