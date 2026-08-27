import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Bike, ChevronLeft, Dumbbell, Wrench } from 'lucide-react';
import { useApi } from '../api/useApi.js';
import { colors } from '../colors';
import { cardioColor, cardioName } from '../utils/cardioConfig';
import { formatTime12h } from '../utils/dateUtils';
import { describeLoggedDay, getDayInfo } from '../utils/dayConfig';
import { dayColor, pad2 } from '../utils/dayDesign';

function formatDate(dateStr) {
  if (!dateStr) return 'Date not recorded';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function entryLevel(entry) {
  if (Number.isInteger(entry?.level) && entry.level >= 1 && entry.level <= 10) return entry.level;
  const levels = (entry?.muscles || []).map((muscle) => muscle.level).filter(Number.isFinite);
  return levels.length ? Math.max(...levels) : null;
}

function levelLabel(level) {
  if (level == null) return 'Not recorded';
  if (level <= 2) return 'Mild';
  if (level <= 4) return 'Noticeable';
  if (level <= 6) return 'Moderate';
  if (level <= 8) return 'Significant';
  return 'Severe';
}

function levelColor(level) {
  if (level == null) return colors.text.tertiary;
  if (level <= 2) return colors.accent.green;
  if (level <= 4) return colors.accent.cyan;
  if (level <= 6) return colors.accent.gold;
  if (level <= 8) return colors.accent.amber;
  return colors.accent.red;
}

function loggedWeights(exercise) {
  if (Array.isArray(exercise.weights)) return exercise.weights;
  return Object.entries(exercise.weights || {}).map(([key, value]) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value,
  }));
}

function recordKey(record) {
  return record?.id || `${record?.date || ''}-${record?.sourceWorkoutId || ''}`;
}

export function ActivityRecordDetail({
  kind,
  record,
  isAdmin,
  onBack,
  onEdit,
  onOpenRecord,
  onAddSoreness,
}) {
  const { fetchWorkouts, fetchCardioSessions, fetchSoreness } = useApi();
  const fetchers = useRef({ fetchWorkouts, fetchCardioSessions, fetchSoreness });
  useEffect(() => {
    fetchers.current = { fetchWorkouts, fetchCardioSessions, fetchSoreness };
  }, [fetchWorkouts, fetchCardioSessions, fetchSoreness]);
  const [related, setRelated] = useState({ workouts: [], cardio: [], soreness: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchers.current.fetchWorkouts(),
      fetchers.current.fetchCardioSessions(),
      fetchers.current.fetchSoreness(),
    ])
      .then(([workoutData, cardioData, sorenessData]) => {
        if (!active) return;
        setRelated({
          workouts: workoutData.workouts || [],
          cardio: cardioData.sessions || [],
          soreness: sorenessData.entries || [],
        });
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, record]);

  const context = useMemo(() => {
    if (kind === 'workout') {
      return {
        cardio: related.cardio.filter((session) => session.date === record.date),
        soreness: related.soreness
          .filter((entry) => entry.sourceWorkoutId === record.id)
          .sort((a, b) => b.date.localeCompare(a.date)),
      };
    }
    if (kind === 'soreness') {
      return {
        sourceWorkout: related.workouts.find((workout) => workout.id === record.sourceWorkoutId) || null,
      };
    }
    return {};
  }, [kind, record, related]);

  if (!record) return null;

  return (
    <div style={styles.page}>
      <button onClick={onBack} style={styles.backButton}>
        <ChevronLeft size={15} /> Back
      </button>

      {kind === 'workout' && (
        <WorkoutDetail
          workout={record}
          context={context}
          isAdmin={isAdmin}
          loading={loading}
          onEdit={() => onEdit?.('workout', record)}
          onOpenRecord={onOpenRecord}
          onAddSoreness={() => onAddSoreness?.(record)}
        />
      )}
      {kind === 'cardio' && (
        <CardioDetail
          session={record}
          isAdmin={isAdmin}
          onEdit={() => onEdit?.('cardio', record)}
        />
      )}
      {kind === 'soreness' && (
        <SorenessDetail
          entry={record}
          sourceWorkout={context.sourceWorkout}
          isAdmin={isAdmin}
          loading={loading}
          onEdit={() => onEdit?.('soreness', record)}
          onOpenRecord={onOpenRecord}
        />
      )}

      {error && <div style={styles.error}>Related records could not be loaded: {error}</div>}
    </div>
  );
}

