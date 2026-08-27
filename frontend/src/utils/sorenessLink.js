// Linking soreness back to the workout that caused it.
//
// A soreness entry names an originating workout, and you log against that same
// workout repeatedly as the soreness fades — the sequence of entries for one
// workout *is* its recovery curve. This module holds the two pieces of shared
// logic that supports: which muscles a given cycle day plausibly makes sore
// (used to default-filter the muscle picker), and how to fold a flat list of
// entries into per-workout recovery curves (used by the timeline view).

import { MUSCLE_GROUPS } from './muscleTaxonomy';

// Cycle day → muscle taxonomy groups that day plausibly makes sore.
//
// Keyed by day slug rather than number: a day's position changes when the cycle
// is reordered, and this map must follow the day itself, not whoever moved into
// its slot.
//
// Deliberately generous rather than minimal: this only sets the *default*
// filter on the muscle picker, and the picker always offers an escape hatch to
// the full taxonomy. Missing a real group costs more than showing a spare one.
// Groups are keyed by MUSCLE_TAXONOMY names, not the informal lowercase tags on
// a day's `muscleGroups`.
//
// Days with no entry — Neck, which the taxonomy has no group for — fall through
// to the whole taxonomy, which is the right default rather than a gap.
export const DAY_MUSCLE_GROUPS = {
  'compound-legs':  ['Quadriceps', 'Glutes', 'Hamstrings', 'Hip & Adductors', 'Abs & Core', 'Lats & Back'],
  calves:           ['Calves'],
  abs:              ['Abs & Core'],
  stretching:       ['Hamstrings', 'Glutes', 'Hip & Adductors'],
  knee:             ['Quadriceps'],
  'compound-pulls': ['Lats & Back', 'Biceps', 'Deltoids', 'Forearms & Grip'],
  bicep:            ['Biceps', 'Forearms & Grip'],
  transverse:       ['Abs & Core', 'Lats & Back'],
  back:             ['Lats & Back', 'Abs & Core'],
  'pecs-mobility':  ['Pecs', 'Deltoids'],
  'compound-push':  ['Pecs', 'Deltoids', 'Triceps'],
  triceps:          ['Triceps', 'Deltoids'],
  deltoid:          ['Deltoids', 'Lats & Back'],
  'shoulder-press': ['Deltoids', 'Triceps', 'Pecs', 'Lats & Back'],
  grip:             ['Forearms & Grip', 'Biceps'],
  hips:             ['Hip & Adductors', 'Glutes'],

  // Retired, but soreness logged against a Torso workout still has to resolve.
  torso:            ['Abs & Core', 'Lats & Back', 'Hip & Adductors'],
};

// Groups to show for a source workout. Falls back to the whole taxonomy when
// the day is unknown or unattributed.
export function groupsForDay(daySlug) {
  return DAY_MUSCLE_GROUPS[daySlug] || MUSCLE_GROUPS;
}

// Whole days between two YYYY-MM-DD strings (b - a). Parsed at noon so DST
// transitions can't shift the result by a day.
export function daysBetween(a, b) {
  const ms = new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00');
  return Math.round(ms / 86400000);
}

// Key identifying one muscle within an entry (muscle is null for group-level).
export const muscleKey = (m) => `${m.group}\u0000${m.muscle || ''}`;

/**
 * Fold soreness entries into recovery curves, one per originating workout.
 *
 * Returns a Map of sourceWorkoutId → {
 *   sourceWorkoutId, sourceWorkoutDaySlug, sourceWorkoutDay, sourceWorkoutDate,
 *   entries: [...]                       // ascending by date
 *   muscles: [{ group, muscle, points: [{ date, dayOffset, level }],
 *               peak, lastLevel, lastDate, spanDays, resolved }]
 * }
 *
 * `dayOffset` is days since the workout, so day 0 is the workout itself.
 * A muscle counts as resolved once its final recorded level is 2 or below —
 * "mild" on the journal's own scale — otherwise it is still ongoing and
 * `spanDays` is a floor, not a total.
 */
