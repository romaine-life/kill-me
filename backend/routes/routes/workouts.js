import { Router } from 'express';
import { workoutDays } from '../data/seed-data.js';

// Cycle length comes from the seeded day definitions, so the route bounds follow
// the cycle instead of a literal that has to be remembered separately.
const MAX_DAY = workoutDays.length;

/**
 * Workout day definitions, exercises, logged workouts, and current-day tracking.
 *
 * Public endpoints (no auth):
 *   GET /api/workout-days/:dayNumber
 *   GET /api/exercises
 *   GET /api/exercises/day/:dayNumber
 *   GET /api/logged-workouts
 *   GET /api/current-day
 *
 * Admin endpoints (requireAuth + requireAdmin):
 *   POST /api/log-workout
 *   PUT  /api/logged-workouts/:id
 *   DELETE /api/logged-workouts/:id
 *   PUT  /api/current-day
 *   POST /api/exercises
 */
export function createWorkoutRoutes({ container, requireAuth, requireAdmin }) {
  const router = Router();

  // Get workout day definition by day number
  router.get('/api/workout-days/:dayNumber', async (req, res) => {
    try {
      const dayNumber = parseInt(req.params.dayNumber);

      if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > MAX_DAY) {
        return res.status(400).json({ error: `Invalid day number. Must be between 1 and ${MAX_DAY}.` });
      }

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type AND c.dayNumber = @dayNumber',
        parameters: [
          { name: '@type', value: 'workout-day-definition' },
          { name: '@dayNumber', value: dayNumber }
        ]
      };

      const { resources } = await container.items.query(querySpec).fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: 'Workout day not found' });
      }

      res.json({ workoutDay: resources[0] });
    } catch (error) {
      console.error('Error fetching workout day:', error);
      res.status(500).json({ error: 'Failed to fetch workout day', message: error.message });
    }
  });

  // Get all exercises across all days (public).
  router.get('/api/exercises', async (req, res) => {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.dayNumber',
        parameters: [
          { name: '@type', value: 'exercise' }
        ]
      };

      const { resources: exercises } = await container.items.query(querySpec).fetchAll();

      res.json({ exercises });
    } catch (error) {
      console.error('Error fetching all exercises:', error);
      res.status(500).json({ error: 'Failed to fetch exercises', message: error.message });
    }
  });

  // Get exercises for a specific day
  router.get('/api/exercises/day/:dayNumber', async (req, res) => {
    try {
      const dayNumber = parseInt(req.params.dayNumber);

      if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > MAX_DAY) {
        return res.status(400).json({ error: `Invalid day number. Must be between 1 and ${MAX_DAY}.` });
      }

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type AND c.dayNumber = @dayNumber',
        parameters: [
          { name: '@type', value: 'exercise' },
          { name: '@dayNumber', value: dayNumber }
        ]
      };

      const { resources: exercises } = await container.items.query(querySpec).fetchAll();

      res.json({ exercises });
    } catch (error) {
      console.error('Error fetching exercises:', error);
      res.status(500).json({ error: 'Failed to fetch exercises', message: error.message });
    }
  });

  // Get all logged workouts (public).
  router.get('/api/logged-workouts', async (req, res) => {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.date DESC',
        parameters: [
          { name: '@type', value: 'logged-workout' }
        ]
      };

      const { resources: workouts } = await container.items.query(querySpec).fetchAll();

      res.json({ workouts });
    } catch (error) {
      console.error('Error fetching logged workouts:', error);
      res.status(500).json({ error: 'Failed to fetch logged workouts', message: error.message });
    }
  });

  // Get current day in the 12-day cycle (public).
  router.get('/api/current-day', async (req, res) => {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type',
        parameters: [
          { name: '@type', value: 'settings' }
        ]
      };

      const { resources: settings } = await container.items.query(querySpec).fetchAll();

      // Defensive: if more than one settings doc exists (e.g. leftover from a
      // legacy/duplicate identity), prefer the most recently updated so the
      // "current day" pointer is stable instead of an arbitrary cross-partition hit.
      const latest = settings
        .slice()
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
      const currentDay = Number(latest?.currentDay) || 1;
      res.json({ currentDay });
    } catch (error) {
      console.error('Error fetching current day:', error);
      res.status(500).json({ error: 'Failed to fetch current day', message: error.message });
    }
  });

  // Log a completed workout.
  router.post('/api/log-workout', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { dayNumber, dayName, mode, date, time, exercises: completedExercises } = req.body;

      if (!dayNumber) {
        return res.status(400).json({ error: 'Missing required field: dayNumber' });
      }

      const today = date || new Date().toISOString().split('T')[0];

      const workoutDoc = {
        id: `logged-workout-${today}-day${dayNumber}-${Date.now()}`,
        type: 'logged-workout',
        userId,
        dayNumber,
        dayName,
        date: today,
        time: time || null,
        mode: mode || 'quick',
        exercises: completedExercises || [],
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const { resource } = await container.items.create(workoutDoc);

      // Auto-advance currentDay if the logged workout matches the current day.
      // Scope the lookup to THIS user (partition) so we never read another
      // identity's pointer, and always key the upsert on settings_<userId> so a
      // stray/legacy doc id can't spawn a duplicate settings document.
      let advancedTo = null;
      const { resources: settings } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.type = @type AND c.userId = @userId',
        parameters: [
          { name: '@type', value: 'settings' },
          { name: '@userId', value: userId }
        ]
      }, { partitionKey: userId }).fetchAll();
      const currentDay = Number(settings[0]?.currentDay) || 1;
      if (Number(dayNumber) === currentDay) {
        const nextDay = currentDay >= 12 ? 1 : currentDay + 1;
        await container.items.upsert({
          ...settings[0],
          id: `settings_${userId}`,
          userId,
          type: 'settings',
          currentDay: nextDay,
          updatedAt: new Date().toISOString()
        });
        advancedTo = nextDay;
      }

      res.status(201).json({ workout: resource, advancedTo });
    } catch (error) {
      console.error('Error logging workout:', error);
      res.status(500).json({ error: 'Failed to log workout', message: error.message });
    }
  });

  // Update a logged workout
  router.put('/api/logged-workouts/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { date, time, dayNumber, dayName, mode, exercises: updatedExercises } = req.body;

      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
        parameters: [
          { name: '@id', value: id },
          { name: '@type', value: 'logged-workout' }
        ]
      }).fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: 'Workout not found' });
      }

      const existing = resources[0];
      const updated = {
        ...existing,
        ...(date !== undefined && { date }),
        ...(time !== undefined && { time }),
        ...(dayNumber !== undefined && { dayNumber }),
        ...(dayName !== undefined && { dayName }),
        ...(mode !== undefined && { mode }),
        ...(updatedExercises !== undefined && { exercises: updatedExercises }),
        updatedAt: new Date().toISOString()
      };

      const { resource } = await container.item(id, existing.userId).replace(updated);
      res.json({ workout: resource });
    } catch (error) {
      console.error('Error updating workout:', error);
      res.status(500).json({ error: 'Failed to update workout', message: error.message });
    }
  });

  // Delete a logged workout
  router.delete('/api/logged-workouts/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
        parameters: [
          { name: '@id', value: id },
          { name: '@type', value: 'logged-workout' }
        ]
      }).fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: 'Workout not found' });
      }

      await container.item(id, resources[0].userId).delete();
      res.status(204).send();
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Workout not found' });
      }
      console.error('Error deleting workout:', error);
      res.status(500).json({ error: 'Failed to delete workout', message: error.message });
    }
  });

  // Update current day in the 12-day cycle
  router.put('/api/current-day', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const currentDay = Number(req.body.currentDay);

      if (!currentDay || currentDay < 1 || currentDay > MAX_DAY) {
        return res.status(400).json({ error: `Invalid day number. Must be between 1 and ${MAX_DAY}.` });
      }

      const settingsDoc = {
        id: `settings_${userId}`,
        userId,
        type: 'settings',
        currentDay,
        updatedAt: new Date().toISOString()
      };

      const { resource } = await container.items.upsert(settingsDoc);
      res.json({ currentDay: resource.currentDay });
    } catch (error) {
      console.error('Error updating current day:', error);
      res.status(500).json({ error: 'Failed to update current day', message: error.message });
    }
  });

  // Add a new exercise to a day (admin only).
  router.post('/api/exercises', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { dayNumber, name, equipment, location, notes, variations, tags } = req.body;

      if (!dayNumber || !name) {
        return res.status(400).json({ error: 'Missing required fields: dayNumber and name' });
      }
      if (dayNumber < 1 || dayNumber > MAX_DAY) {
        return res.status(400).json({ error: `Invalid day number. Must be between 1 and ${MAX_DAY}.` });
      }

      const id = `exercise-${dayNumber}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      const exerciseDoc = {
        id,
        type: 'exercise',
        userId: 'shared',
        dayNumber,
        name,
        equipment: equipment || '',
        location: location || '',
        notes: notes || '',
        tags: Array.isArray(tags) ? tags : [],
        variations: variations && variations.length > 0
          ? variations
          : [{ name: 'Standard', default: true, targetWeight: null, targetReps: null, targetSets: null }],
        createdAt: new Date().toISOString(),
      };

      const { resource } = await container.items.upsert(exerciseDoc);
      res.status(201).json({ exercise: resource });
    } catch (error) {
      console.error('Error creating exercise:', error);
      res.status(500).json({ error: 'Failed to create exercise', message: error.message });
    }
  });

  return router;
}
