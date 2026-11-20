import DatabaseManager from '../../database/DatabaseManager.js';
import bcrypt from 'bcryptjs';
import { withAdmin } from '../../middleware/auth.js';
import { soloMetodo } from '../../shared/http.js';
import { validarPassword } from './cambiar-password.js';

/**
 * POST { usuario, nombres, apellidos?, email?, password, id_roles? } — solo admin.
 * El usuario creado debe cambiar la clave al entrar.
 */
async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;

  const { nombres, apellidos, email, password, id_roles } = req.body || {};
  const usuario = String(req.body?.usuario || '').trim();

  if (!usuario || !nombres || !password) {
    return res.status(400).json({ success: false, message: 'Usuario, nombres y contraseña son obligatorios' });
  }
  const errorClave = validarPassword(password, usuario);
  if (errorClave) return res.status(400).json({ success: false, message: errorClave });

  try {
    const existing = await DatabaseManager.query(
      'SELECT "ID_USUARIO" FROM "USUARIOS" WHERE "USUARIO" = ? OR ("EMAIL" IS NOT NULL AND "EMAIL" = ?)',
      usuario, email || null
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese nombre o email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rolesList = Array.isArray(id_roles) ? id_roles.map(Number).filter(Boolean) : [];

    const idUsuario = await DatabaseManager.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO "USUARIOS" ("USUARIO", "NOMBRES", "APELLIDOS", "EMAIL", "PASSWORD_HASH", "ACTIVO", "REQUIERE_CAMBIO_PASSWORD")
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [usuario, nombres, apellidos || null, email || null, passwordHash, true, true]
      );
      const { rows } = await tx.run('SELECT "ID_USUARIO" FROM "USUARIOS" WHERE "USUARIO" = ?', [usuario]);
      const id = rows[0]?.ID_USUARIO;
      if (!id) throw new Error('No se pudo registrar el usuario');

      for (const idRol of rolesList) {
        await tx.run(
          'INSERT INTO "USUARIO_ROL" ("ID_USUARIO", "ID_ROL", "ASIGNADO_POR") VALUES (?, ?, ?)',
          [id, idRol, req.user.id_usuario]
        );
      }
      return id;
    });

    res.json({ success: true, data: { id_usuario: idUsuario } });
  } catch (error) {
    console.error('[auth/register] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export default withAdmin(handler);
