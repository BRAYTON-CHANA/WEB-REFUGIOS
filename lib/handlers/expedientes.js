import DatabaseManager from '../database/DatabaseManager.js';
import { esAdmin, tieneRol } from '../shared/http.js';

/**
 * Expedientes de refugio: un EXPEDIENTE agrupa a un titular y sus familiares (PERSONAS).
 *
 *   GET    /api/expedientes/catalogos               orígenes, parentescos, tipos de documento, nacionalidades
 *   GET    /api/expedientes?q=&anio=&tramite=&page= página de expedientes con sus personas
 *   GET    /api/expedientes/:id                     expediente con sus personas
 *   POST   /api/expedientes          { ...expediente, personas: [...] }
 *   PUT    /api/expedientes/:id      { ...expediente, personas: [...] } (personas sin ID_PERSONA se crean;
 *                                     las que ya no vienen se dan de baja)
 *   DELETE /api/expedientes/:id      baja lógica (solo admin)
 *
 * Roles: leer → admin, editor, lector · escribir → admin, editor.
 * Reglas: exactamente un titular activo por expediente; NRO_DOCUMENTO es texto
 * (ceros a la izquierda, códigos alfanuméricos); la edad no se guarda.
 */
const TRAMITES = ['SOLICITUD', 'ACTUALIZACION', 'RENUNCIA'];
const PAGE_SIZE = 20;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const CAMPOS_EXPEDIENTE = ['NRO_EXPEDIENTE', 'ID_ORIGEN', 'FECHA_SOLICITUD', 'TIPO_TRAMITE', 'URL_PDF', 'OBSERVACIONES'];
const CAMPOS_PERSONA = [
  'ID_PARENTESCO', 'APELLIDO_PATERNO', 'APELLIDO_MATERNO', 'NOMBRES', 'SEXO', 'ID_NACIONALIDAD',
  'FECHA_NACIMIENTO', 'ID_TIPO_DOCUMENTO', 'NRO_DOCUMENTO',
];
const MAYUSCULAS = new Set(['NRO_EXPEDIENTE', 'APELLIDO_PATERNO', 'APELLIDO_MATERNO', 'NOMBRES', 'NRO_DOCUMENTO', 'SEXO']);
const NUMERICOS = new Set(['ID_ORIGEN', 'ID_PARENTESCO', 'ID_NACIONALIDAD', 'ID_TIPO_DOCUMENTO']);

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
    if (p.NRO_DOCUMENTO && !p.ID_TIPO_DOCUMENTO) return `${n}: indica el tipo de documento`;
    if (p.NRO_DOCUMENTO && p.NRO_DOCUMENTO.length > 30) return `${n}: el documento admite hasta 30 caracteres`;
  }
  if (titulares !== 1) return 'Debe haber exactamente un titular por expediente';
  return null;
}

// ------------------------------------------------------------------ catálogos

async function catalogos() {
  const activo = { ACTIVO: true };
  const [origenes, parentescos, tiposDocumento, nacionalidades] = await Promise.all([
    DatabaseManager.selectWithOrderBy('ORIGENES', 'NOMBRE', 'ASC', activo, ['ID_ORIGEN', 'NOMBRE']),
    DatabaseManager.selectWithOrderBy('PARENTESCOS', 'ORDEN, NOMBRE', 'ASC', activo, ['ID_PARENTESCO', 'NOMBRE', 'ES_TITULAR', 'ORDEN']),
    DatabaseManager.selectWithOrderBy('TIPOS_DOCUMENTO', 'NOMBRE', 'ASC', activo, ['ID_TIPO_DOCUMENTO', 'NOMBRE']),
    DatabaseManager.selectWithOrderBy('NACIONALIDADES', 'NOMBRE', 'ASC', activo, ['ID_NACIONALIDAD', 'NOMBRE']),
  ]);
  return { origenes, parentescos, tiposDocumento, nacionalidades };
}

/** Catálogos completos (incluye inactivos) indexados por id, para validar y nombrar */
async function mapasCatalogo() {
  const [origenes, parentescos, tiposDocumento, nacionalidades] = await Promise.all([
    DatabaseManager.select('ORIGENES'),
    DatabaseManager.select('PARENTESCOS'),
    DatabaseManager.select('TIPOS_DOCUMENTO'),
    DatabaseManager.select('NACIONALIDADES'),
  ]);
  const mapa = (rows, pk) => new Map(rows.map((r) => [r[pk], r]));
  return {
    origenes: mapa(origenes, 'ID_ORIGEN'),
    parentescos: mapa(parentescos, 'ID_PARENTESCO'),
    tiposDocumento: mapa(tiposDocumento, 'ID_TIPO_DOCUMENTO'),
    nacionalidades: mapa(nacionalidades, 'ID_NACIONALIDAD'),
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

async function listar(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const filtros = [{ field: 'ACTIVO', op: '=', value: true }];

  if (TRAMITES.includes(query.tramite)) filtros.push({ field: 'TIPO_TRAMITE', op: '=', value: query.tramite });
  const anio = parseInt(query.anio, 10);
  if (anio > 1900 && anio < 3000) {
    filtros.push({ field: 'FECHA_SOLICITUD', op: '>=', value: `${anio}-01-01` });
    filtros.push({ field: 'FECHA_SOLICITUD', op: '<', value: `${anio + 1}-01-01` });
  }
  if (query.q?.trim()) {
    const ids = await idsPorBusqueda(query.q);
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

    if (req.method === 'GET' && !primero) {
      return res.json({ success: true, data: await listar(req.query || {}) });
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
