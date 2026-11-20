import DatabaseManager from '../database/DatabaseManager.js';
import { esAdmin, tieneRol } from '../shared/http.js';
import { storage, leerCuerpo } from '../storage/supabaseStorage.js';

/**
 * Expedientes de refugio: un EXPEDIENTE agrupa a un titular y sus familiares (PERSONAS).
 *
 *   GET    /api/expedientes/catalogos               orígenes, parentescos, tipos de documento, nacionalidades, estados
 *   GET    /api/expedientes?q=&anio=&tramite=&estado=&page=  página de expedientes con sus personas
 *                                     (estado = ID_ESTADO o 'sin': alguna persona en ese estado)
 *   GET    /api/expedientes/registro?…&page=&grupo=&todo=  filas tipo Excel (view V_PERSONAS_REGISTRO),
 *                                     paginado por expediente; filtros: q anio tramite origen estado(id|sin)
 *                                     parentesco nacionalidad tipodoc sexo edad(menores|adultos) sinnro sinarchivo
 *   GET    /api/expedientes/resumen?anio=&tramite=  conteos de las views V_RESUMEN_* y pendientes
 *   GET    /api/expedientes/:id                     expediente con sus personas
 *   POST   /api/expedientes          { ...expediente, personas: [...] }
 *   PUT    /api/expedientes/:id      { ...expediente, personas: [...] } (personas sin ID_PERSONA se crean;
 *                                     las que ya no vienen se dan de baja)
 *   DELETE /api/expedientes/:id      baja lógica (solo admin)
 *   GET    /api/expedientes/:id/archivo   { url (firmada, 5 min), nombre }; ?descargar=1 fuerza descarga
 *   PUT    /api/expedientes/:id/archivo   cuerpo = el PDF (application/pdf), cabecera X-Nombre-Archivo;
 *                                     reemplaza el anterior (uno por expediente, Supabase Storage)
 *   DELETE /api/expedientes/:id/archivo   quita el archivo
 *
 * Roles: leer → admin, editor, lector · escribir → admin, editor.
 * Reglas: exactamente un titular activo por expediente; NRO_DOCUMENTO es texto
 * (ceros a la izquierda, códigos alfanuméricos); la edad no se guarda.
 */
const TRAMITES = ['SOLICITUD', 'ACTUALIZACION', 'RENUNCIA'];
const PAGE_SIZE = 20;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// ARCHIVO_* no se editan por JSON: solo por /:id/archivo
const CAMPOS_EXPEDIENTE = ['NRO_EXPEDIENTE', 'ID_ORIGEN', 'FECHA_SOLICITUD', 'TIPO_TRAMITE', 'OBSERVACIONES'];
const CAMPOS_PERSONA = [
  'ID_PARENTESCO', 'APELLIDO_PATERNO', 'APELLIDO_MATERNO', 'NOMBRES', 'SEXO', 'ID_NACIONALIDAD',
  'FECHA_NACIMIENTO', 'ID_TIPO_DOCUMENTO', 'NRO_DOCUMENTO', 'ID_ESTADO',
];
const MAYUSCULAS = new Set(['NRO_EXPEDIENTE', 'APELLIDO_PATERNO', 'APELLIDO_MATERNO', 'NOMBRES', 'NRO_DOCUMENTO', 'SEXO']);
const NUMERICOS = new Set(['ID_ORIGEN', 'ID_PARENTESCO', 'ID_NACIONALIDAD', 'ID_TIPO_DOCUMENTO', 'ID_ESTADO']);
const MAX_OBSERVACIONES = 4000;

class ErrorValidacion extends Error {}

// ------------------------------------------------------------------ lectura de body

function limpiar(body, campos) {
  const data = {};
  for (const c of campos) {
    let v = body?.[c];
    if (v === undefined) continue;
    if (typeof v === 'string') {
      v = v.trim();
      if (MAYUSCULAS.has(c)) v = v.toUpperCase();
    }
    if (v === '') v = null;
    if (NUMERICOS.has(c) && v != null) v = Number(v);
    data[c] = v;
  }
  return data;
}

