// SQLite snapshot query layer — mirrors the backend's public API response shapes.
//
// Each function takes an open sql.js database and returns data in the same
// format as the corresponding API endpoint, so components can use either
// source transparently via useDataSource().

// Get current day in the 12-day cycle
export function getCurrentDay(db) {
  const row = db.exec('SELECT value FROM settings WHERE key = ?', ['currentDay']);
  const currentDay = row.length > 0 && row[0].values.length > 0
    ? parseInt(row[0].values[0][0])
    : 1;
  return { currentDay };
}

// Get workout day definition by day number
export function getWorkoutDay(db, dayNumber) {
  const result = db.exec(
    'SELECT day_number, name, focus, warning, primary_muscle_groups FROM workout_days WHERE day_number = ?',
    [dayNumber]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return { workoutDay: null };
  }

  const [dn, name, focus, warning, muscleGroups] = result[0].values[0];
  return {
    workoutDay: {
      dayNumber: dn,
      name,
      focus,
      warning,
      primaryMuscleGroups: muscleGroups ? JSON.parse(muscleGroups) : [],
    },
  };
}

// Get exercises for a specific day
export function getExercisesForDay(db, dayNumber) {
  const result = db.exec(
    'SELECT id, day_number, name, equipment, location, notes, variations, tags FROM exercises WHERE day_number = ?',
    [dayNumber]
  );

  if (result.length === 0) {
    return { exercises: [] };
  }

  const exercises = result[0].values.map(([id, dn, name, equipment, location, notes, variations, tags]) => ({
    id,
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
    'SELECT id, day_number, name, equipment, location, notes, variations, tags FROM exercises ORDER BY day_number'
  );

  if (result.length === 0) {
    return { exercises: [] };
  }

  const exercises = result[0].values.map(([id, dn, name, equipment, location, notes, variations, tags]) => ({
    id,
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
    'SELECT id, day_number, day_name, date, time, mode, exercises, timestamp, created_at FROM logged_workouts ORDER BY date DESC'
  );

  if (result.length === 0) {
    return { workouts: [] };
  }

  const workouts = result[0].values.map(([id, dn, dayName, date, time, mode, exercises, timestamp, createdAt]) => ({
    id,
    dayNumber: dn,
    dayName,
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
    'SELECT id, date, muscles, source_workout_id, source_workout_day, source_workout_date FROM soreness_entries ORDER BY date DESC'
  );

  if (result.length === 0) {
    return { entries: [] };
  }

  const entries = result[0].values.map(([id, date, muscles, sourceWorkoutId, sourceWorkoutDay, sourceWorkoutDate]) => ({
    id,
    date,
    muscles: JSON.parse(muscles),
    sourceWorkoutId,
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
