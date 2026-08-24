// Lanes view — a vertical date rail where each workout spawns a stripe that
// runs for as long as its soreness lasted.
//
// Reads like a git graph: the date axis is the trunk, workouts are commits, and
// each recovery is a branch that slopes off its workout and runs down the page
// until it dies. Stripe *length* is the whole point of the view, so a stripe
// never moves sideways once placed — see packLanes() for why that costs nothing.
//
// Every layout question that came up is a toggle rather than a baked-in choice,
// so the call can be made by looking:
//
//   stripe per  — one stripe per workout, or one per muscle group in a workout
//   missed days — bridge a day with no log, or break the stripe
//   order       — oldest at top (cause above effect) or newest at top (feed order)
//   quiet days  — collapse runs of empty dates, or show every one
//   window      — how far back to draw
//
// Rendered as one SVG so rows, stripes and connectors cannot drift out of
// alignment, inside a horizontally scrollable box for narrow screens.

import { useMemo, useState, useEffect } from 'react';
import { getDayInfo, describeLoggedDay } from '../utils/dayConfig';
import { dayColor, pad2 } from '../utils/dayDesign';
import { buildTracks, packLanes, datesBetween, daysBetween } from '../utils/sorenessLink';
import { todayLocal } from '../utils/dateUtils';
import { colors } from '../colors';

const ROW_H = 30;
const GAP_H = 22; // a collapsed run of dates with nothing in them
const DATE_X = 0;
const DATE_W = 74; // wide enough for "Sat Aug 13" in 10px monospace
const WO_X = DATE_W + 6;
const WO_W = 146;
const GUTTER = 64; // room for the spawn connector to slope
const LANE_W = 20;
const LANE_PITCH = 26;
const LABEL_GAP = 14;
const LABEL_COL = 100; // per-stripe label column, for stripes sharing a start day
const TOP = 34;

const shortDate = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// The rail is read to answer "was that a weekend?" as often as "what date was
// that?", so the weekday sits with the date rather than being inferred.
const weekday = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });

// The chart is intrinsically wide, so on a phone the side panel has to move
// below it — otherwise the row's fixed-width panel pushes the whole thing past
// the viewport, and the app body doesn't scroll sideways so it just gets cut.
function useNarrow(breakpoint = 760) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setNarrow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return narrow;
}

