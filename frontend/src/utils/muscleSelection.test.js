import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toggleMuscleGroupSelection,
  toggleMuscleSelection,
} from './muscleSelection.js';

test('clicking a selected individual muscle removes it', () => {
  const current = [
    { group: 'Quadriceps', muscle: 'Rectus Femoris', level: 6 },
    { group: 'Hamstrings', muscle: 'Biceps Femoris', level: 6 },
  ];

  assert.deepEqual(
    toggleMuscleSelection(current, 'Quadriceps', 'Rectus Femoris', 6),
    [{ group: 'Hamstrings', muscle: 'Biceps Femoris', level: 6 }],
  );
});

test('specific and general selections replace one another within a group', () => {
  const general = [{ group: 'Quadriceps', muscle: null, level: 5 }];
  const specific = toggleMuscleSelection(general, 'Quadriceps', 'Vastus Lateralis', 5);

  assert.deepEqual(specific, [
    { group: 'Quadriceps', muscle: 'Vastus Lateralis', level: 5 },
  ]);
  assert.deepEqual(toggleMuscleSelection(specific, 'Quadriceps', null, 5), general);
});

test('clicking a checked group clears every selection in that group', () => {
  const current = [
    { group: 'Quadriceps', muscle: 'Rectus Femoris', level: 4 },
    { group: 'Quadriceps', muscle: 'Vastus Lateralis', level: 4 },
    { group: 'Hamstrings', muscle: null, level: 4 },
  ];

  assert.deepEqual(toggleMuscleGroupSelection(current, 'Quadriceps', 4), [
    { group: 'Hamstrings', muscle: null, level: 4 },
  ]);
});

test('clicking an unchecked group selects its general option', () => {
  assert.deepEqual(toggleMuscleGroupSelection([], 'Quadriceps', 3), [
    { group: 'Quadriceps', muscle: null, level: 3 },
  ]);
});
