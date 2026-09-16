import test from 'node:test';
import assert from 'node:assert/strict';
import { groupMealsByDate, scaleMeal, unscaleMeal, formatMealNumbers } from './mealConfig.js';

test('a portion scales one set of numbers and reopens to the same numbers', () => {
  const eaten = scaleMeal({ calories: 650, proteinGrams: 45 }, 1.5);
  assert.deepEqual(eaten, { calories: 975, proteinGrams: 68 });
  assert.deepEqual(unscaleMeal({ ...eaten, portion: 1.5 }), { calories: 650, proteinGrams: 45 });
});

test('meals group by date, earliest first, with untimed meals last', () => {
  const days = groupMealsByDate([
    { id: 'c', date: '2026-09-16', time: null, calories: 100, proteinGrams: 5 },
    { id: 'b', date: '2026-09-16', time: '18:00', calories: 700, proteinGrams: 30 },
    { id: 'a', date: '2026-09-16', time: '12:00', calories: 650, proteinGrams: 45 },
    { id: 'd', date: '2026-09-15', time: '12:00', calories: 500, proteinGrams: 20 },
  ]);

  const today = days.get('2026-09-16');
  assert.deepEqual(today.meals.map((meal) => meal.id), ['a', 'b', 'c']);
  assert.deepEqual(today.totals, { calories: 1450, proteinGrams: 80 });
  assert.equal(days.get('2026-09-15').meals.length, 1);
});

test('day totals read compactly', () => {
  assert.equal(formatMealNumbers({ calories: 1850, proteinGrams: 142 }), '1,850 cal · 142g P');
});
