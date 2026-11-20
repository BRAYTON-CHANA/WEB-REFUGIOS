import { expedientesService } from '../services/expedientesService';

export const MAX_ARCHIVO_MB = 20;

/** null si el archivo sirve; si no, el motivo */
export function validarArchivo(file) {
  if (!file) return null;
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return 'El archivo debe ser un PDF';
  if (file.size > MAX_ARCHIVO_MB * 1024 * 1024) return `El archivo supera ${MAX_ARCHIVO_MB} MB`;
  return null;
}

/**
 * Abre el PDF del expediente en otra pestaña. La pestaña se abre antes de pedir el
 * enlace firmado para que el navegador no la bloquee como ventana emergente.
 */
export async function abrirArchivo(idExpediente, { descargar = false } = {}) {
  const ventana = descargar ? null : window.open('', '_blank');
  try {
    const { url } = await expedientesService.archivo.enlace(idExpediente, { descargar });
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
  } catch (e) {
    ventana?.close();
    throw e;
  }
}
