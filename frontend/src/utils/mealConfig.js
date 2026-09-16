// Meal presentation and arithmetic shared by the log form, the Overview meal
// column, and the meal day detail.
//
// A logged meal stores its numbers as eaten (already multiplied by the portion),
// so a day's totals are plain sums and never consult the current defaults.

// Sand — deliberately outside the day, soreness and cardio palettes, which all
// carry meaning of their own.
export const MEAL_COLOR = '#d8c9a3';

export const PORTIONS = [
  { value: 0.5, label: '½' },
  { value: 1, label: '1' },
  { value: 1.5, label: '1½' },
  { value: 2, label: '2' },
];

export const portionLabel = (portion) =>
  PORTIONS.find((option) => option.value === portion)?.label ?? String(portion);

// Numbers for one portion → numbers as eaten.
export const scaleMeal = ({ calories, proteinGrams }, portion) => ({
  calories: Math.round((Number(calories) || 0) * portion),
  proteinGrams: Math.round((Number(proteinGrams) || 0) * portion),
});

// Numbers as eaten → numbers for one portion, for reopening a logged meal.
export const unscaleMeal = ({ calories, proteinGrams, portion }) => {
  const divisor = portion > 0 ? portion : 1;
  return {
    calories: Math.round((calories ?? 0) / divisor),
    proteinGrams: Math.round((proteinGrams ?? 0) / divisor),
  };
};

export const sumMeals = (meals) => meals.reduce(
  (totals, meal) => ({
    calories: totals.calories + (meal.calories || 0),
    proteinGrams: totals.proteinGrams + (meal.proteinGrams || 0),
  }),
  { calories: 0, proteinGrams: 0 },
);

// date → { date, meals (earliest first), totals }
export function groupMealsByDate(meals) {
  const byDate = new Map();
  for (const meal of meals) {
    if (!byDate.has(meal.date)) byDate.set(meal.date, []);
    byDate.get(meal.date).push(meal);
  }
  const days = new Map();
  for (const [date, dayMeals] of byDate) {
    const sorted = [...dayMeals].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    days.set(date, { date, meals: sorted, totals: sumMeals(sorted) });
  }
  return days;
}

export const formatCalories = (calories) => `${Math.round(calories).toLocaleString('en-US')} cal`;
export const formatProtein = (grams) => `${Math.round(grams)} g protein`;
export const formatMealNumbers = ({ calories, proteinGrams }) =>
  `${Math.round(calories).toLocaleString('en-US')} cal · ${Math.round(proteinGrams)}g P`;
