// Workout-tracker landing page. Renders the chronological feed of workouts,
// cardio sessions, and soreness journal entries with an anatomical hero,
// stats strip, filter tabs, and date-grouped timeline cards.
//
// Pixel-matched to the synergy design system (workout-tracker.html).

import { useState, useEffect, useMemo } from 'react';
import { describeLoggedDay, getDayInfo } from '../utils/dayConfig';
import { useApi } from '../api/useApi.js';
import { formatTime12h, todayLocal } from '../utils/dateUtils';
import { formatIntervalSummary } from '../utils/cardioTemplates.js';
import { cardioColor, cardioName } from '../utils/cardioConfig.js';
import { dayColor, pad2, sorenessTierColor } from '../utils/dayDesign';
import { daysBetween } from '../utils/sorenessLink';
import {
  Bike,
  Activity,
  Dumbbell,
  ChevronRight,
} from 'lucide-react';

const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const daysSince = (iso) => {
  const a = new Date(iso + 'T00:00:00').getTime();
  const b = new Date(todayLocal() + 'T00:00:00').getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

export function ListTab({ onWorkoutClick, onCardioClick, onSorenessClick }) {
  const [workouts, setWorkouts] = useState([]);
  const [cardioSessions, setCardioSessions] = useState([]);
  const [sorenessEntries, setSorenessEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { fetchWorkouts, fetchCardioSessions, fetchSoreness } = useApi();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [w, c, s] = await Promise.all([
          fetchWorkouts(),
          fetchCardioSessions(),
          fetchSoreness(),
        ]);
        if (!active) return;
        setWorkouts(w.workouts || []);
        setCardioSessions(c.sessions || []);
        setSorenessEntries(s.entries || []);
      } catch (err) {
        console.error('Error fetching list data:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchWorkouts, fetchCardioSessions, fetchSoreness]);

  const items = useMemo(() => {
    const merged = [
      ...workouts.map((w) => ({ ...w, _kind: 'workout' })),
      ...cardioSessions.map((c) => ({ ...c, _kind: 'cardio' })),
      ...sorenessEntries.map((e) => ({ ...e, _kind: 'soreness' })),
    ].sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      if (d !== 0) return d;
      return (b.time || '').localeCompare(a.time || '');
    });
    return filter === 'all' ? merged : merged.filter((i) => i._kind === filter);
  }, [workouts, cardioSessions, sorenessEntries, filter]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      if (!m.has(it.date)) m.set(it.date, []);
      m.get(it.date).push(it);
    }
    return [...m.entries()];
  }, [items]);

  const filterCounts = useMemo(() => {
    const all = workouts.length + cardioSessions.length + sorenessEntries.length;
    return {
      all,
      workout: workouts.length,
      cardio: cardioSessions.length,
      soreness: sorenessEntries.length,
    };
  }, [workouts, cardioSessions, sorenessEntries]);

  const allDates = useMemo(
    () => [
      ...workouts.map((w) => w.date),
      ...cardioSessions.map((c) => c.date),
      ...sorenessEntries.map((e) => e.date),
    ],
    [workouts, cardioSessions, sorenessEntries],
  );

  const cyclesCompleted = Math.floor(workouts.length / 12);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', color: 'var(--fg-muted)', fontFamily: 'var(--font-primary)' }}>
        Loading list…
      </div>
    );
  }

  const filters = [
    { id: 'all', label: 'All', count: filterCounts.all },
    { id: 'workout', label: 'Workouts', count: filterCounts.workout },
    { id: 'cardio', label: 'Cardio', count: filterCounts.cardio },
    { id: 'soreness', label: 'Soreness', count: filterCounts.soreness },
  ];

  return (
    <div className="list-tab-page" style={{ width: '100%', maxWidth: 1100, margin: 0, padding: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 28, fontFamily: 'var(--font-primary)' }}>
      <StatsStrip workouts={workouts} cardio={cardioSessions} cycles={cyclesCompleted} activeDays={new Set(allDates).size} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
          {filters.map((f) => {
            const active = f.id === filter;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontFamily: 'var(--font-primary)',
                  fontWeight: 600,
                  color: active ? 'var(--fg-primary)' : 'var(--fg-muted)',
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all var(--t-fast) var(--ease)',
                }}
              >
                {f.label}
                <span className="tnum" style={{ fontSize: 10, color: active ? 'var(--fg-muted)' : 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>{f.count}</span>
              </button>
            );
          })}
        </div>
        <div className="eyebrow tnum">Most recent first</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {groups.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', border: '2px dashed var(--border-subtle)', borderRadius: 16, color: 'var(--fg-muted)' }}>
            <div className="display" style={{ fontSize: 28, color: 'var(--fg-secondary)', marginBottom: 8 }}>No activity yet</div>
            <div style={{ fontSize: 13, color: 'var(--fg-faint)' }}>Log your first session to start the timeline.</div>
          </div>
        ) : (
          groups.map(([date, dayItems]) => (
            <DateGroup key={date} date={date} items={dayItems} onWorkoutClick={onWorkoutClick} onCardioClick={onCardioClick} onSorenessClick={onSorenessClick} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────
// ── Stats strip ────────────────────────────────────────────────────────
function StatsStrip({ workouts, cardio, cycles, activeDays }) {
  const stats = [
    { label: 'Workouts logged', value: workouts.length, sub: 'all-time' },
    { label: 'Cardio sessions', value: cardio.length, sub: 'all-time' },
    { label: 'Cycles completed', value: cycles, sub: `${cycles * 12} sessions` },
    { label: 'Active days', value: activeDays, sub: 'unique dates' },
  ];
  return (
    <div
      className="stats-strip"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        background: 'var(--border-subtle)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {stats.map((s) => (
        <div key={s.label} style={{ background: 'var(--bg-raised)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="eyebrow">{s.label}</span>
          <span className="display tnum" style={{ fontSize: 36, color: 'var(--fg-primary)' }}>{s.value}</span>
          <span style={{ fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>{s.sub}</span>
        </div>
      ))}
    </div>
  );
}

// ── Date group ─────────────────────────────────────────────────────────
function DateGroup({ date, items, onWorkoutClick, onCardioClick, onSorenessClick }) {
  const ds = daysSince(date);
  const rel = ds === 0 ? 'today' : ds === 1 ? 'yesterday' : `${ds} days ago`;
  return (
    <div className="date-group" style={{ display: 'flex', gap: 20 }}>
      <div style={{ width: 110, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4 }}>
        <span className="display tnum" style={{ fontSize: 26, color: 'var(--fg-primary)' }}>{fmtDate(date)}</span>
        <span className="eyebrow">{rel}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        {items.map((it) => {
          if (it._kind === 'workout') return <WorkoutCard key={it.id} w={it} onClick={onWorkoutClick} />;
          if (it._kind === 'cardio') return <CardioCard key={it.id} c={it} onClick={onCardioClick} />;
          if (it._kind === 'soreness') return <SorenessCard key={it.id || `s-${it.date}`} s={it} onClick={onSorenessClick} />;
          return null;
        })}
      </div>
    </div>
  );
}

// ── Day chip ───────────────────────────────────────────────────────────
function DayChip({ daySlug, number, size = 'md' }) {
  const sz = size === 'sm' ? { fs: 10, py: 2, px: 6, dot: 5 } : { fs: 11, py: 3, px: 8, dot: 7 };
  return (
    <span
      className="tnum"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-primary)',
        fontWeight: 700,
        fontSize: sz.fs,
        letterSpacing: '0.04em',
        padding: `${sz.py}px ${sz.px}px`,
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.04)',
        color: 'var(--fg-body)',
        border: '1px solid var(--border-subtle)',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: sz.dot, height: sz.dot, borderRadius: '50%', background: dayColor(daySlug) }} />
      D{pad2(number)}
    </span>
  );
}

