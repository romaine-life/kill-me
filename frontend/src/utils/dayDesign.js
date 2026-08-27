// Presentation for each day — accent color and the anatomy image it shows.
//
// Keyed by day slug, not by position, so reordering the cycle can never repaint a
// day or a historical log in someone else's color.
//
// This stays in code rather than on the day record because the anatomy value is a
// filename fragment: `/anatomy/.../rectus-femoris.png` has to exist in the bundle,
// and a database row could easily name a file that doesn't. Colors sit alongside it
// for the same reason — they belong to the design, and changing one is a deploy.
//
// Retired days are kept here forever. A workout logged under Torso in 2025 still
// renders in Torso's color even though the cycle no longer has that day.

export const DAY_DESIGN = {
  'compound-legs': { color: '#4f8cf7', muscle: 'rectus-femoris' },
  calves:          { color: '#7fb98a', muscle: 'gastrocnemius' },
  abs:             { color: '#f0c560', muscle: 'rectus-abdominis' },
  stretching:      { color: '#b48bf0', muscle: 'rectus-femoris' },
  knee:            { color: '#5fd6a0', muscle: 'rectus-femoris' },
  'compound-pulls': { color: '#6c8df5', muscle: 'latissimus-dorsi' },
  bicep:           { color: '#f08bb8', muscle: 'biceps-brachii-anterior' },
  transverse:      { color: '#5fc7c7', muscle: 'rectus-abdominis' },
  back:            { color: '#d4a05f', muscle: 'trapezius' },
  neck:            { color: '#9fb0c0', muscle: 'trapezius-lateral' },
  'pecs-mobility': { color: '#ef6f6f', muscle: 'pectoralis-major-anterior', warn: true },
  'compound-push': { color: '#f59e6f', muscle: 'pectoralis-major-anterior' },
  triceps:         { color: '#67e8f9', muscle: 'biceps-brachii-anterior' },
  deltoid:         { color: '#a06ff5', muscle: 'deltoid-lateral' },
  'shoulder-press': { color: '#d078f0', muscle: 'deltoid-lateral' },
  grip:            { color: '#c8e85e', muscle: 'biceps-brachii-anterior' },
  hips:            { color: '#e08fd0', muscle: 'gluteus-maximus' },

  // ── Retired days, kept so old logs keep their identity ──
  torso:           { color: '#5fc7c7', muscle: 'rectus-abdominis' },
};

export const MUSCLE_RED = '#c83838';

export const dayColor = (daySlug) => DAY_DESIGN[daySlug]?.color || '#9b9b9b';
export const dayMuscle = (daySlug) => DAY_DESIGN[daySlug]?.muscle || 'rectus-femoris';
export const dayWarns = (daySlug) => DAY_DESIGN[daySlug]?.warn === true;
export const anatomyUrl = (slug) => `/anatomy/deltoids/training/bodyworks/cropped/${slug}.png`;
export const pad2 = (n) => String(n).padStart(2, '0');

// Soreness colors are exported as a palette so other semantic color systems
// can verify they do not accidentally reuse one of these meanings.
export const SORENESS_TIER_COLORS = {
  mild: '#7fb98a',
  noticeable: '#67e8f9',
  moderate: '#f0c560',
  significant: '#f59e6f',
  severe: '#ef6f6f',
};

// Soreness 1-10 → tier color (matches design's sorenessColor scale).
export const sorenessTierColor = (level) => {
  if (level <= 2) return SORENESS_TIER_COLORS.mild;
  if (level <= 4) return SORENESS_TIER_COLORS.noticeable;
  if (level <= 6) return SORENESS_TIER_COLORS.moderate;
  if (level <= 8) return SORENESS_TIER_COLORS.significant;
  return SORENESS_TIER_COLORS.severe;
};
