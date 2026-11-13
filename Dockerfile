# ── Stage 1: build the Vite frontend ──────────────────────────────────────
FROM artifacts.home.romaine.life/dockerhub/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS frontend-builder

WORKDIR /build/frontend

# Install frontend deps first (cache layer — only invalidated on lockfile change).
COPY frontend/package*.json ./
ENV NPM_CONFIG_REGISTRY=https://artifacts.home.romaine.life/npm/npm/
RUN npm ci

# Copy frontend source, then build.
COPY frontend/ ./

# The source-content fingerprint is stable when a PR-built image is reused after
# merge. The frontend compares this identity with /api/version to detect an old
# browser tab after a new image is deployed.
ARG APP_BUILD_ID=dev
ENV APP_BUILD_ID=$APP_BUILD_ID

RUN npm run build

# ── Stage 2: runtime — Node + Express serves frontend/dist + /api ────────
FROM artifacts.home.romaine.life/dockerhub/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293

WORKDIR /app

COPY backend/package*.json backend/
ARG NPM_CONFIG_REGISTRY=https://artifacts.home.romaine.life/npm/npm/
RUN cd backend && npm install --omit=dev

# Bring the built frontend and the backend source into the runtime image.
COPY --from=frontend-builder /build/frontend/dist frontend/dist
COPY backend/ backend/

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "backend/server.js"]
