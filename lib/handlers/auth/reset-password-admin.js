import DatabaseManager from '../../database/DatabaseManager.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { withAdmin } from '../../middleware/auth.js';
import { soloMetodo } from '../../shared/http.js';

/**
 * POST { id_usuario } — solo admin. Genera una clave temporal, la devuelve
 * una sola vez y obliga a cambiarla en el próximo ingreso.
 */
async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;

  const idUsuario = Number(req.body?.id_usuario);
  if (!idUsuario) return res.status(400).json({ success: false, message: 'id_usuario es obligatorio' });

  try {
    const user = await DatabaseManager.getById('USUARIOS', idUsuario, 'ID_USUARIO');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const temporal = crypto.randomBytes(6).toString('base64url');
    await DatabaseManager.update('USUARIOS', idUsuario, {
      PASSWORD_HASH: await bcrypt.hash(temporal, 10),
      REQUIERE_CAMBIO_PASSWORD: true,
      FECHA_EDICION: new Date(),
    }, 'ID_USUARIO');

    res.json({
      success: true,
      data: { passwordTemporal: temporal },
      message: `Clave temporal de ${user.USUARIO}: ${temporal}. Deberá cambiarla al entrar.`,
    });
  } catch (error) {
    console.error('[auth/reset-password-admin] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export default withAdmin(handler);
