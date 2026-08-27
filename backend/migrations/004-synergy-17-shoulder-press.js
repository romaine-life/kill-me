// Synergy 16 -> Synergy 17.
//
// Adds a one-exercise Shoulder Press day after Deltoid. Deltoid becomes a true
// low-fatigue shoulder primer, so its redundant front raises are removed and its
// remaining exercises explicitly stay short of failure. The dumbbell-only press
// leaves Compound: Push; the new day uses separately logged dumbbell and cable
// resistance.
//
// Decision: docs/decisions/0002-add-dedicated-vertical-press-day.md
//
// Re-runnable: the model and exercise have deterministic ids, model retirement is
// conditional, exercise updates are deterministic, and removals tolerate 404.

const SHARED = 'shared';
const PREVIOUS_MODEL_ID = 'workout-model-2';
const MODEL_VERSION = 3;
const MODEL_ID = `workout-model-${MODEL_VERSION}`;
const PRESS_DAY_SLUG = 'shoulder-press';
const PRESS_EXERCISE_ID = 'exercise-shoulder-press-dumbbell-cable-shoulder-press';

const REMOVED_EXERCISE_IDS = [
  'exercise-compound-push-shoulder-press',
  'exercise-deltoid-front-deltoid-raises--bottom-to-top-',
  'exercise-deltoid-front-deltoid-raises--top-to-bottom-',
];

const PRIMER_NOTES = {
  'Reverse Delt Cable Fly': 'Shoulder primer only. Smooth, pain-free range; stop well short of failure so tomorrow\'s press stays fresh.',
  'Side Delt Cable Raises': 'Shoulder primer only. Use a light, controlled load and stop well short of failure.',
  'Rotator Cuff Work': 'Light preparation, not fatigue work. Controlled pain-free range in both directions.',
};
const query = async (container, sql, parameters = []) => {
  const { resources } = await container.items.query({ query: sql, parameters }).fetchAll();
  return resources;
};

const remove = async (container, id) => {
  try {
    await container.item(id, SHARED).delete();
    return true;
  } catch (error) {
    if (error.code === 404) return false;
    throw error;
  }
};

const buildSynergy17 = (previousDays) => {
  const days = [];

  for (const previous of previousDays) {
    if (previous.slug === 'deltoid') {
      days.push({
        ...previous,
        name: 'Deltoid + Shoulder Prep',
        focus: 'The Primer. Light deltoid, rotator-cuff, and range-of-motion work. No failure.',
        description: 'Low-fatigue shoulder preparation for the dedicated vertical press the next day',
        muscleGroups: ['shoulders', 'delts', 'rotator-cuff'],
        safetyNotes: 'Keep every movement light and controlled. Stop well short of failure; this day must improve readiness for Shoulder Press.',
      });

      days.push({
        slug: PRESS_DAY_SLUG,
        number: 0,
        name: 'Shoulder Press',
        focus: 'Main Lift: Dumbbell + Cable Shoulder Press. Challenging working sets, not a 1RM test.',
        description: 'A short, dedicated vertical-push session performed with fresh attention',
        muscleGroups: ['shoulders', 'delts', 'triceps', 'serratus'],
        safetyNotes: 'Use same-session ramp-up sets. Stop when another repetition would change the press path or require uncontrolled compensation.',
      });
      continue;
    }

    days.push(previous);
  }

  // Number is position in this model, never identity. Renumbering here moves Grip
  // and Hips while their permanent slugs and all historical logs stay unchanged.
  return days.map((day, index) => ({ ...day, number: index + 1 }));
};

export default {
  version: 4,
  name: 'Synergy 17 dedicated shoulder press day',

  async up({ container }) {
    const [previous] = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type AND c.id = @id',
      [{ name: '@type', value: 'workout-model' }, { name: '@id', value: PREVIOUS_MODEL_ID }],
    );
    if (!previous?.days?.length) {
      throw new Error(`Cannot build Synergy 17 without ${PREVIOUS_MODEL_ID}`);
    }

    const [existingModel] = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type AND c.id = @id',
      [{ name: '@type', value: 'workout-model' }, { name: '@id', value: MODEL_ID }],
    );
    const days = existingModel?.days ?? buildSynergy17(previous.days);

    if (!existingModel || !existingModel.active) {
      await container.items.upsert({
        ...(existingModel ?? {}),
        id: MODEL_ID,
        type: 'workout-model',
        userId: SHARED,
        version: MODEL_VERSION,
        name: 'Synergy 17',
        active: true,
        days,
        createdAt: existingModel?.createdAt ?? new Date().toISOString(),
      });
    }

    if (previous.active) {
      await container.items.upsert({
        ...previous,
        active: false,
        retiredAt: previous.retiredAt ?? new Date().toISOString(),
      });
    }

    const dayNumberBySlug = new Map(days.map((day) => [day.slug, day.number]));
    const exercises = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type',
      [{ name: '@type', value: 'exercise' }],
    );

    let moved = 0;
    let primerUpdated = 0;
    for (const exercise of exercises) {
      if (REMOVED_EXERCISE_IDS.includes(exercise.id)) continue;

      const nextDayNumber = dayNumberBySlug.get(exercise.daySlug);
      const primerNote = exercise.daySlug === 'deltoid' ? PRIMER_NOTES[exercise.name] : null;
      if (nextDayNumber === undefined && !primerNote) continue;

      const numberChanged = nextDayNumber !== undefined && exercise.dayNumber !== nextDayNumber;
      const noteChanged = primerNote != null && exercise.notes !== primerNote;
      if (!numberChanged && !noteChanged) continue;

      await container.items.upsert({
        ...exercise,
        dayNumber: nextDayNumber ?? exercise.dayNumber,
        notes: primerNote ?? exercise.notes,
      });
      if (numberChanged) moved++;
      if (noteChanged) primerUpdated++;
    }

    const existingPress = exercises.find((exercise) => exercise.id === PRESS_EXERCISE_ID);
    await container.items.upsert({
      ...(existingPress ?? {}),
      id: PRESS_EXERCISE_ID,
      type: 'exercise',
      userId: SHARED,
      daySlug: PRESS_DAY_SLUG,
      dayNumber: dayNumberBySlug.get(PRESS_DAY_SLUG),
      name: 'Dumbbell + Cable Shoulder Press',
      equipment: 'Dumbbells + Cable Machine',
      location: 'Home',
      notes: 'Primary lift. Perform same-session ramp-up sets, then stop each working set before the press path or torso position breaks down.',
      tags: ['compound', 'press', 'dumbbell', 'cable', 'shoulders', 'front-delt', 'side-delt', 'triceps', 'serratus'],
      variations: [{
        name: 'Seated',
        default: true,
        weightFields: [
          { key: 'dumbbell', label: 'Dumbbell', targetWeight: 15 },
          { key: 'cable', label: 'Cable', targetWeight: 5 },
        ],
        targetReps: '8-15',
        targetSets: 3,
      }],
      createdAt: existingPress?.createdAt ?? new Date().toISOString(),
    });

    let removed = 0;
    for (const id of REMOVED_EXERCISE_IDS) {
      if (await remove(container, id)) removed++;
    }

    return {
      modelVersion: MODEL_VERSION,
      days: days.length,
      pressCreated: !existingPress,
      moved,
      primerUpdated,
      removed,
    };
  },
};