const fechaValida = (v) => FECHA.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime());

function validarExpediente(exp, cat) {
  if (!cat.origenes.has(exp.ID_ORIGEN)) return 'Elige el origen';
  if (!exp.FECHA_SOLICITUD || !fechaValida(exp.FECHA_SOLICITUD)) return 'Fecha de solicitud no válida';
  if (!TRAMITES.includes(exp.TIPO_TRAMITE)) return 'Tipo de trámite no válido';
  if (exp.NRO_EXPEDIENTE && exp.NRO_EXPEDIENTE.length > 30) return 'El número de expediente admite hasta 30 caracteres';
  if (exp.OBSERVACIONES && exp.OBSERVACIONES.length > MAX_OBSERVACIONES) return `Las observaciones admiten hasta ${MAX_OBSERVACIONES} caracteres`;
  return null;
}

function validarPersonas(personas, cat) {
  if (!Array.isArray(personas) || !personas.length) return 'El expediente debe tener al menos al titular';
  const hoy = new Date().toISOString().slice(0, 10);
  let titulares = 0;
  for (const [i, p] of personas.entries()) {
    const n = `Persona ${i + 1}`;
    const parentesco = cat.parentescos.get(p.ID_PARENTESCO);
    if (!parentesco) return `${n}: elige el parentesco`;
    if (parentesco.ES_TITULAR) titulares++;
    if (!p.NOMBRES) return `${n}: los nombres son obligatorios`;
    if (!p.APELLIDO_PATERNO && !p.APELLIDO_MATERNO) return `${n}: indica al menos un apellido`;
    if (p.SEXO && !['F', 'M'].includes(p.SEXO)) return `${n}: sexo no válido`;
    if (p.FECHA_NACIMIENTO && (!fechaValida(p.FECHA_NACIMIENTO) || p.FECHA_NACIMIENTO > hoy)) return `${n}: fecha de nacimiento no válida`;
    if (p.ID_NACIONALIDAD != null && !cat.nacionalidades.has(p.ID_NACIONALIDAD)) return `${n}: nacionalidad no válida`;
    if (p.ID_TIPO_DOCUMENTO != null && !cat.tiposDocumento.has(p.ID_TIPO_DOCUMENTO)) return `${n}: tipo de documento no válido`;
    if (p.ID_ESTADO != null && !cat.estados.has(p.ID_ESTADO)) return `${n}: estado no válido`;
    if (p.NRO_DOCUMENTO && !p.ID_TIPO_DOCUMENTO) return `${n}: indica el tipo de documento`;
    if (p.NRO_DOCUMENTO && p.NRO_DOCUMENTO.length > 30) return `${n}: el documento admite hasta 30 caracteres`;
  }
  if (titulares !== 1) return 'Debe haber exactamente un titular por expediente';
  return null;
}

// ------------------------------------------------------------------ catálogos

async function catalogos() {
  const activo = { ACTIVO: true };
  const [origenes, parentescos, tiposDocumento, nacionalidades, estados] = await Promise.all([
    DatabaseManager.selectWithOrderBy('ORIGENES', 'NOMBRE', 'ASC', activo, ['ID_ORIGEN', 'NOMBRE']),
    DatabaseManager.selectWithOrderBy('PARENTESCOS', 'ORDEN, NOMBRE', 'ASC', activo, ['ID_PARENTESCO', 'NOMBRE', 'ES_TITULAR', 'ORDEN']),
    DatabaseManager.selectWithOrderBy('TIPOS_DOCUMENTO', 'NOMBRE', 'ASC', activo, ['ID_TIPO_DOCUMENTO', 'NOMBRE']),
    DatabaseManager.selectWithOrderBy('NACIONALIDADES', 'NOMBRE', 'ASC', activo, ['ID_NACIONALIDAD', 'NOMBRE']),
    DatabaseManager.selectWithOrderBy('ESTADOS', 'ORDEN, NOMBRE', 'ASC', activo, ['ID_ESTADO', 'NOMBRE', 'COLOR', 'ORDEN']),
  ]);
  return { origenes, parentescos, tiposDocumento, nacionalidades, estados };
}

