// Hips day: swap both single-leg cable movements for the machines actually used.
//
// Hip extension moves to the standing kickback machine — the cable version's ankle
// cuff is the attachment being avoided — and carries the failure mode found on the
// floor: driving through the heel with a free knee turns the movement into a
// backwards single-leg press (felt as quad) instead of hip extension.
//
// Hip flexion moves from the cable standing leg raise to a captain's chair knee
// raise: same joint action, no cuff. Its note keeps the psoas-above-90 cue from the
// cable entry and adds the pelvis tell — a neutral pelvis is hip flexion, curling it
// toward the ribs hands the work to the abs.
//
// Both replacements intentionally overwrite notes and variations rather than
// preserving whatever the app holds, because the new text is the point of the change.
//
// Re-runnable: deterministic ids and payloads, removals tolerate 404, and the day
// number is read from the active model rather than assumed.

const SHARED = 'shared';
const DAY_SLUG = 'hips';

const exerciseId = (daySlug, name) =>
  `exercise-${daySlug}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

const REPLACED_EXERCISE_IDS = [
  exerciseId(DAY_SLUG, 'Cable Glute Kickback'),
  exerciseId(DAY_SLUG, 'Cable Standing Leg Raise'),
];

const REPLACEMENTS = [
  {
    name: 'Glute Kickback (Machine)',
    equipment: 'Glute Kickback Machine',
    location: 'Gym',
    notes:
      'Drive back through the heel with the knee angle FIXED — quad means the knee is '
      + 'extending and it has become a backwards leg press. Keep the pelvis quiet so the '
      + 'low back does not supply the range.',
    tags: ['isolation', 'extension', 'machine', 'glutes', 'hip'],
    variations: [{ name: 'Standard', targetWeight: 50, targetReps: 12, targetSets: 3, default: true }],
  },
  {
    name: 'Knee Raise',
    equipment: "Captain's Chair",
    location: 'Gym',
    notes:
      'Drive the knee HIGH — psoas only engages above 90 degrees. A neutral pelvis keeps '
      + 'this hip flexion; curling the pelvis toward the ribs hands the work to the abs. '
      + 'Add load with a dumbbell held between the feet.',
    tags: ['isolation', 'flexion', 'bodyweight', 'hip-flexors', 'psoas', 'hip', 'core'],
    variations: [
      { name: 'Bent Knee', targetReps: 12, targetSets: 3, default: true },
      { name: 'Straight Leg', targetReps: 10, targetSets: 3 },
    ],
  },
];

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

export default {
  version: 5,
  name: 'Hips day machine swaps',

  async up({ container }) {
    const [model] = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type AND c.active = true',
      [{ name: '@type', value: 'workout-model' }],
    );
    const day = model?.days?.find((entry) => entry.slug === DAY_SLUG);
    if (!day) {
      throw new Error(`Cannot place hips exercises without a "${DAY_SLUG}" day in the active model`);
    }

    const existing = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type',
      [{ name: '@type', value: 'exercise' }],
    );

    let created = 0;
    for (const replacement of REPLACEMENTS) {
      const id = exerciseId(DAY_SLUG, replacement.name);
      const current = existing.find((entry) => entry.id === id);

      await container.items.upsert({
        ...(current ?? {}),
        id,
        type: 'exercise',
        userId: SHARED,
        daySlug: DAY_SLUG,
        dayNumber: day.number,
        ...replacement,
        createdAt: current?.createdAt ?? new Date().toISOString(),
      });

      if (!current) created++;
    }

    let removed = 0;
    for (const id of REPLACED_EXERCISE_IDS) {
      if (await remove(container, id)) removed++;
    }

    return { dayNumber: day.number, created, removed };
  },
};
