import { Router } from 'express';
import { ExerciseDefaultError, withNewExerciseDefault } from './exercise-defaults.js';

/**
 * The workout model, exercises, logged workouts, and current-day tracking.
 *
 * Days are addressed by slug, not by position. The slug is a day's permanent
 * identity; its number is an attribute of whichever model version it appears in,
 * so reordering the cycle never rebinds an exercise or a log to a different day.
 *
 * Public endpoints (no auth):
 *   GET /api/workout-model
 *   GET /api/workout-days/:daySlug
 *   GET /api/exercises
 *   GET /api/exercises/day/:daySlug
 *   GET /api/logged-workouts
 *   GET /api/current-day
 *
 * Admin endpoints (requireAuth + requireAdmin):
 *   POST   /api/log-workout
 *   PUT    /api/logged-workouts/:id
 *   DELETE /api/logged-workouts/:id
 *   PUT    /api/current-day
 *   POST   /api/exercises
 *   PUT    /api/exercises/:id/default
 */
export function createWorkoutRoutes({ container, requireAuth, requireAdmin }) {
  const router = Router();

  // The active model is read on nearly every request and changes only when a
  // migration publishes a new one, so it is worth a short cache.
  const MODEL_CACHE_MS = 60_000;
  let cachedModel = null;
  let cachedAt = 0;

  async function activeModel() {
    if (cachedModel && Date.now() - cachedAt < MODEL_CACHE_MS) return cachedModel;

    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.type = @type AND c.active = true',
        parameters: [{ name: '@type', value: 'workout-model' }]
      })
      .fetchAll();

    // More than one active model means a migration published without retiring its
    // predecessor. Prefer the newest rather than picking arbitrarily.
    const model = resources.sort((a, b) => b.version - a.version)[0] ?? null;
    if (!model) throw new Error('No active workout model — the database has not been migrated');

    cachedModel = model;
    cachedAt = Date.now();
    return model;
  }

  const findDay = (model, daySlug) => model.days.find((day) => day.slug === daySlug) ?? null;

  const unknownDay = (res, model, daySlug) =>
    res.status(404).json({
      error: `Unknown day "${daySlug}" in ${model.name}.`,
      knownDays: model.days.map((day) => day.slug)
    });

  // The whole cycle in one call — days, order, names, focus, safety notes.
  router.get('/api/workout-model', async (req, res) => {
    try {
      const model = await activeModel();
      res.json({ model: { version: model.version, name: model.name, days: model.days } });
    } catch (error) {
      console.error('Error fetching workout model:', error);
      res.status(500).json({ error: 'Failed to fetch workout model', message: error.message });
    }
  });

  router.get('/api/workout-days/:daySlug', async (req, res) => {
    try {
      const model = await activeModel();
      const day = findDay(model, req.params.daySlug);
      if (!day) return unknownDay(res, model, req.params.daySlug);
      res.json({ workoutDay: day });
    } catch (error) {
      console.error('Error fetching workout day:', error);
      res.status(500).json({ error: 'Failed to fetch workout day', message: error.message });
    }
  });

  router.get('/api/exercises', async (req, res) => {
    try {
      const { resources: exercises } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.dayNumber',
          parameters: [{ name: '@type', value: 'exercise' }]
        })
        .fetchAll();
      res.json({ exercises });
    } catch (error) {
      console.error('Error fetching all exercises:', error);
      res.status(500).json({ error: 'Failed to fetch exercises', message: error.message });
    }
  });

  router.get('/api/exercises/day/:daySlug', async (req, res) => {
    try {
      const model = await activeModel();
      const day = findDay(model, req.params.daySlug);
      if (!day) return unknownDay(res, model, req.params.daySlug);

      const { resources: exercises } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.type = @type AND c.daySlug = @daySlug',
          parameters: [
            { name: '@type', value: 'exercise' },
            { name: '@daySlug', value: day.slug }
          ]
        })
        .fetchAll();

      res.json({ exercises });
    } catch (error) {
      console.error('Error fetching exercises:', error);
      res.status(500).json({ error: 'Failed to fetch exercises', message: error.message });
    }
  });

  router.get('/api/logged-workouts', async (req, res) => {
    try {
      const { resources: workouts } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.date DESC',
          parameters: [{ name: '@type', value: 'logged-workout' }]
        })
        .fetchAll();
      res.json({ workouts });
    } catch (error) {
      console.error('Error fetching logged workouts:', error);
      res.status(500).json({ error: 'Failed to fetch logged workouts', message: error.message });
    }
  });

  router.get('/api/current-day', async (req, res) => {
    try {
      const model = await activeModel();
      const { resources: settings } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.type = @type',
          parameters: [{ name: '@type', value: 'settings' }]
        })
        .fetchAll();

      // Defensive: if more than one settings document exists (a leftover from a
      // duplicate identity), prefer the most recently updated so the pointer is
      // stable rather than an arbitrary cross-partition hit.
      const latest = settings
        .slice()
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];

      const daySlug = findDay(model, latest?.currentDaySlug)
        ? latest.currentDaySlug
        : model.days[0].slug;

      res.json({ currentDaySlug: daySlug });
    } catch (error) {
      console.error('Error fetching current day:', error);
      res.status(500).json({ error: 'Failed to fetch current day', message: error.message });
    }
  });

  router.post('/api/log-workout', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const model = await activeModel();
      const { daySlug, mode, date, time, exercises: completedExercises } = req.body;

      const day = findDay(model, daySlug);
      if (!day) return unknownDay(res, model, daySlug);

      const today = date || new Date().toISOString().split('T')[0];

      // The log records what happened, including what the day was called at the time.
      // Nothing later — a rename, a reorder, a new model — may reach back and edit it.
      const workoutDoc = {
        id: `logged-workout-${today}-${day.slug}-${Date.now()}`,
        type: 'logged-workout',
        userId,
        daySlug: day.slug,
        dayNumber: day.number,
        dayName: day.name,
        modelVersion: model.version,
        date: today,
        time: time || null,
        mode: mode || 'quick',
        exercises: completedExercises || [],
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const { resource } = await container.items.create(workoutDoc);

      // Advance the pointer if this was the day you were on. The wrap comes from the
      // model's own length rather than a literal, so it follows the cycle.
      let advancedTo = null;
      const { resources: settings } = await container.items
        .query(
          {
            query: 'SELECT * FROM c WHERE c.type = @type AND c.userId = @userId',
            parameters: [
              { name: '@type', value: 'settings' },
              { name: '@userId', value: userId }
            ]
          },
          { partitionKey: userId }
        )
        .fetchAll();

      const currentSlug = settings[0]?.currentDaySlug ?? model.days[0].slug;
      if (day.slug === currentSlug) {
        const index = model.days.findIndex((d) => d.slug === currentSlug);
        const next = model.days[(index + 1) % model.days.length];
        await container.items.upsert({
          ...settings[0],
          id: `settings_${userId}`,
          userId,
          type: 'settings',
          currentDaySlug: next.slug,
          updatedAt: new Date().toISOString()
        });
        advancedTo = next.slug;
      }

      res.status(201).json({ workout: resource, advancedTo });
    } catch (error) {
      console.error('Error logging workout:', error);
      res.status(500).json({ error: 'Failed to log workout', message: error.message });
    }
  });

  router.put('/api/logged-workouts/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { date, time, daySlug, mode, exercises: updatedExercises } = req.body;

      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
          parameters: [
            { name: '@id', value: id },
            { name: '@type', value: 'logged-workout' }
          ]
        })
        .fetchAll();

      if (resources.length === 0) return res.status(404).json({ error: 'Workout not found' });

      const existing = resources[0];

      // Moving a log to a different day rewrites its label too, because the label is
      // meant to describe the day it records.
      let dayFields = {};
      if (daySlug !== undefined && daySlug !== existing.daySlug) {
        const model = await activeModel();
        const day = findDay(model, daySlug);
        if (!day) return unknownDay(res, model, daySlug);
        dayFields = {
          daySlug: day.slug,
          dayNumber: day.number,
          dayName: day.name,
          modelVersion: model.version
        };
      }

      const updated = {
        ...existing,
        ...(date !== undefined && { date }),
        ...(time !== undefined && { time }),
        ...(mode !== undefined && { mode }),
        ...(updatedExercises !== undefined && { exercises: updatedExercises }),
        ...dayFields,
        updatedAt: new Date().toISOString()
      };

      const { resource } = await container.item(id, existing.userId).replace(updated);
      res.json({ workout: resource });
    } catch (error) {
      console.error('Error updating workout:', error);
      res.status(500).json({ error: 'Failed to update workout', message: error.message });
    }
  });

  router.delete('/api/logged-workouts/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
          parameters: [
            { name: '@id', value: id },
            { name: '@type', value: 'logged-workout' }
          ]
        })
        .fetchAll();

      if (resources.length === 0) return res.status(404).json({ error: 'Workout not found' });

      await container.item(id, resources[0].userId).delete();
      res.status(204).send();
    } catch (error) {
      if (error.code === 404) return res.status(404).json({ error: 'Workout not found' });
      console.error('Error deleting workout:', error);
      res.status(500).json({ error: 'Failed to delete workout', message: error.message });
    }
  });

  router.put('/api/current-day', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const model = await activeModel();
      const { currentDaySlug } = req.body;

      const day = findDay(model, currentDaySlug);
      if (!day) return unknownDay(res, model, currentDaySlug);

      const { resource } = await container.items.upsert({
        id: `settings_${userId}`,
        userId,
        type: 'settings',
        currentDaySlug: day.slug,
        updatedAt: new Date().toISOString()
      });

      res.json({ currentDaySlug: resource.currentDaySlug });
    } catch (error) {
      console.error('Error updating current day:', error);
      res.status(500).json({ error: 'Failed to update current day', message: error.message });
    }
  });

  router.post('/api/exercises', requireAuth, requireAdmin, async (req, res) => {
    try {
      const model = await activeModel();
      const { daySlug, name, equipment, location, notes, variations, tags } = req.body;

      if (!daySlug || !name) {
        return res.status(400).json({ error: 'Missing required fields: daySlug and name' });
      }

      const day = findDay(model, daySlug);
      if (!day) return unknownDay(res, model, daySlug);

      const exerciseDoc = {
        id: `exercise-${day.slug}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        type: 'exercise',
        userId: 'shared',
        daySlug: day.slug,
        dayNumber: day.number,
        name,
        equipment: equipment || '',
        location: location || '',
        notes: notes || '',
        tags: Array.isArray(tags) ? tags : [],
        variations:
          variations && variations.length > 0
            ? variations
            : [{ name: 'Standard', default: true, targetWeight: null, targetReps: null, targetSets: null }],
        createdAt: new Date().toISOString()
      };

      const { resource } = await container.items.upsert(exerciseDoc);
      res.status(201).json({ exercise: resource });
    } catch (error) {
      console.error('Error creating exercise:', error);
      res.status(500).json({ error: 'Failed to create exercise', message: error.message });
    }
  });

  // Promote one variation and its just-entered workout values to the defaults
  // used the next time this exercise is logged. Historical workouts are separate
  // documents and are deliberately untouched.
  router.put('/api/exercises/:id/default', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
          parameters: [
            { name: '@id', value: req.params.id },
            { name: '@type', value: 'exercise' },
          ],
        })
        .fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      const updated = withNewExerciseDefault(
        resources[0],
        req.body.variationName,
        req.body.values,
      );
      const { resource } = await container
        .item(updated.id, updated.userId)
        .replace(updated);

      res.json({ exercise: resource });
    } catch (error) {
      if (error instanceof ExerciseDefaultError) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Error updating exercise default:', error);
      res.status(500).json({ error: 'Failed to update exercise default', message: error.message });
    }
  });

  return router;
}