/** Catálogos completos (incluye inactivos) indexados por id, para validar y nombrar */
async function mapasCatalogo() {
  const [origenes, parentescos, tiposDocumento, nacionalidades, estados] = await Promise.all([
    DatabaseManager.select('ORIGENES'),
    DatabaseManager.select('PARENTESCOS'),
    DatabaseManager.select('TIPOS_DOCUMENTO'),
    DatabaseManager.select('NACIONALIDADES'),
    DatabaseManager.select('ESTADOS'),
  ]);
  const mapa = (rows, pk) => new Map(rows.map((r) => [r[pk], r]));
  return {
    origenes: mapa(origenes, 'ID_ORIGEN'),
    parentescos: mapa(parentescos, 'ID_PARENTESCO'),
    tiposDocumento: mapa(tiposDocumento, 'ID_TIPO_DOCUMENTO'),
    nacionalidades: mapa(nacionalidades, 'ID_NACIONALIDAD'),
    estados: mapa(estados, 'ID_ESTADO'),
  };
}

// ------------------------------------------------------------------ armado de respuesta

/** Agrega a cada expediente sus personas activas (titular primero) y los nombres de catálogo */
async function conPersonas(expedientes, cat) {
  if (!expedientes.length) return [];
  const ids = expedientes.map((e) => e.ID_EXPEDIENTE);
  const personas = await DatabaseManager.select('PERSONAS', [
    { field: 'ID_EXPEDIENTE', op: 'in', value: ids },
    { field: 'ACTIVO', op: '=', value: true },
  ]);

  const porExpediente = new Map(ids.map((id) => [id, []]));
  for (const p of personas) {
    const parentesco = cat.parentescos.get(p.ID_PARENTESCO);
    porExpediente.get(p.ID_EXPEDIENTE)?.push({
      ...p,
      PARENTESCO: parentesco?.NOMBRE ?? null,
      ORDEN_PARENTESCO: parentesco?.ORDEN ?? 99,
      TIPO_DOCUMENTO: cat.tiposDocumento.get(p.ID_TIPO_DOCUMENTO)?.NOMBRE ?? null,
      NACIONALIDAD: cat.nacionalidades.get(p.ID_NACIONALIDAD)?.NOMBRE ?? null,
      ESTADO: cat.estados.get(p.ID_ESTADO)?.NOMBRE ?? null,
      ESTADO_COLOR: cat.estados.get(p.ID_ESTADO)?.COLOR ?? null,
    });
  }
  const orden = (a, b) => (b.ES_TITULAR - a.ES_TITULAR)
    || (a.ORDEN_PARENTESCO - b.ORDEN_PARENTESCO)
    || String(a.FECHA_NACIMIENTO ?? '').localeCompare(String(b.FECHA_NACIMIENTO ?? ''))
    || (a.ID_PERSONA - b.ID_PERSONA);

  return expedientes.map((e) => ({
    ...e,
    ORIGEN: cat.origenes.get(e.ID_ORIGEN)?.NOMBRE ?? null,
    PERSONAS: porExpediente.get(e.ID_EXPEDIENTE).sort(orden),
  }));
}

/** Ids de expedientes que coinciden con la búsqueda (nº de expediente, nombres, apellidos o documento) */
async function idsPorBusqueda(q) {
  const palabras = q.trim().toUpperCase().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!palabras.length) return null;
  await DatabaseManager.connect();
  const like = DatabaseManager.dialect.like;
  const columnas = ['NOMBRES', 'APELLIDO_PATERNO', 'APELLIDO_MATERNO', 'NRO_DOCUMENTO'];

  // Cada palabra debe aparecer en alguna columna de la misma persona
  const condiciones = palabras.map(() => `(${columnas.map((c) => `"${c}" ${like} ?`).join(' OR ')})`).join(' AND ');
  const params = palabras.flatMap((w) => columnas.map(() => `%${w}%`));
  const personas = await DatabaseManager.query(
    `SELECT DISTINCT "ID_EXPEDIENTE" FROM "PERSONAS" WHERE "ACTIVO" = ? AND ${condiciones}`,
    true, ...params,
  );
  const porNumero = await DatabaseManager.select('EXPEDIENTES', [
    { field: 'NRO_EXPEDIENTE', op: 'like', value: q.trim() },
  ], ['ID_EXPEDIENTE']);

  return [...new Set([...personas, ...porNumero].map((r) => r.ID_EXPEDIENTE))];
}

