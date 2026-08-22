// Synergy 12 → Synergy 16.
//
// Splits the Torso day, which was doing three unrelated jobs, into Transverse
// (rotation) and Back (spinal extension), and moves its two hip machines to a new
// Hips day where single-joint hip isolation belongs. Adds Knee and Neck days, folds
// ankle work into Calves, and renames day 3 to Stretching to match what it always
// contained. Compounds move to 1 / 6 / 12 so they sit 5-6-5 apart including the wrap.
//
// The rationale for each placement is in CLAUDE.md; this file only carries it out.
//
// Synergy 12 is retired, not deleted — its record stays so that logs written under it
// still resolve to the day they were actually performed on.
//
// Re-runnable: model writes are upserts on fixed ids, exercises are matched by name
// and moved rather than recreated, and the two removals are by explicit id.

const SHARED = 'shared';
const PREVIOUS_MODEL_ID = 'workout-model-1';
const MODEL_VERSION = 2;
const MODEL_ID = `workout-model-${MODEL_VERSION}`;

// Where you land on cutover. You are mid-cycle on Pecs (Mobility), and that day keeps
// its slug through the renumber, so tomorrow is the same workout it was going to be.
const LANDING_DAY_SLUG = 'pecs-mobility';

// Two library entries that only ever existed as duplicates of the same exercise on
// another day. Removed by explicit id so this migration can never eat anything else.
const REMOVED_DUPLICATES = [
  'exercise-1-seated-calf-raises', // lives on the Calves day
  'exercise-11-shoulder-press'     // lives on Compound: Push
];

const SYNERGY_16 = [
  {
    slug: "compound-legs", number: 1, name: "Compound: Legs",
    focus: "Main Lift: Squat. Systemic leg strength.",
    description: "Heavy compound leg work with emphasis on squat variations",
    muscleGroups: ["legs","glutes","quads"],
    safetyNotes: null
  },
  {
    slug: "calves", number: 2, name: "Calves + Ankles",
    focus: "Active recovery. Ankle mobility included.",
    description: "Calf isolation plus ankle mobility — dorsiflexion feeds squat depth on Day 1",
    muscleGroups: ["calves","ankles"],
    safetyNotes: null
  },
  {
    slug: "abs", number: 3, name: "Abs",
    focus: "Flexion focus. Isolation with mental focus on the group.",
    description: "Core flexion with mental focus on the group — isolation, not integrated trunk work",
    muscleGroups: ["abs","core"],
    safetyNotes: null
  },
  {
    slug: "stretching", number: 4, name: "Stretching",
    focus: "Its own day by design — long, home-based, easy to cut if combined.",
    description: "Long, home-based mobility work. Kept separate because combining it makes it easy to cut",
    muscleGroups: ["hamstrings","adductors","hip-flexors"],
    safetyNotes: null
  },
  {
    slug: "knee", number: 5, name: "Knee",
    focus: "Tendon health: slow eccentrics, isometrics, controlled range. Not a second leg day.",
    description: "Slow eccentrics, isometric holds, controlled range. Deliberately not a second leg day",
    muscleGroups: ["quads","knees"],
    safetyNotes: null
  },
  {
    slug: "compound-pulls", number: 6, name: "Compound: Pulls",
    focus: "Main Lift: Back/Rows. Systemic pulling strength.",
    description: "Horizontal and vertical pulling movements",
    muscleGroups: ["back","lats"],
    safetyNotes: null
  },
  {
    slug: "bicep", number: 7, name: "Bicep",
    focus: "Accessory work.",
    description: "Bicep isolation work following pull day",
    muscleGroups: ["biceps"],
    safetyNotes: null
  },
  {
    slug: "transverse", number: 8, name: "Transverse",
    focus: "Rotation and anti-rotation. The only transverse-plane work in the cycle.",
    description: "The only transverse-plane work in the cycle — spinal rotation and bracing against it",
    muscleGroups: ["core","obliques"],
    safetyNotes: null
  },
  {
    slug: "back", number: 9, name: "Back",
    focus: "Spinal extension. Placed 8 days clear of Day 1 to spare the lower back for squats.",
    description: "Erector work, placed 8 days clear of Day 1 to spare the lower back for squats",
    muscleGroups: ["back","erector-spinae"],
    safetyNotes: null
  },
  {
    slug: "neck", number: 10, name: "Neck",
    focus: "Retraction and four-way isometrics. Short day.",
    description: "Short day — retraction device and four-way holds",
    muscleGroups: ["neck"],
    safetyNotes: null
  },
  {
    slug: "pecs-mobility", number: 11, name: "Pecs (Mobility)",
    focus: "The Primer. Light flys/holds to prep shoulder capsule. ⚠️ NO DIPS or heavy pressing.",
    description: "Light mobility work only - shoulder injury protection",
    muscleGroups: ["chest"],
    safetyNotes: "⚠️ SHOULDER SAFETY: Do NOT perform dips or heavy pressing movements. Light flys and holds only. Focus on mobility and control."
  },
  {
    slug: "compound-push", number: 12, name: "Compound: Push",
    focus: "Main Lift: DB Bench. Heavy chest/front delt focus.",
    description: "Heavy pressing work (dips are safe on this day)",
    muscleGroups: ["chest","shoulders","triceps"],
    safetyNotes: null
  },
  {
    slug: "triceps", number: 13, name: "Triceps",
    focus: "Isolation. Focus on \"feel\" to save elbows.",
    description: "Tricep isolation (user prefers no pushdowns)",
    muscleGroups: ["triceps"],
    safetyNotes: "User preference: Avoid tricep pushdowns"
  },
  {
    slug: "deltoid", number: 14, name: "Deltoid",
    focus: "Shoulder isolation.",
    description: "Shoulder isolation with rear and side delt focus",
    muscleGroups: ["shoulders","delts"],
    safetyNotes: null
  },
  {
    slug: "grip", number: 15, name: "Grip",
    focus: "Forearm/Hand focus. Placed 8 days clear of pulls and bicep so forearms never stack.",
    description: "Grip strength and forearm endurance — 8 days clear of pulls and bicep",
    muscleGroups: ["forearms","grip"],
    safetyNotes: null
  },
  {
    slug: "hips", number: 16, name: "Hips",
    focus: "Adduction, abduction, extension, flexion. Primes the hips for Day 1 squats.",
    description: "Adduction, abduction, extension, flexion. Primes the hips the day before squats",
    muscleGroups: ["hips","glutes","adductors","abductors"],
    safetyNotes: null
  }
];

