import { Router } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Meal log + meal default routes.
 *
 * A meal default (`meal-template`) is a named meal eaten often enough to log in
 * one tap, holding one set of numbers for one portion. It is a shared library
 * document, like a cardio template.
 *
 * A meal entry (`meal-entry`) is a faithful record of what was eaten. It stores
 * its own name, calories and protein — already multiplied by the portion —
 * rather than pointing at the default, so editing or deleting a default never
 * rewrites a past day's totals. `templateId` is kept only as provenance.
 *
 * Public:
 *   GET    /api/meals
 *   GET    /api/meal-templates
 *
 * Admin:
 *   POST   /api/meals
 *   PUT    /api/meals/:id
 *   DELETE /api/meals/:id
 *   POST   /api/meal-templates
 *   PUT    /api/meal-templates/:templateId
 *   DELETE /api/meal-templates/:templateId
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

// A non-negative number, accepting numeric strings from form inputs. Returns
// undefined for anything else so callers can report the specific field.
function nonNegativeNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function parseMealTemplateBody(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { error: 'Missing required field: name' };

  const calories = nonNegativeNumber(body.calories);
  if (calories === undefined) return { error: 'calories must be a non-negative number' };
  const proteinGrams = nonNegativeNumber(body.proteinGrams);
  if (proteinGrams === undefined) return { error: 'proteinGrams must be a non-negative number' };

  return { value: { name, calories: Math.round(calories), proteinGrams: Math.round(proteinGrams) } };
}

