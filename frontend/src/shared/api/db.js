import { apiFetch } from './apiFetch';

/**
 * CRUD genérico vía /api/execute (requiere JWT).
 * El admin puede todo; un usuario normal solo lo que permite
 * lib/config/permisos.js. Lo que tenga reglas propias va en su endpoint.
 *
 * Filtros: { COL: valor } (igualdad) o [{ field, op, value }]
 * (op: = != > < >= <= in, not in, is null, is not null, like).
 */
export async function executeFunction(functionName, params = {}) {
  return apiFetch('/execute', { method: 'POST', body: { functionName, params } });
}

export const db = {
  select: (table, filters, fields) => executeFunction('select', { table, filters, fields }),
  getById: (table, id, idColumn) => executeFunction('getById', { table, id, idColumn }),
  insert: (table, data) => executeFunction('insert', { table, data }),
  update: (table, id, data, idColumn) => executeFunction('update', { table, id, data, idColumn }),
  delete: (table, id, idColumn) => executeFunction('delete', { table, id, idColumn }),

  insertBatch: (table, dataArray) => executeFunction('insertBatch', { table, dataArray }),
  updateBatch: (table, updates, idColumn) => executeFunction('updateBatch', { table, updates, idColumn }),
  deleteBatch: (table, ids, idColumn) => executeFunction('deleteBatch', { table, ids, idColumn }),
  upsert: (table, conflictColumns, data, conflictTarget) => executeFunction('upsert', { table, conflictColumns, data, conflictTarget }),

  selectWithOrderBy: (table, orderBy, order, filters, fields) => executeFunction('selectWithOrderBy', { table, orderBy, order, filters, fields }),
  selectPaginated: (table, page, pageSize, filters, fields, orderBy) => executeFunction('selectPaginated', { table, page, pageSize, filters, fields, orderBy }),
  count: (table, filters) => executeFunction('count', { table, filters }),

  // Solo admin: SQL con parámetros (? o $n). Escribir SQL portable
  query: (sql, ...params) => executeFunction('query', { sql, params }),

  // Stored procedure (mssql) / función (postgres); params → p_snake_case
  executeFunction: (name, params) => executeFunction('executeFunction', { name, params }),
};

export default db;
