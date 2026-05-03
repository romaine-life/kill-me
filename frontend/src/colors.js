// Centralized compatibility palette. Older tabs still import this object; keep
// the shape stable while mapping values onto the synergy-12 visual system.

export const colors = {
  // ── Backgrounds (layered from deepest to most elevated) ──
  bg: {
    base: '#0e0e0e',
    raised: '#161616',
    surface: '#1a1a1a',
    overlay: '#262626',
    tertiary: 'rgba(255, 255, 255, 0.03)',
  },

  // ── Borders ──
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    strong: 'rgba(255, 255, 255, 0.12)',
  },

  // ── Text ──
  text: {
    primary: '#ffffff',
    secondary: '#cecece',
    tertiary: '#8a8a8a',
    disabled: '#666666',
  },

  // ── Accent colors ──
  accent: {
    cyan: '#c83838',
    blue: '#4f8cf7',
    purple: '#a06ff5',
    green: '#34d399',
    gold: '#f0c560',
    amber: '#f59e6f',
    red: '#ef6f6f',
  },
};
