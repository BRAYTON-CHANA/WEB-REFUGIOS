import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  root: '.',
  build: {
    outDir: 'dist',
    // exceljs (~940 kB) va en su propio chunk y solo se carga al exportar
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    // Solo esta PC. Para abrir desde otras PCs/celular de la red: host: true
    host: 'localhost',
    proxy: {
      // API Express local (server.js en la raíz del proyecto)
      '/api': process.env.VITE_PROXY_API || 'http://localhost:3001',
    }
  }
})
