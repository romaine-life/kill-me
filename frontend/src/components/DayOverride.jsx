// Admin-only control for manually moving the cycle pointer to a different day.
//
// This used to sit alongside buttons that seeded and migrated the database by hand.
// Those are gone: schema and data changes are migrations now, they ship with the
// code, and they run at deploy. Choosing which day you are on is the only thing here
// that was ever a real decision rather than a missing mechanism.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getDays } from '../utils/dayConfig';
import { dayColor } from '../utils/dayDesign';

export function DayOverride({ currentDay, onDayChange }) {
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState(currentDay);
  const days = getDays();

  const handleSelect = (event) => {
    const daySlug = event.target.value;
    setSelected(daySlug);
    onDayChange(daySlug);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-cyan-400 mb-2">Day Override</h2>
        <p className="text-slate-400 mb-4">
          Manually move the pointer to a different day of the cycle
        </p>

        <div className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
          <div className="space-y-4">
            <button
              onClick={() => setEnabled(!enabled)}
              className={`w-full py-3 px-6 rounded-lg font-bold uppercase tracking-wide transition-all ${
                enabled
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-slate-700/60 hover:bg-slate-600/60 text-slate-300'
              }`}
            >
              {enabled ? '🔓 Override Active' : '🔒 Enable Day Override'}
            </button>

            <div className="relative">
              <select
                value={selected ?? ''}
                onChange={handleSelect}
                disabled={!enabled}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all appearance-none cursor-pointer ${
                  enabled
                    ? 'bg-slate-700 border-2 border-cyan-500/50 text-slate-200 hover:border-cyan-400 focus:outline-none focus:border-cyan-400'
                    : 'bg-slate-800/50 border border-slate-700/30 text-slate-600 cursor-not-allowed'
                }`}
                style={{ paddingRight: '2.5rem' }}
              >
                {days.map((day) => (
                  <option key={day.slug} value={day.slug}>
                    Day {day.number}: {day.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg
                  className={`w-5 h-5 ${enabled ? 'text-cyan-400' : 'text-slate-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {enabled && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 text-center"
              >
                <p className="text-amber-300 text-sm font-medium">
                  ⚠️ Manual day override is active
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-black text-cyan-400 mb-2">Cycle</h2>
        <p className="text-slate-400 mb-4">
          The active model, as the database has it
        </p>
        <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
          <ul className="space-y-2 text-sm">
            {days.map((day) => (
              <li key={day.slug} className="flex items-center gap-3">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: dayColor(day.slug) }}
                />
                <span className="text-slate-500 w-8 shrink-0">{day.number}</span>
                <span className="text-slate-200 font-medium">{day.name}</span>
                <code className="text-slate-500 text-xs">{day.slug}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