// ── Workout card ───────────────────────────────────────────────────────
function WorkoutCard({ w, onClick }) {
  const sets = (w.exercises || []).reduce((sum, exercise) => sum + (exercise.sets || 0), 0);
  return (
    <button
      onClick={() => onClick?.(w)}
      aria-label={`View ${w.dayName || describeLoggedDay(w)} workout details`}
      style={{
        width: '100%', padding: 0, textAlign: 'left', color: 'inherit', borderRadius: 12,
        border: '1px solid var(--border-subtle)', background: 'var(--bg-raised)',
        overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ height: 2, background: dayColor(w.daySlug) }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: `${dayColor(w.daySlug)}18`, color: dayColor(w.daySlug), display: 'grid', placeItems: 'center' }}>
          <Dumbbell size={16} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <DayChip daySlug={w.daySlug} number={w.dayNumber} />
            <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, fontSize: 15, color: 'var(--fg-primary)' }}>
              {w.dayName || describeLoggedDay(w)}
            </span>
            {w.mode === 'quick' && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }}>
                quick log
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
            {w.time && <span>{formatTime12h(w.time)} ·</span>}
            <span>{(w.exercises || []).length} exercises</span>
            <span>· {sets} sets</span>
          </div>
        </div>
        <ChevronRight size={15} color="var(--fg-muted)" />
      </div>
    </button>
  );
}

