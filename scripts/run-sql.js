import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { DB_CLIENT, loadDriver } from '../lib/database/DatabaseManager.js';

/**
 * Ejecuta los scripts de database/sql/<motor>/ en orden (motor = DB_CLIENT).
 *
 *   setup        → solo si hay DB_ADMIN_USER/DB_ADMIN_PASSWORD: crea BD y usuario
 *                  (mssql: setup/*.sql contra master; postgres: desde aquí)
 *   tables, seeds, views, triggers, procedures, indexes, (otras, alfabético)
 *   migrations   → NO (es para BD con datos: npm run db:migrate)
 *
 * Placeholders {{DB_DATABASE}}, {{DB_USER}}, {{DB_PASSWORD}} se reemplazan
 * desde .env. Al final crea los usuarios admin, editor y lector
 * (ADMIN_PASSWORD, EDITOR_PASSWORD, LECTOR_PASSWORD).
 *
 * Uso: npm run db:setup
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_DIR = path.join(__dirname, '..', 'database', 'sql', DB_CLIENT === 'pg' ? 'postgres' : DB_CLIENT);
const FOLDER_ORDER = ['tables', 'seeds', 'views', 'triggers', 'procedures', 'indexes'];
const SKIP = new Set(['setup', 'migrations']);
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function substitute(text) {
  return text
    .replaceAll('{{DB_DATABASE}}', process.env.DB_DATABASE || '')
    .replaceAll('{{DB_USER}}', process.env.DB_USER || '')
    .replaceAll('{{DB_PASSWORD}}', (process.env.DB_PASSWORD || '').replaceAll("'", "''"));
}

async function listSqlFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith('.sql')).map((e) => path.join(dir, e.name)).sort();
  } catch {
    return [];
  }
}

async function runScript(conn, filePath) {
  console.log(`  ${path.relative(SQL_DIR, filePath)}`);
  await conn.exec(substitute(await fs.readFile(filePath, 'utf8')));
}

/** Crea BD y usuario como administrador (opcional) */
async function setup(driver) {
  const adminUser = process.env.DB_ADMIN_USER;
  const adminPassword = process.env.DB_ADMIN_PASSWORD;
  if (!adminUser || !adminPassword) {
    console.log('[run-sql] DB_ADMIN_USER/DB_ADMIN_PASSWORD no configurados: la BD y el usuario deben existir ya.');
    return;
  }

  const { DB_DATABASE: db, DB_USER: user, DB_PASSWORD: pass = '' } = process.env;
  if (!IDENT.test(db || '') || !IDENT.test(user || '')) {
    throw new Error('DB_DATABASE y DB_USER deben ser identificadores simples (letras, números, _)');
  }

  if (driver.dialect.name === 'mssql') {
    console.log(`[run-sql] Conectando a master como ${adminUser}...`);
    const admin = await driver.open(driver.configFromEnv({ database: 'master', user: adminUser, password: adminPassword }));
    for (const file of await listSqlFiles(path.join(SQL_DIR, 'setup'))) await runScript(admin, file);
    await admin.close();
  } else {
    console.log(`[run-sql] Conectando a postgres como ${adminUser}...`);
    const admin = await driver.open(driver.configFromEnv({ database: 'postgres', user: adminUser, password: adminPassword }));
    const lit = `'${pass.replaceAll("'", "''")}'`;
    const role = await admin.run('SELECT 1 FROM pg_roles WHERE rolname = ?', [user]);
    await admin.exec(role.rows.length
      ? `ALTER ROLE "${user}" WITH LOGIN PASSWORD ${lit}`
      : `CREATE ROLE "${user}" WITH LOGIN PASSWORD ${lit}`);
    const exists = await admin.run('SELECT 1 FROM pg_database WHERE datname = ?', [db]);
    if (!exists.rows.length) await admin.exec(`CREATE DATABASE "${db}" OWNER "${user}"`);
    await admin.close();
  }
  console.log('[run-sql] Base de datos y usuario listos');
}

