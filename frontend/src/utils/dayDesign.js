// Visual metadata for the 12-day Synergy cycle — accent colors and anatomy
// slugs used by the redesigned List landing page (hero, day chip, sidebar
// cycle dial, feed thumbnails). Logic-relevant config (focus / safety) lives
// in dayConfig.js; this file is purely presentational.
//
// Day *names* deliberately live only in dayConfig.js. This file used to carry a
// second short-label vocabulary (`group`: QUADS, BACK, …) that the cycle dial
// rendered, so the dial disagreed with every other surface — and days 8 and 9
// both read PECS, hiding the mobility/heavy-push distinction.

export const DAY_DESIGN = {
  1:  { color: '#4f8cf7', muscle: 'rectus-femoris' },
  2:  { color: '#7fb98a', muscle: 'gastrocnemius' },
  3:  { color: '#b48bf0', muscle: 'rectus-femoris' },
  4:  { color: '#f0c560', muscle: 'rectus-abdominis' },
  5:  { color: '#6c8df5', muscle: 'latissimus-dorsi' },
  6:  { color: '#f08bb8', muscle: 'biceps-brachii-anterior' },
  7:  { color: '#5fc7c7', muscle: 'trapezius' },
  8:  { color: '#ef6f6f', muscle: 'pectoralis-major-anterior', warn: true },
  9:  { color: '#f59e6f', muscle: 'pectoralis-major-anterior' },
  10: { color: '#67e8f9', muscle: 'biceps-brachii-anterior' },
  11: { color: '#a06ff5', muscle: 'deltoid-lateral' },
  12: { color: '#c8e85e', muscle: 'biceps-brachii-anterior' },
};

export const MUSCLE_RED = '#c83838';

export const dayColor = (n) => DAY_DESIGN[n]?.color || '#9b9b9b';
export const dayMuscle = (n) => DAY_DESIGN[n]?.muscle || 'rectus-femoris';
export const anatomyUrl = (slug) => `/anatomy/deltoids/training/bodyworks/cropped/${slug}.png`;
export const pad2 = (n) => String(n).padStart(2, '0');

// Soreness 1-10 → tier color (matches design's sorenessColor scale).
export const sorenessTierColor = (level) => {
  if (level <= 2) return '#7fb98a';
  if (level <= 4) return '#67e8f9';
  if (level <= 6) return '#f0c560';
  if (level <= 8) return '#f59e6f';
  return '#ef6f6f';
};
