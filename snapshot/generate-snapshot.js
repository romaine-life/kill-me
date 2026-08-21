// Generates a SQLite snapshot of public Cosmos DB data for static frontend serving.
//
// Connects to Cosmos DB via Azure identity, queries all public document types,
// and writes them into a SQLite file that the frontend loads via sql.js (WASM).
//
// Environment variables:
//   AZURE_APP_CONFIG_ENDPOINT  - Azure App Configuration endpoint
//   APP_CONFIG_PREFIX          - App Config key prefix (e.g. "workout")
//   COSMOS_DB_ENDPOINT         - Direct Cosmos DB endpoint (skips App Config lookup)
//   COSMOS_DB_DATABASE_NAME    - Database name (default: WorkoutTrackerDB)
//   COSMOS_DB_CONTAINER_NAME   - Container name (default: workouts)
//   OUTPUT_PATH                - Output .db file path (default: ../frontend/public/snapshot.db)

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { AppConfigurationClient } from '@azure/app-configuration';
import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse --output CLI arg or use env var or default
function getOutputPath() {
  const idx = process.argv.indexOf('--output');
  if (idx !== -1 && process.argv[idx + 1]) {
    return resolve(process.argv[idx + 1]);
  }
  return resolve(process.env.OUTPUT_PATH || `${__dirname}/../frontend/public/snapshot.db`);
}

// Resolve Cosmos DB endpoint — either from env var directly or via App Configuration
async function getCosmosEndpoint(credential) {
  if (process.env.COSMOS_DB_ENDPOINT) {
    return process.env.COSMOS_DB_ENDPOINT;
  }

  const appConfigEndpoint = process.env.AZURE_APP_CONFIG_ENDPOINT;
  if (!appConfigEndpoint) {
    throw new Error('Set COSMOS_DB_ENDPOINT or AZURE_APP_CONFIG_ENDPOINT');
  }

  const client = new AppConfigurationClient(appConfigEndpoint, credential);
  const setting = await client.getConfigurationSetting({ key: 'cosmos_db_endpoint' });
  return setting.value;
}

