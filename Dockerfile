# ── Stage 1: build the Vite frontend ──────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install frontend deps first (cache layer — only invalidated on lockfile change).
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source, then build.
COPY frontend/ ./

# BUILD_NUMBER overrides vite.config.js's `execSync('git rev-parse')` fallback
# — git isn't available in this stage, and that's fine.
ARG BUILD_NUMBER=dev
ENV BUILD_NUMBER=$BUILD_NUMBER

RUN npm run build

# ── Stage 2: runtime — Node + Express serves frontend/dist + /api + /auth ─
FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json backend/
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
