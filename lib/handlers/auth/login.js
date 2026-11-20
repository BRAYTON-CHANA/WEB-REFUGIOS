import DatabaseManager from '../../database/DatabaseManager.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { soloMetodo } from '../../shared/http.js';

/** Roles activos de un usuario, del más alto al más bajo */
export async function rolesDeUsuario(idUsuario) {
  return DatabaseManager.query(
    `SELECT r."ID_ROL" AS "id_rol", r."NOMBRE_ROL" AS "nombre", r."NIVEL_ACCESO" AS "nivel", r."ES_SISTEMA" AS "es_sistema"
     FROM "USUARIO_ROL" ur
     JOIN "ROLES" r ON r."ID_ROL" = ur."ID_ROL"
     WHERE ur."ID_USUARIO" = ? AND r."ACTIVO" = ?
     ORDER BY r."NIVEL_ACCESO" DESC`,
    idUsuario, true
  );
}

/** POST { usuario, password } — `usuario` puede ser el nombre de usuario o el email */
export default async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;

  const usuario = String(req.body?.usuario || '').trim();
  const password = req.body?.password;
  if (!usuario || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son obligatorios' });
  }

  try {
    const [user] = await DatabaseManager.query(
      `SELECT "ID_USUARIO", "USUARIO", "NOMBRES", "APELLIDOS", "EMAIL", "PASSWORD_HASH", "REQUIERE_CAMBIO_PASSWORD"
       FROM "USUARIOS"
       WHERE ("USUARIO" = ? OR "EMAIL" = ?) AND "ACTIVO" = ?`,
      usuario, usuario, true
    );

    // Mismo mensaje para usuario inexistente y clave incorrecta
    const ok = user?.PASSWORD_HASH && await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }

    const roles = await rolesDeUsuario(user.ID_USUARIO);

    const token = jwt.sign(
      {
        id_usuario: user.ID_USUARIO,
        usuario: user.USUARIO,
        nombres: user.NOMBRES,
        apellidos: user.APELLIDOS,
        roles: roles.map((r) => r.nombre),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id_usuario: user.ID_USUARIO,
          usuario: user.USUARIO,
          nombres: user.NOMBRES,
          apellidos: user.APELLIDOS,
          email: user.EMAIL,
          roles,
          requiereCambioPassword: Boolean(user.REQUIERE_CAMBIO_PASSWORD),
        },
      },
    });
  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
