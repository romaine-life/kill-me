// Workout-tracker landing page. Renders the chronological feed of workouts,
// cardio sessions, and soreness journal entries with an anatomical hero,
// stats strip, filter tabs, and date-grouped timeline cards.
//
// Pixel-matched to the synergy design system (workout-tracker.html).

import { useState, useEffect, useMemo } from 'react';
import { DAY_CONFIG } from '../utils/dayConfig';
import { useDataSource } from '../api/snapshotContext.jsx';
import { formatTime12h, todayLocal } from '../utils/dateUtils';
import { formatIntervalSummary } from '../utils/cardioTemplates.js';
import {
  DAY_DESIGN,
  dayColor,
  dayMuscle,
  anatomyUrl,
  pad2,
  sorenessTierColor,
} from '../utils/dayDesign';
import {
  Plus,
  Check,
  Bike,
  Activity,
  ChevronRight,
  AlertTriangle,
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

export function ListTab({ onWorkoutClick, onCardioClick, viewToggle }) {
  const [workouts, setWorkouts] = useState([]);
  const [cardioSessions, setCardioSessions] = useState([]);
  const [sorenessEntries, setSorenessEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { fetchWorkouts, fetchCardioSessions, fetchSoreness, isReady } = useDataSource();

  useEffect(() => {
    if (!isReady) return;
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
  }, [isReady]);

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
    <div className="list-tab-page" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 80px', display: 'flex', flexDirection: 'column', gap: 28, fontFamily: 'var(--font-primary)' }}>
      {viewToggle}
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
            <DateGroup key={date} date={date} items={dayItems} onWorkoutClick={onWorkoutClick} onCardioClick={onCardioClick} />
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
function DateGroup({ date, items, onWorkoutClick, onCardioClick }) {
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
          if (it._kind === 'soreness') return <SorenessCard key={`s-${it.date}`} s={it} />;
          return null;
        })}
      </div>
    </div>
  );
}

// ── Day chip ───────────────────────────────────────────────────────────
function DayChip({ n, size = 'md' }) {
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
      <span style={{ width: sz.dot, height: sz.dot, borderRadius: '50%', background: dayColor(n) }} />
      D{pad2(n)}
    </span>
  );
}

// ── Workout card ───────────────────────────────────────────────────────
function WorkoutCard({ w, onClick }) {
  const [open, setOpen] = useState(false);
  const design = DAY_DESIGN[w.dayNumber] || {};
  const dayInfo = DAY_CONFIG[w.dayNumber];
  const muscle = dayMuscle(w.dayNumber);
  const sets = (w.exercises || []).reduce((s, e) => s + (e.sets || 0), 0);
  const handleHeader = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-raised)',
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 2, background: dayColor(w.dayNumber) }} />
      <button
        onClick={handleHeader}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
          alignItems: 'center',
          gap: 14,
          padding: '14px 16px',
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            background: 'var(--bg-app)',
            border: '1px solid var(--border-subtle)',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <img className="anatomy" src={anatomyUrl(muscle)} alt="" style={{ height: 62, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <DayChip n={w.dayNumber} />
            <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, fontSize: 15, color: 'var(--fg-primary)' }}>
              {w.dayName || dayInfo?.name}
            </span>
            {w.mode === 'quick' && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--fg-muted)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                  textTransform: 'lowercase',
                }}
              >
                quick log
              </span>
            )}
            {design.warn && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--status-warn)', fontFamily: 'var(--font-mono)' }}>
                <AlertTriangle size={12} /> shoulder-safe
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
            {w.time && <span>{formatTime12h(w.time)}</span>}
            {w.time && <span>·</span>}
            <span>{(w.exercises || []).length} exercises</span>
            <span>·</span>
            <span className="tnum">{sets} sets</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {(w.exercises || []).map((e, i) => {
            const h = Math.max(6, Math.min(28, ((e.weight || 0) / 4) + 6));
            return <div key={i} style={{ width: 4, height: h, background: dayColor(w.dayNumber), opacity: 0.6, borderRadius: 1 }} />;
          })}
        </div>
        <div
          style={{
            color: 'var(--fg-muted)',
            display: 'flex',
            alignItems: 'center',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform var(--t-fast) var(--ease)',
          }}
        >
          <ChevronRight size={14} />
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 70 }}>
          {(w.exercises || []).map((e, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 6,
                alignItems: 'center',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div>
                <span style={{ color: 'var(--fg-body)', fontWeight: 600 }}>{e.name}</span>
                {e.variation && e.variation !== 'Standard' && (
                  <span style={{ color: 'var(--fg-faint)', marginLeft: 8 }}>{e.variation}</span>
                )}
              </div>
              <div className="tnum" style={{ color: 'var(--fg-secondary)', display: 'flex', gap: 10 }}>
                {e.weight != null && <span>{e.weight} lb</span>}
                {e.reps != null && <span>×{e.reps}</span>}
                {e.sets != null && <span style={{ color: dayColor(w.dayNumber) }}>×{e.sets} sets</span>}
              </div>
            </div>
          ))}
          {onClick && (
            <button
              onClick={() => onClick(w)}
              style={{
                alignSelf: 'flex-start',
                marginTop: 6,
                padding: '6px 10px',
                fontSize: 11,
                fontFamily: 'var(--font-primary)',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 9999,
                cursor: 'pointer',
              }}
            >
              Open in editor →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cardio card ────────────────────────────────────────────────────────
function CardioCard({ c, onClick }) {
  const isBike = c.activity === 'bike';
  const intervalSummary = Array.isArray(c.treadmill?.intervals)
    ? formatIntervalSummary(c.treadmill.intervals)
    : c.treadmill?.intervals;

  return (
    <div
      onClick={() => onClick?.(c)}
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
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(103,232,249,0.10)', color: '#67e8f9', display: 'grid', placeItems: 'center' }}>
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
              background: 'rgba(103,232,249,0.14)',
              color: '#a5f3fc',
            }}
          >
            Cardio
          </span>
          <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, fontSize: 15, color: 'var(--fg-primary)', textTransform: 'capitalize' }}>
            {c.activity}
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
function SorenessCard({ s }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-raised)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
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
