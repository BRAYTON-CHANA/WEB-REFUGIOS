import { apiFetch } from '@/shared/api/apiFetch';

export const authService = {
  /** usuario = nombre de usuario o email */
  login: (usuario, password) => apiFetch('/auth/login', { method: 'POST', body: { usuario, password } }),

  verify: () => apiFetch('/auth/verify'),

  /** Solo admin: { usuario, nombres, apellidos?, email?, password, id_roles? } */
  register: (userData) => apiFetch('/auth/register', { method: 'POST', body: userData }),

  /** Clave del usuario en sesión; passwordActual no se pide si el cambio es obligatorio */
  changePassword: (passwordActual, newPassword) =>
    apiFetch('/auth/cambiar-password', { method: 'POST', body: { passwordActual, newPassword } }),

  /** Solo admin: devuelve { passwordTemporal } */
  resetPasswordAdmin: (idUsuario) =>
    apiFetch('/auth/reset-password-admin', { method: 'POST', body: { id_usuario: idUsuario } }),
};
