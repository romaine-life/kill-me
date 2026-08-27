# 0002: Add a dedicated vertical-press day

- Status: Accepted
- Date: 2026-08-26
- Deciders: Nelson

## Context

Compound Push is functionally a chest-weight day. Nelson deliberately spends the
session's physical and mental effort on challenging pec work and does not find a
second maximal-focus press productive afterward. The existing Shoulder Press
entry on Compound Push is consequently unlikely to be performed with useful
attention.

The rest of the cycle already covers the anterior deltoids through chest
pressing, the lateral and posterior deltoids through raises and pulling, the
triceps directly, and the rotator cuff directly. A shoulder press therefore does
not fill a missing-muscle hole comparable to the pectoralis major. Its distinct
value is the integrated vertical-push pattern: loaded humeral elevation,
scapular upward rotation, elbow extension, and trunk stabilization.

For a desk-based lifestyle and a program whose purpose is varied stimulus and
atrophy prevention, preserving that force direction is useful even though
maximizing the lift is not an independent program goal.

## Decision

Advance the active program to Synergy 17:

- Keep Day 12 Compound Push chest-focused and remove Shoulder Press from it.
- Make Day 14 `Deltoid + Shoulder Prep`, a genuinely low-fatigue primer with
  reverse cable flyes, side cable raises, and rotator-cuff work.
- Remove the two direct front-raise entries from Day 14. Chest pressing already
  loads the anterior deltoids, the new press day loads them directly, and hard
  front-raise work would compromise the primer's purpose.
- Insert Day 15 `Shoulder Press`, containing one primary exercise: Dumbbell +
  Cable Shoulder Press.
- Use three controlled working sets in an 8-15 repetition range. Challenge the
  sets while normally retaining one or two technically sound repetitions rather
  than testing a one-repetition maximum or grinding through altered mechanics.
- Perform movement-specific ramp-up sets during the press session. The preceding
  primer day does not replace an acute warm-up.
- Shift Grip and Hips to Days 16 and 17 without changing their permanent slugs.

## Rationale

A separate day fits the program's established rule that adding a short day is
cheaper and more reliable than appending work to an exhausting session. It lets
the vertical press receive fresh attention without pretending the movement
trains a large, otherwise neglected anatomical unit. The one-exercise day adds a
distinct force direction and coordination demand while keeping total work small.

The absolute dumbbell load does not determine whether an effort is maximal for
the person performing it. The program therefore treats the press as challenging
working practice, not as a safer one-repetition maximum merely because the
number on the dumbbell is modest.

## Alternatives considered

### Keep Shoulder Press on Compound Push

Rejected because chest work consumes the energy and attention Nelson wants to
devote to the lift. In practice, work appended there is likely to be omitted or
performed poorly.

### Perform a hard press on the existing Deltoid day

Rejected because that would combine a preparation/shoulder-care session with a
fatiguing compound effort and would make the day's intent ambiguous.

### Omit vertical pressing entirely

Anatomically acceptable, because the involved muscles are otherwise covered,
but rejected because it leaves loaded vertical pushing as the one upper-body
force direction the program does not directly practice.

### Create a true maximal-strength shoulder day

Rejected. Heavy singles and repeated failure are unnecessary for the wellness
and coverage goal and add fatigue without unique muscular coverage.

## Consequences

- The cycle becomes Synergy 17.
- Day 15 is a focused compound movement but is not classified with the three
  systemically taxing compound days.
- Day 14 must remain easy enough that it improves readiness rather than creating
  soreness or fatigue for Day 15.
- The press will improve slowly at once per cycle; rapid overhead-strength
  development is explicitly not the goal.
- The exercise records dumbbell load and cable tension separately because they
  are independent resistance sources and should not be reported as a fake total.

## Safety constraints

- Use pain-free range and stop for sharp pain, pinching, sudden weakness, or
  increasing left/right asymmetry.
- Stop a working set when another repetition would materially change the press
  path or require uncontrolled torso compensation.
- Preserve same-session ramp-up sets even after completing Day 14.
- Day 14 exercises stay well short of failure.

## Revisit when

- Shoulder symptoms increase during or after pressing.
- Day 14 produces fatigue that degrades Day 15.
- The new day is repeatedly skipped or adds no perceived value after several
  cycles.
- Recovery records show interference with chest, triceps, grip, or the return to
  Compound Legs.
- Overhead strength becomes a primary performance goal, which would require a
  different frequency and loading design.

## Evidence and references

- [ACSM 2026 resistance-training position stand](https://pubmed.ncbi.nlm.nih.gov/41843416/)
- [Task specificity of dynamic resistance training](https://pubmed.ncbi.nlm.nih.gov/40314751/)
- [Higher- and lower-load resistance training adaptations](https://pubmed.ncbi.nlm.nih.gov/33874848/)
- [Failure versus non-failure training](https://pubmed.ncbi.nlm.nih.gov/33497853/)
- [Shoulder press and deltoid activation](https://pmc.ncbi.nlm.nih.gov/articles/PMC7706677/)

## Related work

- Supersedes the Shoulder Press placement established by
  `backend/migrations/002-synergy-16.js`.
- Implemented by `backend/migrations/004-synergy-17-shoulder-press.js`.
