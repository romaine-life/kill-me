import { Router } from 'express';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { workoutDays, loggedWorkouts, exercises } from '../data/seed-data.js';
import { sorenessSeedData } from '../data/seed-soreness.js';
import { cardioTemplates } from '../data/seed-cardio-templates.js';

const LEGACY_USER_ID = 'cf57d57d-1411-4f59-b517-e9a8600b140a';

/**
 * Admin routes for database initialization and data migration.
 *
 *   POST /api/admin/init-database
 *   POST /api/admin/migrate-data
 *   POST /api/admin/seed-soreness
 *   POST /api/admin/migrate-exercise-variations
 */
export function createAdminRoutes({ container, cosmosDbEndpoint, databaseName, containerName, requireAuth, requireAdmin }) {
  const router = Router();

  // Database initialization — seeds 12-day cycle, historical workouts, exercise library.
  router.post('/api/admin/init-database', requireAuth, requireAdmin, async (req, res) => {
    try {
      const credential = new DefaultAzureCredential();
      const client = new CosmosClient({
        endpoint: cosmosDbEndpoint,
        aadCredentials: credential
      });

      const { database } = await client.databases.createIfNotExists({ id: databaseName });
      const { container: newContainer } = await database.containers.createIfNotExists({
        id: containerName,
        partitionKey: { paths: ['/userId'] }
      });

      const seededData = { workoutDays: 0, loggedWorkouts: 0, exercises: 0, cardioTemplates: 0 };

      // Clean up old workout day definitions
      try {
        const { resources: oldDays } = await newContainer.items
          .query('SELECT c.id, c.userId FROM c WHERE c.type = "workout-day-definition"')
          .fetchAll();
        for (const old of oldDays) {
          try { await newContainer.item(old.id, old.userId ?? undefined).delete(); } catch { /* ignore */ }
        }
      } catch (cleanupErr) {
        console.error('Day definition cleanup failed (non-fatal):', cleanupErr.message);
      }

      for (const day of workoutDays) {
        try {
          const dayDoc = {
            id: `workout-day-${day.dayNumber}`,
            type: 'workout-day-definition',
            userId: 'shared',
            ...day,
            createdAt: new Date().toISOString()
          };
          await newContainer.items.upsert(dayDoc);
          seededData.workoutDays++;
        } catch (err) {
          console.error(`Failed to seed workout day ${day.dayNumber}:`, err.message);
        }
      }

      for (const workout of loggedWorkouts) {
        try {
          const workoutDoc = {
            id: `logged-workout-${workout.date}-day${workout.dayNumber}`,
            type: 'logged-workout',
            userId: workout.userId,
            dayNumber: workout.dayNumber,
            dayName: workout.dayName,
            date: workout.date,
            timestamp: new Date(workout.date).toISOString(),
            createdAt: new Date().toISOString()
          };
          await newContainer.items.upsert(workoutDoc);
          seededData.loggedWorkouts++;
        } catch (err) {
          console.error(`Failed to seed logged workout for ${workout.date}:`, err.message);
        }
      }

      // Delete old exercise documents then re-seed
      try {
        const { resources: oldExercises } = await newContainer.items
          .query('SELECT c.id, c.userId FROM c WHERE c.type = "exercise"')
          .fetchAll();
        for (const old of oldExercises) {
          try { await newContainer.item(old.id, old.userId ?? undefined).delete(); } catch { /* ignore */ }
        }
        console.log(`Cleaned up ${oldExercises.length} old exercise documents`);
      } catch (cleanupErr) {
        console.error('Exercise cleanup failed (non-fatal):', cleanupErr.message);
      }

      for (const exercise of exercises) {
        try {
          const exerciseDoc = {
            id: `exercise-${exercise.dayNumber}-${exercise.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            type: 'exercise',
            userId: 'shared',
            ...exercise,
            createdAt: new Date().toISOString()
          };
          await newContainer.items.upsert(exerciseDoc);
          seededData.exercises++;
        } catch (err) {
          console.error(`Failed to seed exercise ${exercise.name}:`, err.message);
        }
      }

      // Delete old cardio-template documents then re-seed (idempotent)
      try {
        const { resources: oldTemplates } = await newContainer.items
          .query('SELECT c.id, c.userId FROM c WHERE c.type = "cardio-template"')
          .fetchAll();
        for (const old of oldTemplates) {
          try { await newContainer.item(old.id, old.userId ?? undefined).delete(); } catch { /* ignore */ }
        }
      } catch (cleanupErr) {
        console.error('Cardio template cleanup failed (non-fatal):', cleanupErr.message);
      }

      for (const template of cardioTemplates) {
        try {
          const templateDoc = {
            id: `cardio-template-${template.templateId}`,
            type: 'cardio-template',
            userId: 'shared',
            ...template,
            createdAt: new Date().toISOString()
          };
          await newContainer.items.upsert(templateDoc);
          seededData.cardioTemplates++;
        } catch (err) {
          console.error(`Failed to seed cardio template ${template.templateId}:`, err.message);
        }
      }

      res.json({
        success: true,
        message: 'Database initialized and seeded successfully',
        database: databaseName,
        container: containerName,
        seeded: seededData
      });
    } catch (error) {
      console.error('Error initializing database:', error);
      res.status(500).json({ success: false, error: 'Failed to initialize database', message: error.message });
    }
  });

  // Re-partition documents from legacy userId to authenticated user's Microsoft userId.
  router.post('/api/admin/migrate-data', requireAuth, requireAdmin, async (req, res) => {
    try {
      const newUserId = req.user.sub;

      const { resources: oldDocs } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: LEGACY_USER_ID }]
        }, { partitionKey: LEGACY_USER_ID })
        .fetchAll();

      let migrated = 0;
      const errors = [];

      for (const doc of oldDocs) {
        try {
          const { _rid, _self, _etag, _attachments, _ts, ...cleanDoc } = doc;
          const newDoc = { ...cleanDoc, userId: newUserId };
          if (doc.type === 'settings') newDoc.id = `settings_${newUserId}`;

          await container.items.upsert(newDoc);
          await container.item(doc.id, LEGACY_USER_ID).delete();
          migrated++;
        } catch (err) {
          errors.push({ id: doc.id, error: err.message });
        }
      }

      res.json({
        success: true,
        migrated,
        errors: errors.length > 0 ? errors : undefined,
        message: `Migrated ${migrated} documents from legacy userId to ${newUserId}`
      });
    } catch (error) {
      console.error('Error migrating data:', error);
      res.status(500).json({ error: 'Failed to migrate data', message: error.message });
    }
  });

  // Seed soreness journal from spreadsheet data.
  router.post('/api/admin/seed-soreness', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      let seeded = 0;
      const errors = [];

      for (const entry of sorenessSeedData) {
        try {
          const doc = {
            id: `soreness-${entry.date}`,
            type: 'soreness-entry',
            userId,
            date: entry.date,
            muscles: entry.muscles,
            updatedAt: new Date().toISOString(),
          };
          await container.items.upsert(doc);
          seeded++;
        } catch (err) {
          errors.push({ date: entry.date, error: err.message });
        }
      }

      res.json({
        success: true,
        message: `Seeded ${seeded} soreness entries`,
        seeded,
        total: sorenessSeedData.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Error seeding soreness data:', error);
      res.status(500).json({ error: 'Failed to seed soreness data', message: error.message });
    }
  });

  // Migrate exercise documents to the variations model.
  router.post('/api/admin/migrate-exercise-variations', requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = { exercises: { found: 0, migrated: 0 }, workouts: { found: 0, migrated: 0 }, errors: [] };

      const { resources: exerciseDocs } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.type = @type',
        parameters: [{ name: '@type', value: 'exercise' }]
      }).fetchAll();
      stats.exercises.found = exerciseDocs.length;

      for (const doc of exerciseDocs) {
        try {
          if (doc.variations && Array.isArray(doc.variations)) continue;
          const variation = { name: 'Standard', default: true };
          if (doc.targetWeight != null) variation.targetWeight = doc.targetWeight;
          if (doc.targetReps != null) variation.targetReps = doc.targetReps;
          if (doc.targetSets != null) variation.targetSets = doc.targetSets;

          const { _rid, _self, _etag, _attachments, _ts, ...cleanDoc } = doc;
          delete cleanDoc.targetWeight;
          delete cleanDoc.targetReps;
          delete cleanDoc.targetSets;
          cleanDoc.variations = [variation];

          await container.items.upsert(cleanDoc);
          stats.exercises.migrated++;
        } catch (err) {
          stats.errors.push({ id: doc.id, type: 'exercise', error: err.message });
        }
      }

      const { resources: workoutDocs } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.type = @type',
        parameters: [{ name: '@type', value: 'logged-workout' }]
      }).fetchAll();
      stats.workouts.found = workoutDocs.length;

      for (const doc of workoutDocs) {
        try {
          if (!doc.exercises || !Array.isArray(doc.exercises) || doc.exercises.length === 0) continue;
          let needsUpdate = false;
          const updatedExercises = doc.exercises.map(ex => {
            if (!ex.variation) { needsUpdate = true; return { ...ex, variation: 'Standard' }; }
            return ex;
          });
          if (!needsUpdate) continue;

          const { _rid, _self, _etag, _attachments, _ts, ...cleanDoc } = doc;
          cleanDoc.exercises = updatedExercises;
          await container.items.upsert(cleanDoc);
          stats.workouts.migrated++;
        } catch (err) {
          stats.errors.push({ id: doc.id, type: 'logged-workout', error: err.message });
        }
      }

      res.json({
        success: true,
        message: `Migrated ${stats.exercises.migrated}/${stats.exercises.found} exercises, ${stats.workouts.migrated}/${stats.workouts.found} workouts`,
        stats,
        errors: stats.errors.length > 0 ? stats.errors : undefined,
      });
    } catch (error) {
      console.error('Error migrating exercise variations:', error);
      res.status(500).json({ error: 'Failed to migrate exercise variations', message: error.message });
    }
  });

  return router;
}