// Schema DDL — mirrors the public document types from Cosmos DB
const SCHEMA = `
  CREATE TABLE workout_days (
    day_number    INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    focus         TEXT,
    warning       TEXT,
    primary_muscle_groups TEXT
  );

  CREATE TABLE exercises (
    id            TEXT PRIMARY KEY,
    day_number    INTEGER NOT NULL,
    name          TEXT NOT NULL,
    equipment     TEXT,
    location      TEXT,
    notes         TEXT,
    variations    TEXT,
    tags          TEXT
  );
  CREATE INDEX idx_exercises_day ON exercises(day_number);

  CREATE TABLE logged_workouts (
    id            TEXT PRIMARY KEY,
    day_number    INTEGER NOT NULL,
    day_name      TEXT,
    date          TEXT NOT NULL,
    time          TEXT,
    mode          TEXT,
    exercises     TEXT,
    timestamp     TEXT,
    created_at    TEXT
  );
  CREATE INDEX idx_logged_workouts_date ON logged_workouts(date DESC);

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- One row per (date, source workout). Several rows can share a date when the
  -- soreness from two different workouts overlaps, so date alone is not the key.
  CREATE TABLE soreness_entries (
    id                  TEXT PRIMARY KEY,
    date                TEXT NOT NULL,
    muscles             TEXT NOT NULL,
    source_workout_id   TEXT,
    source_workout_day  INTEGER,
    source_workout_date TEXT
  );
  CREATE INDEX idx_soreness_date ON soreness_entries(date DESC);
  CREATE INDEX idx_soreness_source ON soreness_entries(source_workout_id);

  CREATE TABLE cardio_sessions (
    id                TEXT PRIMARY KEY,
    date              TEXT NOT NULL,
    time              TEXT,
    activity          TEXT NOT NULL,
    duration_minutes  REAL,
    notes             TEXT,
    treadmill         TEXT,
    bike              TEXT,
    timestamp         TEXT,
    created_at        TEXT
  );
  CREATE INDEX idx_cardio_date ON cardio_sessions(date DESC);

  CREATE TABLE cardio_templates (
    template_id   TEXT PRIMARY KEY,
    activity      TEXT,
    name          TEXT NOT NULL,
    description   TEXT,
    intervals     TEXT NOT NULL,
    sort_order    INTEGER
  );

  CREATE TABLE snapshot_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

async function main() {
  const outputPath = getOutputPath();
  console.log(`Output: ${outputPath}`);

  const credential = new DefaultAzureCredential();
  const cosmosEndpoint = await getCosmosEndpoint(credential);
  console.log(`Cosmos DB endpoint: ${cosmosEndpoint}`);

  const cosmosClient = new CosmosClient({
    endpoint: cosmosEndpoint,
    aadCredentials: credential,
  });

  const databaseName = process.env.COSMOS_DB_DATABASE_NAME || 'WorkoutTrackerDB';
  const containerName = process.env.COSMOS_DB_CONTAINER_NAME || 'workouts';
  const container = cosmosClient.database(databaseName).container(containerName);

  // Query all public document types
  console.log('Querying Cosmos DB...');

  const queries = {
    workoutDays: 'SELECT * FROM c WHERE c.type = "workout-day-definition"',
    exercises: 'SELECT * FROM c WHERE c.type = "exercise"',
    loggedWorkouts: 'SELECT * FROM c WHERE c.type = "logged-workout" ORDER BY c.date DESC',
    settings: 'SELECT * FROM c WHERE c.type = "settings"',
    soreness: 'SELECT * FROM c WHERE c.type = "soreness-entry" ORDER BY c.date DESC',
    cardioSessions: 'SELECT * FROM c WHERE c.type = "cardio-session" ORDER BY c.date DESC',
    cardioTemplates: 'SELECT * FROM c WHERE c.type = "cardio-template" ORDER BY c.sortOrder',
  };

  const results = {};
  for (const [key, query] of Object.entries(queries)) {
    const { resources } = await container.items.query(query).fetchAll();
    results[key] = resources;
    console.log(`  ${key}: ${resources.length} documents`);
  }

  // Build SQLite database
  const db = new Database(outputPath);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = OFF');

  db.exec(SCHEMA);

  const insertAll = db.transaction(() => {
    // Workout days
    const insertDay = db.prepare(
      'INSERT INTO workout_days (day_number, name, focus, warning, primary_muscle_groups) VALUES (?, ?, ?, ?, ?)'
    );
    for (const doc of results.workoutDays) {
      insertDay.run(
        doc.dayNumber,
        doc.name,
        doc.focus || null,
        doc.warning || null,
        doc.primaryMuscleGroups ? JSON.stringify(doc.primaryMuscleGroups) : null,
      );
    }

    // Exercises
    const insertExercise = db.prepare(
      'INSERT INTO exercises (id, day_number, name, equipment, location, notes, variations, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const doc of results.exercises) {
      // Build variations — either from the doc's variations array or from
      // flat targetWeight/Reps/Sets (pre-migration compat)
      let variations = doc.variations;
      if (!variations || !Array.isArray(variations)) {
        const fallback = { name: 'Standard', default: true };
        if (doc.targetWeight != null) fallback.targetWeight = doc.targetWeight;
        if (doc.targetReps != null) fallback.targetReps = doc.targetReps;
        if (doc.targetSets != null) fallback.targetSets = doc.targetSets;
        variations = [fallback];
      }
      insertExercise.run(
        doc.id,
        doc.dayNumber,
        doc.name,
        doc.equipment || null,
        doc.location || null,
        doc.notes || null,
        JSON.stringify(variations),
        Array.isArray(doc.tags) ? JSON.stringify(doc.tags) : null,
      );
    }

    // Logged workouts
    const insertWorkout = db.prepare(
      'INSERT INTO logged_workouts (id, day_number, day_name, date, time, mode, exercises, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const doc of results.loggedWorkouts) {
      insertWorkout.run(
        doc.id,
        doc.dayNumber,
        doc.dayName || null,
        doc.date,
        doc.time || null,
        doc.mode || null,
        doc.exercises?.length ? JSON.stringify(doc.exercises) : null,
        doc.timestamp || null,
        doc.createdAt || null,
      );
    }

    // Settings (current day)
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    const currentDay = results.settings[0]?.currentDay || 1;
    insertSetting.run('currentDay', String(currentDay));

    // Soreness entries
    const insertSoreness = db.prepare(
      'INSERT INTO soreness_entries (id, date, muscles, source_workout_id, source_workout_day, source_workout_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const doc of results.soreness) {
      insertSoreness.run(
        doc.id,
        doc.date,
        JSON.stringify(doc.muscles),
        doc.sourceWorkoutId || null,
        doc.sourceWorkoutDay || null,
        doc.sourceWorkoutDate || null
      );
    }

    // Cardio sessions
    const insertCardio = db.prepare(
      'INSERT INTO cardio_sessions (id, date, time, activity, duration_minutes, notes, treadmill, bike, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const doc of results.cardioSessions) {
      insertCardio.run(
        doc.id,
        doc.date,
        doc.time || null,
        doc.activity,
        doc.durationMinutes || null,
        doc.notes || null,
        doc.treadmill ? JSON.stringify(doc.treadmill) : null,
        doc.bike ? JSON.stringify(doc.bike) : null,
        doc.timestamp || null,
        doc.createdAt || null,
      );
    }

    // Cardio templates (shared treadmill interval library)
    const insertTemplate = db.prepare(
      'INSERT INTO cardio_templates (template_id, activity, name, description, intervals, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const doc of results.cardioTemplates) {
      insertTemplate.run(
        doc.templateId,
        doc.activity || 'treadmill',
        doc.name,
        doc.description || null,
        JSON.stringify(Array.isArray(doc.intervals) ? doc.intervals : []),
        doc.sortOrder ?? 0,
      );
    }

    // Snapshot metadata
    const insertMeta = db.prepare('INSERT INTO snapshot_meta (key, value) VALUES (?, ?)');
    insertMeta.run('generated_at', new Date().toISOString());
  });

  insertAll();
  db.close();

  console.log(`Snapshot written to ${outputPath}`);
}

main().catch((err) => {
  console.error('Snapshot generation failed:', err);
  process.exit(1);
});
