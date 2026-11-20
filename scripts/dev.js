/**
 * Desarrollo en un solo comando: backend (:3001, node --watch) + frontend (:5173, Vite).
 * Uso: npm run dev   ·  solo uno: npm run dev:api / npm run dev:web
 * Si un proceso termina, se cierra el otro. Ctrl+C cierra ambos.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');

if (!existsSync(path.join(frontend, 'node_modules'))) {
  console.error('[dev] Falta instalar el frontend: cd frontend && npm install');
  process.exit(1);
}

const procesos = [
  { nombre: 'api', color: 36, cmd: 'node', args: ['--watch', 'server.js'], cwd: root },
  { nombre: 'web', color: 35, cmd: 'npm', args: ['run', 'dev'], cwd: frontend },
];

const hijos = procesos.map(({ nombre, color, cmd, args, cwd }) => {
  const prefijo = `\x1b[${color}m[${nombre}]\x1b[0m `;
  // Comando como texto con shell (npm en Windows es .cmd); los argumentos son fijos
  const hijo = spawn([cmd, ...args].join(' '), { cwd, shell: true, env: { ...process.env, FORCE_COLOR: '1' } });
  const salida = (destino) => (data) => {
    for (const linea of data.toString().split(/\r?\n/)) if (linea) destino.write(prefijo + linea + '\n');
  };
  hijo.stdout.on('data', salida(process.stdout));
  hijo.stderr.on('data', salida(process.stderr));
  hijo.on('exit', (code) => {
    console.log(`${prefijo}terminó (código ${code ?? 0})`);
    cerrar(code ?? 0);
  });
  return hijo;
});

let cerrando = false;
function cerrar(code = 0) {
  if (cerrando) return;
  cerrando = true;
  for (const h of hijos) {
    if (h.exitCode !== null) continue;
    // Con shell hay que matar el árbol (cmd → npm → vite) en Windows
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(h.pid), '/T', '/F']);
    else h.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => cerrar(0));
process.on('SIGTERM', () => cerrar(0));
