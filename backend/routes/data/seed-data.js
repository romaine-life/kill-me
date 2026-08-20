// Seed data for the Synergy 12 workout tracker.
//
// This is the source of truth for the 12-day cycle definition, exercise library,
// and historical workout logs. It is loaded into Cosmos DB via the admin
// /api/admin/init-database endpoint.
//
// The day ordering is recovery-sequenced — see CLAUDE.md for the full rationale.
// Key placement decisions are noted in each day's `focus` field.
//
// Historical logged workouts use a hardcoded legacy userId. After deploying the
// Microsoft auth migration, run /api/admin/migrate-data to re-partition them.
//
// Exercise model: each exercise has a `variations` array. Each variation has its
// own targetWeight/Reps/Sets. One variation per exercise is marked `default: true`
// — that's what pre-fills in the log form. Exercises with no meaningful variations
// have a single "Standard" entry.

// 12-Day Workout Cycle Definition
export const workoutDays = [
  { dayNumber: 1, name: 'Compound: Legs', focus: 'Main Lift: Squat. Systemic leg strength.', primaryMuscleGroups: ['legs', 'glutes', 'quads'] },
  { dayNumber: 2, name: 'Calves', focus: 'Active recovery.', primaryMuscleGroups: ['calves'] },
  { dayNumber: 3, name: 'Hamstring', focus: 'Isolation. (Safe here since Day 1 was Squats).', primaryMuscleGroups: ['hamstrings'] },
  { dayNumber: 4, name: 'Abs', focus: 'Flexion focus.', primaryMuscleGroups: ['abs', 'core'] },
  { dayNumber: 5, name: 'Compound: Pulls', focus: 'Main Lift: Back/Rows. Systemic pulling strength.', primaryMuscleGroups: ['back', 'lats'] },
  { dayNumber: 6, name: 'Bicep', focus: 'Accessory work.', primaryMuscleGroups: ['biceps'] },
  { dayNumber: 7, name: 'Torso', focus: 'Extension/Rotation. Placed here to save lower back for Day 1.', primaryMuscleGroups: ['core', 'back'] },
  { dayNumber: 8, name: 'Pecs (Mobility)', focus: 'The Primer. Light flys/holds to prep shoulder capsule. ⚠️ NO DIPS or heavy pressing.', primaryMuscleGroups: ['chest'], warning: 'Shoulder health priority - light work only' },
  { dayNumber: 9, name: 'Compound: Push', focus: 'Main Lift: DB Bench. Heavy chest/front delt focus.', primaryMuscleGroups: ['chest', 'shoulders', 'triceps'] },
  { dayNumber: 10, name: 'Triceps', focus: 'Isolation. Focus on "feel" to save elbows.', primaryMuscleGroups: ['triceps'] },
  { dayNumber: 11, name: 'Deltoid', focus: 'Shoulder isolation.', primaryMuscleGroups: ['shoulders', 'delts'] },
  { dayNumber: 12, name: 'Grip', focus: 'Forearm/Hand focus. Final burnout.', primaryMuscleGroups: ['forearms', 'grip'] }
];

