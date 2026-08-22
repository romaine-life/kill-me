// Radial dial showing the Synergy cycle, one segment per day. Today's segment
// fills in its accent color; completed segments are dim white; future segments
// are nearly invisible. Click a segment to navigate (admin) or inspect.
//
// Segments come from the active workout model, so the dial follows the cycle when
// days are added, removed or reordered. Days are addressed by slug; the number on
// each segment is just its position in the current model.

import { dayColor, pad2 } from '../utils/dayDesign';
import { getDays, getDayInfo } from '../utils/dayConfig';

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 88;
const R_INNER = 54;

const polar = (r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
};

const segPath = (i, slice) => {
  const a0 = i * slice;
  const a1 = (i + 1) * slice;
  const [x0, y0] = polar(R_OUTER, a0);
  const [x1, y1] = polar(R_OUTER, a1);
  const [x2, y2] = polar(R_INNER, a1);
  const [x3, y3] = polar(R_INNER, a0);
  return `M ${x0} ${y0} A ${R_OUTER} ${R_OUTER} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${R_INNER} ${R_INNER} 0 0 0 ${x3} ${y3} Z`;
};

export function CycleDial({ currentDay, onDay }) {
  const days = getDays();
  const slice = 360 / days.length;
  // Arc length per segment at the label radius. Two-digit numbers need ~12px, so
  // the label steps down once the cycle grows past a dozen days.
  const labelSize = days.length > 12 ? 10 : 11;

  const current = getDayInfo(currentDay);
  const currentIndex = days.findIndex((day) => day.slug === currentDay);
  const dayName = (current?.name || '').toUpperCase();
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0 6px' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {days.map((day, i) => {
          const isCurrent = day.slug === currentDay;
          const completed = currentIndex !== -1 && i < currentIndex;
          const [tx, ty] = polar((R_OUTER + R_INNER) / 2, i * slice + slice / 2);
          return (
            <g key={day.slug} style={{ cursor: onDay ? 'pointer' : 'default' }} onClick={() => onDay?.(day.slug)}>
              <path
                d={segPath(i, slice)}
                fill={isCurrent ? dayColor(day.slug) : completed ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)'}
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
                fontSize={labelSize}
                fill={isCurrent ? '#0a0a0a' : completed ? 'var(--fg-body)' : 'var(--fg-faint)'}
              >
                {day.number}
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
          D{pad2(current?.number ?? 0)}
        </text>
        {/* The dial hole is ~90 units wide at this baseline, which fits ~13 chars
            at 9px — the longest names ("COMPOUND: PULLS") are 15, so they drop a notch. */}
        <text
          x={CX}
          y={CY + 30}
          textAnchor="middle"
          fontSize={dayName.length > 13 ? 8 : 9}
          fontFamily="var(--font-primary)"
          fontWeight="500"
          fill={dayColor(currentDay)}
        >
          {dayName}
        </text>
      </svg>
    </div>
  );
}
