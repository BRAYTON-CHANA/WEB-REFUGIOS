import { useRef } from 'react';
import { FileText, Upload, Eye, X, Undo2 } from 'lucide-react';
import { formatFecha } from '@/shared/utils/format';
import { MAX_ARCHIVO_MB } from '../utils/archivo';

const tamano = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const btn = 'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[13px] text-grafito border border-trazo bg-hoja hover:bg-niebla transition-colors';

/**
 * Archivo del expediente (un PDF). No sube nada por sí mismo: devuelve la elección y el
 * modal sube o quita al guardar.
 *   actual: { nombre, fecha } del archivo guardado (o null)
 *   nuevo: File elegido · quitar: marcar para quitar el actual
 */
const ArchivoCampo = ({ actual, nuevo, quitar, onElegir, onQuitar, onDeshacer, onVer, error }) => {
  const input = useRef(null);
  const elegir = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onElegir(file);
  };

  let contenido;
  if (nuevo) {
    contenido = (
      <>
        <span className="flex-1 min-w-0">
          <span className="block truncate text-sm text-grafito font-medium">{nuevo.name}</span>
          <span className="text-xs text-pizarra">{tamano(nuevo.size)}. Se sube al guardar{actual ? ' y reemplaza al anterior' : ''}.</span>
        </span>
        <button type="button" className={btn} onClick={onDeshacer}><Undo2 size={14} /> Cancelar</button>
      </>
    );
  } else if (actual && !quitar) {
    contenido = (
      <>
        <span className="flex-1 min-w-0">
          <span className="block truncate text-sm text-grafito font-medium">{actual.nombre}</span>
          {actual.fecha && <span className="text-xs text-pizarra">Subido el {formatFecha(actual.fecha)}</span>}
        </span>
        <button type="button" className={btn} onClick={onVer}><Eye size={14} /> Ver</button>
        <button type="button" className={btn} onClick={() => input.current?.click()}><Upload size={14} /> Reemplazar</button>
        <button type="button" className={`${btn} hover:text-red-700`} onClick={onQuitar}><X size={14} /> Quitar</button>
      </>
    );
  } else {
    contenido = (
      <>
        <span className="flex-1 min-w-0 text-sm text-pizarra">
          {quitar ? 'Se quitará el archivo al guardar.' : `Ningún archivo. PDF de hasta ${MAX_ARCHIVO_MB} MB.`}
        </span>
        {quitar && <button type="button" className={btn} onClick={onDeshacer}><Undo2 size={14} /> Deshacer</button>}
        <button type="button" className={btn} onClick={() => input.current?.click()}><Upload size={14} /> Elegir PDF</button>
      </>
    );
  }

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5 ${error ? 'border-red-600' : 'border-trazo'} bg-niebla/50`}>
        <FileText size={18} className="text-pizarra shrink-0" aria-hidden />
        {contenido}
      </div>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={elegir} tabIndex={-1} aria-hidden />
      {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
    </div>
  );
};

export default ArchivoCampo;