/** Vistas con `*` fijan sus columnas al crearse: refrescarlas (solo mssql) */
async function refreshViews(conn) {
  const { rows } = await conn.run(`
    SELECT QUOTENAME(SCHEMA_NAME(v."schema_id")) + '.' + QUOTENAME(v."name") AS "NOMBRE"
    FROM sys.views v WHERE OBJECTPROPERTY(v."object_id", 'IsSchemaBound') = 0`);
  for (const { NOMBRE } of rows) {
    await conn.run('EXEC sp_refreshview ?', [NOMBRE]).catch((err) => {
      console.warn(`  No se pudo refrescar ${NOMBRE}: ${err.message}`);
    });
  }
  if (rows.length) console.log(`  ${rows.length} vista(s) refrescada(s)`);
}

/** Usuarios iniciales: uno por rol. Sin clave en .env no se crea. */
const USUARIOS_INICIALES = [
  { usuario: process.env.ADMIN_USUARIO || 'admin', clave: 'ADMIN_PASSWORD', nombres: 'Administrador', rol: 'admin' },
  { usuario: 'editor', clave: 'EDITOR_PASSWORD', nombres: 'Editor', rol: 'editor' },
  { usuario: 'lector', clave: 'LECTOR_PASSWORD', nombres: 'Lector', rol: 'lector' },
];

async function seedUsuarios(conn) {
  for (const { usuario, clave, nombres, rol } of USUARIOS_INICIALES) {
    const password = process.env[clave];
    if (!password) {
      console.log(`[run-sql] ${clave} no configurado: no se crea el usuario "${usuario}".`);
      continue;
    }

    const existing = await conn.run('SELECT "ID_USUARIO" FROM "USUARIOS" WHERE "USUARIO" = ?', [usuario]);
    if (existing.rows.length) {
      console.log(`  Usuario "${usuario}" ya existe`);
      continue;
    }

    await conn.run(
      `INSERT INTO "USUARIOS" ("USUARIO", "NOMBRES", "APELLIDOS", "PASSWORD_HASH", "ACTIVO", "REQUIERE_CAMBIO_PASSWORD")
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario, nombres, null, await bcrypt.hash(password, 10), true, true]
    );
    await conn.run(
      `INSERT INTO "USUARIO_ROL" ("ID_USUARIO", "ID_ROL")
       SELECT u."ID_USUARIO", r."ID_ROL" FROM "USUARIOS" u, "ROLES" r
       WHERE u."USUARIO" = ? AND r."NOMBRE_ROL" = ?`,
      [usuario, rol]
    );
    console.log(`  Usuario "${usuario}" (${rol}) creado: deberá cambiar la clave al entrar`);
  }
}

async function main() {
  const driver = await loadDriver();
  console.log(`[run-sql] Motor: ${driver.dialect.name} · scripts: ${path.relative(process.cwd(), SQL_DIR)}`);

  await setup(driver);

  console.log(`[run-sql] Conectando a ${process.env.DB_DATABASE} como ${process.env.DB_USER}...`);
  const conn = await driver.open(driver.configFromEnv());

  const entries = await fs.readdir(SQL_DIR, { withFileTypes: true });
  const extra = entries.filter((e) => e.isDirectory() && !SKIP.has(e.name) && !FOLDER_ORDER.includes(e.name)).map((e) => e.name).sort();
  for (const dir of [...FOLDER_ORDER, ...extra]) {
    for (const file of await listSqlFiles(path.join(SQL_DIR, dir))) await runScript(conn, file);
  }

  if (driver.dialect.name === 'mssql') await refreshViews(conn);
  await seedUsuarios(conn);

  await conn.close();
  console.log('[run-sql] Listo.');
}

main().catch((err) => {
  console.error('[run-sql] Error:', err.message);
  if (DB_CLIENT === 'mssql' && (err.code === 'ESOCKET' || err.message.includes('instance'))) {
    console.error('[run-sql] No se pudo conectar a SQL Server. ¿Está activo el servicio y SQL Server Browser');
    console.error('[run-sql] (instancia nombrada) o el puerto TCP (DB_PORT)?');
  }
  process.exit(1);
});
