import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { esAdmin } from '../shared/http.js';

export function verifyToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('No token provided');
    error.code = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const error = new Error('Token inválido o expirado');
    error.code = 401;
    throw error;
  }
}

/** Exige JWT válido; deja el payload en req.user */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      req.user = verifyToken(req);
    } catch (error) {
      return res.status(error.code || 401).json({ success: false, message: error.message });
    }
    return handler(req, res);
  };
}

/** Exige JWT válido con rol admin */
export function withAdmin(handler) {
  return withAuth((req, res) => {
    if (!esAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo para administración' });
    }
    return handler(req, res);
  });
}
