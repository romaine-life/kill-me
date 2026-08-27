# 0001: Adopt the Synergy 16 program architecture

- Status: Accepted
- Date: 2026-08-21
- Deciders: Nelson

## Context

Synergy 12 combined unrelated functions on a Torso day, omitted several
peripheral movement categories, and addressed days by mutable position. Nelson
works approximately twelve-hour days and consistently completes one to three
exercises per session. Long sessions and optional accessories are therefore
unreliable: work appended to another day is the first work omitted.

The program's goal is daily activity, joint awareness, and broad coverage rather
than maximizing hypertrophy or any single lift. A longer cycle with deliberately
short days is more sustainable than a conventional weekly split for this use
case.

## Decision

Adopt Synergy 16 as a daily, coverage-first cycle:

- Keep each day short, fixed, and conceptually coherent.
- Alternate demanding compound work with isolation, mobility, and recovery work.
- Place the three systemically demanding compound days at Days 1, 6, and 12.
- Split the former Torso day into Transverse, Back, and Hips responsibilities.
- Add dedicated Knee and Neck days and place ankle work with Calves.
- Place Pecs Mobility immediately before Compound Push and Hips immediately
  before the cycle returns to Compound Legs.
- Identify a day permanently by slug; treat its number only as its position in a
  particular model version.
- Publish cycle changes through forward-only, retry-safe migrations. Retire old
  workout models rather than rewriting historical logs.

## Rationale

More days mean shorter days, not more total work. A named slot makes peripheral
work visible and actionable, while alternating intensity preserves the daily
habit without making every day systemically demanding. Stable slugs and model
versions ensure that changing the present cycle cannot change what a historical
workout meant.

## Alternatives considered

### Conventional three- or four-day weekly split

Rejected because it concentrates too much work into sessions that do not fit the
available time and makes peripheral work optional.

### Keep Synergy 12 and lengthen existing days

Rejected because Torso already mixed unrelated movements and longer exercise
lists are not completed consistently.

### Add a hip-hinge day

Deferred. A deadlift, Romanian deadlift, or good-morning day would be the most
demanding addition and the most likely session to be skipped. The missing hinge
pattern remains a known gap rather than being hidden inside another day.

### Continue identifying days by number

Rejected because reordering the cycle silently rebound exercises and historical
records to different days.

## Consequences

- The cycle is longer than a calendar week and is not intended to optimize
  training frequency for a single adaptation.
- Current-state rationale belongs in `CLAUDE.md`; historical rationale belongs
  in this directory.
- Exercise and log documents use permanent day slugs.
- Historical models and presentation mappings for retired slugs must remain
  readable.
- Any future cycle change requires a new workout-model version and migration.

## Safety constraints

Both shoulders have old, healed injuries with residual limitations. Pecs
Mobility must remain light and must not contain dips or heavy pressing. Compound
Push follows it as the dedicated heavy chest session.

## Revisit when

- Short sessions are routinely skipped despite their size.
- Recovery data shows that the compound-day spacing is insufficient.
- Available time changes enough to make a hip-hinge day sustainable.
- A movement category is repeatedly omitted because its day is incoherent or
  overloaded.

## Evidence and references

- [ACSM 2026 resistance-training position stand](https://pubmed.ncbi.nlm.nih.gov/41843416/)

## Related work

- [PR #79: Expand the cycle to 16 days and identify days by slug](https://github.com/romaine-life/kill-me/pull/79)
- [Original design conversation](https://claude.ai/code/session_011s6dYuiZLzHpccJwwRhAoh)
- `backend/migrations/001-workout-model.js`
- `backend/migrations/002-synergy-16.js`
