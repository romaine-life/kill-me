// Per-app backend for workout.romaine.life. Serves the Vite-built React frontend,
// the kill-me route package under /*, and the auth.romaine.life delegation
// exchange under /api/auth/* on the same origin.
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import {
  createWorkoutRoutes,
  createSorenessRoutes,
  createCardioRoutes,
  createAdminRoutes,
} from './routes/index.js';
import { createRequireAuth, requireAdmin } from './auth.js';
import { createAuthRoutes } from './auth-routes.js';
import { fetchConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Vite emits built assets to frontend/dist/. Multi-stage Dockerfile copies
// that into /app/frontend/dist.
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'dist');

const app = express();
const PORT = process.env.PORT || 3000;
let serverReady = false;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

app.use((req, res, next) => {
  if (serverReady || req.path === '/health') return next();
  res.status(503).json({ error: 'Starting' });
});

app.get('/health', (req, res) => {
  if (!serverReady) return res.status(503).json({ status: 'starting' });
  res.json({ status: 'healthy' });
});

async function start() {
  const config = await fetchConfig();

  const credential = new DefaultAzureCredential();
  const cosmosClient = new CosmosClient({
    endpoint: config.cosmosDbEndpoint,
    aadCredentials: credential,
  });
  const workoutContainer = cosmosClient.database('WorkoutTrackerDB').container('workouts');

  const requireAuth = createRequireAuth({ jwtSecret: config.jwtSigningSecret });

  app.use(createAuthRoutes({ jwtSecret: config.jwtSigningSecret, requireAuth }));
  app.use(createWorkoutRoutes({ container: workoutContainer, requireAuth, requireAdmin }));
  app.use(createSorenessRoutes({ container: workoutContainer, requireAuth, requireAdmin }));
  app.use(createCardioRoutes({ container: workoutContainer, requireAuth, requireAdmin }));
  app.use(createAdminRoutes({
    container: workoutContainer,
    cosmosDbEndpoint: config.cosmosDbEndpoint,
    databaseName: 'WorkoutTrackerDB',
    containerName: 'workouts',
    requireAuth,
    requireAdmin,
  }));

  app.use(express.static(FRONTEND_DIR));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  serverReady = true;
  console.log(`[kill-me] ready on port ${PORT}`);
}

app.listen(PORT, () => {
  start().catch((err) => {
    console.error('[kill-me] fatal startup error:', err);
    process.exit(1);
  });
});

export default app;
