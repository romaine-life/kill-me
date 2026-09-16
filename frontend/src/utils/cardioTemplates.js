// Treadmill interval helpers.
//
// Templates themselves are DATA — they live in Cosmos DB as `cardio-template`
// documents and are loaded at runtime through the public API. There is no hardcoded
// template list in the frontend. These are the only things that stay in code: pure
// functions that summarize an interval array (which each logged cardio-session
// stores inline, so history is self-contained).

// Total duration of all intervals in a template (minutes)
export function getTotalDuration(intervals) {
  return intervals.reduce((sum, i) => sum + i.durationMinutes, 0);
}

// Human-readable summary of a template's intervals
export function formatIntervalSummary(intervals) {
  // A steady walk is a treadmill session with one interval — summarize it by
  // pace, since "0 jog intervals" says nothing about it.
  if (intervals.length === 1) {
    return `${intervals[0].speedMph} mph`;
  }
  const jogCount = intervals.filter(i => i.type === 'jog').length;
  const totalMin = getTotalDuration(intervals);
  return `${jogCount} jog intervals, ${totalMin} min`;
}

// A steady walk is logged as a treadmill session rather than its own activity:
// same machine, same color, same history lane. It differs from an interval
// template only in that its single `walk` interval is entered per session, so a
// logged session with one interval is a steady one.
export const buildWalkIntervals = (speedMph, durationMinutes) => [
  { type: 'walk', speedMph, durationMinutes },
];

export const isSteadySession = (treadmill) =>
  (treadmill?.intervals || []).length === 1;