// ── Cardio card ────────────────────────────────────────────────────────
function CardioCard({ c, onClick }) {
  const isBike = c.activity === 'bike';
  const activityColor = cardioColor(c.activity);
  const intervalSummary = Array.isArray(c.treadmill?.intervals)
    ? formatIntervalSummary(c.treadmill.intervals)
    : c.treadmill?.intervals;

  return (
    <div
      onClick={() => onClick?.(c)}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick(c);
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-raised)',
        padding: '14px 16px',
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 14,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 8, background: `${activityColor}1a`, color: activityColor, display: 'grid', placeItems: 'center' }}>
        {isBike ? <Bike size={16} /> : <Activity size={16} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-primary)',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 9999,
              background: `${activityColor}24`,
              color: activityColor,
            }}
          >
            Cardio
          </span>
          <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, fontSize: 15, color: 'var(--fg-primary)' }}>
            {cardioName(c.activity)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
          {c.time && <>{formatTime12h(c.time)} · </>}
          {c.durationMinutes} min
          {intervalSummary && <span> · {intervalSummary}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
        {isBike && c.bike?.distanceMiles && <MetricStat val={c.bike.distanceMiles} unit="mi" />}
        {isBike && c.bike?.avgSpeedMph && <MetricStat val={c.bike.avgSpeedMph} unit="mph" />}
        {isBike && c.bike?.avgHeartRate && <MetricStat val={c.bike.avgHeartRate} unit="bpm" />}
        {!isBike && <MetricStat val={c.durationMinutes} unit="min" />}
      </div>
    </div>
  );
}

function MetricStat({ val, unit }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
      <span className="display tnum" style={{ fontSize: 20, color: 'var(--fg-primary)' }}>{val}</span>
      <span style={{ fontSize: 10, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{unit}</span>
    </div>
  );
}

// ── Soreness card ──────────────────────────────────────────────────────
function SorenessCard({ s, onClick }) {
  return (
    <div
      onClick={() => onClick?.(s)}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick(s);
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-raised)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,111,0.12)', color: '#f59e6f', display: 'grid', placeItems: 'center' }}>
          <Activity size={14} />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-primary)',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 9999,
            background: 'rgba(245,158,111,0.12)',
            color: '#f59e6f',
          }}
        >
          Soreness journal
        </span>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
          {s.muscles.length} muscle{s.muscles.length !== 1 ? 's' : ''} logged
        </span>
      </div>

      {/* Which workout caused this.
          The feed groups by the date soreness was *felt*, so this card often sits
          directly beneath a workout from the same date that did NOT cause it —
          e.g. Aug 14 leg day above soreness carried over from Aug 13 abs day.
          The attribution therefore has to name the day and its date outright;
          a bare "from D04" reads as a footnote on the card above it. */}
      {s.sourceWorkoutDay != null && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            flexWrap: 'wrap',
            padding: '5px 10px',
            borderRadius: 8,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.03)',
            borderLeft: `3px solid ${dayColor(s.sourceWorkoutDaySlug)}`,
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--fg-faint)', fontFamily: 'var(--font-primary)', fontWeight: 700 }}>
            Caused by
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dayColor(s.sourceWorkoutDaySlug) }} />
            <span className="tnum" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fg-body)' }}>
              D{pad2(s.sourceWorkoutDay)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-primary)' }}>
              {getDayInfo(s.sourceWorkoutDaySlug)?.name}
            </span>
          </span>
          {s.sourceWorkoutDate && (
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
              {fmtDate(s.sourceWorkoutDate)}
              {' · '}
              {(() => {
                const d = daysBetween(s.sourceWorkoutDate, s.date);
                return d === 0 ? 'same day' : `${d} day${d === 1 ? '' : 's'} later`;
              })()}
            </span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {s.muscles.map((m, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              fontSize: 12,
              color: 'var(--fg-body)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sorenessTierColor(m.level) }} />
            <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 500 }}>{m.muscle || m.group}</span>
            <span className="tnum" style={{ color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.level}/10</span>
          </span>
        ))}
      </div>
    </div>
  );
}
