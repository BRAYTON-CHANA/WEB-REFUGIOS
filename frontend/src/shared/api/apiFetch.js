import { API_BASE_URL } from '@/shared/config/api';
import { tokenUtils } from '@/shared/utils/tokenUtils';

/**
 * Wrapper de fetch para la API:
 * - Inyecta Authorization: Bearer <token> desde localStorage
 * - Parsea { success, data, message } y lanza Error unificado
 * - En 401 con sesión abierta limpia la sesión y redirige a /login
 */
export async function apiFetch(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = tokenUtils.getToken();

  const finalHeaders = { ...headers };
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
  });

  if (raw) return response;

  let result;
  try {
    result = await response.json();
  } catch {
    result = { success: false, message: `Error ${response.status}` };
  }

  if (response.status === 401 && token) {
    tokenUtils.clear();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error(result.message || 'Sesión expirada');
  }

  if (!result.success) {
    const error = new Error(result.message || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return result.data;
}

export default apiFetch;
