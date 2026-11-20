import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import executeHandler from './api/execute.js';
import healthHandler from './api/health.js';
import authHandler from './api/auth/[...path].js';
import eventosHandler from './api/eventos/[...path].js';
import expedientesHandler from './api/expedientes/[...path].js';
import DatabaseManager, { DB_CLIENT } from './lib/database/DatabaseManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.JWT_SECRET) {
  console.error('[server] Falta JWT_SECRET en .env');
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Rutas API (handlers estilo Vercel: (req, res) con res.status().json()).
// Con app.use, dentro del handler req.url ya viene sin el prefijo.
app.all('/api/execute', executeHandler);
app.all('/api/health', healthHandler);
app.use('/api/auth', authHandler);
app.use('/api/eventos', eventosHandler);
app.use('/api/expedientes', expedientesHandler);

// 404 para rutas /api desconocidas
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// En producción, servir el build del frontend si existe
const distDir = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('[server] Error no manejado:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`[server] API en http://localhost:${PORT} (BD: ${DB_CLIENT})`);
  console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
});

// Cierre limpio del pool
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await DatabaseManager.close().catch(() => {});
    process.exit(0);
  });
}
