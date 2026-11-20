/**
 * Qué puede hacer un usuario NO admin por /api/execute (el admin puede todo).
 *
 * Mantener estas listas cortas: lo que tenga reglas propias (solo lo suyo,
 * validaciones, auditoría) va en un endpoint dedicado, no aquí.
 */

/** Tablas que cualquier usuario autenticado puede leer (select/getById/count…) */
export const LECTURA_USUARIO = new Set([
  'ROLES',
]);

/** Tablas en las que cualquier usuario autenticado puede insertar */
export const ALTA_USUARIO = new Set([]);

/** Acciones de DatabaseManager consideradas de lectura */
export const ACCIONES_LECTURA = new Set([
  'select', 'getById', 'count', 'selectWithOrderBy', 'selectWithLimit', 'selectPaginated',
]);
