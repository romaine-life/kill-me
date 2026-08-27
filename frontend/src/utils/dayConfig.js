// Access to the active workout model — the cycle's days, their order, names, focus
// text and safety notes.
//
// None of that lives here any more. The model is data: it comes from the public API
// and is installed once at boot by WorkoutModelProvider before anything renders.
// This module is the read side of it.
//
// A day is identified by its `slug`, which is permanent. `number` is only that day's
// position in this version of the model, so it may change when the cycle is
// reordered — never use it as an identity, and never persist it as one.
//
// The model is held in a module singleton rather than React state on purpose: it
// changes only when a migration publishes a new version, which means a deploy, which
// means a fresh page load. There is nothing to re-render for.

let model = null;

export function setWorkoutModel(nextModel) {
  model = nextModel;
}

export const getWorkoutModel = () => model;

export const getDays = () => model?.days ?? [];

export const getTotalDays = () => getDays().length;

export const getDaySlugs = () => getDays().map((day) => day.slug);

export const getDayInfo = (daySlug) => getDays().find((day) => day.slug === daySlug) ?? null;

export const isValidDay = (daySlug) => getDayInfo(daySlug) !== null;

// The cycle wraps, so the day after the last is the first.
const step = (daySlug, offset) => {
  const days = getDays();
  if (days.length === 0) return null;
  const index = days.findIndex((day) => day.slug === daySlug);
  if (index === -1) return days[0].slug;
  return days[(index + offset + days.length) % days.length].slug;
};

export const getNextDay = (daySlug) => step(daySlug, 1);
export const getPreviousDay = (daySlug) => step(daySlug, -1);

// Historical logs record the number they were performed under, which may no longer
// match anything in the current model. Prefer the slug; fall back to the recorded
// name so a log from a retired day still reads correctly.
export const describeLoggedDay = (workout) =>
  getDayInfo(workout?.daySlug)?.name ?? workout?.dayName ?? 'Unknown day';
