// Cardio activity metadata — parallel to DAY_CONFIG but for non-cycle activities.
// Used by HistoryTab (color coding, filter legend) and LogTab (cardio form).

import { DAY_DESIGN, SORENESS_TIER_COLORS } from './dayDesign';
import { isSteadySession } from './cardioTemplates.js';

export const CARDIO_CONFIG = {
  treadmill: {
    name: 'Treadmill',
    color: '#10b981',   // emerald-500
    label: 'Treadmill',
  },
  bike: {
    name: 'Bike Ride',
    color: '#14b8a6',   // teal-500
    label: 'Bike',
  },
};

export const cardioColor = (activity) => CARDIO_CONFIG[activity]?.color || '#9b9b9b';
export const cardioLabel = (activity) => CARDIO_CONFIG[activity]?.label || activity || 'Cardio';
export const cardioName = (activity) => CARDIO_CONFIG[activity]?.name || cardioLabel(activity);

// What a session looked like, for places that show a glyph instead of a label.
// Walk and run share the treadmill's color; the figure is what tells them apart.
// Paths are Material Icons (Apache 2.0) on a 24x24 grid — lucide has no
// walking or running figure.
export const CARDIO_MOTIONS = {
  walk: {
    label: 'Walk',
    path: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
  },
  run: {
    label: 'Run',
    path: 'M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z',
  },
  bike: {
    label: 'Bike',
    path: 'M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z',
  },
};

// A treadmill session with one steady interval is a walk; intervals are a run.
export const cardioMotion = (session) => {
  if (session.activity === 'bike') return 'bike';
  return isSteadySession(session.treadmill) ? 'walk' : 'run';
};

// Colors are semantic data here: day colors identify strength workouts,
// soreness colors identify intensity, and cardio colors identify activities.
// Fail during development/build if those namespaces ever collide.
const normalize = (color) => color.toLowerCase();
const reservedNonCardioColors = new Set([
  ...Object.values(DAY_DESIGN).map(({ color }) => normalize(color)),
  ...Object.values(SORENESS_TIER_COLORS).map(normalize),
]);
const cardioColors = Object.entries(CARDIO_CONFIG).map(
  ([activity, config]) => [activity, normalize(config.color)],
);
const repeatedCardioColor = cardioColors.find(([, color], index) =>
  cardioColors.some(([, other], otherIndex) => otherIndex !== index && other === color)
);
const overlappingColor = cardioColors.find(([, color]) => reservedNonCardioColors.has(color));

if (repeatedCardioColor) {
  throw new Error(`Cardio palette collision: ${repeatedCardioColor[0]} reuses another cardio color.`);
}
if (overlappingColor) {
  throw new Error(`Cardio palette collision: ${overlappingColor[0]} reuses a strength or soreness color.`);
}