export function parseMealEntryBody(body = {}) {
  const { date, time = null, templateId = null, notes = '' } = body;

  if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
    return { error: 'date must be YYYY-MM-DD' };
  }
  if (time !== null && time !== '' && !(typeof time === 'string' && TIME_PATTERN.test(time))) {
    return { error: 'time must be HH:MM' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { error: 'Missing required field: name' };

  const portion = body.portion === undefined ? 1 : nonNegativeNumber(body.portion);
  if (portion === undefined || portion === 0) return { error: 'portion must be a positive number' };

  const calories = nonNegativeNumber(body.calories);
  if (calories === undefined) return { error: 'calories must be a non-negative number' };
  const proteinGrams = nonNegativeNumber(body.proteinGrams);
  if (proteinGrams === undefined) return { error: 'proteinGrams must be a non-negative number' };

  return {
    value: {
      date,
      time: time || null,
      templateId: templateId || null,
      name,
      portion,
      calories: Math.round(calories),
      proteinGrams: Math.round(proteinGrams),
      notes: typeof notes === 'string' ? notes.trim() : '',
    },
  };
}

const shapeTemplate = (doc) => ({
  id: doc.templateId,
  name: doc.name,
  calories: doc.calories,
  proteinGrams: doc.proteinGrams,
});

export function createMealRoutes({ container, requireAuth, requireAdmin }) {
  const router = Router();

  const findTemplate = async (templateId) => {
    const { resources } = await container.items.query({
      query: 'SELECT * FROM c WHERE c.type = @type AND c.templateId = @templateId',
      parameters: [
        { name: '@type', value: 'meal-template' },
        { name: '@templateId', value: templateId },
      ],
    }).fetchAll();
    return resources[0] ?? null;
  };

  // Get all meal entries (public).
  router.get('/api/meals', async (req, res) => {
    try {
      const { resources: meals } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.date DESC',
        parameters: [{ name: '@type', value: 'meal-entry' }],
      }).fetchAll();
      res.json({ meals });
    } catch (error) {
      console.error('Error fetching meals:', error);
      res.status(500).json({ error: 'Failed to fetch meals', message: error.message });
    }
  });

  // Log a meal (admin only). Creation always gets a unique identity, so several
  // meals on one date never collide.
  router.post('/api/meals', requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = parseMealEntryBody(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const now = new Date().toISOString();
      const doc = {
        id: `meal-${parsed.value.date}-${randomUUID()}`,
        type: 'meal-entry',
        userId: req.user.sub,
        ...parsed.value,
        createdAt: now,
        updatedAt: now,
      };

      const { resource } = await container.items.create(doc);
      res.status(201).json({ meal: resource });
    } catch (error) {
      console.error('Error logging meal:', error);
      res.status(500).json({ error: 'Failed to log meal', message: error.message });
    }
  });

  // Update one meal (admin only).
  router.put('/api/meals/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { id } = req.params;
      const parsed = parseMealEntryBody(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const { resource: existing } = await container.item(id, userId).read();
      if (!existing || existing.type !== 'meal-entry') {
        return res.status(404).json({ error: 'Meal not found' });
      }

      const { resource } = await container.item(id, userId).replace({
        ...existing,
        ...parsed.value,
        id,
        type: 'meal-entry',
        userId,
        updatedAt: new Date().toISOString(),
      });
      res.json({ meal: resource });
    } catch (error) {
      if (error.code === 404) return res.status(404).json({ error: 'Meal not found' });
      console.error('Error updating meal:', error);
      res.status(500).json({ error: 'Failed to update meal', message: error.message });
    }
  });

  // Delete one meal (admin only).
  router.delete('/api/meals/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await container.item(req.params.id, req.user.sub).delete();
      res.status(204).send();
    } catch (error) {
      if (error.code === 404) return res.status(404).json({ error: 'Meal not found' });
      console.error('Error deleting meal:', error);
      res.status(500).json({ error: 'Failed to delete meal', message: error.message });
    }
  });

  // Get all meal defaults (public), alphabetical for the picker.
  router.get('/api/meal-templates', async (req, res) => {
    try {
      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.type = @type',
        parameters: [{ name: '@type', value: 'meal-template' }],
      }).fetchAll();
      const templates = resources
        .map(shapeTemplate)
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json({ templates });
    } catch (error) {
      console.error('Error fetching meal templates:', error);
      res.status(500).json({ error: 'Failed to fetch meal templates', message: error.message });
    }
  });

  // Create a meal default (admin only).
  router.post('/api/meal-templates', requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = parseMealTemplateBody(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const templateId = randomUUID();
      const { resource } = await container.items.create({
        id: `meal-template-${templateId}`,
        type: 'meal-template',
        userId: 'shared',
        templateId,
        ...parsed.value,
        updatedAt: new Date().toISOString(),
      });
      res.status(201).json({ template: shapeTemplate(resource) });
    } catch (error) {
      console.error('Error creating meal template:', error);
      res.status(500).json({ error: 'Failed to create meal template', message: error.message });
    }
  });

  // Replace a meal default's name and numbers (admin only). Logged meals keep
  // the numbers they were logged with.
  router.put('/api/meal-templates/:templateId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = parseMealTemplateBody(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const existing = await findTemplate(req.params.templateId);
      if (!existing) return res.status(404).json({ error: 'Meal template not found' });

      const { resource } = await container.item(existing.id, existing.userId).replace({
        ...existing,
        ...parsed.value,
        updatedAt: new Date().toISOString(),
      });
      res.json({ template: shapeTemplate(resource) });
    } catch (error) {
      console.error('Error updating meal template:', error);
      res.status(500).json({ error: 'Failed to update meal template', message: error.message });
    }
  });

  // Delete a meal default (admin only). Logged meals are unaffected.
  router.delete('/api/meal-templates/:templateId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const existing = await findTemplate(req.params.templateId);
      if (!existing) return res.status(404).json({ error: 'Meal template not found' });

      await container.item(existing.id, existing.userId).delete();
      res.status(204).send();
    } catch (error) {
      if (error.code === 404) return res.status(404).json({ error: 'Meal template not found' });
      console.error('Error deleting meal template:', error);
      res.status(500).json({ error: 'Failed to delete meal template', message: error.message });
    }
  });

  return router;
}
