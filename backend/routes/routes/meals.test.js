import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMealEntryBody, parseMealTemplateBody } from './meals.js';

test('a meal entry stores the numbers as eaten, rounded, with a default portion of 1', () => {
  const parsed = parseMealEntryBody({
    date: '2026-09-16',
    time: '12:30',
    templateId: 'abc',
    name: '  Rice and beans bowl ',
    calories: '712.4',
    proteinGrams: 31.6,
    notes: ' extra salsa ',
  });

  assert.deepEqual(parsed.value, {
    date: '2026-09-16',
    time: '12:30',
    templateId: 'abc',
    name: 'Rice and beans bowl',
    portion: 1,
    calories: 712,
    proteinGrams: 32,
    notes: 'extra salsa',
  });
});

test('a one-off meal needs no template and no time', () => {
  const parsed = parseMealEntryBody({
    date: '2026-09-16',
    time: '',
    name: 'Burrito',
    portion: 1.5,
    calories: 0,
    proteinGrams: 0,
  });

  assert.equal(parsed.value.templateId, null);
  assert.equal(parsed.value.time, null);
  assert.equal(parsed.value.portion, 1.5);
  assert.equal(parsed.value.calories, 0);
});

test('a meal entry rejects missing or invalid fields', () => {
  const valid = { date: '2026-09-16', name: 'Salad', calories: 400, proteinGrams: 30 };

  assert.match(parseMealEntryBody({ ...valid, date: '9/16' }).error, /date/);
  assert.match(parseMealEntryBody({ ...valid, time: '9pm' }).error, /time/);
  assert.match(parseMealEntryBody({ ...valid, name: '   ' }).error, /name/);
  assert.match(parseMealEntryBody({ ...valid, portion: 0 }).error, /portion/);
  assert.match(parseMealEntryBody({ ...valid, calories: '' }).error, /calories/);
  assert.match(parseMealEntryBody({ ...valid, proteinGrams: -1 }).error, /proteinGrams/);
});

test('a meal default holds one set of numbers', () => {
  assert.deepEqual(
    parseMealTemplateBody({ name: ' Chicken Caesar ', calories: '650', proteinGrams: '45' }).value,
    { name: 'Chicken Caesar', calories: 650, proteinGrams: 45 },
  );
  assert.match(parseMealTemplateBody({ name: 'Salad', calories: 'lots', proteinGrams: 1 }).error, /calories/);
});
