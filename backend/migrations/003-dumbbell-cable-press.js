// Add the combined dumbbell + cable press used on Compound: Push. Its variation
// defines two independent load fields so neither load is collapsed into a fake
// total, plus an adjustable bench incline.

const SHARED = 'shared';
const EXERCISE_ID = 'exercise-compound-push-dumbbell-cable-bench-press';

export default {
  version: 3,
  name: 'Add dumbbell and cable bench press',

  async up({ container }) {
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.type = @type AND c.id = @id',
        parameters: [
          { name: '@type', value: 'exercise' },
          { name: '@id', value: EXERCISE_ID },
        ],
      })
      .fetchAll();

    const current = resources[0];
    await container.items.upsert({
      ...(current ?? {}),
      id: EXERCISE_ID,
      type: 'exercise',
      userId: SHARED,
      daySlug: 'compound-push',
      dayNumber: 12,
      name: 'Dumbbell + Cable Bench Press',
      equipment: current?.equipment ?? 'Dumbbells + Cable Machine',
      location: current?.location ?? 'Home',
      notes: current?.notes ?? 'Record the dumbbell load and cable tension separately.',
      tags: current?.tags?.length
        ? current.tags
        : ['compound', 'press', 'dumbbell', 'cable', 'chest', 'triceps', 'front-delt'],
      variations: current?.variations?.length
        ? current.variations
        : [{
            name: 'Incline',
            default: true,
            weightFields: [
              { key: 'dumbbell', label: 'Dumbbell', targetWeight: 15 },
              { key: 'cable', label: 'Cable', targetWeight: 10 },
            ],
            targetInclineDegrees: 30,
            targetReps: 12,
            targetSets: 3,
          }],
      createdAt: current?.createdAt ?? new Date().toISOString(),
    });

    return { created: !current, exerciseId: EXERCISE_ID };
  },
};
