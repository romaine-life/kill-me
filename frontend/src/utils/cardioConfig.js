// Cardio activity metadata — parallel to DAY_CONFIG but for non-cycle activities.
// Used by HistoryTab (color coding, filter legend) and LogTab (cardio form).

import { DAY_DESIGN, SORENESS_TIER_COLORS } from './dayDesign';

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