// Historical Logged Workouts (from spreadsheet)
export const loggedWorkouts = [
  // 2026 Workouts
  { date: '2026-02-14', dayNumber: 8, dayName: 'Pecs (Mobility)', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-29', dayNumber: 11, dayName: 'Deltoid', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-26', dayNumber: 6, dayName: 'Bicep', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-23', dayNumber: 5, dayName: 'Compound: Pulls', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-22', dayNumber: 4, dayName: 'Abs', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-08', dayNumber: 3, dayName: 'Hamstring', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-05', dayNumber: 2, dayName: 'Calves', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-04', dayNumber: 1, dayName: 'Compound: Legs', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },

  // 2025 November/December Workouts
  { date: '2025-12-11', dayNumber: 6, dayName: 'Bicep', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-10', dayNumber: 5, dayName: 'Compound: Pulls', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-09', dayNumber: 7, dayName: 'Torso', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-08', dayNumber: 1, dayName: 'Compound: Legs', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-07', dayNumber: 10, dayName: 'Triceps', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-05', dayNumber: 12, dayName: 'Grip', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-26', dayNumber: 9, dayName: 'Compound: Push', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-25', dayNumber: 6, dayName: 'Bicep', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-24', dayNumber: 5, dayName: 'Compound: Pulls', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-16', dayNumber: 7, dayName: 'Torso', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-15', dayNumber: 1, dayName: 'Compound: Legs', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-14', dayNumber: 12, dayName: 'Grip', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' }
];

// Exercise Library
//
// Each exercise has a `variations` array with per-variation targets. The `default`
// flag marks which variation pre-fills in the log form. Exercises that don't have
// meaningful variations use a single "Standard" entry.
export const exercises = [
  // ── Day 1: Compound Legs ──
  {
    name: 'Barbell Squat', dayNumber: 1, equipment: 'Smith Machine', location: 'Gym',
    tags: ['compound', 'squat', 'press', 'machine', 'quads', 'glutes', 'hamstrings', 'core'],
    variations: [
      { name: 'Standard', targetWeight: 115, targetReps: '6-8', targetSets: 4, default: true },
      { name: 'Wide Stance', targetWeight: 105, targetReps: '8-10', targetSets: 4 },
      { name: 'Close Stance', targetWeight: 95, targetReps: '8-10', targetSets: 4 },
      { name: 'Pause Rep', targetWeight: 95, targetReps: '6-8', targetSets: 3 },
    ],
  },
  {
    name: 'Leg Press', dayNumber: 1, equipment: 'Leg Press Machine', location: 'Gym',
    tags: ['compound', 'press', 'machine', 'quads', 'glutes', 'hamstrings'],
    variations: [
      { name: 'Standard', targetWeight: 140, targetReps: 12, targetSets: 3, default: true },
      { name: 'High Foot', targetWeight: 140, targetReps: 12, targetSets: 3 },
      { name: 'Narrow Foot', targetWeight: 120, targetReps: 12, targetSets: 3 },
      { name: 'Single Leg', targetWeight: 70, targetReps: 10, targetSets: 3 },
    ],
  },
  {
    name: 'Leg Extension', dayNumber: 1, equipment: 'Leg Extension Machine', location: 'Gym',
    tags: ['isolation', 'extension', 'machine', 'quads'],
    notes: 'Lowest seat, legs notch 1, back notch 1. Superset with leg curls',
    variations: [
      { name: 'Standard', targetWeight: 60, targetReps: '12-15', targetSets: 3, default: true },
      { name: 'Single Leg', targetWeight: 30, targetReps: '12-15', targetSets: 3 },
      { name: 'Pause at Top', targetWeight: 50, targetReps: '10-12', targetSets: 3 },
    ],
  },
  {
    name: 'Leg Curl', dayNumber: 1, equipment: 'Leg Curl Machine', location: 'Gym',
    tags: ['isolation', 'curl', 'machine', 'hamstrings'],
    notes: 'Highest seat, legs at lowest notch. Superset with leg extension',
    variations: [
      { name: 'Standard', targetWeight: 60, targetReps: '12-15', targetSets: 3, default: true },
      { name: 'Single Leg', targetWeight: 30, targetReps: '12-15', targetSets: 3 },
    ],
  },
  {
    name: 'Seated Calf Raises', dayNumber: 1, equipment: 'Bench + Dumbbells', location: 'Gym',
    tags: ['isolation', 'calves', 'dumbbell'],
    variations: [
      { name: 'Standard', targetWeight: 80, targetReps: 12, targetSets: 3, default: true },
    ],
  },

  // ── Day 2: Calves ──
  {
    name: 'Calf Stands', dayNumber: 2, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['isolation', 'calves', 'bodyweight', 'hold'],
    notes: 'Stand on toes for about 5 minutes',
    variations: [
      { name: 'Standard', targetReps: '5 minutes', default: true },
    ],
  },
  {
    name: 'Calf Stretches', dayNumber: 2, equipment: 'None', location: 'Anywhere',
    tags: ['mobility', 'calves', 'bodyweight', 'stretch'],
    variations: [
      { name: 'Standard', default: true },
    ],
  },
  {
    name: 'Seated Calf Raises', dayNumber: 2, equipment: 'Seated Calf Raise Machine', location: 'Gym',
    tags: ['isolation', 'calves', 'machine'],
    variations: [
      { name: 'Standard', targetWeight: 90, targetReps: 12, targetSets: 3, default: true },
    ],
  },

  // ── Day 3: Hamstring ──
  {
    name: 'Single Leg Cable Stretch (Front)', dayNumber: 3, equipment: 'Cable', location: 'Gym',
    tags: ['mobility', 'stretch', 'cable', 'hamstrings', 'hip-flexors'],
    variations: [
      { name: 'Standard', targetReps: '3-5 minutes, 2-5 times', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Single Leg Cable Stretch (Side)', dayNumber: 3, equipment: 'Cable', location: 'Gym',
    tags: ['mobility', 'stretch', 'cable', 'adductors', 'abductors'],
    variations: [
      { name: 'Standard', targetReps: '3-5 minutes, 2-5 times', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Single Leg Forward Lean', dayNumber: 3, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['mobility', 'stretch', 'bodyweight', 'hamstrings', 'glutes'],
    variations: [
      { name: 'Standard', default: true },
    ],
  },
  {
    name: 'Seated Splits', dayNumber: 3, equipment: 'None', location: 'Anywhere',
    tags: ['mobility', 'stretch', 'bodyweight', 'hamstrings', 'adductors'],
    variations: [
      { name: 'Standard', default: true },
    ],
  },

  // ── Day 4: Abs ──
  {
    name: 'Crunches', dayNumber: 4, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['isolation', 'abs', 'core', 'flexion', 'bodyweight'],
    variations: [
      { name: 'Standard', default: true },
      { name: 'Weighted', targetWeight: 10, targetReps: 15, targetSets: 3 },
      { name: 'Bicycle', targetReps: 20, targetSets: 3 },
    ],
  },
  {
    name: 'Under Leg Crunches', dayNumber: 4, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['isolation', 'abs', 'core', 'flexion', 'bodyweight'],
    variations: [
      { name: 'Standard', default: true },
    ],
  },

  // ── Day 5: Compound Pulls ──
  {
    name: 'Lat Pulldowns', dayNumber: 5, equipment: 'Cable Machine', location: 'Home',
    tags: ['compound', 'pull', 'cable', 'lats', 'back', 'biceps', 'rear-delt'],
    variations: [
      { name: 'Wide Grip', targetWeight: 40, targetReps: 12, targetSets: 3, cableSetting: '', default: true },
      { name: 'Close Grip', targetWeight: 45, targetReps: 12, targetSets: 3, cableSetting: '' },
      { name: 'Reverse Grip', targetWeight: 35, targetReps: 12, targetSets: 3, cableSetting: '' },
      { name: 'Single Arm', targetWeight: 20, targetReps: 12, targetSets: 3, cableSetting: '' },
    ],
  },
  {
    name: 'Bent-Over Rows', dayNumber: 5, equipment: 'Barbell', location: 'Home',
    tags: ['compound', 'row', 'pull', 'barbell', 'back', 'lats', 'biceps', 'rear-delt', 'traps'],
    variations: [
      { name: 'Standard', targetWeight: 35, targetReps: 12, targetSets: 3, default: true },
      { name: 'Underhand', targetWeight: 35, targetReps: 12, targetSets: 3 },
    ],
  },
  {
    name: 'Seated Cable Rows', dayNumber: 5, equipment: 'Cable Machine', location: 'Home',
    tags: ['compound', 'row', 'pull', 'cable', 'back', 'lats', 'biceps', 'traps', 'rear-delt'],
    variations: [
      { name: 'Standard', targetWeight: 80, targetReps: 12, targetSets: 3, cableSetting: '', default: true },
      { name: 'Wide Grip', targetWeight: 70, targetReps: 12, targetSets: 3, cableSetting: '' },
      { name: 'Single Arm', targetWeight: 40, targetReps: 12, targetSets: 3, cableSetting: '' },
    ],
  },

  // ── Day 6: Biceps ──
  {
    name: 'Dumbbell Bicep Curl', dayNumber: 6, equipment: 'Dumbbells', location: 'Home',
    tags: ['isolation', 'curl', 'dumbbell', 'biceps', 'forearms'],
    notes: 'Reps to failure, decrease weight by 5-10 each time',
    variations: [
      { name: 'Standard', targetWeight: 20, targetReps: 'Failure', targetSets: 3, default: true },
      { name: 'Hammer', targetWeight: 20, targetReps: 'Failure', targetSets: 3 },
      { name: 'Incline', targetWeight: 15, targetReps: 'Failure', targetSets: 3 },
      { name: 'Concentration', targetWeight: 15, targetReps: 'Failure', targetSets: 3 },
    ],
  },
  {
    name: 'Cable Bicep Curl', dayNumber: 6, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'curl', 'cable', 'biceps', 'forearms'],
    notes: 'Reps to failure, decrease weight by 5-10 each time',
    variations: [
      { name: 'Standard', targetWeight: 20, targetReps: 'Failure', targetSets: 3, cableSetting: '', default: true },
      { name: 'Rope Hammer', targetWeight: 20, targetReps: 'Failure', targetSets: 3, cableSetting: '' },
      { name: 'Single Arm', targetWeight: 10, targetReps: 'Failure', targetSets: 3, cableSetting: '' },
      { name: 'Bayesian', targetWeight: 13, targetReps: 12, targetSets: 3, cableSetting: '' },
    ],
  },

  // ── Day 7: Torso ──
  {
    name: 'Torso Twist', dayNumber: 7, equipment: 'Torso Twist Machine', location: 'Gym',
    tags: ['isolation', 'rotation', 'machine', 'core', 'obliques'],
    notes: 'Max twist. One set is rotating from each side',
    variations: [
      { name: 'Standard', targetWeight: 90, targetReps: 20, targetSets: 3, default: true },
    ],
  },
  {
    name: 'Back Extension (Seated)', dayNumber: 7, equipment: 'Seated Back Extension Machine', location: 'Gym',
    tags: ['isolation', 'extension', 'machine', 'back', 'erector-spinae'],
    notes: 'Max range of motion',
    variations: [
      { name: 'Standard', targetWeight: 140, targetReps: 12, targetSets: 3, default: true },
    ],
  },
  {
    name: 'Hip Adductor', dayNumber: 7, equipment: 'Hip Adductor Machine', location: 'Gym',
    tags: ['isolation', 'machine', 'adductors', 'hip'],
    notes: 'Max stretch. Involves static stretching and contractions',
    variations: [
      { name: 'Standard', targetWeight: 100, targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Hip Abductor', dayNumber: 7, equipment: 'Hip Abductor Machine', location: 'Gym',
    tags: ['isolation', 'machine', 'abductors', 'hip', 'glutes'],
    variations: [
      { name: 'Standard', targetWeight: 80, targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Situps', dayNumber: 7, equipment: 'Situp Device', location: 'Gym',
    tags: ['isolation', 'flexion', 'machine', 'abs', 'core', 'hip-flexors'],
    variations: [
      { name: 'Standard', targetReps: 12, targetSets: 3, default: true },
    ],
  },

  // ── Day 8: Pecs (Mobility) ──
  {
    name: 'Dumbbell Bench Press', dayNumber: 8, equipment: 'Dumbbells', location: 'Home',
    tags: ['mobility', 'press', 'dumbbell', 'chest', 'front-delt', 'triceps'],
    notes: '⚠️ Light weight only for mobility',
    variations: [
      { name: 'Flat (Light)', targetWeight: 20, targetReps: 12, targetSets: 3, default: true },
      { name: 'Incline (Light)', targetWeight: 15, targetReps: 12, targetSets: 3 },
    ],
  },
  {
    name: 'Cable Fly', dayNumber: 8, equipment: 'Cable Machine', location: 'Home',
    tags: ['mobility', 'fly', 'cable', 'chest', 'front-delt'],
    notes: '⚠️ Light weight, focus on stretch',
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
      { name: 'Low to High', cableSetting: '' },
      { name: 'High to Low', cableSetting: '' },
    ],
  },
  {
    name: 'Static Hold (Lowered Position)', dayNumber: 8, equipment: 'Dumbbells', location: 'Home',
    tags: ['mobility', 'hold', 'dumbbell', 'chest', 'stretch'],
    notes: '⚠️ Horizontal dumbbell hold in lowered position',
    variations: [
      { name: 'Standard', default: true },
    ],
  },

  // ── Day 9: Compound Push ──
  {
    name: 'Barbell Bench Press', dayNumber: 9, equipment: 'Smith Machine', location: 'Gym',
    tags: ['compound', 'press', 'machine', 'chest', 'triceps', 'front-delt'],
    variations: [
      { name: 'Flat', targetWeight: 115, targetReps: 12, targetSets: 3, default: true },
      { name: 'Incline', targetWeight: 95, targetReps: 12, targetSets: 3 },
      { name: 'Decline', targetWeight: 105, targetReps: 10, targetSets: 3 },
      { name: 'Close Grip', targetWeight: 85, targetReps: 12, targetSets: 3 },
    ],
  },
  {
    name: 'Dumbbell Bench Press', dayNumber: 9, equipment: 'Dumbbells', location: 'Home',
    tags: ['compound', 'press', 'dumbbell', 'chest', 'triceps', 'front-delt'],
    notes: 'Reps to failure, decreasing weight',
    variations: [
      { name: 'Flat', targetWeight: 20, targetReps: 12, targetSets: 3, default: true },
      { name: 'Incline', targetWeight: 15, targetReps: 12, targetSets: 3 },
      { name: 'Decline', targetWeight: 20, targetReps: 10, targetSets: 3 },
    ],
  },
  {
    name: 'Dips', dayNumber: 9, equipment: 'Dip Machine', location: 'Gym',
    tags: ['compound', 'press', 'machine', 'chest', 'triceps', 'front-delt', 'bodyweight'],
    variations: [
      { name: 'Assisted', targetWeight: -90, targetReps: '15-20', targetSets: 3, default: true },
      { name: 'Bodyweight', targetReps: '8-12', targetSets: 3 },
    ],
  },
  {
    name: 'Shoulder Press', dayNumber: 9, equipment: 'Dumbbells', location: 'Home',
    tags: ['compound', 'press', 'dumbbell', 'front-delt', 'side-delt', 'triceps'],
    variations: [
      { name: 'Seated', targetWeight: 15, targetReps: 12, targetSets: 3, default: true },
      { name: 'Standing', targetWeight: 15, targetReps: 10, targetSets: 3 },
      { name: 'Arnold Press', targetWeight: 12, targetReps: 12, targetSets: 3 },
    ],
  },

  // ── Day 10: Triceps ──
  {
    name: 'Cable Standing High Cross', dayNumber: 10, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'cable', 'triceps', 'extension'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Tricep Pushdown', dayNumber: 10, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'cable', 'triceps', 'pushdown', 'extension'],
    variations: [
      { name: 'Rope', cableSetting: '', default: true },
      { name: 'V-Bar', cableSetting: '' },
      { name: 'Straight Bar', cableSetting: '' },
      { name: 'Single Arm', cableSetting: '' },
    ],
  },
  {
    name: 'Tricep Extension (Katana)', dayNumber: 10, equipment: 'Dumbbell', location: 'Home',
    tags: ['isolation', 'extension', 'dumbbell', 'triceps'],
    variations: [
      { name: 'Standard', targetWeight: 10, default: true },
      { name: 'Overhead', targetWeight: 10 },
    ],
  },

  // ── Day 11: Deltoids ──
  {
    name: 'Reverse Delt Cable Fly', dayNumber: 11, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'fly', 'cable', 'rear-delt', 'traps'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
      { name: 'High Pulley', cableSetting: '' },
      { name: 'Low Pulley', cableSetting: '' },
    ],
  },
  {
    name: 'Side Delt Cable Raises', dayNumber: 11, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'raise', 'cable', 'side-delt'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
      { name: 'Behind the Back', cableSetting: '' },
    ],
  },
  {
    name: 'Front Deltoid Raises (Bottom to Top)', dayNumber: 11, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'raise', 'cable', 'front-delt'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Front Deltoid Raises (Top to Bottom)', dayNumber: 11, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'raise', 'cable', 'front-delt'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Rotator Cuff Work', dayNumber: 11, equipment: 'Light Weight', location: 'Home',
    tags: ['isolation', 'rotation', 'mobility', 'rotator-cuff', 'shoulder-health'],
    variations: [
      { name: 'Internal Rotation', default: true },
      { name: 'External Rotation' },
    ],
  },

  // ── Day 12: Grip ──
  {
    name: 'Gripper - Trainer', dayNumber: 12, equipment: 'Hand Gripper', location: 'Home',
    tags: ['isolation', 'grip', 'forearms'],
    notes: 'Start with left/weak side',
    variations: [
      { name: 'Standard', targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Gripper - Sport', dayNumber: 12, equipment: 'Hand Gripper', location: 'Home',
    tags: ['isolation', 'grip', 'forearms'],
    notes: 'Start with left/weak side',
    variations: [
      { name: 'Standard', targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Gripper - Guide', dayNumber: 12, equipment: 'Hand Gripper', location: 'Home',
    tags: ['isolation', 'grip', 'forearms'],
    notes: 'Start with left/weak side',
    variations: [
      { name: 'Standard', targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Wrist Curls', dayNumber: 12, equipment: 'Dumbbells', location: 'Home',
    tags: ['isolation', 'curl', 'dumbbell', 'forearms', 'grip'],
    variations: [
      { name: 'Pronated', targetWeight: 20, targetReps: 'Failure', targetSets: 3, default: true },
      { name: 'Supinated', targetWeight: 20, targetReps: 'Failure', targetSets: 3 },
    ],
  },
];
