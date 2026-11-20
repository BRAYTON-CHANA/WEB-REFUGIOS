# Web Refugios

Registro de expedientes de solicitud de refugio. Cada **expediente** (nº Q2, origen,
fecha de solicitud, PDF) agrupa a un **titular y sus familiares** (cónyuge, hijos…),
con sus datos personales y documentos.

**React 19 + Vite + Tailwind v4** en el frontend, **Express 5 + PostgreSQL** en el
backend, login JWT y roles. Creado desde WEB TEMPLATE.

## Usuarios y roles

| Usuario | Rol | Puede |
|---|---|---|
| `admin` | admin | todo, incluida la configuración (usuarios, roles, catálogos) y eliminar expedientes |
| `editor` | editor | registrar y editar expedientes y su grupo familiar |
| `lector` | lector | solo consultar |

`npm run db:setup` los crea con `ADMIN_PASSWORD`, `EDITOR_PASSWORD` y
`LECTOR_PASSWORD` del `.env` (sin clave no se crea ese usuario); todos deben cambiar
la clave en su primer ingreso.

## Modelo de datos

Viene de un Excel donde cada fila es una persona y las filas del mismo expediente
comparten nº, origen, fecha y PDF (celdas combinadas).

- `EXPEDIENTES`: nº (opcional, único), origen, fecha de solicitud, trámite
  (solicitud / actualización / renuncia), enlace al PDF, observaciones.
- `PERSONAS`: expediente, parentesco, apellido paterno y materno, nombres, sexo,
  nacionalidad, fecha de nacimiento, tipo y nº de documento.
- Un solo titular por expediente. El nº de documento es texto (ceros a la izquierda,
  códigos alfanuméricos). La edad se calcula de la fecha de nacimiento.
- Catálogos editables por admin: orígenes, parentescos, tipos de documento,
  nacionalidades.

`database/sql/postgres/seeds/03_demo.sql` carga expedientes **ficticios** de ejemplo:
bórralo antes de instalar en producción.

No depende de ningún proveedor: corre en cualquier servidor con Node.js
(o en Vercel, opcional).

## Requisitos

- Node.js 20+
- PostgreSQL 13+

## Puesta en marcha

```bash
# 1. Dependencias
npm install
cd frontend && npm install && cd ..

# 2. Configuración
cp .env.example .env                       # backend: BD, JWT, admin inicial
cp frontend/.env.example frontend/.env.local   # nombre, descripción y logo de la app

# 3. Base de datos (crea tablas, catálogos, roles y usuarios admin/editor/lector)
npm run db:setup

# 4. Desarrollo (dos terminales)
npm run dev                  # API en http://localhost:3001
cd frontend && npm run dev   # web en http://localhost:5173 (proxy /api → 3001)
```

### Base de datos

`DB_CLIENT=postgres`, `DB_PORT=5432` (`DB_SSL=true` para servicios en la nube).
Scripts en `database/sql/postgres/` (ver [database/sql/README.md](database/sql/README.md)).
Con `DB_ADMIN_USER`/`DB_ADMIN_PASSWORD` (usuario `postgres`), `db:setup` crea la BD y
el usuario de la app; sin ellos, deben existir.

## Producción

```bash
cd frontend && npm run build && cd ..
npm start                     # Express sirve la API y frontend/dist en el mismo puerto
# o con PM2:
pm2 start ecosystem.config.cjs
```

Configura `JWT_SECRET` largo y aleatorio, y `CORS_ORIGIN` si el frontend se sirve
desde otro dominio (en ese caso, `VITE_API_URL` en el frontend).

**Vercel (opcional):** `vercel.json` construye el frontend y publica `api/` como
funciones (los handlers son `(req, res)` compatibles). Necesita una BD accesible desde
internet; no está probado en esta plantilla.

## Estructura

```
server.js                 Express: monta api/ y sirve frontend/dist
api/                      endpoints (execute, health, auth/*, eventos/*)
lib/
  database/               DatabaseManager + drivers/ (mssql, postgres)
  handlers/               lógica de los endpoints (auth/, eventos.js, expedientes.js)
  middleware/auth.js      withAuth / withAdmin (JWT)
  config/permisos.js      qué puede hacer un no-admin por /api/execute
  shared/http.js          cors, método, segmentos de ruta, esAdmin
database/sql/postgres/    tables/ seeds/ migrations/
scripts/                  run-sql.js (db:setup), run-sql-migrations.js (db:migrate)
frontend/src/
  app/                    App (rutas), config (marca), navigation (menú), views/<ruta>/ (páginas)
  features/               expedientes/, inicio/, login/, layout/, config/ (usuarios, roles, catálogos), calendario/
  shared/                 api/, components/ (ui, Toast, calendario/), context/, hooks/, utils/
```

## Cómo extender

- **Página nueva**: componente en `features/<dominio>/components/` (exportado en su
  `index.js`), página en `app/views/<ruta>/index.jsx` que solo lo re-exporta,
  `<Route>` en `app/App.jsx` e ítem en `app/navigation.js`.
- **Catálogo administrable** (tabla simple): tabla en `database/sql/<motor>/tables/`
  y una sección en `features/config/configs.js` → queda en `/config/<clave>` con
  `GenericCrud` (listar, crear, editar, activar/desactivar).
- **Endpoint con reglas propias**: handler en `lib/handlers/`, router en
  `api/<nombre>/[...path].js` y montarlo en `server.js` (ejemplo: `eventos`).
- **Cambiar el esquema de una BD con datos**: `database/sql/<motor>/migrations/` +
  `npm run db:migrate`.
