import { Router } from 'express';

/**
 * Soreness journal routes.
 *
 * A soreness entry is anchored to an *originating workout* rather than to a
 * date alone: you log soreness repeatedly against the same workout as it
 * decays (squat on the 19th → level 7 on the 20th, 5 on the 21st, 2 on the
 * 22nd), and a single date can hold several entries when two workouts'
 * soreness overlap.
 *
 * The document id encodes that pair, so an upsert naturally means "the
 * soreness from workout W recorded on date D":
 *
 *   attributed   → soreness-<date>-<sourceWorkoutId>
 *   unattributed → soreness-<date>
 *
 * The unattributed form is byte-identical to the pre-workout-link id scheme,
 * so historical entries keep working as-is with no migration.
 *
 * Public:
 *   GET    /api/soreness
 *
 * Admin:
 *   POST   /api/soreness
 *   DELETE /api/soreness/:id
 */

// Build the deterministic document id for a (date, sourceWorkoutId) pair.
export function sorenessDocId(date, sourceWorkoutId) {
  return sourceWorkoutId ? `soreness-${date}-${sourceWorkoutId}` : `soreness-${date}`;
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

  // Create or update a soreness entry (admin only).
  //
  // Identified by (date, sourceWorkoutId). Pass sourceWorkoutId to attribute the
  // entry to a logged workout; omit it for a free-floating entry. The workout's
  // day number and date are denormalised onto the entry so the timeline view can
  // render without joining against the workout list.
  router.post('/api/soreness', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const {
        date,
        muscles,
        sourceWorkoutId = null,
        sourceWorkoutDay = null,
        sourceWorkoutDate = null,
      } = req.body;

      if (!date) {
        return res.status(400).json({ error: 'Missing required field: date' });
      }
      if (!muscles || !Array.isArray(muscles)) {
        return res.status(400).json({ error: 'Missing required field: muscles (array)' });
      }

      for (const m of muscles) {
        if (!m.group || !m.level) {
          return res.status(400).json({ error: 'Each muscle entry requires group and level' });
        }
        if (m.level < 1 || m.level > 10) {
          return res.status(400).json({ error: 'Soreness level must be between 1 and 10' });
        }
      }

      if (sourceWorkoutId) {
        if (!sourceWorkoutDate) {
          return res.status(400).json({ error: 'sourceWorkoutDate is required when sourceWorkoutId is set' });
        }
        if (sourceWorkoutDate > date) {
          return res.status(400).json({ error: 'Soreness cannot predate the workout that caused it' });
        }
      }

      const doc = {
        id: sorenessDocId(date, sourceWorkoutId),
        type: 'soreness-entry',
        userId,
        date,
        muscles,
        sourceWorkoutId,
        sourceWorkoutDay,
        sourceWorkoutDate,
        updatedAt: new Date().toISOString()
      };

      const { resource } = await container.items.upsert(doc);
      res.status(201).json({ entry: resource });
    } catch (error) {
      console.error('Error saving soreness entry:', error);
      res.status(500).json({ error: 'Failed to save soreness entry', message: error.message });
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