const LIBRARY = [
  {
    daySlug: "compound-legs", number: 1, name: "Barbell Squat",
    equipment: "Smith Machine", location: "Gym", notes: "",
    tags: ["compound","squat","press","machine","quads","glutes","hamstrings","core"],
    variations: [{"name":"Standard","targetWeight":115,"targetReps":"6-8","targetSets":4,"default":true},{"name":"Wide Stance","targetWeight":105,"targetReps":"8-10","targetSets":4},{"name":"Close Stance","targetWeight":95,"targetReps":"8-10","targetSets":4},{"name":"Pause Rep","targetWeight":95,"targetReps":"6-8","targetSets":3}]
  },
  {
    daySlug: "compound-legs", number: 1, name: "Leg Press",
    equipment: "Leg Press Machine", location: "Gym", notes: "",
    tags: ["compound","press","machine","quads","glutes","hamstrings"],
    variations: [{"name":"Standard","targetWeight":140,"targetReps":12,"targetSets":3,"default":true},{"name":"High Foot","targetWeight":140,"targetReps":12,"targetSets":3},{"name":"Narrow Foot","targetWeight":120,"targetReps":12,"targetSets":3},{"name":"Single Leg","targetWeight":70,"targetReps":10,"targetSets":3}]
  },
  {
    daySlug: "compound-legs", number: 1, name: "Leg Curl",
    equipment: "Leg Curl Machine", location: "Gym", notes: "Highest seat, legs at lowest notch. Only loaded hamstring work in the cycle",
    tags: ["isolation","curl","machine","hamstrings"],
    variations: [{"name":"Standard","targetWeight":60,"targetReps":"12-15","targetSets":3,"default":true},{"name":"Single Leg","targetWeight":30,"targetReps":"12-15","targetSets":3}]
  },
  {
    daySlug: "calves", number: 2, name: "Calf Stands",
    equipment: "Bodyweight", location: "Anywhere", notes: "Stand on toes for about 5 minutes",
    tags: ["isolation","calves","bodyweight","hold"],
    variations: [{"name":"Standard","targetReps":"5 minutes","default":true}]
  },
  {
    daySlug: "calves", number: 2, name: "Calf Stretches",
    equipment: "None", location: "Anywhere", notes: "",
    tags: ["mobility","calves","bodyweight","stretch"],
    variations: [{"name":"Standard","default":true}]
  },
  {
    daySlug: "calves", number: 2, name: "Seated Calf Raises",
    equipment: "Seated Calf Raise Machine", location: "Gym", notes: "",
    tags: ["isolation","calves","machine"],
    variations: [{"name":"Standard","targetWeight":90,"targetReps":12,"targetSets":3,"default":true}]
  },
  {
    daySlug: "calves", number: 2, name: "Ankle Circles",
    equipment: "Bodyweight", location: "Anywhere", notes: "Both directions. Ankle dorsiflexion limits squat depth, so this feeds Day 1.",
    tags: ["mobility","ankles","bodyweight","rotation"],
    variations: [{"name":"Standard","targetReps":"10 each direction","targetSets":2,"default":true},{"name":"Dorsiflexion Rocks","targetReps":15,"targetSets":2}]
  },
  {
    daySlug: "abs", number: 3, name: "Crunches",
    equipment: "Bodyweight", location: "Anywhere", notes: "",
    tags: ["isolation","abs","core","flexion","bodyweight"],
    variations: [{"name":"Standard","default":true},{"name":"Weighted","targetWeight":10,"targetReps":15,"targetSets":3},{"name":"Bicycle","targetReps":20,"targetSets":3}]
  },
  {
    daySlug: "abs", number: 3, name: "Under Leg Crunches",
    equipment: "Bodyweight", location: "Anywhere", notes: "",
    tags: ["isolation","abs","core","flexion","bodyweight"],
    variations: [{"name":"Standard","default":true}]
  },
  {
    daySlug: "abs", number: 3, name: "Situps",
    equipment: "Situp Device", location: "Gym", notes: "",
    tags: ["isolation","flexion","machine","abs","core","hip-flexors"],
    variations: [{"name":"Standard","targetReps":12,"targetSets":3,"default":true}]
  },
  {
    daySlug: "stretching", number: 4, name: "Single Leg Cable Stretch (Front)",
    equipment: "Cable", location: "Gym", notes: "",
    tags: ["mobility","stretch","cable","hamstrings","hip-flexors"],
    variations: [{"name":"Standard","targetReps":"3-5 minutes, 2-5 times","cableSetting":"","default":true}]
  },
  {
    daySlug: "stretching", number: 4, name: "Single Leg Cable Stretch (Side)",
    equipment: "Cable", location: "Gym", notes: "",
    tags: ["mobility","stretch","cable","adductors","abductors"],
    variations: [{"name":"Standard","targetReps":"3-5 minutes, 2-5 times","cableSetting":"","default":true}]
  },
  {
    daySlug: "stretching", number: 4, name: "Single Leg Forward Lean",
    equipment: "Bodyweight", location: "Anywhere", notes: "",
    tags: ["mobility","stretch","bodyweight","hamstrings","glutes"],
    variations: [{"name":"Standard","default":true}]
  },
  {
    daySlug: "stretching", number: 4, name: "Seated Splits",
    equipment: "None", location: "Anywhere", notes: "",
    tags: ["mobility","stretch","bodyweight","hamstrings","adductors"],
    variations: [{"name":"Standard","default":true}]
  },
  {
    daySlug: "knee", number: 5, name: "Leg Extension",
    equipment: "Leg Extension Machine", location: "Gym", notes: "Lowest seat, legs notch 1, back notch 1. Slow 3-4s lowering — this day is tendon loading, not volume.",
    tags: ["isolation","extension","machine","quads","knees","tendon","eccentric"],
    variations: [{"name":"Slow Eccentric","targetWeight":50,"targetReps":12,"targetSets":3,"default":true},{"name":"Standard","targetWeight":60,"targetReps":"12-15","targetSets":3},{"name":"Single Leg","targetWeight":30,"targetReps":"12-15","targetSets":3},{"name":"Pause at Top","targetWeight":50,"targetReps":"10-12","targetSets":3}]
  },
  {
    daySlug: "knee", number: 5, name: "Wall Sit",
    equipment: "Bodyweight", location: "Anywhere", notes: "Isometric hold for patellar tendon loading. Thighs parallel, back flat to wall.",
    tags: ["isometric","hold","bodyweight","quads","knees","tendon"],
    variations: [{"name":"Standard","targetReps":"30-45 seconds","targetSets":3,"default":true},{"name":"Spanish Squat (Banded)","targetReps":"30-45 seconds","targetSets":3},{"name":"Single Leg","targetReps":"20-30 seconds","targetSets":3}]
  },
  {
    daySlug: "knee", number: 5, name: "Single-Leg Decline Squat",
    equipment: "Decline Board", location: "Gym", notes: "Classic patellar tendon exercise. 25 degree decline, slow 3-4s lowering.",
    tags: ["isolation","squat","bodyweight","quads","knees","tendon","eccentric"],
    variations: [{"name":"Slow Eccentric","targetReps":12,"targetSets":3,"default":true},{"name":"Bodyweight","targetReps":15,"targetSets":3}]
  },
  {
    daySlug: "compound-pulls", number: 6, name: "Lat Pulldowns",
    equipment: "Cable Machine", location: "Home", notes: "",
    tags: ["compound","pull","cable","lats","back","biceps","rear-delt"],
    variations: [{"name":"Wide Grip","targetWeight":40,"targetReps":12,"targetSets":3,"cableSetting":"","default":true},{"name":"Close Grip","targetWeight":45,"targetReps":12,"targetSets":3,"cableSetting":""},{"name":"Reverse Grip","targetWeight":35,"targetReps":12,"targetSets":3,"cableSetting":""},{"name":"Single Arm","targetWeight":20,"targetReps":12,"targetSets":3,"cableSetting":""}]
  },
  {
    daySlug: "compound-pulls", number: 6, name: "Bent-Over Rows",
    equipment: "Barbell", location: "Home", notes: "",
    tags: ["compound","row","pull","barbell","back","lats","biceps","rear-delt","traps"],
    variations: [{"name":"Standard","targetWeight":35,"targetReps":12,"targetSets":3,"default":true},{"name":"Underhand","targetWeight":35,"targetReps":12,"targetSets":3}]
  },
  {
    daySlug: "compound-pulls", number: 6, name: "Seated Cable Rows",
    equipment: "Cable Machine", location: "Home", notes: "",
    tags: ["compound","row","pull","cable","back","lats","biceps","traps","rear-delt"],
    variations: [{"name":"Standard","targetWeight":80,"targetReps":12,"targetSets":3,"cableSetting":"","default":true},{"name":"Wide Grip","targetWeight":70,"targetReps":12,"targetSets":3,"cableSetting":""},{"name":"Single Arm","targetWeight":40,"targetReps":12,"targetSets":3,"cableSetting":""}]
  },
  {
    daySlug: "bicep", number: 7, name: "Dumbbell Bicep Curl",
    equipment: "Dumbbells", location: "Home", notes: "Reps to failure, decrease weight by 5-10 each time",
    tags: ["isolation","curl","dumbbell","biceps","forearms"],
    variations: [{"name":"Standard","targetWeight":20,"targetReps":"Failure","targetSets":3,"default":true},{"name":"Hammer","targetWeight":20,"targetReps":"Failure","targetSets":3},{"name":"Incline","targetWeight":15,"targetReps":"Failure","targetSets":3},{"name":"Concentration","targetWeight":15,"targetReps":"Failure","targetSets":3}]
  },
  {
    daySlug: "bicep", number: 7, name: "Cable Bicep Curl",
    equipment: "Cable Machine", location: "Home", notes: "Reps to failure, decrease weight by 5-10 each time",
    tags: ["isolation","curl","cable","biceps","forearms"],
    variations: [{"name":"Standard","targetWeight":20,"targetReps":"Failure","targetSets":3,"cableSetting":"","default":true},{"name":"Rope Hammer","targetWeight":20,"targetReps":"Failure","targetSets":3,"cableSetting":""},{"name":"Single Arm","targetWeight":10,"targetReps":"Failure","targetSets":3,"cableSetting":""},{"name":"Bayesian","targetWeight":13,"targetReps":12,"targetSets":3,"cableSetting":""}]
  },
  {
    daySlug: "transverse", number: 8, name: "Torso Twist",
    equipment: "Torso Twist Machine", location: "Gym", notes: "Max twist. One set is rotating from each side",
    tags: ["isolation","rotation","machine","core","obliques"],
    variations: [{"name":"Standard","targetWeight":90,"targetReps":20,"targetSets":3,"default":true}]
  },
  {
    daySlug: "transverse", number: 8, name: "Cable Chop",
    equipment: "Cable Machine", location: "Gym", notes: "Arm is the lever, trunk is the target. Light weight — this is movement, not load.",
    tags: ["rotation","cable","core","obliques","transverse"],
    variations: [{"name":"High to Low","cableSetting":"","targetReps":12,"targetSets":3,"default":true},{"name":"Low to High","cableSetting":"","targetReps":12,"targetSets":3}]
  },
  {
    daySlug: "transverse", number: 8, name: "Pallof Press",
    equipment: "Cable Machine", location: "Gym", notes: "Resist rotation with the whole trunk braced. Pairs with the twist machine.",
    tags: ["anti-rotation","cable","core","obliques","transverse","isometric"],
    variations: [{"name":"Standard","cableSetting":"","targetReps":12,"targetSets":3,"default":true},{"name":"Split Stance","cableSetting":"","targetReps":12,"targetSets":3},{"name":"Hold","cableSetting":"","targetReps":"20-30 seconds","targetSets":3}]
  },
  {
    daySlug: "back", number: 9, name: "Back Extension (Seated)",
    equipment: "Seated Back Extension Machine", location: "Gym", notes: "Max range of motion",
    tags: ["isolation","extension","machine","back","erector-spinae"],
    variations: [{"name":"Standard","targetWeight":140,"targetReps":12,"targetSets":3,"default":true}]
  },
  {
    daySlug: "back", number: 9, name: "Bird Dog",
    equipment: "Bodyweight", location: "Anywhere", notes: "Opposite arm and leg. Spinal extension with an anti-rotation demand, no load on the discs.",
    tags: ["isolation","extension","bodyweight","back","erector-spinae","core"],
    variations: [{"name":"Standard","targetReps":10,"targetSets":3,"default":true},{"name":"Hold","targetReps":"10 seconds each","targetSets":3}]
  },
  {
    daySlug: "neck", number: 10, name: "Neck Retraction",
    equipment: "Neck Retraction Device", location: "Home", notes: "Chin tuck against resistance. Trains the deep neck flexors that posture depends on.",
    tags: ["isolation","neck","posture","deep-neck-flexors"],
    variations: [{"name":"Standard","targetReps":12,"targetSets":3,"default":true},{"name":"Hold","targetReps":"10 seconds","targetSets":3}]
  },
  {
    daySlug: "neck", number: 10, name: "Neck Isometrics (4-Way)",
    equipment: "Hand Resistance", location: "Anywhere", notes: "Palm against forehead, back of head, and each side. Press without moving.",
    tags: ["isometric","neck","hold","posture"],
    variations: [{"name":"Standard","targetReps":"10 seconds each of 4","targetSets":2,"default":true}]
  },
  {
    daySlug: "pecs-mobility", number: 11, name: "Dumbbell Bench Press",
    equipment: "Dumbbells", location: "Home", notes: "⚠️ Light weight only for mobility",
    tags: ["mobility","press","dumbbell","chest","front-delt","triceps"],
    variations: [{"name":"Flat (Light)","targetWeight":20,"targetReps":12,"targetSets":3,"default":true},{"name":"Incline (Light)","targetWeight":15,"targetReps":12,"targetSets":3}]
  },
  {
    daySlug: "pecs-mobility", number: 11, name: "Cable Fly",
    equipment: "Cable Machine", location: "Home", notes: "⚠️ Light weight, focus on stretch",
    tags: ["mobility","fly","cable","chest","front-delt"],
    variations: [{"name":"Standard","cableSetting":"","default":true},{"name":"Low to High","cableSetting":""},{"name":"High to Low","cableSetting":""}]
  },
  {
    daySlug: "pecs-mobility", number: 11, name: "Static Hold (Lowered Position)",
    equipment: "Dumbbells", location: "Home", notes: "⚠️ Horizontal dumbbell hold in lowered position",
    tags: ["mobility","hold","dumbbell","chest","stretch"],
    variations: [{"name":"Standard","default":true}]
  },
  {
    daySlug: "compound-push", number: 12, name: "Barbell Bench Press",
    equipment: "Smith Machine", location: "Gym", notes: "",
    tags: ["compound","press","machine","chest","triceps","front-delt"],
    variations: [{"name":"Flat","targetWeight":115,"targetReps":12,"targetSets":3,"default":true},{"name":"Incline","targetWeight":95,"targetReps":12,"targetSets":3},{"name":"Decline","targetWeight":105,"targetReps":10,"targetSets":3},{"name":"Close Grip","targetWeight":85,"targetReps":12,"targetSets":3}]
  },
  {
    daySlug: "compound-push", number: 12, name: "Dumbbell Bench Press",
    equipment: "Dumbbells", location: "Home", notes: "Reps to failure, decreasing weight",
    tags: ["compound","press","dumbbell","chest","triceps","front-delt"],
    variations: [{"name":"Flat","targetWeight":20,"targetReps":12,"targetSets":3,"default":true},{"name":"Incline","targetWeight":15,"targetReps":12,"targetSets":3},{"name":"Decline","targetWeight":20,"targetReps":10,"targetSets":3}]
  },
  {
    daySlug: "compound-push", number: 12, name: "Dips",
    equipment: "Dip Machine", location: "Gym", notes: "",
    tags: ["compound","press","machine","chest","triceps","front-delt","bodyweight"],
    variations: [{"name":"Assisted","targetWeight":-90,"targetReps":"15-20","targetSets":3,"default":true},{"name":"Bodyweight","targetReps":"8-12","targetSets":3}]
  },
  {
    daySlug: "compound-push", number: 12, name: "Shoulder Press",
    equipment: "Dumbbells", location: "Home", notes: "",
    tags: ["compound","press","dumbbell","front-delt","side-delt","triceps"],
    variations: [{"name":"Seated","targetWeight":15,"targetReps":12,"targetSets":3,"default":true},{"name":"Standing","targetWeight":15,"targetReps":10,"targetSets":3},{"name":"Arnold Press","targetWeight":12,"targetReps":12,"targetSets":3}]
  },
  {
    daySlug: "triceps", number: 13, name: "Cable Standing High Cross",
    equipment: "Cable Machine", location: "Home", notes: "",
    tags: ["isolation","cable","triceps","extension"],
    variations: [{"name":"Standard","cableSetting":"","default":true}]
  },
  {
    daySlug: "triceps", number: 13, name: "Tricep Pushdown",
    equipment: "Cable Machine", location: "Home", notes: "",
    tags: ["isolation","cable","triceps","pushdown","extension"],
    variations: [{"name":"Rope","cableSetting":"","default":true},{"name":"V-Bar","cableSetting":""},{"name":"Straight Bar","cableSetting":""},{"name":"Single Arm","cableSetting":""}]
  },
  {
    daySlug: "triceps", number: 13, name: "Tricep Extension (Katana)",
    equipment: "Dumbbell", location: "Home", notes: "",
    tags: ["isolation","extension","dumbbell","triceps"],
    variations: [{"name":"Standard","targetWeight":10,"default":true},{"name":"Overhead","targetWeight":10}]
  },
  {
    daySlug: "deltoid", number: 14, name: "Reverse Delt Cable Fly",
    equipment: "Cable Machine", location: "Home", notes: "",
    tags: ["isolation","fly","cable","rear-delt","traps"],
    variations: [{"name":"Standard","cableSetting":"","default":true},{"name":"High Pulley","cableSetting":""},{"name":"Low Pulley","cableSetting":""}]
  },
  {
    daySlug: "deltoid", number: 14, name: "Side Delt Cable Raises",
    equipment: "Cable Machine", location: "Home", notes: "",
    tags: ["isolation","raise","cable","side-delt"],
    variations: [{"name":"Standard","cableSetting":"","default":true},{"name":"Behind the Back","cableSetting":""}]
  },
  {
    daySlug: "deltoid", number: 14, name: "Front Deltoid Raises (Bottom to Top)",
    equipment: "Cable Machine", location: "Home", notes: "",
    tags: ["isolation","raise","cable","front-delt"],
    variations: [{"name":"Standard","cableSetting":"","default":true}]
  },
  {
    daySlug: "deltoid", number: 14, name: "Front Deltoid Raises (Top to Bottom)",
    equipment: "Cable Machine", location: "Home", notes: "",
    tags: ["isolation","raise","cable","front-delt"],
    variations: [{"name":"Standard","cableSetting":"","default":true}]
  },
  {
    daySlug: "deltoid", number: 14, name: "Rotator Cuff Work",
    equipment: "Light Weight", location: "Home", notes: "",
    tags: ["isolation","rotation","mobility","rotator-cuff","shoulder-health"],
    variations: [{"name":"Internal Rotation","default":true},{"name":"External Rotation"}]
  },
  {
    daySlug: "grip", number: 15, name: "Gripper - Trainer",
    equipment: "Hand Gripper", location: "Home", notes: "Start with left/weak side",
    tags: ["isolation","grip","forearms"],
    variations: [{"name":"Standard","targetReps":"Failure","targetSets":3,"default":true}]
  },
  {
    daySlug: "grip", number: 15, name: "Gripper - Sport",
    equipment: "Hand Gripper", location: "Home", notes: "Start with left/weak side",
    tags: ["isolation","grip","forearms"],
    variations: [{"name":"Standard","targetReps":"Failure","targetSets":3,"default":true}]
  },
  {
    daySlug: "grip", number: 15, name: "Gripper - Guide",
    equipment: "Hand Gripper", location: "Home", notes: "Start with left/weak side",
    tags: ["isolation","grip","forearms"],
    variations: [{"name":"Standard","targetReps":"Failure","targetSets":3,"default":true}]
  },
  {
    daySlug: "grip", number: 15, name: "Wrist Curls",
    equipment: "Dumbbells", location: "Home", notes: "",
    tags: ["isolation","curl","dumbbell","forearms","grip"],
    variations: [{"name":"Pronated","targetWeight":20,"targetReps":"Failure","targetSets":3,"default":true},{"name":"Supinated","targetWeight":20,"targetReps":"Failure","targetSets":3}]
  },
  {
    daySlug: "hips", number: 16, name: "Hip Adductor",
    equipment: "Hip Adductor Machine", location: "Gym", notes: "Max stretch. Involves static stretching and contractions",
    tags: ["isolation","machine","adductors","hip"],
    variations: [{"name":"Standard","targetWeight":100,"targetReps":"Failure","targetSets":3,"default":true}]
  },
  {
    daySlug: "hips", number: 16, name: "Hip Abductor",
    equipment: "Hip Abductor Machine", location: "Gym", notes: "",
    tags: ["isolation","machine","abductors","hip","glutes"],
    variations: [{"name":"Standard","targetWeight":80,"targetReps":"Failure","targetSets":3,"default":true}]
  },
  {
    daySlug: "hips", number: 16, name: "Cable Glute Kickback",
    equipment: "Cable Machine", location: "Gym", notes: "Ankle cuff on the low pulley. Same setup as the standing leg raise — just face the machine.",
    tags: ["isolation","extension","cable","glutes","hip"],
    variations: [{"name":"Standard","targetWeight":20,"targetReps":12,"targetSets":3,"cableSetting":"","default":true}]
  },
  {
    daySlug: "hips", number: 16, name: "Cable Standing Leg Raise",
    equipment: "Cable Machine", location: "Gym", notes: "Same cuff and pulley as the kickback, facing away. Drive the knee HIGH — psoas only engages above 90 degrees.",
    tags: ["isolation","flexion","cable","hip-flexors","psoas","hip"],
    variations: [{"name":"Bent Knee","targetWeight":15,"targetReps":12,"targetSets":3,"cableSetting":"","default":true},{"name":"Straight Leg","targetWeight":10,"targetReps":12,"targetSets":3,"cableSetting":""}]
  }
];

