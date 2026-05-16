// Per-app backend for workout.romaine.life. Serves the Vite-built React
// frontend + the kill-me route package on the same origin.
//
// Auth: the .romaine.life session cookie is the durable session, owned by
// auth.romaine.life. requireAuth (backend/auth.js) forwards the cookie
// upstream on each request and gates on role. No local JWT signing, no
// per-app KV secret, no frontend token storage.
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
import { createRequireAuth, requireAdmin, currentCaller } from './auth.js';
import { fetchConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

// Boot-time "am I signed in?" probe used by the frontend. Returns null if
// no valid session (rather than 401), so the SPA can simply render the
// Sign-in button without treating the missing session as an error.
app.get('/api/auth/me', async (req, res) => {
  const user = await currentCaller(req);
  res.json(user);
});

async function start() {
  const config = await fetchConfig();

  const credential = new DefaultAzureCredential();
  const cosmosClient = new CosmosClient({
    endpoint: config.cosmosDbEndpoint,
    aadCredentials: credential,
  });
  const workoutContainer = cosmosClient.database('WorkoutTrackerDB').container('workouts');

  const requireAuth = createRequireAuth();

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