export function buildRecoveryCurves(entries) {
  const byWorkout = new Map();

  for (const entry of entries) {
    if (!entry.sourceWorkoutId) continue;
    let curve = byWorkout.get(entry.sourceWorkoutId);
    if (!curve) {
      curve = {
        sourceWorkoutId: entry.sourceWorkoutId,
        sourceWorkoutDaySlug: entry.sourceWorkoutDaySlug ?? null,
        sourceWorkoutDay: entry.sourceWorkoutDay ?? null,
        sourceWorkoutDate: entry.sourceWorkoutDate ?? null,
        entries: [],
        muscleMap: new Map(),
      };
      byWorkout.set(entry.sourceWorkoutId, curve);
    }
    curve.entries.push(entry);
    // Denormalised workout fields are written on every entry; keep the first
    // non-null in case an older entry was saved without them.
    curve.sourceWorkoutDaySlug ??= entry.sourceWorkoutDaySlug ?? null;
    curve.sourceWorkoutDay ??= entry.sourceWorkoutDay ?? null;
    curve.sourceWorkoutDate ??= entry.sourceWorkoutDate ?? null;

    for (const m of entry.muscles) {
      const key = muscleKey(m);
      let row = curve.muscleMap.get(key);
      if (!row) {
        row = { group: m.group, muscle: m.muscle || null, points: [] };
        curve.muscleMap.set(key, row);
      }
      row.points.push({ date: entry.date, level: m.level });
    }
  }

  for (const curve of byWorkout.values()) {
    curve.entries.sort((a, b) => a.date.localeCompare(b.date));
    const origin = curve.sourceWorkoutDate || curve.entries[0]?.date;

    curve.muscles = [...curve.muscleMap.values()].map((row) => {
      row.points.sort((a, b) => a.date.localeCompare(b.date));
      for (const p of row.points) {
        p.dayOffset = origin ? daysBetween(origin, p.date) : 0;
      }
      const last = row.points[row.points.length - 1];
      return {
        ...row,
        peak: Math.max(...row.points.map((p) => p.level)),
        lastLevel: last.level,
        lastDate: last.date,
        spanDays: last.dayOffset,
        resolved: last.level <= 2,
      };
    });
    // Worst-hit muscle first — that's the one the recovery read is about.
    curve.muscles.sort((a, b) => b.peak - a.peak || b.spanDays - a.spanDays);
    delete curve.muscleMap;
  }

  return byWorkout;
}

// Historical records used a deterministic (date, sourceWorkoutId) id. Keep the
// helper only as a fallback for those rows; new records have unique ids.
export function sorenessDocId(date, sourceWorkoutId) {
  return sourceWorkoutId ? `soreness-${date}-${sourceWorkoutId}` : `soreness-${date}`;
}

// ---------------------------------------------------------------------------
// Recovery tracks and lane packing (the Lanes view)
// ---------------------------------------------------------------------------

// Every date from a to b inclusive, as YYYY-MM-DD.
export function datesBetween(a, b) {
  const out = [];
  const cur = new Date(a + 'T12:00:00');
  const end = new Date(b + 'T12:00:00');
  while (cur <= end) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
    );
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Fold soreness entries into "tracks" — one contiguous stripe each.
 *
 *   mode 'workout' — one track per originating workout. A workout's whole
 *                    recovery is a single stripe; the level shown on a day is
 *                    the worst muscle that day. Rarely more than 2-3 overlap.
 *   mode 'muscle'  — one track per (originating workout, muscle group), so a
 *                    workout that made three groups sore spawns three stripes.
 *                    Still anchored to its workout, just finer grained.
 *
 * Unattributed entries have no workout to spawn from, so they get no track.
 *
 * An entry naming no muscles is still a track. Its record-level intensity is
 * the stripe value; muscles are optional detail.
 */