function shiftDays(date, delta) {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function SorenessLanes({ entries, workouts, isAdmin, onLogSoreness, onEditEntry }) {
  const [group, setGroup] = useState('workout');   // 'workout' | 'muscle'
  const [gaps, setGaps] = useState('bridge');     // 'bridge' | 'break'
  const [order, setOrder] = useState('oldest');    // 'oldest' | 'newest'
  const [quiet, setQuiet] = useState('collapse');  // 'collapse' | 'show'
  const [windowDays, setWindowDays] = useState(30); // 30 | 90 | 0 (all)
  const [hover, setHover] = useState(null);
  const narrow = useNarrow();

  const model = useMemo(() => {
    const cutoff = windowDays ? shiftDays(todayLocal(), -windowDays) : null;
    const inWindow = (d) => !cutoff || d >= cutoff;

    const built = buildTracks(entries.filter((e) => inWindow(e.date)), group);
    const { tracks, laneCount } = packLanes(built);
    const visibleWorkouts = workouts.filter((w) => inWindow(w.date));

    const stamps = [
      ...visibleWorkouts.map((w) => w.date),
      ...tracks.flatMap((t) => [t.startDate, t.endDate, t.sourceWorkoutDate].filter(Boolean)),
    ];
    if (stamps.length === 0) {
      return { layout: [], yByDate: new Map(), bottom: TOP, tracks: [], laneCount: 0, workoutsByDate: new Map() };
    }

    const min = stamps.reduce((a, b) => (a < b ? a : b));
    const max = stamps.reduce((a, b) => (a > b ? a : b));
    let dates = datesBetween(min, max);
    if (order === 'newest') dates = dates.reverse();

    const workoutsByDate = new Map();
    for (const w of visibleWorkouts) {
      if (!workoutsByDate.has(w.date)) workoutsByDate.set(w.date, []);
      workoutsByDate.get(w.date).push(w);
    }

    // A date earns a full row if something happens on it, or if a stripe is
    // mid-run through it. A stripe must never be collapsed through, or its
    // length — the one thing this view exists to show — would lie.
    const active = new Set(workoutsByDate.keys());
    for (const t of tracks) {
      if (t.sourceWorkoutDate) active.add(t.sourceWorkoutDate);
      for (const d of datesBetween(t.startDate, t.endDate)) active.add(d);
    }

    const layout = [];
    let yPos = TOP;
    let run = [];
    const flushRun = () => {
      if (!run.length) return;
      if (quiet === 'collapse' && run.length >= 2) {
        layout.push({ kind: 'gap', count: run.length, y: yPos, h: GAP_H });
        yPos += GAP_H;
      } else {
        for (const d of run) {
          layout.push({ kind: 'date', date: d, y: yPos + ROW_H / 2, h: ROW_H });
          yPos += ROW_H;
        }
      }
      run = [];
    };
    for (const d of dates) {
      if (active.has(d)) {
        flushRun();
        layout.push({ kind: 'date', date: d, y: yPos + ROW_H / 2, h: ROW_H });
        yPos += ROW_H;
      } else {
        run.push(d);
      }
    }
    flushRun();

    const yByDate = new Map();
    for (const r of layout) if (r.kind === 'date') yByDate.set(r.date, r.y);

    return { layout, yByDate, bottom: yPos, tracks, laneCount, workoutsByDate };
  }, [entries, workouts, group, order, windowDays, quiet]);

  const { layout, yByDate, bottom, tracks, laneCount, workoutsByDate } = model;
  const y = (date) => yByDate.get(date);

  // A stripe's label sits at whichever end is visually on top, which flips with
  // the sort order — otherwise in newest-first the label floats at the bottom of
  // the stripe it names.
  const anchorDate = (t) => (order === 'newest' ? t.endDate : t.startDate);

  // Several stripes can share an anchor row — after a leg session you might log
  // quads, glutes and erectors at once — and their labels would otherwise print
  // on top of each other. Lay them out left-to-right in lane order, so reading
  // the labels across matches reading the stripes across.
  const labelSlots = useMemo(() => {
    const byRow = new Map();
    for (const t of [...tracks].sort((a, b) => a.lane - b.lane)) {
      const d = order === 'newest' ? t.endDate : t.startDate;
      if (!byRow.has(d)) byRow.set(d, []);
      byRow.get(d).push(t.key);
    }
    const slot = new Map();
    let widest = 1;
    for (const keys of byRow.values()) {
      keys.forEach((k, i) => slot.set(k, i));
      widest = Math.max(widest, keys.length);
    }
    return { slot, widest };
  }, [tracks, order]);

  const laneX0 = WO_X + WO_W + GUTTER;
  const labelX = laneX0 + Math.max(laneCount, 1) * LANE_PITCH + LABEL_GAP;
  const width = labelX + labelSlots.widest * LABEL_COL + 16;
  const height = bottom + 16;

  const controls = (
    <Controls {...{ group, setGroup, gaps, setGaps, order, setOrder, quiet, setQuiet, windowDays, setWindowDays }} />
  );

  if (layout.length === 0) {
    return (
      <div style={{ maxWidth: '100%', minWidth: 0 }}>
        {controls}
        <p style={{ color: colors.text.tertiary, fontSize: 13, marginTop: 16 }}>
          No workout-linked soreness in this window.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '100%', minWidth: 0 }}>
      {controls}

      <div
        style={{
          display: 'flex',
          flexDirection: narrow ? 'column' : 'row',
          gap: 16,
          // Stretch once stacked: with flex-start, a column's children size to
          // their own content, so the scroll box would inflate to the SVG's full
          // width and drag the panel and controls off the screen with it.
          alignItems: narrow ? 'stretch' : 'flex-start',
          marginTop: 14,
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        <div
          style={{
            overflowX: 'auto',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            // `flex` addresses the main axis, so it must not be set once the
            // row turns into a column — it would zero the chart's height.
            ...(narrow ? {} : { flex: '1 1 0' }),
          }}
        >
          <svg width={width} height={height} style={{ display: 'block' }}>
            {/* Date rail */}
            {layout.map((r) =>
              r.kind === 'gap' ? (
                <g key={`gap-${r.y}`}>
                  <line
                    x1={DATE_X}
                    y1={r.y + GAP_H / 2}
                    x2={width - 8}
                    y2={r.y + GAP_H / 2}
                    stroke={colors.border.subtle}
                    strokeWidth={0.5}
                    strokeDasharray="1 5"
                  />
                  <rect x={DATE_X} y={r.y + GAP_H / 2 - 7} width={DATE_W + 24} height={14} fill={colors.bg.base} />
                  <text
                    x={DATE_X}
                    y={r.y + GAP_H / 2 + 3}
                    style={{ fontSize: 9, fontFamily: 'monospace', fill: colors.text.disabled }}
                  >
                    {r.count} quiet days
                  </text>
                </g>
              ) : (
                <g key={r.date}>
                  <text
                    x={DATE_X}
                    y={r.y + 4}
                    style={{ fontSize: 10, fontFamily: 'monospace', fill: colors.text.tertiary }}
                  >
                    {weekday(r.date)} {shortDate(r.date)}
                  </text>
                  <line
                    x1={DATE_W - 4}
                    y1={r.y}
                    x2={width - 8}
                    y2={r.y}
                    stroke={colors.border.subtle}
                    strokeWidth={0.5}
                    strokeDasharray="2 4"
                    opacity={0.5}
                  />
                </g>
              ),
            )}

            {/* Spawn connectors: workout -> first day of its stripe */}
            {tracks.map((t) => {
              const y1 = t.sourceWorkoutDate ? y(t.sourceWorkoutDate) : undefined;
              const y2raw = y(t.startDate);
              if (y1 == null || y2raw == null) return null;
              const x1 = WO_X + WO_W;
              const x2 = laneX0 + t.lane * LANE_PITCH;
              const y2 = y2raw - ROW_H / 2 + 1;
              const dim = hover && hover.workoutId !== t.sourceWorkoutId;
              return (
                <path
                  key={`c-${t.key}`}
                  d={`M${x1} ${y1} C${x1 + 34} ${y1} ${x2 - 30} ${y2} ${x2} ${y2}`}
                  fill="none"
                  stroke={dayColor(t.sourceWorkoutDaySlug)}
                  strokeWidth={1.5}
                  opacity={dim ? 0.18 : 0.75}
                />
              );
            })}

            {/* Stripes */}
            {tracks.map((t) => {
              const x = laneX0 + t.lane * LANE_PITCH;
              const color = dayColor(t.sourceWorkoutDaySlug);
              const dim = hover && hover.workoutId !== t.sourceWorkoutId;
              return (
                <g key={t.key} opacity={dim ? 0.2 : 1}>
                  {datesBetween(t.startDate, t.endDate).map((d) => {
                    const rowY = y(d);
                    if (rowY == null) return null;
                    const top = rowY - ROW_H / 2 + 1;
                    if (!t.logged.has(d)) {
                      // A day you didn't log. Bridge it (the soreness was
                      // presumably still there) or break the stripe.
                      if (gaps === 'break') return null;
                      return (
                        <rect
                          key={d}
                          x={x + LANE_W / 2 - 1.5}
                          y={top}
                          width={3}
                          height={ROW_H - 2}
                          fill={color}
                          opacity={0.3}
                        />
                      );
                    }
                    // A logged day is the entry itself, so clicking it opens
                    // that entry in the editor — the same place the journal
                    // wrench goes. Without this the only way to fix a mislogged
                    // day was to leave the view you spotted it in.
                    const editable = isAdmin && !!onEditEntry;
                    return (
                      <rect
                        key={d}
                        x={x}
                        y={top}
                        width={LANE_W}
                        height={ROW_H - 2}
                        rx={2}
                        fill={color}
                        style={{ cursor: editable ? 'pointer' : 'default' }}
                        onClick={() =>
                          editable && onEditEntry({ date: d, sourceWorkoutId: t.sourceWorkoutId })
                        }
                        onMouseEnter={() =>
                          setHover({
                            workoutId: t.sourceWorkoutId,
                            daySlug: t.sourceWorkoutDaySlug,
                            day: t.sourceWorkoutDay,
                            workoutDate: t.sourceWorkoutDate,
                            date: d,
                            group: t.group,
                            detail: t.detail.get(d) || [],
                          })
                        }
                        onMouseLeave={() => setHover(null)}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* One label per stripe, at its first day */}
            {tracks.map((t) => {
              const rowY = y(anchorDate(t));
              if (rowY == null) return null;
              const dim = hover && hover.workoutId !== t.sourceWorkoutId;
              return (
                <text
                  key={`l-${t.key}`}
                  x={labelX + (labelSlots.slot.get(t.key) || 0) * LABEL_COL}
                  y={rowY + 4}
                  style={{ fontSize: 10, fontFamily: 'monospace', fill: colors.text.tertiary }}
                  opacity={dim ? 0.25 : 1}
                >
                  {group === 'muscle'
                    ? t.group
                    : `${t.spanDays}d${t.peak == null ? '' : ` · peak ${t.peak}`}`}
                </text>
              );
            })}

            {/* Workout nodes */}
            {layout
              .filter((r) => r.kind === 'date')
              .map((r) =>
                (workoutsByDate.get(r.date) || []).map((w, i) => {
                  const dim = hover && hover.workoutId !== w.id;
                  const c = dayColor(w.daySlug);
                  return (
                    <g
                      key={w.id}
                      opacity={dim ? 0.3 : 1}
                      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                      onClick={() => isAdmin && onLogSoreness?.(w)}
                    >
                      <rect
                        x={WO_X + i * 5}
                        y={r.y - ROW_H / 2 + 2}
                        width={WO_W - i * 5}
                        height={ROW_H - 6}
                        rx={4}
                        fill={colors.bg.surface}
                        stroke={c}
                        strokeWidth={0.75}
                      />
                      <rect x={WO_X + i * 5} y={r.y - ROW_H / 2 + 2} width={3} height={ROW_H - 6} fill={c} />
                      <text
                        x={WO_X + 10 + i * 5}
                        y={r.y + 4}
                        style={{ fontSize: 11, fill: colors.text.primary, fontWeight: 600 }}
                      >
                        D{pad2(w.dayNumber)} · {describeLoggedDay(w).slice(0, 15)}
                      </text>
                    </g>
                  );
                }),
              )}
          </svg>
        </div>

        <HoverPanel hover={hover} narrow={narrow} />
      </div>
    </div>
  );
}

function HoverPanel({ hover, narrow }) {
  // Nothing hovered means nothing to say. On a phone the panel sits below the
  // chart, so it can simply go; on desktop it is a fixed column beside the
  // chart, and dropping it outright would reflow the chart on every hover.
  if (!hover) return narrow ? null : <div style={{ width: 200, flexShrink: 0 }} />;

  return (
    <div
      style={{
        width: narrow ? '100%' : 200,
        boxSizing: 'border-box',
        flexShrink: 0,
        padding: 12,
        borderRadius: 10,
        background: colors.bg.raised,
        border: `1px solid ${colors.border.subtle}`,
        ...(narrow ? {} : { position: 'sticky', top: 12 }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dayColor(hover.daySlug) }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary }}>
          D{pad2(hover.day)} · {getDayInfo(hover.daySlug)?.name}
        </span>
      </div>
      <div style={{ fontSize: 11, color: colors.text.tertiary, marginBottom: 8 }}>
        {weekday(hover.date)} {shortDate(hover.date)}
        {hover.workoutDate && ` · +${daysBetween(hover.workoutDate, hover.date)}d`}
      </div>
      {hover.group && (
        <div style={{ fontSize: 11, color: colors.text.secondary, marginBottom: 6 }}>{hover.group}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {hover.detail.map((m) => (
          <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 }}>
            <span style={{ color: colors.text.secondary }}>{m.name}</span>
            <span style={{ color: colors.text.primary, fontFamily: 'monospace' }}>{m.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Controls({ group, setGroup, gaps, setGaps, order, setOrder, quiet, setQuiet, windowDays, setWindowDays }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', maxWidth: '100%', minWidth: 0 }}>
      <Seg
        label="Stripe per"
        value={group}
        onChange={setGroup}
        opts={[
          { id: 'workout', label: 'Workout' },
          { id: 'muscle', label: 'Muscle group' },
        ]}
      />
      <Seg
        label="Missed days"
        value={gaps}
        onChange={setGaps}
        opts={[
          { id: 'bridge', label: 'Bridge' },
          { id: 'break', label: 'Break' },
        ]}
      />
      <Seg
        label="Order"
        value={order}
        onChange={setOrder}
        opts={[
          { id: 'oldest', label: 'Oldest top' },
          { id: 'newest', label: 'Newest top' },
        ]}
      />
      <Seg
        label="Quiet days"
        value={quiet}
        onChange={setQuiet}
        opts={[
          { id: 'collapse', label: 'Collapse' },
          { id: 'show', label: 'Show' },
        ]}
      />
      <Seg
        label="Window"
        value={windowDays}
        onChange={setWindowDays}
        opts={[
          { id: 30, label: '30d' },
          { id: 90, label: '90d' },
          { id: 0, label: 'All' },
        ]}
      />
    </div>
  );
}

function Seg({ label, value, onChange, opts }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.text.disabled }}>
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          gap: 3,
          padding: 3,
          background: colors.bg.raised,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: 7,
        }}
      >
        {opts.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              style={{
                padding: '4px 9px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                color: active ? colors.text.primary : colors.text.tertiary,
                background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
