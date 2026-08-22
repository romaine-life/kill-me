// SQLite snapshot query layer — mirrors the backend's public API response shapes.
//
// Each function takes an open sql.js database and returns data in the same
// format as the corresponding API endpoint, so components can use either
// source transparently via useDataSource().

// Get the active workout model — the whole cycle in one read
export function getWorkoutModel(db) {
  const result = db.exec('SELECT version, name, days FROM workout_model LIMIT 1');

  if (result.length === 0 || result[0].values.length === 0) {
    return { model: null };
  }

  const [version, name, days] = result[0].values[0];
  return { model: { version, name, days: days ? JSON.parse(days) : [] } };
}

// Get the day the cycle is currently on
export function getCurrentDay(db) {
  const row = db.exec('SELECT value FROM settings WHERE key = ?', ['currentDaySlug']);
  const currentDaySlug = row.length > 0 && row[0].values.length > 0
    ? row[0].values[0][0]
    : getWorkoutModel(db).model?.days?.[0]?.slug ?? null;
  return { currentDaySlug };
}

// Get one day's definition out of the active model
export function getWorkoutDay(db, daySlug) {
  const { model } = getWorkoutModel(db);
  return { workoutDay: model?.days.find((day) => day.slug === daySlug) ?? null };
}

// Get exercises for a specific day
export function getExercisesForDay(db, daySlug) {
  const result = db.exec(
    'SELECT id, day_slug, day_number, name, equipment, location, notes, variations, tags FROM exercises WHERE day_slug = ?',
    [daySlug]
  );

  if (result.length === 0) {
    return { exercises: [] };
  }

  const exercises = result[0].values.map(([id, daySlug, dn, name, equipment, location, notes, variations, tags]) => ({
    id,
    daySlug,
    dayNumber: dn,
    name,
    equipment,
    location,
    notes,
    variations: variations ? JSON.parse(variations) : [{ name: 'Standard', default: true }],
    tags: tags ? JSON.parse(tags) : [],
  }));

  return { exercises };
}

// Get all exercises across all days
export function getAllExercises(db) {
  const result = db.exec(
    'SELECT id, day_slug, day_number, name, equipment, location, notes, variations, tags FROM exercises ORDER BY day_number'
  );

  if (result.length === 0) {
    return { exercises: [] };
  }

  const exercises = result[0].values.map(([id, daySlug, dn, name, equipment, location, notes, variations, tags]) => ({
    id,
    daySlug,
    dayNumber: dn,
    name,
    equipment,
    location,
    notes,
    variations: variations ? JSON.parse(variations) : [{ name: 'Standard', default: true }],
    tags: tags ? JSON.parse(tags) : [],
  }));

  return { exercises };
}

// Get all logged workouts, sorted by date descending
export function getLoggedWorkouts(db) {
  const result = db.exec(
    'SELECT id, day_slug, day_number, day_name, model_version, date, time, mode, exercises, timestamp, created_at FROM logged_workouts ORDER BY date DESC'
  );

  if (result.length === 0) {
    return { workouts: [] };
  }

  const workouts = result[0].values.map(([id, daySlug, dn, dayName, modelVersion, date, time, mode, exercises, timestamp, createdAt]) => ({
    id,
    daySlug,
    dayNumber: dn,
    dayName,
    modelVersion,
    date,
    time,
    mode,
    exercises: exercises ? JSON.parse(exercises) : [],
    timestamp,
    createdAt,
  }));

  return { workouts };
}

// Get all soreness entries, sorted by date descending.
// Several entries can share a date — one per originating workout — so `id` is
// the identity, not `date`. Entries predating workout attribution have a null
// source_workout_id and read as unattributed.
export function getSorenessEntries(db) {
  const result = db.exec(
    'SELECT id, date, muscles, source_workout_id, source_workout_day_slug, source_workout_day, source_workout_date FROM soreness_entries ORDER BY date DESC'
  );

  if (result.length === 0) {
    return { entries: [] };
  }

  const entries = result[0].values.map(([id, date, muscles, sourceWorkoutId, sourceWorkoutDaySlug, sourceWorkoutDay, sourceWorkoutDate]) => ({
    id,
    date,
    muscles: JSON.parse(muscles),
    sourceWorkoutId,
    sourceWorkoutDaySlug,
    sourceWorkoutDay,
    sourceWorkoutDate,
  }));

  return { entries };
}

// Get all cardio sessions, sorted by date descending
export function getCardioSessions(db) {
  const result = db.exec(
    'SELECT id, date, time, activity, duration_minutes, notes, treadmill, bike, timestamp, created_at FROM cardio_sessions ORDER BY date DESC'
  );

  if (result.length === 0) {
    return { sessions: [] };
  }

  const sessions = result[0].values.map(([id, date, time, activity, durationMinutes, notes, treadmill, bike, timestamp, createdAt]) => ({
    id,
    date,
    time,
    activity,
    durationMinutes,
    notes,
    treadmill: treadmill ? JSON.parse(treadmill) : null,
    bike: bike ? JSON.parse(bike) : null,
    timestamp,
    createdAt,
  }));

  return { sessions };
}

// Get all treadmill templates, ordered for the dropdown
export function getCardioTemplates(db) {
  const result = db.exec(
    'SELECT template_id, activity, name, description, intervals, sort_order FROM cardio_templates ORDER BY sort_order'
  );

  if (result.length === 0) {
    return { templates: [] };
  }

  const templates = result[0].values.map(([id, activity, name, description, intervals]) => ({
    id,
    activity,
    name,
    description,
    intervals: intervals ? JSON.parse(intervals) : [],
  }));

  return { templates };
}

// Get snapshot metadata (generated_at timestamp)
export function getSnapshotMeta(db) {
  const result = db.exec('SELECT key, value FROM snapshot_meta');
  if (result.length === 0) return {};

  const meta = {};
  for (const [key, value] of result[0].values) {
    meta[key] = value;
  }
  return meta;
}
