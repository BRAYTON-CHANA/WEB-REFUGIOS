# Imagen para Cloud Run (o cualquier host con contenedores).
# 1) compila el frontend (Vite) · 2) imagen final solo con el backend + frontend/dist.
# Express sirve la API en /api y el frontend compilado en el resto de rutas.
# Variables (DB_*, JWT_SECRET, SUPABASE_*…) se configuran en el servicio, no en la imagen.

FROM node:22-alpine AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY api ./api
COPY lib ./lib
COPY --from=web /app/frontend/dist ./frontend/dist
USER node
# Cloud Run pasa PORT (8080); server.js lo lee
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
