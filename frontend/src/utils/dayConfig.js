// Static metadata for the 16-day Synergy cycle: names, colors, focus descriptions,
// and safety notes. Used by HistoryTab (color coding), WorkoutDrawer (day info),
// and TodayTab (override dropdown labels).
//
// The actual exercise library lives in the database (seeded from backend/seed-data.js).
// This file intentionally does NOT contain exercise lists — components that need
// exercises fetch them from the API.
//
// Day count is derived from this object everywhere (see getTotalDays), so adding or
// removing a day here is enough — the cycle dial, day pickers, and API bounds follow.

export const DAY_CONFIG = {
  1: {
    name: "Compound: Legs",
    focus: "Squat focus",
    description: "Heavy compound leg work with emphasis on squat variations",
    color: "bg-blue-600",
    safetyNotes: null
  },
  2: {
    name: "Calves + Ankles",
    focus: "Active recovery",
    description: "Calf isolation plus ankle mobility — dorsiflexion feeds squat depth on Day 1",
    color: "bg-green-600",
    safetyNotes: null
  },
  3: {
    name: "Abs",
    focus: "Flexion focus",
    description: "Core flexion with mental focus on the group — isolation, not integrated trunk work",
    color: "bg-yellow-600",
    safetyNotes: null
  },
  4: {
    name: "Stretching",
    focus: "Its own day by design",
    description: "Long, home-based mobility work. Kept separate because combining it makes it easy to cut",
    color: "bg-purple-600",
    safetyNotes: null
  },
  5: {
    name: "Knee",
    focus: "Tendon health, not volume",
    description: "Slow eccentrics, isometric holds, controlled range. Deliberately not a second leg day",
    color: "bg-emerald-600",
    safetyNotes: null
  },
  6: {
    name: "Compound: Pulls",
    focus: "Back/Rows",
    description: "Horizontal and vertical pulling movements",
    color: "bg-indigo-600",
    safetyNotes: null
  },
  7: {
    name: "Bicep",
    focus: "Accessory",
    description: "Bicep isolation work following pull day",
    color: "bg-pink-600",
    safetyNotes: null
  },
  8: {
    name: "Transverse",
    focus: "Rotation + anti-rotation",
    description: "The only transverse-plane work in the cycle — spinal rotation and bracing against it",
    color: "bg-teal-600",
    safetyNotes: null
  },
  9: {
    name: "Back",
    focus: "Spinal extension",
    description: "Erector work, placed 8 days clear of Day 1 to spare the lower back for squats",
    color: "bg-amber-600",
    safetyNotes: null
  },
  10: {
    name: "Neck",
    focus: "Retraction + isometrics",
    description: "Short day — retraction device and four-way holds",
    color: "bg-slate-500",
    safetyNotes: null
  },
  11: {
    name: "Pecs (Mobility)",
    focus: "⚠️ CRITICAL: NO DIPS or HEAVY PRESSING",
    description: "Light mobility work only - shoulder injury protection",
    color: "bg-red-600",
    safetyNotes: "⚠️ SHOULDER SAFETY: Do NOT perform dips or heavy pressing movements. Light flys and holds only. Focus on mobility and control."
  },
  12: {
    name: "Compound: Push",
    focus: "DB Bench - Dips allowed here",
    description: "Heavy pressing work (dips are safe on this day)",
    color: "bg-orange-600",
    safetyNotes: null
  },
  13: {
    name: "Triceps",
    focus: "Cable High Cross - NO pushdowns",
    description: "Tricep isolation (user prefers no pushdowns)",
    color: "bg-cyan-600",
    safetyNotes: "User preference: Avoid tricep pushdowns"
  },
  14: {
    name: "Deltoid",
    focus: "Rear/Side isolation",
    description: "Shoulder isolation with rear and side delt focus",
    color: "bg-violet-600",
    safetyNotes: null
  },
  15: {
    name: "Grip",
    focus: "Forearm burnout",
    description: "Grip strength and forearm endurance — 8 days clear of pulls and bicep",
    color: "bg-lime-600",
    safetyNotes: null
  },
  16: {
    name: "Hips",
    focus: "All four hip actions",
    description: "Adduction, abduction, extension, flexion. Primes the hips the day before squats",
    color: "bg-fuchsia-600",
    safetyNotes: null
  }
};

const DAY_NUMBERS = Object.keys(DAY_CONFIG).map(Number).sort((a, b) => a - b);
const FIRST_DAY = DAY_NUMBERS[0];
const LAST_DAY = DAY_NUMBERS[DAY_NUMBERS.length - 1];

export const getTotalDays = () => DAY_NUMBERS.length;

export const getDayNumbers = () => [...DAY_NUMBERS];

export const isValidDay = (dayNumber) => Object.hasOwn(DAY_CONFIG, dayNumber);

export const getNextDay = (currentDay) => {
  return currentDay >= LAST_DAY ? FIRST_DAY : currentDay + 1;
};

export const getPreviousDay = (currentDay) => {
  return currentDay <= FIRST_DAY ? LAST_DAY : currentDay - 1;
};

export const getDayInfo = (dayNumber) => {
  return DAY_CONFIG[dayNumber] || null;
};
