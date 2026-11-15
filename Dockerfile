# Imagen de la API de JIIMATZIN (backend/) para Cloud Run. Se construye desde la raíz del repositorio:
#   gcloud builds submit --tag <REGION>-docker.pkg.dev/<PROYECTO>/jiimatzin/api
# La misma imagen corre las migraciones (Cloud Run Job, comando: node node_modules/node-pg-migrate/bin/node-pg-migrate.js ...).
# Guía completa: docs/07-google-cloud.md
FROM node:22-alpine AS dependencias
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/solo-pnpm.mjs scripts/
COPY backend/package.json backend/
# el frontend no tiene dependencias, pero el lockfile del workspace lo nombra
COPY frontend/package.json frontend/
# solo el backend; con sus devDependencies (node-pg-migrate) para que la imagen también migre
RUN pnpm install --frozen-lockfile --filter @jiimatzin/backend... --ignore-scripts

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY --from=dependencias /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
WORKDIR /app/backend
USER node
# Cloud Run pone PORT (8080); env.js lo lee
CMD ["node", "src/index.js"]
