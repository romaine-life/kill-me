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
  const jogCount = intervals.filter(i => i.type === 'jog').length;
  const totalMin = getTotalDuration(intervals);
  return `${jogCount} jog intervals, ${totalMin} min`;
}
