import test from 'node:test';
import assert from 'node:assert/strict';
import { ExerciseDefaultError, withNewExerciseDefault } from './exercise-defaults.js';

test('stores entered values and makes the selected variation the default', () => {
  const exercise = {
    id: 'exercise-press',
    variations: [
      { name: 'Flat', default: true, targetWeight: 100, targetReps: 8, targetSets: 3 },
      {
        name: 'Incline',
        targetWeight: 80,
        targetInclineDegrees: 30,
        targetReps: '8-10',
        targetSets: 3,
      },
    ],
  };

  const updated = withNewExerciseDefault(exercise, 'Incline', {
    weight: '85.5',
    inclineDegrees: '35',
    reps: '10-12',
    sets: '4',
  });

  assert.equal(updated.variations[0].default, false);
  assert.deepEqual(updated.variations[1], {
    name: 'Incline',
    default: true,
    targetWeight: 85.5,
    targetInclineDegrees: 35,
    targetReps: '10-12',
    targetSets: 4,
  });
  assert.equal(exercise.variations[0].default, true, 'does not mutate the source document');
});

test('updates labelled weights and preserves their definition metadata', () => {
  const exercise = {
    variations: [{
      name: 'Standard',
      default: true,
      weightFields: [
        { key: 'dumbbell', label: 'Dumbbell', targetWeight: 20 },
        { key: 'cable', label: 'Cable', targetWeight: 30 },
      ],
      targetReps: 12,
      targetSets: 3,
    }],
  };

  const updated = withNewExerciseDefault(exercise, 'Standard', {
    weights: [
      { key: 'dumbbell', label: 'Changed label is ignored', value: '25' },
      { key: 'cable', value: '' },
    ],
    reps: '15',
    sets: '4',
  });

  assert.deepEqual(updated.variations[0].weightFields, [
    { key: 'dumbbell', label: 'Dumbbell', targetWeight: 25 },
    { key: 'cable', label: 'Cable', targetWeight: null },
  ]);
  assert.equal(updated.variations[0].targetReps, '15');
  assert.equal(updated.variations[0].targetSets, 4);
});

test('rejects an unknown variation and non-numeric number fields', () => {
  const exercise = { variations: [{ name: 'Standard', default: true }] };

  assert.throws(
    () => withNewExerciseDefault(exercise, 'Missing', {}),
    ExerciseDefaultError,
  );
  assert.throws(
    () => withNewExerciseDefault(exercise, 'Standard', { weight: 'heavy' }),
    /weight must be a number or blank/,
  );
});

test('promotes defaults on a legacy flat exercise definition', () => {
  const exercise = {
    name: 'Legacy Curl',
    targetWeight: 20,
    targetReps: 10,
    targetSets: 3,
  };

  const updated = withNewExerciseDefault(exercise, 'Standard', {
    weight: '25',
    reps: '12',
    sets: '4',
  });

  assert.deepEqual(updated.variations, [{
    name: 'Standard',
    default: true,
    targetWeight: 25,
    targetReps: '12',
    targetSets: 4,
  }]);
});
