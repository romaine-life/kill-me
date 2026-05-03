// 12-segment radial dial showing the Synergy 12 cycle. Today's segment fills
// in its accent color; completed segments are dim white; future segments
// are nearly invisible. Click a segment to navigate (admin) or inspect.

import { DAY_DESIGN, dayGroup, pad2 } from '../utils/dayDesign';

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 88;
const R_INNER = 54;
const SLICE = 360 / 12;

const polar = (r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
};

const segPath = (i) => {
  const a0 = i * SLICE;
  const a1 = (i + 1) * SLICE;
  const [x0, y0] = polar(R_OUTER, a0);
  const [x1, y1] = polar(R_OUTER, a1);
  const [x2, y2] = polar(R_INNER, a1);
  const [x3, y3] = polar(R_INNER, a0);
  return `M ${x0} ${y0} A ${R_OUTER} ${R_OUTER} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${R_INNER} ${R_INNER} 0 0 0 ${x3} ${y3} Z`;
};

export function CycleDial({ currentDay, onDay }) {
  const cur = DAY_DESIGN[currentDay];
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0 6px' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const meta = DAY_DESIGN[n];
          const isCurrent = n === currentDay;
          const completed = n < currentDay;
          const [tx, ty] = polar((R_OUTER + R_INNER) / 2, i * SLICE + SLICE / 2);
          return (
            <g key={n} style={{ cursor: onDay ? 'pointer' : 'default' }} onClick={() => onDay?.(n)}>
              <path
                d={segPath(i)}
                fill={isCurrent ? meta.color : completed ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)'}
                stroke="var(--bg-sidebar)"
                strokeWidth="2"
                style={{ transition: 'fill 200ms cubic-bezier(0.22,0.61,0.36,1)' }}
              />
              <text
                x={tx}
                y={ty + 4}
                textAnchor="middle"
                fontFamily="var(--font-primary)"
                fontWeight={isCurrent ? 800 : 600}
                fontSize="11"
                fill={isCurrent ? '#0a0a0a' : completed ? 'var(--fg-body)' : 'var(--fg-faint)'}
              >
                {n}
              </text>
            </g>
          );
        })}
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-primary)"
          fontWeight="600"
          letterSpacing="2"
          fill="var(--fg-faint)"
        >
          TODAY
        </text>
        <text
          x={CX}
          y={CY + 14}
          textAnchor="middle"
          fontFamily="var(--font-primary)"
          fontWeight="900"
          fontSize="26"
          fill="#ffffff"
          letterSpacing="-0.02em"
        >
          D{pad2(currentDay)}
        </text>
        <text
          x={CX}
          y={CY + 30}
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-primary)"
          fontWeight="500"
          fill={cur?.color || '#8a8a8a'}
        >
          {dayGroup(currentDay)}
        </text>
      </svg>
    </div>
  );
}
