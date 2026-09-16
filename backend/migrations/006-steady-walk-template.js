// A steady walk is a treadmill workout, not a new cardio activity: same machine,
// same color, same history lane. It differs from the interval templates only in
// that its single `walk` interval is entered per session rather than fixed.
//
// It lives in the template library for the same reason exercise defaults live on
// the exercise definition: the document IS the default. Logging a walk and ticking
// "this is the new default" writes the entered pace and duration back here, so the
// next walk prefills from it.
//
// Re-runnable: the upsert preserves whatever intervals the document already holds,
// so re-applying the migration can never reset a default set from the app.

const SHARED = 'shared';
const TEMPLATE_ID = 'steady-walk';
const DOCUMENT_ID = `cardio-template-${TEMPLATE_ID}`;

// Only used when the template does not exist yet — a plausible starting pace that
// the first "new default" tick replaces.
const INITIAL_INTERVALS = [{ type: 'walk', speedMph: 3.2, durationMinutes: 30 }];

export default {
  version: 6,
  name: 'steady-walk-template',

  async up({ container }) {
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.type = @type AND c.templateId = @templateId',
        parameters: [
          { name: '@type', value: 'cardio-template' },
          { name: '@templateId', value: TEMPLATE_ID },
        ],
      })
      .fetchAll();

    const current = resources[0] ?? null;
    const intervals = Array.isArray(current?.intervals) && current.intervals.length > 0
      ? current.intervals
      : INITIAL_INTERVALS;

    await container.items.upsert({
      ...(current ?? {}),
      id: DOCUMENT_ID,
      type: 'cardio-template',
      userId: SHARED,
      templateId: TEMPLATE_ID,
      activity: 'treadmill',
      name: 'Walk',
      description: 'Steady walk — pace and duration set per session',
      // What tells the log form to ask for a pace instead of showing a fixed
      // interval list, and what makes this template writable from the app.
      steady: true,
      intervals,
      sortOrder: current?.sortOrder ?? 10,
      updatedAt: new Date().toISOString(),
    });

    return { created: !current, intervals: intervals.length };
  },
};
