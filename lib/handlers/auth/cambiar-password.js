import DatabaseManager from '../../database/DatabaseManager.js';
import bcrypt from 'bcryptjs';
import { withAuth } from '../../middleware/auth.js';
import { soloMetodo } from '../../shared/http.js';

/** null si la clave sirve; mensaje de error en caso contrario */
export function validarPassword(password, usuario) {
  if (typeof password !== 'string' || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (usuario && password.toLowerCase() === String(usuario).toLowerCase()) return 'La contraseña no puede ser igual al usuario';
  return null;
}

/**
 * POST { passwordActual?, newPassword } — cambia la clave del usuario del token.
 * Pide la clave actual salvo cuando el cambio es obligatorio (primer ingreso
 * o tras un reseteo del admin).
 */
async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;

  const { passwordActual, newPassword } = req.body || {};
  const errorClave = validarPassword(newPassword, req.user.usuario);
  if (errorClave) return res.status(400).json({ success: false, message: errorClave });

  try {
    const user = await DatabaseManager.getById('USUARIOS', req.user.id_usuario, 'ID_USUARIO');
    if (!user || !user.ACTIVO) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    if (!user.REQUIERE_CAMBIO_PASSWORD) {
      const ok = passwordActual && await bcrypt.compare(passwordActual, user.PASSWORD_HASH || '');
      if (!ok) return res.status(400).json({ success: false, message: 'La contraseña actual no es correcta' });
    }

    await DatabaseManager.update('USUARIOS', user.ID_USUARIO, {
      PASSWORD_HASH: await bcrypt.hash(newPassword, 10),
      REQUIERE_CAMBIO_PASSWORD: false,
      FECHA_EDICION: new Date(),
    }, 'ID_USUARIO');

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('[auth/cambiar-password] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export default withAuth(handler);