/** Ids de expedientes con alguna persona activa en ese estado ('sin' = sin estado) */
async function idsPorEstado(estado) {
  const filtroEstado = estado === 'sin'
    ? { field: 'ID_ESTADO', op: 'is null' }
    : { field: 'ID_ESTADO', op: '=', value: Number(estado) };
  const rows = await DatabaseManager.select('PERSONAS', [
    { field: 'ACTIVO', op: '=', value: true }, filtroEstado,
  ], ['ID_EXPEDIENTE']);
  return [...new Set(rows.map((r) => r.ID_EXPEDIENTE))];
}

async function listar(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const filtros = [{ field: 'ACTIVO', op: '=', value: true }];

  if (TRAMITES.includes(query.tramite)) filtros.push({ field: 'TIPO_TRAMITE', op: '=', value: query.tramite });
  const anio = parseInt(query.anio, 10);
  if (anio > 1900 && anio < 3000) {
    filtros.push({ field: 'FECHA_SOLICITUD', op: '>=', value: `${anio}-01-01` });
    filtros.push({ field: 'FECHA_SOLICITUD', op: '<', value: `${anio + 1}-01-01` });
  }
  let ids = null;
  if (query.q?.trim()) ids = await idsPorBusqueda(query.q);
  if (query.estado === 'sin' || /^\d+$/.test(query.estado ?? '')) {
    const porEstado = await idsPorEstado(query.estado);
    ids = ids ? ids.filter((id) => porEstado.includes(id)) : porEstado;
  }
  if (ids) {
    if (!ids.length) return { rows: [], total: 0, page, pageSize: PAGE_SIZE };
    filtros.push({ field: 'ID_EXPEDIENTE', op: 'in', value: ids });
  }

  const [total, expedientes, cat] = await Promise.all([
    DatabaseManager.count('EXPEDIENTES', filtros),
    DatabaseManager.selectPaginated('EXPEDIENTES', page, PAGE_SIZE, filtros, null, 'FECHA_SOLICITUD DESC, ID_EXPEDIENTE DESC'),
    mapasCatalogo(),
  ]);
  return { rows: await conPersonas(expedientes, cat), total, page, pageSize: PAGE_SIZE };
}

// ------------------------------------------------------------------ registro (tabla tipo Excel) y resumen

const REGISTRO_PAGE = 25;      // expedientes por página (no se parten grupos familiares)
const REGISTRO_MAX = 5000;     // tope de filas para exportar
const entero = (v) => (/^\d+$/.test(String(v ?? '')) ? Number(v) : null);
const activado = (v) => v === '1' || v === 'true';

function filtrosAnioTramite(query) {
  const f = [];
  const anio = parseInt(query.anio, 10);
  if (anio > 1900 && anio < 3000) f.push({ field: 'ANIO', op: '=', value: anio });
  if (TRAMITES.includes(query.tramite)) f.push({ field: 'TIPO_TRAMITE', op: '=', value: query.tramite });
  return f;
}

