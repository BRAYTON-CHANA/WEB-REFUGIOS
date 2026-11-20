// Secciones de configuración administradas por GenericCrud: /config/<clave>.
// Para agregar un catálogo: crear la tabla (database/sql/<motor>/tables/),
// agregar aquí su sección y su ítem en app/navigation.js.
//
// Ejemplo (requiere la tabla CATEGORIAS con ID_CATEGORIA, NOMBRE, COLOR, ACTIVO):
//
// const activoField = { name: 'ACTIVO', label: 'Activo', type: 'checkbox', default: true, checkLabel: 'Activo' };
//
// 'categorias': {
//   title: 'Categorías',
//   table: 'CATEGORIAS',
//   pk: 'ID_CATEGORIA',
//   columns: [
//     { key: 'NOMBRE', label: 'Nombre' },
//     { key: 'COLOR', label: 'Color', type: 'color' },
//     { key: 'ACTIVO', label: 'Estado', type: 'badge' },
//   ],
//   fields: [
//     { name: 'NOMBRE', label: 'Nombre', required: true },
//     { name: 'COLOR', label: 'Color', type: 'color' },
//     { name: 'ID_PADRE', label: 'Depende de', type: 'select',
//       optionsFrom: { table: 'CATEGORIAS', key: 'ID_CATEGORIA', label: 'NOMBRE', filters: { ACTIVO: true } } },
//     activoField,
//   ],
// },

const activoField = { name: 'ACTIVO', label: 'Activo', type: 'checkbox', default: true, checkLabel: 'Activo' };
const nombreField = { name: 'NOMBRE', label: 'Nombre', required: true };
const columnasBase = [{ key: 'NOMBRE', label: 'Nombre' }, { key: 'ACTIVO', label: 'Estado', type: 'badge' }];

/** Catálogo simple NOMBRE + ACTIVO */
const catalogo = (title, table, pk) => ({ title, table, pk, columns: columnasBase, fields: [nombreField, activoField] });

export const configSections = {
  origenes: catalogo('Orígenes / ODE', 'ORIGENES', 'ID_ORIGEN'),
  'tipos-documento': catalogo('Tipos de documento', 'TIPOS_DOCUMENTO', 'ID_TIPO_DOCUMENTO'),
  nacionalidades: catalogo('Nacionalidades', 'NACIONALIDADES', 'ID_NACIONALIDAD'),
  parentescos: {
    title: 'Parentescos',
    table: 'PARENTESCOS',
    pk: 'ID_PARENTESCO',
    columns: [
      { key: 'NOMBRE', label: 'Nombre' },
      { key: 'ORDEN', label: 'Orden' },
      { key: 'ES_TITULAR', label: 'Titular', render: (r) => (r.ES_TITULAR ? 'Sí' : '') },
      { key: 'ACTIVO', label: 'Estado', type: 'badge' },
    ],
    fields: [
      nombreField,
      { name: 'ORDEN', label: 'Orden en el grupo familiar', type: 'number', default: 50, min: 0 },
      { name: 'ES_TITULAR', label: 'Es titular', type: 'checkbox', checkLabel: 'Marca al titular (solo uno debe tenerlo)' },
      activoField,
    ],
  },
  // Colores de fila del Excel: estado del trámite de cada persona
  estados: {
    title: 'Estados de persona',
    table: 'ESTADOS',
    pk: 'ID_ESTADO',
    columns: [
      { key: 'COLOR', label: 'Color', type: 'color' },
      { key: 'NOMBRE', label: 'Nombre' },
      { key: 'ORDEN', label: 'Orden' },
      { key: 'ACTIVO', label: 'Estado', type: 'badge' },
    ],
    fields: [
      nombreField,
      { name: 'COLOR', label: 'Color', type: 'color', default: '#94A3B8', required: true },
      { name: 'ORDEN', label: 'Orden en la leyenda', type: 'number', default: 50, min: 0 },
      activoField,
    ],
  },
};