const exerciseId = (daySlug, name) =>
  `exercise-${daySlug}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

const query = async (container, sql, parameters = []) => {
  const { resources } = await container.items.query({ query: sql, parameters }).fetchAll();
  return resources;
};

// Deleting something a previous run already deleted is success, not failure.
const remove = async (container, id) => {
  try {
    await container.item(id, SHARED).delete();
    return true;
  } catch (error) {
    if (error.code === 404) return false;
    throw error;
  }
};

export default {
  version: 2,
  name: 'Synergy 12 to Synergy 16',

  async up({ container }) {
    // 1. Publish the new model and retire the old one. Order matters only in that we
    //    never want two active models, so the new one lands before the old stands down.
    await container.items.upsert({
      id: MODEL_ID,
      type: 'workout-model',
      userId: SHARED,
      version: MODEL_VERSION,
      name: 'Synergy 16',
      active: true,
      days: SYNERGY_16,
      createdAt: new Date().toISOString()
    });

    const [previous] = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type AND c.id = @id',
      [{ name: '@type', value: 'workout-model' }, { name: '@id', value: PREVIOUS_MODEL_ID }]
    );
    if (previous?.active) {
      await container.items.upsert({ ...previous, active: false, retiredAt: new Date().toISOString() });
    }

    // 2. Reconcile the exercise library. Existing entries are matched by name and moved
    //    to their new day; anything the library doesn't mention is left exactly where it
    //    is, so exercises added in the app are never touched.
    //
    //    An exercise can legitimately sit on two days — Dumbbell Bench Press is listed on
    //    both Pecs (Mobility) and Compound: Push — so each library entry claims at most
    //    one existing document, preferring a copy already on the day it is headed for.
    const existing = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type',
      [{ name: '@type', value: 'exercise' }]
    );

    const claimed = new Set();
    const claim = (entry) => {
      const candidates = existing.filter((e) => e.name === entry.name && !claimed.has(e.id));
      if (candidates.length === 0) return null;
      const onTargetDay = candidates.find((e) => e.daySlug === entry.daySlug || e.dayNumber === entry.number);
      const chosen = onTargetDay ?? candidates[0];
      claimed.add(chosen.id);
      return chosen;
    };

    const desiredIds = new Set(LIBRARY.map((entry) => exerciseId(entry.daySlug, entry.name)));
    const supersededIds = new Set();
    let created = 0;

    for (const entry of LIBRARY) {
      const id = exerciseId(entry.daySlug, entry.name);
      const current = claim(entry);

      // Keep whatever the exercise already carries — targets and notes may have been
      // edited in the app since it was first seeded — and change only its placement.
      const doc = {
        ...(current ?? {}),
        id,
        type: 'exercise',
        userId: SHARED,
        daySlug: entry.daySlug,
        dayNumber: entry.number,
        name: entry.name,
        equipment: current?.equipment ?? entry.equipment,
        location: current?.location ?? entry.location,
        notes: current?.notes ?? entry.notes,
        tags: current?.tags?.length ? current.tags : entry.tags,
        variations: current?.variations?.length ? current.variations : entry.variations,
        createdAt: current?.createdAt ?? new Date().toISOString()
      };

      await container.items.upsert(doc);

      if (!current) created++;
      else if (current.id !== id && !desiredIds.has(current.id)) supersededIds.add(current.id);
    }

    // The documents left behind by a move. Keyed ids, so re-running finds them gone.
    let moved = 0;
    for (const id of supersededIds) {
      if (await remove(container, id)) moved++;
    }

    // 3. Drop the two duplicates.
    let removed = 0;
    for (const id of REMOVED_DUPLICATES) {
      if (await remove(container, id)) removed++;
    }

    // 4. Move the current-day pointer onto the new cycle.
    const settings = await query(
      container,
      'SELECT * FROM c WHERE c.type = @type',
      [{ name: '@type', value: 'settings' }]
    );
    for (const setting of settings) {
      await container.items.upsert({
        ...setting,
        currentDaySlug: LANDING_DAY_SLUG,
        updatedAt: new Date().toISOString()
      });
    }

    return { days: SYNERGY_16.length, created, moved, removed, settings: settings.length };
  }
};
