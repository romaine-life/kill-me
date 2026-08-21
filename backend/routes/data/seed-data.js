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
  { dayNumber: 2, name: 'Calves + Ankles', focus: 'Active recovery. Ankle mobility included.', primaryMuscleGroups: ['calves', 'ankles'] },
  { dayNumber: 3, name: 'Abs', focus: 'Flexion focus. Isolation with mental focus on the group.', primaryMuscleGroups: ['abs', 'core'] },
  { dayNumber: 4, name: 'Stretching', focus: 'Its own day by design — long, home-based, easy to cut if combined.', primaryMuscleGroups: ['hamstrings', 'adductors', 'hip-flexors'] },
  { dayNumber: 5, name: 'Knee', focus: 'Tendon health: slow eccentrics, isometrics, controlled range. Not a second leg day.', primaryMuscleGroups: ['quads', 'knees'] },
  { dayNumber: 6, name: 'Compound: Pulls', focus: 'Main Lift: Back/Rows. Systemic pulling strength.', primaryMuscleGroups: ['back', 'lats'] },
  { dayNumber: 7, name: 'Bicep', focus: 'Accessory work.', primaryMuscleGroups: ['biceps'] },
  { dayNumber: 8, name: 'Transverse', focus: 'Rotation and anti-rotation. The only transverse-plane work in the cycle.', primaryMuscleGroups: ['core', 'obliques'] },
  { dayNumber: 9, name: 'Back', focus: 'Spinal extension. Placed 8 days clear of Day 1 to spare the lower back for squats.', primaryMuscleGroups: ['back', 'erector-spinae'] },
  { dayNumber: 10, name: 'Neck', focus: 'Retraction and four-way isometrics. Short day.', primaryMuscleGroups: ['neck'] },
  { dayNumber: 11, name: 'Pecs (Mobility)', focus: 'The Primer. Light flys/holds to prep shoulder capsule. ⚠️ NO DIPS or heavy pressing.', primaryMuscleGroups: ['chest'], warning: 'Shoulder health priority - light work only' },
  { dayNumber: 12, name: 'Compound: Push', focus: 'Main Lift: DB Bench. Heavy chest/front delt focus.', primaryMuscleGroups: ['chest', 'shoulders', 'triceps'] },
  { dayNumber: 13, name: 'Triceps', focus: 'Isolation. Focus on "feel" to save elbows.', primaryMuscleGroups: ['triceps'] },
  { dayNumber: 14, name: 'Deltoid', focus: 'Shoulder isolation.', primaryMuscleGroups: ['shoulders', 'delts'] },
  { dayNumber: 15, name: 'Grip', focus: 'Forearm/Hand focus. Placed 8 days clear of pulls and bicep so forearms never stack.', primaryMuscleGroups: ['forearms', 'grip'] },
  { dayNumber: 16, name: 'Hips', focus: 'Adduction, abduction, extension, flexion. Primes the hips for Day 1 squats.', primaryMuscleGroups: ['hips', 'glutes', 'adductors', 'abductors'] }
];

