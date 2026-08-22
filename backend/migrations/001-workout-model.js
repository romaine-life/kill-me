// Introduces the workout model as a first-class record.
//
// Before: a day was identified by its position, spread across 12 loose
// `workout-day-definition` documents, with exercises and logs pointing at that
// position by number. Renumbering the cycle silently rebound every one of them.
//
// After: one `workout-model` document per generation of the program, holding its
// day list. Days are identified by a stable slug; the day number becomes an
// ordinary attribute you can reorder. Exercises and logs reference the slug.
//
// This migration is a pure rename — it does not change the cycle. Synergy 12 comes
// out the other side identical, just addressed differently.
//
// Re-runnable: every write is an upsert keyed on a deterministic id, and the
// backfills skip documents that already carry a daySlug.

const MODEL_VERSION = 1;
const MODEL_ID = `workout-model-${MODEL_VERSION}`;
const SHARED = 'shared';

// The existing twelve days, in their original order. Slugs are assigned here once
// and are permanent — a day may be renamed later without its slug following.
//
// Day 3 is slugged `stretching` even though it is *named* Hamstring, because every
// exercise on it is a stretch. The name was wrong, not the day. Naming the slug after
// the contents now means the later rename is a rename and nothing has to rebind.
const SYNERGY_12 = [
  { slug: 'compound-legs',  number: 1,  name: 'Compound: Legs' },
  { slug: 'calves',         number: 2,  name: 'Calves' },
  { slug: 'stretching',     number: 3,  name: 'Hamstring' },
  { slug: 'abs',            number: 4,  name: 'Abs' },
  { slug: 'compound-pulls', number: 5,  name: 'Compound: Pulls' },
  { slug: 'bicep',          number: 6,  name: 'Bicep' },
  { slug: 'torso',          number: 7,  name: 'Torso' },
  { slug: 'pecs-mobility',  number: 8,  name: 'Pecs (Mobility)' },
  { slug: 'compound-push',  number: 9,  name: 'Compound: Push' },
  { slug: 'triceps',        number: 10, name: 'Triceps' },
  { slug: 'deltoid',        number: 11, name: 'Deltoid' },
  { slug: 'grip',           number: 12, name: 'Grip' }
];

const slugByNumber = new Map(SYNERGY_12.map((day) => [day.number, day.slug]));

const query = async (container, sql, parameters = []) => {
  const { resources } = await container.items.query({ query: sql, parameters }).fetchAll();
  return resources;
};

export default {
  version: 1,
  name: 'Introduce the workout model and stable day slugs',

  async up({ container }) {
    // 1. Fold the loose day-definition documents into one model record, keeping
    //    whatever focus/muscle-group text they already carry.
    const existingDays = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type',
      [{ name: '@type', value: 'workout-day-definition' }]
    );
    const byNumber = new Map(existingDays.map((day) => [day.dayNumber, day]));

    // If a previous attempt already wrote the model, leave it alone. Rebuilding it now
    // would read from day-definition documents that attempt already deleted, and quietly
    // replace the real focus text with nulls.
    const [alreadyWritten] = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type AND c.id = @id',
      [{ name: '@type', value: 'workout-model' }, { name: '@id', value: MODEL_ID }]
    );

    const days = alreadyWritten?.days ?? SYNERGY_12.map((day) => {
      const previous = byNumber.get(day.number) ?? {};
      return {
        slug: day.slug,
        number: day.number,
        name: previous.name ?? day.name,
        focus: previous.focus ?? null,
        description: previous.description ?? null,
        muscleGroups: previous.primaryMuscleGroups ?? [],
        safetyNotes: previous.warning ?? null
      };
    });

    if (!alreadyWritten) {
      await container.items.upsert({
        id: MODEL_ID,
        type: 'workout-model',
        userId: SHARED,
        version: MODEL_VERSION,
        name: 'Synergy 12',
        active: true,
        days,
        createdAt: new Date().toISOString()
      });
    }

    // 2. Point exercises at the day slug instead of the day number.
    const exercises = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type AND NOT IS_DEFINED(c.daySlug)',
      [{ name: '@type', value: 'exercise' }]
    );
    for (const exercise of exercises) {
      const daySlug = slugByNumber.get(exercise.dayNumber);
      if (!daySlug) continue; // Day outside the known cycle — left alone rather than guessed at.
      await container.items.upsert({ ...exercise, daySlug });
    }

    // 3. Same for logged workouts. dayNumber and dayName stay exactly as recorded —
    //    the log is a faithful account of what happened and this must not edit it.
    const logs = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type AND NOT IS_DEFINED(c.daySlug)',
      [{ name: '@type', value: 'logged-workout' }]
    );
    for (const log of logs) {
      const daySlug = slugByNumber.get(log.dayNumber);
      if (!daySlug) continue;
      await container.items.upsert({ ...log, daySlug, modelVersion: MODEL_VERSION });
    }

    // 4. The current-day pointer becomes a slug too.
    const settings = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type AND NOT IS_DEFINED(c.currentDaySlug)',
      [{ name: '@type', value: 'settings' }]
    );
    for (const setting of settings) {
      const currentDaySlug = slugByNumber.get(Number(setting.currentDay)) ?? SYNERGY_12[0].slug;
      await container.items.upsert({ ...setting, currentDaySlug });
    }

    // 5. The loose day documents are now superseded by the model record.
    for (const day of existingDays) {
      await container.item(day.id, day.userId ?? undefined).delete();
    }

    return {
      days: days.length,
      exercises: exercises.length,
      logs: logs.length,
      settings: settings.length
    };
  }
};
