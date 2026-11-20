/**
 * Supabase Storage (API REST) con la secret key: solo se usa desde el backend.
 * Bucket privado: nadie lee archivos sin pasar por la API (que exige sesión); para
 * descargar se entrega un enlace firmado de pocos minutos.
 *
 * .env: SUPABASE_URL, SUPABASE_SECRET_KEY, STORAGE_BUCKET (por defecto "expedientes")
 */
const BUCKET = process.env.STORAGE_BUCKET || 'expedientes';
const MAX_BYTES = 20 * 1024 * 1024;

const config = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Falta SUPABASE_URL o SUPABASE_SECRET_KEY en .env para guardar archivos');
  return { base: `${url.replace(/\/$/, '')}/storage/v1`, headers: { apikey: key, Authorization: `Bearer ${key}` } };
};

async function fallo(res, accion) {
  const texto = await res.text().catch(() => '');
  let msg = texto;
  try { msg = JSON.parse(texto).message || texto; } catch { /* texto plano */ }
  return new Error(`Storage (${accion}): ${res.status} ${msg}`.slice(0, 300));
}

let bucketListo = false;

/** Crea el bucket privado si no existe (una vez por proceso) */
async function asegurarBucket() {
  if (bucketListo) return;
  const { base, headers } = config();
  const existe = await fetch(`${base}/bucket/${BUCKET}`, { headers });
  if (!existe.ok) {
    const res = await fetch(`${base}/bucket`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: MAX_BYTES, allowed_mime_types: ['application/pdf'] }),
    });
    if (!res.ok && res.status !== 409) throw await fallo(res, 'crear bucket');
  }
  bucketListo = true;
}

const rutaObjeto = (ruta) => ruta.split('/').map(encodeURIComponent).join('/');

export const storage = {
  MAX_BYTES,

  async subir(ruta, buffer, contentType = 'application/pdf') {
    await asegurarBucket();
    const { base, headers } = config();
    const res = await fetch(`${base}/object/${BUCKET}/${rutaObjeto(ruta)}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: buffer,
    });
    if (!res.ok) throw await fallo(res, 'subir');
  },

  /** Enlace firmado para descargar/ver (expira en `segundos`) */
  async enlace(ruta, segundos = 300, nombreDescarga = null) {
    const { base, headers } = config();
    const res = await fetch(`${base}/object/sign/${BUCKET}/${rutaObjeto(ruta)}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: segundos }),
    });
    if (!res.ok) throw await fallo(res, 'firmar');
    const { signedURL } = await res.json();
    const url = `${base}${signedURL}`;
    return nombreDescarga ? `${url}&download=${encodeURIComponent(nombreDescarga)}` : url;
  },

  async borrar(ruta) {
    const { base, headers } = config();
    const res = await fetch(`${base}/object/${BUCKET}`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [ruta] }),
    });
    if (!res.ok) throw await fallo(res, 'borrar');
  },
};

/** Lee el cuerpo crudo de la petición (Express no lo parsea si no es JSON) con tope de tamaño */
export function leerCuerpo(req, max = MAX_BYTES) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const partes = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > max) {
        reject(Object.assign(new Error(`El archivo supera ${Math.round(max / 1024 / 1024)} MB`), { status: 413 }));
        req.destroy();
      } else partes.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}