function DetailHeader({ eyebrow, title, date, time, accent, icon, actions }) {
  return (
    <header className="activity-detail-header" style={{ ...styles.header, borderColor: `${accent}55` }}>
      <div style={{ ...styles.icon, color: accent, background: `${accent}18` }}>
        {createElement(icon, { size: 20 })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.eyebrow}>{eyebrow}</div>
        <h2 style={styles.title}>{title}</h2>
        <div style={styles.meta}>
          {formatDate(date)}{time ? ` · ${formatTime12h(time)}` : ''}
        </div>
      </div>
      {actions && <div className="activity-detail-actions" style={styles.actions}>{actions}</div>}
    </header>
  );
}

function WorkoutDetail({ workout, context, isAdmin, loading, onEdit, onOpenRecord, onAddSoreness }) {
  const accent = dayColor(workout.daySlug);
  const exercises = workout.exercises || [];
  const hasRelated = context.cardio?.length > 0 || context.soreness?.length > 0;

  return (
    <>
      <DetailHeader
        eyebrow="Strength workout"
        title={describeLoggedDay(workout)}
        date={workout.date}
        time={workout.time}
        accent={accent}
        icon={Dumbbell}
        actions={isAdmin && (
          <>
            <button onClick={onAddSoreness} style={styles.primaryAction}>+ Add soreness</button>
            <button onClick={onEdit} style={styles.secondaryAction}><Wrench size={13} /> Edit workout</button>
          </>
        )}
      />

      <section style={styles.section}>
        <div style={styles.sectionHeadingRow}>
          <h3 style={styles.sectionHeading}>Exercises</h3>
          <span style={styles.count}>{exercises.length}</span>
        </div>
        {exercises.length === 0 ? (
          <div style={styles.empty}>No exercise details were recorded.</div>
        ) : (
          <div style={styles.cardList}>
            {exercises.map((exercise, index) => (
              <ExerciseRow key={`${exercise.name}-${index}`} exercise={exercise} number={index + 1} accent={accent} />
            ))}
          </div>
        )}
      </section>

      {!loading && hasRelated && (
        <section style={styles.section}>
          <h3 style={styles.sectionHeading}>Related records</h3>
          <div style={styles.relatedGrid}>
            {context.cardio.map((session) => (
              <RecordLink
                key={recordKey(session)}
                eyebrow="Cardio · same day"
                title={cardioName(session.activity)}
                detail={`${session.durationMinutes || '—'} min${session.time ? ` · ${formatTime12h(session.time)}` : ''}`}
                accent={cardioColor(session.activity)}
                onClick={() => onOpenRecord?.('cardio', session)}
              />
            ))}
            {context.soreness.map((entry) => {
              const level = entryLevel(entry);
              const muscles = entry.muscles || [];
              return (
                <RecordLink
                  key={recordKey(entry)}
                  eyebrow="Soreness"
                  title={level ? `Intensity ${level} · ${levelLabel(level)}` : 'Intensity not recorded'}
                  detail={`${formatDate(entry.date)} · ${muscles.length ? muscles.map((m) => m.muscle || m.group).join(', ') : 'No muscles specified'}`}
                  accent={levelColor(level)}
                  onClick={() => onOpenRecord?.('soreness', entry)}
                />
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function ExerciseRow({ exercise, number, accent }) {
  const weights = loggedWeights(exercise).filter((entry) => entry.value != null && entry.value !== '');
  const metrics = [
    exercise.weight != null && exercise.weight !== '' ? ['Weight', `${exercise.weight} lb`] : null,
    ...weights.map((entry) => [entry.label || entry.key, `${entry.value} lb`]),
    exercise.inclineDegrees != null && exercise.inclineDegrees !== '' ? ['Incline', `${exercise.inclineDegrees}°`] : null,
    exercise.sets != null ? ['Sets', exercise.sets] : null,
    exercise.reps != null ? ['Reps', exercise.reps] : null,
  ].filter(Boolean);

  return (
    <div style={styles.exerciseRow}>
      <div style={{ ...styles.exerciseNumber, borderColor: accent, color: accent }}>{number}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.exerciseName}>{exercise.name}</div>
        {exercise.variation && exercise.variation !== 'Standard' && (
          <div style={styles.exerciseVariation}>{exercise.variation}</div>
        )}
        {metrics.length > 0 && (
          <div style={styles.metricGrid}>
            {metrics.map(([label, value]) => <DetailField key={label} label={label} value={value} compact />)}
          </div>
        )}
      </div>
    </div>
  );
}

function CardioDetail({ session, isAdmin, onEdit }) {
  const accent = cardioColor(session.activity);
  const isBike = session.activity === 'bike';
  const intervals = Array.isArray(session.treadmill?.intervals) ? session.treadmill.intervals : [];
  const metrics = [
    ['Duration', session.durationMinutes != null ? `${session.durationMinutes} min` : 'Not recorded'],
    session.treadmill?.templateName ? ['Workout', session.treadmill.templateName] : null,
    session.bike?.distanceMiles != null ? ['Distance', `${session.bike.distanceMiles} mi`] : null,
    session.bike?.avgSpeedMph != null ? ['Average speed', `${session.bike.avgSpeedMph} mph`] : null,
    session.bike?.avgHeartRate != null ? ['Average heart rate', `${session.bike.avgHeartRate} bpm`] : null,
    session.bike?.calories != null ? ['Calories', `${session.bike.calories} cal`] : null,
  ].filter(Boolean);

  return (
    <>
      <DetailHeader
        eyebrow="Cardio session"
        title={cardioName(session.activity)}
        date={session.date}
        time={session.time}
        accent={accent}
        icon={isBike ? Bike : Activity}
        actions={isAdmin && (
          <button onClick={onEdit} style={styles.secondaryAction}><Wrench size={13} /> Edit cardio</button>
        )}
      />

      <section style={styles.section}>
        <div style={styles.metricGridLarge}>
          {metrics.map(([label, value]) => <DetailField key={label} label={label} value={value} />)}
        </div>
      </section>

      {intervals.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionHeading}>Intervals</h3>
          <div style={styles.cardList}>
            {intervals.map((interval, index) => (
              <div key={`${interval.type}-${index}`} style={styles.intervalRow}>
                <span style={{ color: interval.type === 'jog' ? accent : colors.text.secondary, fontWeight: 700, textTransform: 'capitalize' }}>
                  {interval.type}
                </span>
                <span style={styles.mono}>{interval.durationMinutes} min · {interval.speedMph} mph</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {session.notes && (
        <section style={styles.section}>
          <h3 style={styles.sectionHeading}>Notes</h3>
          <div style={styles.note}>{session.notes}</div>
        </section>
      )}
    </>
  );
}

function SorenessDetail({ entry, sourceWorkout, isAdmin, loading, onEdit, onOpenRecord }) {
  const level = entryLevel(entry);
  const muscles = entry.muscles || [];
  const accent = levelColor(level);
  const sourceTitle = sourceWorkout
    ? describeLoggedDay(sourceWorkout)
    : getDayInfo(entry.sourceWorkoutDaySlug)?.name || `Day ${entry.sourceWorkoutDay}`;

  return (
    <>
      <DetailHeader
        eyebrow="Soreness record"
        title={level ? `Intensity ${level} · ${levelLabel(level)}` : 'Intensity not recorded'}
        date={entry.date}
        accent={accent}
        icon={Activity}
        actions={isAdmin && (
          <button onClick={onEdit} style={styles.secondaryAction}><Wrench size={13} /> Edit soreness</button>
        )}
      />

      <section style={styles.section}>
        <div style={styles.metricGridLarge}>
          <DetailField label="Intensity" value={level ? `${level} / 10 · ${levelLabel(level)}` : 'Not recorded'} />
          <DetailField label="Muscles" value={muscles.length ? `${muscles.length} specified` : 'Not specified'} />
        </div>
      </section>

      {muscles.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionHeading}>Muscles</h3>
          <div style={styles.muscleList}>
            {muscles.map((muscle, index) => (
              <div key={`${muscle.group}-${muscle.muscle || 'group'}-${index}`} style={styles.musclePill}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />
                <span>{muscle.muscle || muscle.group}</span>
                {muscle.muscle && <span style={styles.muscleGroup}>{muscle.group}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && (entry.sourceWorkoutId || entry.sourceWorkoutDay != null) && (
        <section style={styles.section}>
          <h3 style={styles.sectionHeading}>Originating workout</h3>
          {sourceWorkout ? (
            <RecordLink
              eyebrow="Strength workout"
              title={sourceTitle}
              detail={formatDate(sourceWorkout.date)}
              accent={dayColor(sourceWorkout.daySlug)}
              onClick={() => onOpenRecord?.('workout', sourceWorkout)}
            />
          ) : (
            <div style={styles.note}>
              D{pad2(entry.sourceWorkoutDay)} · {sourceTitle} · {formatDate(entry.sourceWorkoutDate)}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function DetailField({ label, value, compact = false }) {
  return (
    <div style={compact ? styles.metricCompact : styles.metric}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value}</div>
    </div>
  );
}

function RecordLink({ eyebrow, title, detail, accent, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.recordLink, borderLeftColor: accent }}>
      <span style={styles.eyebrow}>{eyebrow}</span>
      <span style={styles.recordTitle}>{title}</span>
      <span style={styles.recordDetail}>{detail}</span>
      <span style={styles.openLabel}>View details →</span>
    </button>
  );
}

const styles = {
  page: { width: '100%', maxWidth: 960, minWidth: 0, boxSizing: 'border-box' },
  backButton: {
    display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14, padding: '7px 10px',
    borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent',
    color: 'var(--fg-muted)', fontFamily: 'var(--font-primary)', fontSize: 12, fontWeight: 650, cursor: 'pointer',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 14,
    border: '1px solid', background: 'var(--bg-raised)', flexWrap: 'wrap',
  },
  icon: { width: 44, height: 44, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0 },
  eyebrow: { color: 'var(--fg-faint)', fontSize: 10, fontWeight: 750, letterSpacing: '0.09em', textTransform: 'uppercase' },
  title: { margin: '2px 0 0', color: 'var(--fg-primary)', fontFamily: 'var(--font-primary)', fontSize: 24, lineHeight: 1.2, fontWeight: 750 },
  meta: { marginTop: 5, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 },
  actions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  primaryAction: {
    padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(245,158,111,0.42)',
    background: 'rgba(245,158,111,0.12)', color: '#f59e6f', fontFamily: 'var(--font-primary)',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  secondaryAction: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: 8,
    border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--fg-body)',
    fontFamily: 'var(--font-primary)', fontSize: 12, fontWeight: 650, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  section: { marginTop: 22 },
  sectionHeadingRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionHeading: { margin: '0 0 10px', color: 'var(--fg-secondary)', fontFamily: 'var(--font-primary)', fontSize: 13, fontWeight: 750, letterSpacing: '0.02em' },
  count: { minWidth: 20, height: 20, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--fg-muted)', fontSize: 10 },
  cardList: { display: 'flex', flexDirection: 'column', gap: 8 },
  exerciseRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 15px', borderRadius: 11, background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' },
  exerciseNumber: { width: 25, height: 25, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  exerciseName: { color: 'var(--fg-primary)', fontSize: 14, fontWeight: 700 },
  exerciseVariation: { marginTop: 2, color: 'var(--fg-muted)', fontSize: 11 },
  metricGrid: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  metricGridLarge: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 },
  metricCompact: { minWidth: 76, padding: '6px 9px', borderRadius: 7, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)' },
  metric: { padding: '13px 14px', borderRadius: 10, background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' },
  fieldLabel: { color: 'var(--fg-faint)', fontSize: 9, fontWeight: 750, letterSpacing: '0.08em', textTransform: 'uppercase' },
  fieldValue: { marginTop: 3, color: 'var(--fg-primary)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 650 },
  relatedGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: 8 },
  recordLink: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '13px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', borderLeft: '3px solid', background: 'var(--bg-raised)', color: 'inherit', cursor: 'pointer', minWidth: 0 },
  recordTitle: { marginTop: 4, color: 'var(--fg-primary)', fontSize: 13, fontWeight: 700 },
  recordDetail: { marginTop: 3, color: 'var(--fg-muted)', fontSize: 11, lineHeight: 1.45 },
  openLabel: { marginTop: 10, color: 'var(--fg-secondary)', fontSize: 10, fontWeight: 700 },
  intervalRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', color: 'var(--fg-secondary)', fontSize: 12 },
  mono: { fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' },
  note: { padding: '13px 14px', borderRadius: 10, background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', color: 'var(--fg-body)', fontSize: 13, lineHeight: 1.55 },
  muscleList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  musclePill: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 11px', borderRadius: 999, background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', color: 'var(--fg-body)', fontSize: 12, fontWeight: 600 },
  muscleGroup: { color: 'var(--fg-faint)', fontSize: 10 },
  empty: { padding: '20px', borderRadius: 10, border: '1px dashed var(--border-subtle)', color: 'var(--fg-muted)', fontSize: 12 },
  error: { marginTop: 18, color: colors.accent.red, fontSize: 12 },
};
