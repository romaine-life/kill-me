// Seed data for treadmill interval templates (cardio-template document type).
//
// These are shared library documents (userId: 'shared'), seeded by
// /api/admin/init-database alongside the exercise library and day definitions.
// A logged cardio-session stores the full interval array at log time, so
// editing or removing a template here never rewrites history.
//
// `templateId` is the stable slug the frontend and logged sessions reference.
// `sortOrder` controls dropdown order; the lowest sortOrder is the default.
//
// The frontend keeps a static mirror of these in
// frontend/src/utils/cardioTemplates.js as an offline fallback (same pattern as
// dayConfig.js mirroring the workout-day-definition seed). Keep the two in sync.

export const cardioTemplates = [
  {
    templateId: 'walk-jog-5x-60',
    activity: 'treadmill',
    name: 'Walk/Jog 5×6.0 + 1×7.0',
    description: '2 min walk / 4 min jog @ 6.0 mph × 5, then 4 min @ 7.0, cooldown',
    sortOrder: 0,
    intervals: [
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 6.0, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 6.0, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 6.0, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 6.0, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 6.0, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 7.0, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
    ],
  },
  {
    templateId: 'walk-jog-5x-54',
    activity: 'treadmill',
    name: 'Walk/Jog 5×5.4 + 1×6.0',
    description: '2 min walk / 4 min jog @ 5.4 mph × 5, then 4 min @ 6.0, cooldown',
    sortOrder: 1,
    intervals: [
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 5.4, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 5.4, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 5.4, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 5.4, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 5.4, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
      { type: 'jog',  speedMph: 6.0, durationMinutes: 4 },
      { type: 'walk', speedMph: 2.0, durationMinutes: 2 },
    ],
  },
];
