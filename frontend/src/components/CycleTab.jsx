// Displays the full Synergy cycle overview — philosophy, day-by-day breakdown,
// recovery sequencing rationale, and CNS-aware compound day highlighting.
//
// The day list and cycle length come from the active workout model; only the
// compound-day set and the recovery notes are curated here.
//
// Both are keyed by day slug rather than number, so reordering the cycle moves the
// notes with their days instead of leaving them pointing at whoever moved in.

import { getDays, getDayInfo, getTotalDays } from '../utils/dayConfig';

const COMPOUND_DAYS = new Set(['compound-legs', 'compound-pulls', 'compound-push']);

const RECOVERY_NOTES = {
  'compound-legs': 'Starts the cycle — systemic leg strength sets the recovery baseline',
  knee: 'Tendon work is safe here because Day 1 squat volume has cleared. Defined by intent — slow eccentrics and holds, not a second leg day',
  back: 'The only loaded spinal extension, placed 8 days clear of Day 1 to spare the lower back for squats',
  'pecs-mobility': 'Primes the shoulder capsule for heavy pressing the next day — light work only',
  'compound-push': 'Dips and heavy pressing belong here, never on the mobility day before it',
  grip: 'Sits 8 days clear of Pulls and Bicep so forearm loading never stacks',
  hips: 'Primes the hips the day before Day 1 squats, mirroring how Pecs Mobility primes Push',
};

export function CycleTab({ currentDay }) {
  const days = getDays();
  const TOTAL_DAYS = getTotalDays();

  // The shoulder-safety callout names two specific days, so it reads them off the
  // model instead of hardcoding numbers that go stale the moment the cycle moves.
  const mobilityDay = getDayInfo('pecs-mobility');
  const pushDay = getDayInfo('compound-push');

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-5xl font-black text-cyan-400 uppercase tracking-wide">
          The Cycle
        </h2>
        <p className="text-slate-400 mt-2 text-lg">
          Synergy {TOTAL_DAYS} — a custom {TOTAL_DAYS}-day training cycle
        </p>
      </div>

      {/* Philosophy */}
      <div className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
          Philosophy
        </h3>
        <div className="space-y-3">
          <Principle
            number={1}
            title="Daily activity over rest"
            text="The cycle alternates intensity so every day has something to do. Grip, calves, and mobility days are deliberately low-impact, keeping the habit of daily training without taxing recovery."
          />
          <Principle
            number={2}
            title="Wellness over hypertrophy"
            text="The goal is muscle-mind connection and joint health, not progressive overload. Controlled movement and avoiding excessive bulk."
          />
          <Principle
            number={3}
            title="CNS-aware sequencing"
            text="Only three days (1, 6, 12) are systemically taxing compound lifts. They are evenly spaced with isolation and recovery work between them to avoid stacking central nervous system fatigue."
          />
          <Principle
            number={4}
            title="Coverage over optimization"
            text="The cycle exists to prevent atrophy, not to optimize any one adaptation. Its job is making sure nothing gets left out — every day is a short, fixed list requiring zero decisions."
          />
        </div>
      </div>

      {/* Day-by-day breakdown */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
          {TOTAL_DAYS}-Day Breakdown
        </h3>
        <div className="space-y-2">
          {days.map((day) => {
            const isCompound = COMPOUND_DAYS.has(day.slug);
            const isCurrent = day.slug === currentDay;
            const recoveryNote = RECOVERY_NOTES[day.slug];

            return (
              <div
                key={day.slug}
                className={`rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? 'bg-green-500/10 border-green-500/50 ring-1 ring-green-500/30'
                    : isCompound
                      ? 'bg-cyan-500/10 border-cyan-500/40'
                      : 'bg-slate-800/30 border-slate-700/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Day number */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg ${
                      isCurrent
                        ? 'bg-green-500/30 text-green-300'
                        : isCompound
                          ? 'bg-cyan-500/30 text-cyan-300'
                          : 'bg-slate-700/60 text-slate-400'
                    }`}
                  >
                    {day.number}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100">{day.name}</span>
                      {isCurrent && (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                          Next
                        </span>
                      )}
                      {isCompound && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                          Compound
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{day.focus}</p>
                    <p className="text-sm text-slate-500 mt-1">{day.description}</p>

                    {/* Safety note */}
                    {day.safetyNotes && (
                      <div className="mt-2 bg-amber-900/20 border border-amber-500/30 rounded-lg px-3 py-2">
                        <p className="text-amber-300 text-xs font-medium">{day.safetyNotes}</p>
                      </div>
                    )}

                    {/* Recovery sequencing note */}
                    {recoveryNote && (
                      <p className="text-xs text-cyan-400/70 mt-2 italic">
                        {recoveryNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shoulder Safety Callout */}
      {mobilityDay && pushDay && (
        <div className="bg-amber-900/20 border-2 border-amber-500/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-amber-300 mb-2">
            Day {mobilityDay.number} Shoulder Safety
          </h3>
          <p className="text-amber-200/80 text-sm leading-relaxed">
            Historical shoulder injuries (both shoulders, healed but with underlying limitations).
            Day {mobilityDay.number} is strictly mobility-focused — no dips, no heavy pressing.
            Light flys, holds, and stretches only. Dips are permitted on Day {pushDay.number}{' '}
            (assisted machine at -90 lbs), never on Day {mobilityDay.number}.
          </p>
        </div>
      )}
    </div>
  );
}

function Principle({ number, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="text-slate-200 font-semibold">{title}</p>
        <p className="text-slate-400 text-sm mt-0.5">{text}</p>
      </div>
    </div>
  );
}
