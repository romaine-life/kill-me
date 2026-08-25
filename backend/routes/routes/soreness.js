import { Router } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Soreness journal routes.
 *
 * A soreness entry is anchored to an *originating workout* rather than to a
 * date alone: you log soreness repeatedly against the same workout as it
 * decays (squat on the 19th → level 7 on the 20th, 5 on the 21st, 2 on the
 * 22nd), and a single date can hold several entries when two workouts'
 * soreness overlap.
 *
 * Historical document ids encoded the date/source pair:
 *
 *   attributed   → soreness-<date>-<sourceWorkoutId>
 *   unattributed → soreness-<date>
 *
 * New records use unique ids so several records may share a date and source,
 * and create can never silently become update. Historical ids remain editable.
 *
 * Public:
 *   GET    /api/soreness
 *
 * Admin:
 *   POST   /api/soreness
 *   PUT    /api/soreness/:id
 *   DELETE /api/soreness/:id
 */

// Historical deterministic id helper retained for compatibility and tests.
export function sorenessDocId(date, sourceWorkoutId) {
  return sourceWorkoutId ? `soreness-${date}-${sourceWorkoutId}` : `soreness-${date}`;
}

function parseSorenessBody(body) {
  const {
    date,
    level,
    muscles,
    sourceWorkoutId = null,
    sourceWorkoutDaySlug = null,
    sourceWorkoutDay = null,
    sourceWorkoutDate = null,
  } = body;

  if (!date) return { error: 'Missing required field: date' };
  if (!Number.isInteger(level) || level < 1 || level > 10) {
    return { error: 'Overall soreness intensity must be between 1 and 10' };
  }
  if (!Array.isArray(muscles)) {
    return { error: 'Missing required field: muscles (array)' };
  }
  for (const muscle of muscles) {
    if (!muscle.group) return { error: 'Each muscle entry requires a group' };
  }
  if (sourceWorkoutId && !sourceWorkoutDate) {
    return { error: 'sourceWorkoutDate is required when sourceWorkoutId is set' };
  }
  if (sourceWorkoutDate && sourceWorkoutDate > date) {
    return { error: 'Soreness cannot predate the workout that caused it' };
  }

  return {
    value: {
      date,
      level,
      muscles: muscles.map(({ group, muscle = null }) => ({ group, muscle, level })),
      sourceWorkoutId,
      sourceWorkoutDaySlug,
      sourceWorkoutDay,
      sourceWorkoutDate,
    },
  };
}

export function createSorenessRoutes({ container, requireAuth, requireAdmin }) {
  const router = Router();

  // Get all soreness entries (public).
  router.get('/api/soreness', async (req, res) => {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.date DESC',
        parameters: [
          { name: '@type', value: 'soreness-entry' }
        ]
      };

      const { resources: entries } = await container.items.query(querySpec).fetchAll();
      res.json({ entries });
    } catch (error) {
      console.error('Error fetching soreness entries:', error);
      res.status(500).json({ error: 'Failed to fetch soreness entries', message: error.message });
    }
  });

  // Create a new soreness entry. Creation always gets a unique identity; it can
  // never silently overwrite or switch into editing another record.
  router.post('/api/soreness', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const parsed = parseSorenessBody(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const doc = {
        id: `soreness-${parsed.value.date}-${randomUUID()}`,
        type: 'soreness-entry',
        userId,
        ...parsed.value,
        updatedAt: new Date().toISOString()
      };

      const { resource } = await container.items.create(doc);
      res.status(201).json({ entry: resource });
    } catch (error) {
      console.error('Error creating soreness entry:', error);
      res.status(500).json({ error: 'Failed to create soreness entry', message: error.message });
    }
  });

  // Update one explicitly selected record. The id remains stable when its date
  // or originating workout changes.
  router.put('/api/soreness/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { id } = req.params;
      const parsed = parseSorenessBody(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const { resource: existing } = await container.item(id, userId).read();
      if (!existing || existing.type !== 'soreness-entry') {
        return res.status(404).json({ error: 'Soreness entry not found' });
      }

      const doc = {
        ...existing,
        ...parsed.value,
        id,
        type: 'soreness-entry',
        userId,
        updatedAt: new Date().toISOString(),
      };
      const { resource } = await container.item(id, userId).replace(doc);
      res.json({ entry: resource });
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Soreness entry not found' });
      }
      console.error('Error updating soreness entry:', error);
      res.status(500).json({ error: 'Failed to update soreness entry', message: error.message });
    }
  });

  // Delete a soreness entry by document id (admin only).
  //
  // Historical entries use the bare `soreness-<date>` id, so a plain date still
  // resolves to the unattributed entry for that date.
  router.delete('/api/soreness/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { id: rawId } = req.params;
      const id = rawId.startsWith('soreness-') ? rawId : `soreness-${rawId}`;

      await container.item(id, userId).delete();
      res.status(204).send();
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Soreness entry not found' });
      }
      console.error('Error deleting soreness entry:', error);
      res.status(500).json({ error: 'Failed to delete soreness entry', message: error.message });
    }
  });

  return router;
}