/** Filtros de la tabla sobre V_PERSONAS_REGISTRO (una fila por persona) */
function filtrosRegistro(query) {
  const f = filtrosAnioTramite(query);
  const porId = { origen: 'ID_ORIGEN', parentesco: 'ID_PARENTESCO', nacionalidad: 'ID_NACIONALIDAD', tipodoc: 'ID_TIPO_DOCUMENTO' };
  for (const [param, campo] of Object.entries(porId)) {
    const id = entero(query[param]);
    if (id) f.push({ field: campo, op: '=', value: id });
  }
  if (query.estado === 'sin') f.push({ field: 'ID_ESTADO', op: 'is null' });
  else if (entero(query.estado)) f.push({ field: 'ID_ESTADO', op: '=', value: entero(query.estado) });
  if (['F', 'M'].includes(query.sexo)) f.push({ field: 'SEXO', op: '=', value: query.sexo });
  if (query.edad === 'menores') f.push({ field: 'EDAD', op: '<', value: 18 });
  if (query.edad === 'adultos') f.push({ field: 'EDAD', op: '>=', value: 18 });
  if (activado(query.sinnro)) f.push({ field: 'NRO_EXPEDIENTE', op: 'is null' });
  if (activado(query.sinarchivo)) f.push({ field: 'ARCHIVO_RUTA', op: 'is null' });
  return f;
}

/**
 * Filas tipo Excel. Pagina por expediente: primero los expedientes que tienen alguna
 * persona que cumple los filtros, luego sus filas. grupo=0 → solo las personas que cumplen.
 */
async function registro(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const todo = activado(query.todo);
  const vacio = { rows: [], total: 0, personas: 0, page, pageSize: REGISTRO_PAGE };
  const filtros = filtrosRegistro(query);

  if (query.q?.trim()) {
    const ids = await idsPorBusqueda(query.q);
    if (!ids.length) return vacio;
    filtros.push({ field: 'ID_EXPEDIENTE', op: 'in', value: ids });
  }

  const coincidencias = await DatabaseManager.select('V_PERSONAS_REGISTRO', filtros, ['ID_PERSONA', 'ID_EXPEDIENTE', 'FECHA_SOLICITUD']);
  const fechas = new Map(coincidencias.map((r) => [r.ID_EXPEDIENTE, String(r.FECHA_SOLICITUD)]));
  const expedientes = [...fechas]
    .sort((a, b) => b[1].localeCompare(a[1]) || b[0] - a[0])
    .map(([id]) => id);

  const ids = todo ? expedientes : expedientes.slice((page - 1) * REGISTRO_PAGE, page * REGISTRO_PAGE);
  const base = { total: expedientes.length, personas: coincidencias.length, page, pageSize: REGISTRO_PAGE };
  if (!ids.length) return { ...vacio, ...base };

  let rows = await DatabaseManager.select('V_PERSONAS_REGISTRO', [{ field: 'ID_EXPEDIENTE', op: 'in', value: ids }]);
  if (query.grupo === '0') {
    const cumplen = new Set(coincidencias.map((r) => r.ID_PERSONA));
    rows = rows.filter((r) => cumplen.has(r.ID_PERSONA));
  }
  if (todo && rows.length > REGISTRO_MAX) {
    throw new ErrorValidacion(`Son ${rows.length} filas; el máximo para exportar es ${REGISTRO_MAX}. Aplica más filtros.`);
  }

  const posicion = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (posicion.get(a.ID_EXPEDIENTE) - posicion.get(b.ID_EXPEDIENTE))
    || (b.ES_TITULAR - a.ES_TITULAR)
    || (a.ORDEN_PARENTESCO - b.ORDEN_PARENTESCO)
    || String(a.FECHA_NACIMIENTO ?? '').localeCompare(String(b.FECHA_NACIMIENTO ?? ''))
    || (a.ID_PERSONA - b.ID_PERSONA));

  return { ...base, rows };
}

/** Suma filas de una view agrupando por `clave`; conserva los demás campos de la primera fila */
function agrupar(rows, clave, sumas) {
  const mapa = new Map();
  for (const r of rows) {
    const k = r[clave] ?? 'sin';
    const acc = mapa.get(k);
    if (!acc) mapa.set(k, { ...r });
    else for (const s of sumas) acc[s] += r[s];
  }
  return [...mapa.values()];
}

