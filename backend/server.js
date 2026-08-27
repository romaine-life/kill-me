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
} from './routes/index.js';
import { createRequireAuth, requireAdmin, currentCaller } from './auth.js';
import { fetchConfig } from './config.js';
import { runMigrations, pendingMigrations } from './migrations/runner.js';
import { getVersionInfo } from './version.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'dist');
const FRONTEND_ASSETS_DIR = path.join(FRONTEND_DIR, 'assets');

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

// Public, non-cached deployment identity. An already-open frontend polls this
// endpoint and offers a reload when its immutable build no longer matches the
// image currently serving the API.
app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.json(getVersionInfo());
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

  // Migrations run before any route is mounted, and the 503 gate above keeps traffic
  // out until they finish. A failure here throws, which exits the process and fails the
  // deploy — a half-migrated database serving requests is worse than a rollout that stops.
  //
  // Only in the cluster, though. Local development runs against the live database, so
  // auto-applying on `npm run dev` would let a half-written migration reach production
  // just because someone started their dev server. Locally it reports and waits.
  if (process.env.RUN_MIGRATIONS_ON_BOOT === 'true') {
    await runMigrations({ container: workoutContainer });
  } else {
    const pending = await pendingMigrations({ container: workoutContainer });
    if (pending.length > 0) {
      console.warn(
        `[kill-me] ${pending.length} migration(s) pending and not applied here: ` +
        `${pending.map((m) => m.file).join(', ')}. ` +
        `Preview with \`npm run migrate:dry-run\`; they apply on deploy.`
      );
    }
  }

  const requireAuth = createRequireAuth();

  app.use(createWorkoutRoutes({ container: workoutContainer, requireAuth, requireAdmin }));
  app.use(createSorenessRoutes({ container: workoutContainer, requireAuth, requireAdmin }));
  app.use(createCardioRoutes({ container: workoutContainer, requireAuth, requireAdmin }));

  // Hashed Vite assets are immutable. Keep their routing separate so a stale
  // document requesting a removed hash receives a real 404 instead of the SPA
  // HTML shell (which browsers reject as the wrong JS/CSS MIME type).
  app.use('/assets', express.static(FRONTEND_ASSETS_DIR, {
    immutable: true,
    maxAge: '1y',
  }));
  app.use('/assets', (req, res) => {
    res.status(404).type('text/plain').send('Asset not found');
  });

  app.use(express.static(FRONTEND_DIR, {
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-store');
      }
    },
  }));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Missing static files must stay missing. Only extensionless browser routes
  // are eligible for the History API fallback.
  app.get(/.*\.[^/]+$/, (req, res) => {
    res.status(404).type('text/plain').send('File not found');
  });
  app.get(/.*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
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