// Historical Logged Workouts (from spreadsheet)
export const loggedWorkouts = [
  // 2026 Workouts
  { date: '2026-02-14', dayNumber: 11, dayName: 'Pecs (Mobility)', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-29', dayNumber: 14, dayName: 'Deltoid', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-26', dayNumber: 7, dayName: 'Bicep', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-23', dayNumber: 6, dayName: 'Compound: Pulls', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-22', dayNumber: 3, dayName: 'Abs', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-08', dayNumber: 4, dayName: 'Hamstring', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-05', dayNumber: 2, dayName: 'Calves', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2026-01-04', dayNumber: 1, dayName: 'Compound: Legs', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },

  // 2025 November/December Workouts
  { date: '2025-12-11', dayNumber: 7, dayName: 'Bicep', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-10', dayNumber: 6, dayName: 'Compound: Pulls', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-09', dayNumber: 8, dayName: 'Torso', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-08', dayNumber: 1, dayName: 'Compound: Legs', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-07', dayNumber: 13, dayName: 'Triceps', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-12-05', dayNumber: 15, dayName: 'Grip', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-26', dayNumber: 12, dayName: 'Compound: Push', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-25', dayNumber: 7, dayName: 'Bicep', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-24', dayNumber: 6, dayName: 'Compound: Pulls', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-16', dayNumber: 8, dayName: 'Torso', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-15', dayNumber: 1, dayName: 'Compound: Legs', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' },
  { date: '2025-11-14', dayNumber: 15, dayName: 'Grip', userId: 'cf57d57d-1411-4f59-b517-e9a8600b140a' }
];

// Exercise Library
//
// Each exercise has a `variations` array with per-variation targets. The `default`
// flag marks which variation pre-fills in the log form. Exercises that don't have
// meaningful variations use a single "Standard" entry.
export const exercises = [  // ── Day 1: Compound: Legs ──
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
    name: 'Leg Curl', dayNumber: 1, equipment: 'Leg Curl Machine', location: 'Gym',
    tags: ['isolation', 'curl', 'machine', 'hamstrings'],
    notes: 'Highest seat, legs at lowest notch. Only loaded hamstring work in the cycle',
    variations: [
      { name: 'Standard', targetWeight: 60, targetReps: '12-15', targetSets: 3, default: true },
      { name: 'Single Leg', targetWeight: 30, targetReps: '12-15', targetSets: 3 },
    ],
  },

  // ── Day 2: Calves + Ankles ──
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
  {
    name: 'Ankle Circles', dayNumber: 2, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['mobility', 'ankles', 'bodyweight', 'rotation'],
    notes: 'Both directions. Ankle dorsiflexion limits squat depth, so this feeds Day 1.',
    variations: [
      { name: 'Standard', targetReps: '10 each direction', targetSets: 2, default: true },
      { name: 'Dorsiflexion Rocks', targetReps: 15, targetSets: 2 },
    ],
  },

  // ── Day 3: Abs ──
  {
    name: 'Crunches', dayNumber: 3, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['isolation', 'abs', 'core', 'flexion', 'bodyweight'],
    variations: [
      { name: 'Standard', default: true },
      { name: 'Weighted', targetWeight: 10, targetReps: 15, targetSets: 3 },
      { name: 'Bicycle', targetReps: 20, targetSets: 3 },
    ],
  },
  {
    name: 'Under Leg Crunches', dayNumber: 3, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['isolation', 'abs', 'core', 'flexion', 'bodyweight'],
    variations: [
      { name: 'Standard', default: true },
    ],
  },
  {
    name: 'Situps', dayNumber: 3, equipment: 'Situp Device', location: 'Gym',
    tags: ['isolation', 'flexion', 'machine', 'abs', 'core', 'hip-flexors'],
    variations: [
      { name: 'Standard', targetReps: 12, targetSets: 3, default: true },
    ],
  },

  // ── Day 4: Stretching ──
  {
    name: 'Single Leg Cable Stretch (Front)', dayNumber: 4, equipment: 'Cable', location: 'Gym',
    tags: ['mobility', 'stretch', 'cable', 'hamstrings', 'hip-flexors'],
    variations: [
      { name: 'Standard', targetReps: '3-5 minutes, 2-5 times', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Single Leg Cable Stretch (Side)', dayNumber: 4, equipment: 'Cable', location: 'Gym',
    tags: ['mobility', 'stretch', 'cable', 'adductors', 'abductors'],
    variations: [
      { name: 'Standard', targetReps: '3-5 minutes, 2-5 times', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Single Leg Forward Lean', dayNumber: 4, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['mobility', 'stretch', 'bodyweight', 'hamstrings', 'glutes'],
    variations: [
      { name: 'Standard', default: true },
    ],
  },
  {
    name: 'Seated Splits', dayNumber: 4, equipment: 'None', location: 'Anywhere',
    tags: ['mobility', 'stretch', 'bodyweight', 'hamstrings', 'adductors'],
    variations: [
      { name: 'Standard', default: true },
    ],
  },

  // ── Day 5: Knee ──
  {
    name: 'Leg Extension', dayNumber: 5, equipment: 'Leg Extension Machine', location: 'Gym',
    tags: ['isolation', 'extension', 'machine', 'quads', 'knees', 'tendon', 'eccentric'],
    notes: 'Lowest seat, legs notch 1, back notch 1. Slow 3-4s lowering — this day is tendon loading, not volume.',
    variations: [
      { name: 'Slow Eccentric', targetWeight: 50, targetReps: 12, targetSets: 3, default: true },
      { name: 'Standard', targetWeight: 60, targetReps: '12-15', targetSets: 3 },
      { name: 'Single Leg', targetWeight: 30, targetReps: '12-15', targetSets: 3 },
      { name: 'Pause at Top', targetWeight: 50, targetReps: '10-12', targetSets: 3 },
    ],
  },
  {
    name: 'Wall Sit', dayNumber: 5, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['isometric', 'hold', 'bodyweight', 'quads', 'knees', 'tendon'],
    notes: 'Isometric hold for patellar tendon loading. Thighs parallel, back flat to wall.',
    variations: [
      { name: 'Standard', targetReps: '30-45 seconds', targetSets: 3, default: true },
      { name: 'Spanish Squat (Banded)', targetReps: '30-45 seconds', targetSets: 3 },
      { name: 'Single Leg', targetReps: '20-30 seconds', targetSets: 3 },
    ],
  },
  {
    name: 'Single-Leg Decline Squat', dayNumber: 5, equipment: 'Decline Board', location: 'Gym',
    tags: ['isolation', 'squat', 'bodyweight', 'quads', 'knees', 'tendon', 'eccentric'],
    notes: 'Classic patellar tendon exercise. 25 degree decline, slow 3-4s lowering.',
    variations: [
      { name: 'Slow Eccentric', targetReps: 12, targetSets: 3, default: true },
      { name: 'Bodyweight', targetReps: 15, targetSets: 3 },
    ],
  },

  // ── Day 6: Compound: Pulls ──
  {
    name: 'Lat Pulldowns', dayNumber: 6, equipment: 'Cable Machine', location: 'Home',
    tags: ['compound', 'pull', 'cable', 'lats', 'back', 'biceps', 'rear-delt'],
    variations: [
      { name: 'Wide Grip', targetWeight: 40, targetReps: 12, targetSets: 3, cableSetting: '', default: true },
      { name: 'Close Grip', targetWeight: 45, targetReps: 12, targetSets: 3, cableSetting: '' },
      { name: 'Reverse Grip', targetWeight: 35, targetReps: 12, targetSets: 3, cableSetting: '' },
      { name: 'Single Arm', targetWeight: 20, targetReps: 12, targetSets: 3, cableSetting: '' },
    ],
  },
  {
    name: 'Bent-Over Rows', dayNumber: 6, equipment: 'Barbell', location: 'Home',
    tags: ['compound', 'row', 'pull', 'barbell', 'back', 'lats', 'biceps', 'rear-delt', 'traps'],
    variations: [
      { name: 'Standard', targetWeight: 35, targetReps: 12, targetSets: 3, default: true },
      { name: 'Underhand', targetWeight: 35, targetReps: 12, targetSets: 3 },
    ],
  },
  {
    name: 'Seated Cable Rows', dayNumber: 6, equipment: 'Cable Machine', location: 'Home',
    tags: ['compound', 'row', 'pull', 'cable', 'back', 'lats', 'biceps', 'traps', 'rear-delt'],
    variations: [
      { name: 'Standard', targetWeight: 80, targetReps: 12, targetSets: 3, cableSetting: '', default: true },
      { name: 'Wide Grip', targetWeight: 70, targetReps: 12, targetSets: 3, cableSetting: '' },
      { name: 'Single Arm', targetWeight: 40, targetReps: 12, targetSets: 3, cableSetting: '' },
    ],
  },

  // ── Day 7: Bicep ──
  {
    name: 'Dumbbell Bicep Curl', dayNumber: 7, equipment: 'Dumbbells', location: 'Home',
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
    name: 'Cable Bicep Curl', dayNumber: 7, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'curl', 'cable', 'biceps', 'forearms'],
    notes: 'Reps to failure, decrease weight by 5-10 each time',
    variations: [
      { name: 'Standard', targetWeight: 20, targetReps: 'Failure', targetSets: 3, cableSetting: '', default: true },
      { name: 'Rope Hammer', targetWeight: 20, targetReps: 'Failure', targetSets: 3, cableSetting: '' },
      { name: 'Single Arm', targetWeight: 10, targetReps: 'Failure', targetSets: 3, cableSetting: '' },
      { name: 'Bayesian', targetWeight: 13, targetReps: 12, targetSets: 3, cableSetting: '' },
    ],
  },

  // ── Day 8: Transverse ──
  {
    name: 'Torso Twist', dayNumber: 8, equipment: 'Torso Twist Machine', location: 'Gym',
    tags: ['isolation', 'rotation', 'machine', 'core', 'obliques'],
    notes: 'Max twist. One set is rotating from each side',
    variations: [
      { name: 'Standard', targetWeight: 90, targetReps: 20, targetSets: 3, default: true },
    ],
  },
  {
    name: 'Cable Chop', dayNumber: 8, equipment: 'Cable Machine', location: 'Gym',
    tags: ['rotation', 'cable', 'core', 'obliques', 'transverse'],
    notes: 'Arm is the lever, trunk is the target. Light weight — this is movement, not load.',
    variations: [
      { name: 'High to Low', cableSetting: '', targetReps: 12, targetSets: 3, default: true },
      { name: 'Low to High', cableSetting: '', targetReps: 12, targetSets: 3 },
    ],
  },
  {
    name: 'Pallof Press', dayNumber: 8, equipment: 'Cable Machine', location: 'Gym',
    tags: ['anti-rotation', 'cable', 'core', 'obliques', 'transverse', 'isometric'],
    notes: 'Resist rotation with the whole trunk braced. Pairs with the twist machine.',
    variations: [
      { name: 'Standard', cableSetting: '', targetReps: 12, targetSets: 3, default: true },
      { name: 'Split Stance', cableSetting: '', targetReps: 12, targetSets: 3 },
      { name: 'Hold', cableSetting: '', targetReps: '20-30 seconds', targetSets: 3 },
    ],
  },

  // ── Day 9: Back ──
  {
    name: 'Back Extension (Seated)', dayNumber: 9, equipment: 'Seated Back Extension Machine', location: 'Gym',
    tags: ['isolation', 'extension', 'machine', 'back', 'erector-spinae'],
    notes: 'Max range of motion',
    variations: [
      { name: 'Standard', targetWeight: 140, targetReps: 12, targetSets: 3, default: true },
    ],
  },
  {
    name: 'Bird Dog', dayNumber: 9, equipment: 'Bodyweight', location: 'Anywhere',
    tags: ['isolation', 'extension', 'bodyweight', 'back', 'erector-spinae', 'core'],
    notes: 'Opposite arm and leg. Spinal extension with an anti-rotation demand, no load on the discs.',
    variations: [
      { name: 'Standard', targetReps: 10, targetSets: 3, default: true },
      { name: 'Hold', targetReps: '10 seconds each', targetSets: 3 },
    ],
  },

  // ── Day 10: Neck ──
  {
    name: 'Neck Retraction', dayNumber: 10, equipment: 'Neck Retraction Device', location: 'Home',
    tags: ['isolation', 'neck', 'posture', 'deep-neck-flexors'],
    notes: 'Chin tuck against resistance. Trains the deep neck flexors that posture depends on.',
    variations: [
      { name: 'Standard', targetReps: 12, targetSets: 3, default: true },
      { name: 'Hold', targetReps: '10 seconds', targetSets: 3 },
    ],
  },
  {
    name: 'Neck Isometrics (4-Way)', dayNumber: 10, equipment: 'Hand Resistance', location: 'Anywhere',
    tags: ['isometric', 'neck', 'hold', 'posture'],
    notes: 'Palm against forehead, back of head, and each side. Press without moving.',
    variations: [
      { name: 'Standard', targetReps: '10 seconds each of 4', targetSets: 2, default: true },
    ],
  },

  // ── Day 11: Pecs (Mobility) ──
  {
    name: 'Dumbbell Bench Press', dayNumber: 11, equipment: 'Dumbbells', location: 'Home',
    tags: ['mobility', 'press', 'dumbbell', 'chest', 'front-delt', 'triceps'],
    notes: '⚠️ Light weight only for mobility',
    variations: [
      { name: 'Flat (Light)', targetWeight: 20, targetReps: 12, targetSets: 3, default: true },
      { name: 'Incline (Light)', targetWeight: 15, targetReps: 12, targetSets: 3 },
    ],
  },
  {
    name: 'Cable Fly', dayNumber: 11, equipment: 'Cable Machine', location: 'Home',
    tags: ['mobility', 'fly', 'cable', 'chest', 'front-delt'],
    notes: '⚠️ Light weight, focus on stretch',
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
      { name: 'Low to High', cableSetting: '' },
      { name: 'High to Low', cableSetting: '' },
    ],
  },
  {
    name: 'Static Hold (Lowered Position)', dayNumber: 11, equipment: 'Dumbbells', location: 'Home',
    tags: ['mobility', 'hold', 'dumbbell', 'chest', 'stretch'],
    notes: '⚠️ Horizontal dumbbell hold in lowered position',
    variations: [
      { name: 'Standard', default: true },
    ],
  },

  // ── Day 12: Compound: Push ──
  {
    name: 'Barbell Bench Press', dayNumber: 12, equipment: 'Smith Machine', location: 'Gym',
    tags: ['compound', 'press', 'machine', 'chest', 'triceps', 'front-delt'],
    variations: [
      { name: 'Flat', targetWeight: 115, targetReps: 12, targetSets: 3, default: true },
      { name: 'Incline', targetWeight: 95, targetReps: 12, targetSets: 3 },
      { name: 'Decline', targetWeight: 105, targetReps: 10, targetSets: 3 },
      { name: 'Close Grip', targetWeight: 85, targetReps: 12, targetSets: 3 },
    ],
  },
  {
    name: 'Dumbbell Bench Press', dayNumber: 12, equipment: 'Dumbbells', location: 'Home',
    tags: ['compound', 'press', 'dumbbell', 'chest', 'triceps', 'front-delt'],
    notes: 'Reps to failure, decreasing weight',
    variations: [
      { name: 'Flat', targetWeight: 20, targetReps: 12, targetSets: 3, default: true },
      { name: 'Incline', targetWeight: 15, targetReps: 12, targetSets: 3 },
      { name: 'Decline', targetWeight: 20, targetReps: 10, targetSets: 3 },
    ],
  },
  {
    name: 'Dips', dayNumber: 12, equipment: 'Dip Machine', location: 'Gym',
    tags: ['compound', 'press', 'machine', 'chest', 'triceps', 'front-delt', 'bodyweight'],
    variations: [
      { name: 'Assisted', targetWeight: -90, targetReps: '15-20', targetSets: 3, default: true },
      { name: 'Bodyweight', targetReps: '8-12', targetSets: 3 },
    ],
  },
  {
    name: 'Shoulder Press', dayNumber: 12, equipment: 'Dumbbells', location: 'Home',
    tags: ['compound', 'press', 'dumbbell', 'front-delt', 'side-delt', 'triceps'],
    variations: [
      { name: 'Seated', targetWeight: 15, targetReps: 12, targetSets: 3, default: true },
      { name: 'Standing', targetWeight: 15, targetReps: 10, targetSets: 3 },
      { name: 'Arnold Press', targetWeight: 12, targetReps: 12, targetSets: 3 },
    ],
  },

  // ── Day 13: Triceps ──
  {
    name: 'Cable Standing High Cross', dayNumber: 13, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'cable', 'triceps', 'extension'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Tricep Pushdown', dayNumber: 13, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'cable', 'triceps', 'pushdown', 'extension'],
    variations: [
      { name: 'Rope', cableSetting: '', default: true },
      { name: 'V-Bar', cableSetting: '' },
      { name: 'Straight Bar', cableSetting: '' },
      { name: 'Single Arm', cableSetting: '' },
    ],
  },
  {
    name: 'Tricep Extension (Katana)', dayNumber: 13, equipment: 'Dumbbell', location: 'Home',
    tags: ['isolation', 'extension', 'dumbbell', 'triceps'],
    variations: [
      { name: 'Standard', targetWeight: 10, default: true },
      { name: 'Overhead', targetWeight: 10 },
    ],
  },

  // ── Day 14: Deltoid ──
  {
    name: 'Reverse Delt Cable Fly', dayNumber: 14, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'fly', 'cable', 'rear-delt', 'traps'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
      { name: 'High Pulley', cableSetting: '' },
      { name: 'Low Pulley', cableSetting: '' },
    ],
  },
  {
    name: 'Side Delt Cable Raises', dayNumber: 14, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'raise', 'cable', 'side-delt'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
      { name: 'Behind the Back', cableSetting: '' },
    ],
  },
  {
    name: 'Front Deltoid Raises (Bottom to Top)', dayNumber: 14, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'raise', 'cable', 'front-delt'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Front Deltoid Raises (Top to Bottom)', dayNumber: 14, equipment: 'Cable Machine', location: 'Home',
    tags: ['isolation', 'raise', 'cable', 'front-delt'],
    variations: [
      { name: 'Standard', cableSetting: '', default: true },
    ],
  },
  {
    name: 'Rotator Cuff Work', dayNumber: 14, equipment: 'Light Weight', location: 'Home',
    tags: ['isolation', 'rotation', 'mobility', 'rotator-cuff', 'shoulder-health'],
    variations: [
      { name: 'Internal Rotation', default: true },
      { name: 'External Rotation' },
    ],
  },

  // ── Day 15: Grip ──
  {
    name: 'Gripper - Trainer', dayNumber: 15, equipment: 'Hand Gripper', location: 'Home',
    tags: ['isolation', 'grip', 'forearms'],
    notes: 'Start with left/weak side',
    variations: [
      { name: 'Standard', targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Gripper - Sport', dayNumber: 15, equipment: 'Hand Gripper', location: 'Home',
    tags: ['isolation', 'grip', 'forearms'],
    notes: 'Start with left/weak side',
    variations: [
      { name: 'Standard', targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Gripper - Guide', dayNumber: 15, equipment: 'Hand Gripper', location: 'Home',
    tags: ['isolation', 'grip', 'forearms'],
    notes: 'Start with left/weak side',
    variations: [
      { name: 'Standard', targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Wrist Curls', dayNumber: 15, equipment: 'Dumbbells', location: 'Home',
    tags: ['isolation', 'curl', 'dumbbell', 'forearms', 'grip'],
    variations: [
      { name: 'Pronated', targetWeight: 20, targetReps: 'Failure', targetSets: 3, default: true },
      { name: 'Supinated', targetWeight: 20, targetReps: 'Failure', targetSets: 3 },
    ],
  },

  // ── Day 16: Hips ──
  {
    name: 'Hip Adductor', dayNumber: 16, equipment: 'Hip Adductor Machine', location: 'Gym',
    tags: ['isolation', 'machine', 'adductors', 'hip'],
    notes: 'Max stretch. Involves static stretching and contractions',
    variations: [
      { name: 'Standard', targetWeight: 100, targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Hip Abductor', dayNumber: 16, equipment: 'Hip Abductor Machine', location: 'Gym',
    tags: ['isolation', 'machine', 'abductors', 'hip', 'glutes'],
    variations: [
      { name: 'Standard', targetWeight: 80, targetReps: 'Failure', targetSets: 3, default: true },
    ],
  },
  {
    name: 'Cable Glute Kickback', dayNumber: 16, equipment: 'Cable Machine', location: 'Gym',
    tags: ['isolation', 'extension', 'cable', 'glutes', 'hip'],
    notes: 'Ankle cuff on the low pulley. Same setup as the standing leg raise — just face the machine.',
    variations: [
      { name: 'Standard', targetWeight: 20, targetReps: 12, targetSets: 3, cableSetting: '', default: true },
    ],
  },
  {
    name: 'Cable Standing Leg Raise', dayNumber: 16, equipment: 'Cable Machine', location: 'Gym',
    tags: ['isolation', 'flexion', 'cable', 'hip-flexors', 'psoas', 'hip'],
    notes: 'Same cuff and pulley as the kickback, facing away. Drive the knee HIGH — psoas only engages above 90 degrees.',
    variations: [
      { name: 'Bent Knee', targetWeight: 15, targetReps: 12, targetSets: 3, cableSetting: '', default: true },
      { name: 'Straight Leg', targetWeight: 10, targetReps: 12, targetSets: 3, cableSetting: '' },
    ],
  },
];