/** Resumen para Reportes y la franja de estados: lee las views V_RESUMEN_* y V_EXPEDIENTES_PENDIENTES */
async function resumen(query) {
  const f = filtrosAnioTramite(query);
  const [estados, tramites, pendientes, origenes, nacionalidades, anios] = await Promise.all([
    DatabaseManager.select('V_RESUMEN_ESTADOS', f),
    DatabaseManager.select('V_RESUMEN_TRAMITES', f),
    DatabaseManager.select('V_EXPEDIENTES_PENDIENTES', f),
    DatabaseManager.select('V_RESUMEN_ORIGENES', f),
    DatabaseManager.select('V_RESUMEN_NACIONALIDADES', f),
    DatabaseManager.select('V_RESUMEN_TRAMITES', [], ['ANIO']),
  ]);
  const ordenTramite = (t) => TRAMITES.indexOf(t);
  return {
    anios: [...new Set(anios.map((r) => r.ANIO))].sort((a, b) => b - a),
    estados: agrupar(estados, 'ID_ESTADO', ['PERSONAS'])
      .map(({ ID_ESTADO, ESTADO, COLOR, ORDEN, PERSONAS }) => ({ ID_ESTADO, ESTADO, COLOR, ORDEN, PERSONAS }))
      .sort((a, b) => ((a.ID_ESTADO == null) - (b.ID_ESTADO == null)) || (a.ORDEN - b.ORDEN)),
    tramites: tramites.sort((a, b) => (b.ANIO - a.ANIO) || (ordenTramite(a.TIPO_TRAMITE) - ordenTramite(b.TIPO_TRAMITE))),
    pendientes: {
      sinNro: pendientes.filter((p) => p.SIN_NRO).length,
      sinArchivo: pendientes.filter((p) => p.SIN_ARCHIVO).length,
      lista: pendientes.sort((a, b) => String(b.FECHA_SOLICITUD).localeCompare(String(a.FECHA_SOLICITUD))).slice(0, 8),
    },
    origenes: agrupar(origenes, 'ID_ORIGEN', ['EXPEDIENTES', 'PERSONAS'])
      .map(({ ID_ORIGEN, ORIGEN, EXPEDIENTES, PERSONAS }) => ({ ID_ORIGEN, ORIGEN, EXPEDIENTES, PERSONAS }))
      .sort((a, b) => b.PERSONAS - a.PERSONAS),
    nacionalidades: agrupar(nacionalidades, 'NACIONALIDAD', ['PERSONAS', 'MENORES'])
      .map(({ ID_NACIONALIDAD, NACIONALIDAD, PERSONAS, MENORES }) => ({ ID_NACIONALIDAD, NACIONALIDAD, PERSONAS, MENORES }))
      .sort((a, b) => b.PERSONAS - a.PERSONAS),
  };
}

async function obtener(id, cat) {
  const exp = await DatabaseManager.getById('EXPEDIENTES', id, 'ID_EXPEDIENTE');
  if (!exp || !exp.ACTIVO) return null;
  return (await conPersonas([exp], cat ?? await mapasCatalogo()))[0];
}

// ------------------------------------------------------------------ escritura (en transacción)

function insertTx(tx, table, data) {
  const row = DatabaseManager.sanitizeData(data);
  return DatabaseManager.dialect.insert(tx, table, Object.keys(row), [row]);
}

function updateTx(tx, table, pk, id, data) {
  const row = DatabaseManager.sanitizeData(data);
  const keys = Object.keys(row);
  return DatabaseManager.dialect.update(tx, table, keys.map((k) => `"${k}" = ?`).join(', '), `"${pk}" = ?`, [...keys.map((k) => row[k]), id]);
}

/** Lee y valida { ...expediente, personas } del body */
async function leerBody(body) {
  const cat = await mapasCatalogo();
  const exp = limpiar(body, CAMPOS_EXPEDIENTE);
  exp.TIPO_TRAMITE ??= 'SOLICITUD';
  const personas = (Array.isArray(body?.personas) ? body.personas : []).map((p) => ({
    ID_PERSONA: p?.ID_PERSONA ? Number(p.ID_PERSONA) : null,
    ...limpiar(p, CAMPOS_PERSONA),
  }));
  const error = validarExpediente(exp, cat) || validarPersonas(personas, cat);
  if (error) throw new ErrorValidacion(error);
  for (const p of personas) p.ES_TITULAR = Boolean(cat.parentescos.get(p.ID_PARENTESCO).ES_TITULAR);
  return { exp, personas, cat };
}