export function buildTracks(entries, mode = 'workout') {
  const tracks = new Map();

  // Record one day of one stripe. `muscles` is what the tooltip shows, and may
  // be empty — the day was logged either way.
  const add = (key, group, date, muscles, entry) => {
    let t = tracks.get(key);
    if (!t) {
      t = {
        key,
        group,
        sourceWorkoutId: entry.sourceWorkoutId,
        sourceWorkoutDaySlug: entry.sourceWorkoutDaySlug ?? null,
        sourceWorkoutDay: entry.sourceWorkoutDay ?? null,
        sourceWorkoutDate: entry.sourceWorkoutDate ?? null,
        logged: new Set(),  // every date this stripe was logged on
        levels: new Map(),  // date -> record-level intensity
        detail: new Map(),  // date -> [{ name, level }]
      };
      tracks.set(key, t);
    }
    t.logged.add(date);
    if (muscles.length) {
      const worst = Math.max(...muscles.map((m) => m.level));
      // Two entries should never share a (track, date), but guard anyway.
      t.levels.set(date, Math.max(t.levels.get(date) ?? 0, worst));
    } else if (entry.level) {
      t.levels.set(date, Math.max(t.levels.get(date) ?? 0, entry.level));
    }
    t.detail.set(date, muscles.map((m) => ({ name: m.muscle || m.group, level: m.level })));
  };

  for (const entry of entries) {
    if (!entry.sourceWorkoutId) continue;

    if (mode === 'muscle' && entry.muscles?.length) {
      // One stripe per taxonomy group this workout made sore.
      const byGroup = new Map();
      for (const m of entry.muscles) {
        if (!byGroup.has(m.group)) byGroup.set(m.group, []);
        byGroup.get(m.group).push(m);
      }
      for (const [group, muscles] of byGroup) {
        add(`${entry.sourceWorkoutId} :: ${group}`, group, entry.date, muscles, entry);
      }
    } else {
      // Plain workout mode, and the muscle mode's fallback for an entry that
      // named no muscles: there is no group to split it by, so it stays whole.
      add(entry.sourceWorkoutId, null, entry.date, entry.muscles || [], entry);
    }
  }

  for (const t of tracks.values()) {
    t.dates = [...t.logged].sort();
    t.startDate = t.dates[0];
    t.endDate = t.dates[t.dates.length - 1];
    // Null rather than -Infinity when the stripe carries no levels at all.
    t.peak = t.levels.size ? Math.max(...t.levels.values()) : null;
    t.lastLevel = t.levels.get(t.endDate) ?? null;
    t.spanDays = t.sourceWorkoutDate ? daysBetween(t.sourceWorkoutDate, t.endDate) : t.dates.length;
  }

  return [...tracks.values()];
}

/**
 * Assign each track a lane, greedily, in start-date order: always the lowest
 * lane whose previous occupant has already finished.
 *
 * This is interval-graph colouring. Interval graphs are perfect, so the minimum
 * possible lane count equals peak concurrency (the most stripes alive on any one
 * day), and greedy-by-start-date provably achieves it. That is why nothing here
 * ever reflows a stripe sideways: the layout is already as narrow as it can be,
 * so shifting a live stripe to backfill a freed lane would buy zero width while
 * destroying the stable x-position that makes a stripe's length readable.
 * A freed lane simply stays empty until a later track claims it — and that hole
 * is information: fewer concurrent recoveries that day.
 *
 * Returns { tracks (each with .lane), laneCount }.
 */
export function packLanes(tracks) {
  const sorted = [...tracks].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      b.endDate.localeCompare(a.endDate) ||
      a.key.localeCompare(b.key),
  );

  const laneEnds = []; // lane index -> endDate of its current occupant
  for (const t of sorted) {
    let lane = laneEnds.findIndex((end) => end < t.startDate);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(t.endDate);
    } else {
      laneEnds[lane] = t.endDate;
    }
    t.lane = lane;
  }

  return { tracks: sorted, laneCount: laneEnds.length };
}
