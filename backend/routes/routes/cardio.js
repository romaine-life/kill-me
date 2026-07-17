import { Router } from 'express';

/**
 * Cardio session + treadmill template routes.
 *
 * Public:
 *   GET    /api/cardio-sessions
 *   GET    /api/cardio-templates
 *
 * Admin:
 *   POST   /api/cardio-sessions
 *   PUT    /api/cardio-sessions/:id
 *   DELETE /api/cardio-sessions/:id
 *   POST   /api/cardio-templates
 *   PUT    /api/cardio-templates/:templateId
 *   DELETE /api/cardio-templates/:templateId
 */
export function createCardioRoutes({ container, requireAuth, requireAdmin }) {
  const router = Router();

  // Shape a cardio-template document into the frontend contract: the stable
  // `templateId` slug is exposed as `id` (what the dropdown and logged sessions
  // reference), alongside name/description/intervals.
  const shapeTemplate = (doc) => ({
    id: doc.templateId,
    activity: doc.activity || 'treadmill',
    name: doc.name,
    description: doc.description || '',
    intervals: Array.isArray(doc.intervals) ? doc.intervals : [],
    sortOrder: doc.sortOrder ?? 0,
  });

  // Get all cardio sessions (public).
  router.get('/api/cardio-sessions', async (req, res) => {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.date DESC',
        parameters: [
          { name: '@type', value: 'cardio-session' }
        ]
      };

      const { resources: sessions } = await container.items.query(querySpec).fetchAll();
      res.json({ sessions });
    } catch (error) {
      console.error('Error fetching cardio sessions:', error);
      res.status(500).json({ error: 'Failed to fetch cardio sessions', message: error.message });
    }
  });

  // Log a cardio session (admin only).
  router.post('/api/cardio-sessions', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { date, time, activity, durationMinutes, notes, treadmill, bike } = req.body;

      if (!date) {
        return res.status(400).json({ error: 'Missing required field: date' });
      }
      if (!activity || !['treadmill', 'bike'].includes(activity)) {
        return res.status(400).json({ error: 'activity must be "treadmill" or "bike"' });
      }

      const doc = {
        id: `cardio-${date}-${activity}-${Date.now()}`,
        type: 'cardio-session',
        userId,
        date,
        time: time || null,
        activity,
        durationMinutes: durationMinutes || null,
        notes: notes || '',
        ...(treadmill && { treadmill }),
        ...(bike && { bike }),
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const { resource } = await container.items.create(doc);
      res.status(201).json({ session: resource });
    } catch (error) {
      console.error('Error logging cardio session:', error);
      res.status(500).json({ error: 'Failed to log cardio session', message: error.message });
    }
  });

  // Update a cardio session (admin only).
  router.put('/api/cardio-sessions/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { date, time, activity, durationMinutes, notes, treadmill, bike } = req.body;

      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
        parameters: [
          { name: '@id', value: id },
          { name: '@type', value: 'cardio-session' }
        ]
      }).fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: 'Cardio session not found' });
      }

      const existing = resources[0];
      const updated = {
        ...existing,
        ...(date !== undefined && { date }),
        ...(time !== undefined && { time }),
        ...(activity !== undefined && { activity }),
        ...(durationMinutes !== undefined && { durationMinutes }),
        ...(notes !== undefined && { notes }),
        ...(treadmill !== undefined && { treadmill }),
        ...(bike !== undefined && { bike }),
        updatedAt: new Date().toISOString()
      };

      const { resource } = await container.item(id, existing.userId).replace(updated);
      res.json({ session: resource });
    } catch (error) {
      console.error('Error updating cardio session:', error);
      res.status(500).json({ error: 'Failed to update cardio session', message: error.message });
    }
  });

  // Delete a cardio session (admin only).
  router.delete('/api/cardio-sessions/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
        parameters: [
          { name: '@id', value: id },
          { name: '@type', value: 'cardio-session' }
        ]
      }).fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: 'Cardio session not found' });
      }

      await container.item(id, resources[0].userId).delete();
      res.status(204).send();
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Cardio session not found' });
      }
      console.error('Error deleting cardio session:', error);
      res.status(500).json({ error: 'Failed to delete cardio session', message: error.message });
    }
  });

  // Get all treadmill templates (public), ordered for the dropdown.
  router.get('/api/cardio-templates', async (req, res) => {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.sortOrder',
        parameters: [
          { name: '@type', value: 'cardio-template' }
        ]
      };

      const { resources } = await container.items.query(querySpec).fetchAll();
      res.json({ templates: resources.map(shapeTemplate) });
    } catch (error) {
      console.error('Error fetching cardio templates:', error);
      res.status(500).json({ error: 'Failed to fetch cardio templates', message: error.message });
    }
  });

  // Create or replace a treadmill template (admin only). Keyed on templateId so
  // re-submitting the same slug edits in place. Templates are shared library
  // documents (userId: 'shared'), like the exercise library.
  router.post('/api/cardio-templates', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { templateId, name, description, intervals, activity, sortOrder } = req.body;

      if (!templateId || !name) {
        return res.status(400).json({ error: 'Missing required fields: templateId and name' });
      }
      if (!Array.isArray(intervals) || intervals.length === 0) {
        return res.status(400).json({ error: 'intervals must be a non-empty array' });
      }

      const doc = {
        id: `cardio-template-${templateId}`,
        type: 'cardio-template',
        userId: 'shared',
        templateId,
        activity: activity || 'treadmill',
        name,
        description: description || '',
        intervals,
        sortOrder: sortOrder ?? 0,
        updatedAt: new Date().toISOString(),
      };

      const { resource } = await container.items.upsert(doc);
      res.status(201).json({ template: shapeTemplate(resource) });
    } catch (error) {
      console.error('Error creating cardio template:', error);
      res.status(500).json({ error: 'Failed to create cardio template', message: error.message });
    }
  });

  // Update fields on an existing treadmill template (admin only).
  router.put('/api/cardio-templates/:templateId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { templateId } = req.params;
      const { name, description, intervals, activity, sortOrder } = req.body;

      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.type = @type AND c.templateId = @templateId',
        parameters: [
          { name: '@type', value: 'cardio-template' },
          { name: '@templateId', value: templateId }
        ]
      }).fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: 'Cardio template not found' });
      }

      const existing = resources[0];
      const updated = {
        ...existing,
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(intervals !== undefined && { intervals }),
        ...(activity !== undefined && { activity }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date().toISOString(),
      };

      const { resource } = await container.item(existing.id, existing.userId).replace(updated);
      res.json({ template: shapeTemplate(resource) });
    } catch (error) {
      console.error('Error updating cardio template:', error);
      res.status(500).json({ error: 'Failed to update cardio template', message: error.message });
    }
  });

  // Delete a treadmill template (admin only). Logged sessions are unaffected —
  // they store their own interval snapshot.
  router.delete('/api/cardio-templates/:templateId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { templateId } = req.params;

      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.type = @type AND c.templateId = @templateId',
        parameters: [
          { name: '@type', value: 'cardio-template' },
          { name: '@templateId', value: templateId }
        ]
      }).fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: 'Cardio template not found' });
      }

      await container.item(resources[0].id, resources[0].userId).delete();
      res.status(204).send();
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Cardio template not found' });
      }
      console.error('Error deleting cardio template:', error);
      res.status(500).json({ error: 'Failed to delete cardio template', message: error.message });
    }
  });

  return router;
}