/** Sincroniza las personas del expediente con la lista recibida */
async function guardarPersonas(tx, idExpediente, personas) {
  const actuales = (await tx.run(
    'SELECT "ID_PERSONA" FROM "PERSONAS" WHERE "ID_EXPEDIENTE" = ? AND "ACTIVO" = ?', [idExpediente, true],
  )).rows.map((r) => r.ID_PERSONA);
  const recibidas = new Set(personas.filter((p) => p.ID_PERSONA).map((p) => p.ID_PERSONA));

  for (const id of recibidas) {
    if (!actuales.includes(id)) throw new ErrorValidacion('Una de las personas no pertenece a este expediente');
  }
  // Primero quitar el titular actual: el índice único no permite dos titulares a la vez
  await tx.run('UPDATE "PERSONAS" SET "ES_TITULAR" = ? WHERE "ID_EXPEDIENTE" = ?', [false, idExpediente]);
  for (const id of actuales) {
    if (!recibidas.has(id)) await updateTx(tx, 'PERSONAS', 'ID_PERSONA', id, { ACTIVO: false });
  }
  for (const { ID_PERSONA, ...datos } of personas) {
    if (ID_PERSONA) await updateTx(tx, 'PERSONAS', 'ID_PERSONA', ID_PERSONA, datos);
    else await insertTx(tx, 'PERSONAS', { ...datos, ID_EXPEDIENTE: idExpediente, ACTIVO: true });
  }
}

// ------------------------------------------------------------------ archivo (Supabase Storage)

/** Nombre legible y seguro para mostrar/descargar */
function nombreArchivo(cabecera, exp) {
  let nombre = '';
  try { nombre = decodeURIComponent(String(cabecera || '')); } catch { /* nombre inválido */ }
  nombre = nombre.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 200);
  if (!nombre) nombre = `expediente_${exp.NRO_EXPEDIENTE || exp.ID_EXPEDIENTE}`;
  return /\.pdf$/i.test(nombre) ? nombre : `${nombre}.pdf`;
}

async function archivo(req, res, exp) {
  const id = exp.ID_EXPEDIENTE;

  if (req.method === 'GET') {
    if (!exp.ARCHIVO_RUTA) return res.status(404).json({ success: false, message: 'Este expediente no tiene archivo' });
    const descargar = req.query?.descargar === '1';
    const url = await storage.enlace(exp.ARCHIVO_RUTA, 300, descargar ? exp.ARCHIVO_NOMBRE : null);
    return res.json({ success: true, data: { url, nombre: exp.ARCHIVO_NOMBRE } });
  }

  if (req.method === 'PUT') {
    if (!String(req.headers['content-type'] || '').startsWith('application/pdf')) {
      throw new ErrorValidacion('El archivo debe ser un PDF');
    }
    const buffer = await leerCuerpo(req);
    if (!buffer.length) throw new ErrorValidacion('El archivo está vacío');
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') throw new ErrorValidacion('El archivo no es un PDF válido');

    const ruta = `${id}/${Date.now()}.pdf`;
    await storage.subir(ruta, buffer);
    await DatabaseManager.update('EXPEDIENTES', id, {
      ARCHIVO_RUTA: ruta,
      ARCHIVO_NOMBRE: nombreArchivo(req.headers['x-nombre-archivo'], exp),
      ARCHIVO_FECHA: new Date(),
    }, 'ID_EXPEDIENTE');
    if (exp.ARCHIVO_RUTA) await storage.borrar(exp.ARCHIVO_RUTA).catch((e) => console.warn('[expedientes] No se borró el archivo anterior:', e.message));
    return res.json({ success: true, data: await obtener(id) });
  }

  if (req.method === 'DELETE') {
    if (exp.ARCHIVO_RUTA) await storage.borrar(exp.ARCHIVO_RUTA);
    await DatabaseManager.update('EXPEDIENTES', id, { ARCHIVO_RUTA: null, ARCHIVO_NOMBRE: null, ARCHIVO_FECHA: null }, 'ID_EXPEDIENTE');
    return res.json({ success: true, data: await obtener(id) });
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
}

// ------------------------------------------------------------------ handler

export default async function handler(req, res, segments) {
  const [primero] = segments;
  const id = primero && /^\d+$/.test(primero) ? Number(primero) : null;
  const puedeLeer = tieneRol(req.user, 'editor', 'lector');
  const puedeEscribir = tieneRol(req.user, 'editor');

  try {
    if (!puedeLeer) return res.status(403).json({ success: false, message: 'Sin acceso a expedientes' });
    if (req.method !== 'GET' && !puedeEscribir) {
      return res.status(403).json({ success: false, message: 'Tu rol solo permite consultar' });
    }

    if (req.method === 'GET' && primero === 'catalogos') {
      return res.json({ success: true, data: await catalogos() });
    }

    if (req.method === 'GET' && primero === 'registro') {
      return res.json({ success: true, data: await registro(req.query || {}) });
    }

    if (req.method === 'GET' && primero === 'resumen') {
      return res.json({ success: true, data: await resumen(req.query || {}) });
    }

    if (req.method === 'GET' && !primero) {
      return res.json({ success: true, data: await listar(req.query || {}) });
    }

    if (id && segments[1] === 'archivo') {
      const exp = await DatabaseManager.getById('EXPEDIENTES', id, 'ID_EXPEDIENTE');
      if (!exp || !exp.ACTIVO) return res.status(404).json({ success: false, message: 'Expediente no encontrado' });
      return archivo(req, res, exp);
    }

    if (req.method === 'GET' && id) {
      const exp = await obtener(id);
      if (!exp) return res.status(404).json({ success: false, message: 'Expediente no encontrado' });
      return res.json({ success: true, data: exp });
    }

    if (req.method === 'POST' && !primero) {
      const { exp, personas, cat } = await leerBody(req.body);
      const nuevoId = await DatabaseManager.transaction(async (tx) => {
        const [row] = await insertTx(tx, 'EXPEDIENTES', { ...exp, ACTIVO: true, ID_USUARIO_CREA: req.user.id_usuario });
        await guardarPersonas(tx, row.ID_EXPEDIENTE, personas);
        return row.ID_EXPEDIENTE;
      });
      return res.json({ success: true, data: await obtener(nuevoId, cat) });
    }

    if (id && (req.method === 'PUT' || req.method === 'DELETE')) {
      const actual = await DatabaseManager.getById('EXPEDIENTES', id, 'ID_EXPEDIENTE');
      if (!actual || !actual.ACTIVO) return res.status(404).json({ success: false, message: 'Expediente no encontrado' });

      if (req.method === 'DELETE') {
        if (!esAdmin(req.user)) return res.status(403).json({ success: false, message: 'Solo administración puede eliminar expedientes' });
        await DatabaseManager.update('EXPEDIENTES', id, { ACTIVO: false }, 'ID_EXPEDIENTE');
        return res.json({ success: true });
      }

      const { exp, personas, cat } = await leerBody(req.body);
      await DatabaseManager.transaction(async (tx) => {
        await updateTx(tx, 'EXPEDIENTES', 'ID_EXPEDIENTE', id, exp);
        await guardarPersonas(tx, id, personas);
      });
      return res.json({ success: true, data: await obtener(id, cat) });
    }

    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
  } catch (error) {
    if (error instanceof ErrorValidacion) return res.status(400).json({ success: false, message: error.message });
    if (error.status === 413) return res.status(413).json({ success: false, message: error.message });
    if (error.code === '23505') {
      const msg = String(error.constraint || error.message).includes('NRO')
        ? 'Ya existe un expediente con ese número'
        : 'Debe haber exactamente un titular por expediente';
      return res.status(409).json({ success: false, message: msg });
    }
    console.error('[expedientes] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
