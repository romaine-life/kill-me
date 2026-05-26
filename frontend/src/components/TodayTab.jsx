// Workout view — detailed breakdown of a single day in the 12-day cycle.
// Defaults to the current day but allows selecting any day via the day strip.
//
// Shows: day info card (with compound/today badges), exercise list with targets,
// safety notes, recovery sequencing rationale, and muscle groups.
// Admin users also get quick/detailed logging modes below the exercise list.
//
// Fetches workout day definitions and exercises from the backend.

import { useState, useEffect } from 'react';
import { todayLocal } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataSource } from '../api/snapshotContext.jsx';
import { apiFetch } from '../api/client.js';
import { DAY_CONFIG } from '../utils/dayConfig.js';
import { colors } from '../colors.js';

const COMPOUND_DAYS = new Set([1, 5, 9]);

// Get the default variation for an exercise, falling back to the first one.
// Also handles pre-migration exercises that have flat targetWeight/Reps/Sets.
function getDefaultVariation(exercise) {
  const vars = exercise.variations;
  if (!vars || !Array.isArray(vars) || vars.length === 0) {
    return {
      name: 'Standard',
      targetWeight: exercise.targetWeight,
      targetReps: exercise.targetReps,
      targetSets: exercise.targetSets,
    };
  }
  return vars.find(v => v.default) || vars[0];
}

const RECOVERY_NOTES = {
  1: 'Starts the cycle — systemic leg strength sets the recovery baseline',
  3: 'Hamstring isolation is safe here because Day 1 squat volume has cleared',
  7: 'Placed to save the lower back for Day 1 when the cycle wraps around',
  8: 'Primes the shoulder capsule for Day 9 heavy pressing — light work only',
  9: 'Dips and heavy pressing belong here, never on Day 8',
  12: 'Ends the cycle at near-zero CNS load before restarting',
};

export function TodayTab({ currentDay, isAdmin, onNavigateExercises }) {
  const [selectedDay, setSelectedDay] = useState(currentDay);
  const [mode, setMode] = useState('quick');
  const [workoutDay, setWorkoutDay] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [completedExercises, setCompletedExercises] = useState([]);
  const { fetchWorkoutDay, fetchExercises, isReady } = useDataSource();

  // Sync selectedDay if currentDay changes externally (e.g. after logging advances it)
  useEffect(() => {
    setSelectedDay(currentDay);
  }, [currentDay]);

  // Fetch workout day info and exercises when selectedDay changes
  useEffect(() => {
    if (!isReady) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const dayData = await fetchWorkoutDay(selectedDay);
        setWorkoutDay(dayData.workoutDay);

        const exercisesData = await fetchExercises(selectedDay);
        setExercises(exercisesData.exercises || []);

        setCompletedExercises(
          (exercisesData.exercises || []).map(ex => {
            const dv = getDefaultVariation(ex);
            return {
              name: ex.name,
              variation: dv.name,
              completed: false,
              weight: dv.targetWeight || '',
              reps: dv.targetReps || '',
              sets: dv.targetSets || '',
            };
          })
        );
      } catch (error) {
        console.error('Error fetching workout data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedDay) {
      fetchData();
      setSuccess(false);
    }
  }, [selectedDay, isReady]);

  const handleQuickLog = async () => {
    setLogging(true);
    try {
      await apiFetch('/api/log-workout', {
        method: 'POST',
        body: JSON.stringify({
          dayNumber: selectedDay,
          dayName: workoutDay?.name || `Day ${selectedDay}`,
          mode: 'quick',
          date: todayLocal()
        })
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error logging workout:', error);
    } finally {
      setLogging(false);
    }
  };

  const handleDetailedLog = async () => {
    const completed = completedExercises.filter(ex => ex.completed);
    if (completed.length === 0) {
      alert('Please complete at least one exercise');
      return;
    }

    setLogging(true);
    try {
      await apiFetch('/api/log-workout', {
        method: 'POST',
        body: JSON.stringify({
          dayNumber: selectedDay,
          dayName: workoutDay?.name || `Day ${selectedDay}`,
          mode: 'detailed',
          date: todayLocal(),
          exercises: completed
        })
      });
      setSuccess(true);
      setCompletedExercises(
        exercises.map(ex => {
          const dv = getDefaultVariation(ex);
          return {
            name: ex.name,
            variation: dv.name,
            completed: false,
            weight: dv.targetWeight || '',
            reps: dv.targetReps || '',
            sets: dv.targetSets || '',
          };
        })
      );
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error logging workout:', error);
    } finally {
      setLogging(false);
    }
  };

  const updateExercise = (index, field, value) => {
    setCompletedExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const isToday = selectedDay === currentDay;
  const isCompound = COMPOUND_DAYS.has(selectedDay);
  const dayConfig = DAY_CONFIG[selectedDay];
  const recoveryNote = RECOVERY_NOTES[selectedDay];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-5xl font-black text-cyan-400 uppercase tracking-wide">
          Workout
        </h2>
      </div>

      {/* Day selector strip */}
      <div style={styles.dayStrip}>
        {Object.entries(DAY_CONFIG).map(([dayNum, day]) => {
          const num = parseInt(dayNum);
          const selected = num === selectedDay;
          const isCurrent = num === currentDay;

          return (
            <button
              key={num}
              onClick={() => setSelectedDay(num)}
              style={{
                ...styles.dayPill,
                ...(selected ? styles.dayPillSelected : {}),
                ...(isCurrent && !selected ? styles.dayPillCurrent : {}),
              }}
              title={day.name}
            >
              <span style={styles.dayPillNumber}>{num}</span>
              {isCurrent && (
                <span style={styles.todayDot} />
              )}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-center">
            <p className="text-slate-400">Loading workout...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Success Message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-green-900/30 border-2 border-green-500/50 rounded-xl p-4 text-center"
              >
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-400 font-bold text-lg">Workout Logged Successfully!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Day Info Card */}
          <div
            className="backdrop-blur-md rounded-2xl border-2 p-8 shadow-2xl"
            style={{
              background: isToday
                ? 'linear-gradient(135deg, rgba(90, 142, 112, 0.2), rgba(34, 211, 238, 0.15))'
                : isCompound
                  ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(59, 130, 246, 0.15))'
                  : `linear-gradient(135deg, ${colors.bg.surface}, ${colors.bg.overlay})`,
              borderColor: isToday
                ? 'rgba(90, 142, 112, 0.5)'
                : isCompound
                  ? 'rgba(34, 211, 238, 0.4)'
                  : colors.border.strong,
              boxShadow: isToday
                ? '0 25px 50px rgba(90, 142, 112, 0.15)'
                : isCompound
                  ? '0 25px 50px rgba(34, 211, 238, 0.1)'
                  : 'none',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-6xl font-black text-white">
                    Day {selectedDay}
                  </span>
                  {isToday && (
                    <span className="text-sm bg-green-500/20 text-green-300 px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                      Today
                    </span>
                  )}
                  {isCompound && (
                    <span className="text-sm bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                      Compound
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-bold text-cyan-300 mb-2">
                  {workoutDay?.name}
                </h3>
                <p className="text-slate-300 text-lg">
                  {workoutDay?.focus}
                </p>
              </div>
            </div>

            {/* Description */}
            {dayConfig?.description && (
              <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                {dayConfig.description}
              </p>
            )}

            {/* Warning */}
            {workoutDay?.warning && (
              <div className="mt-4 bg-amber-900/30 border-2 border-amber-500/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <p className="text-amber-400 font-bold">Important:</p>
                    <p className="text-amber-200">{workoutDay.warning}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Safety notes */}
            {dayConfig?.safetyNotes && !workoutDay?.warning && (
              <div className="mt-4 bg-amber-900/20 border border-amber-500/30 rounded-lg px-4 py-3">
                <p className="text-amber-300 text-sm font-medium">{dayConfig.safetyNotes}</p>
              </div>
            )}

            {/* Recovery sequencing note */}
            {recoveryNote && (
              <p className="text-xs text-cyan-400/70 mt-3 italic">
                {recoveryNote}
              </p>
            )}

            {/* Muscle Groups */}
            {workoutDay?.primaryMuscleGroups && (
              <div className="mt-4 flex flex-wrap gap-2">
                {workoutDay.primaryMuscleGroups.map((muscle, idx) => (
                  <span
                    key={idx}
                    className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Exercise List (always visible) */}
          {exercises.length > 0 && (
            <div className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wide mb-4">
                Exercises
              </h3>
              <div className="space-y-2">
                {exercises.map((exercise, idx) => {
                  const defaultVar = getDefaultVariation(exercise);
                  const vars = exercise.variations || [];
                  const hasMultipleVars = vars.length > 1;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-700/30 rounded-lg px-4 py-3 border border-slate-600/30"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <button
                            onClick={() => onNavigateExercises?.(selectedDay, exercise.name)}
                            className="font-semibold text-slate-100 hover:text-cyan-400 transition-colors cursor-pointer bg-transparent border-none p-0 text-left"
                          >
                            {exercise.name}
                          </button>
                          {exercise.equipment && (
                            <span className="text-slate-500 text-sm ml-2">({exercise.equipment})</span>
                          )}
                          {exercise.notes && (
                            <p className="text-slate-500 text-xs mt-0.5">{exercise.notes}</p>
                          )}
                        </div>
                        <div className="text-sm text-slate-400 flex gap-3 flex-shrink-0">
                          {defaultVar.targetWeight && (
                            <span>{defaultVar.targetWeight} lbs</span>
                          )}
                          {defaultVar.targetReps && (
                            <span>{defaultVar.targetReps} reps</span>
                          )}
                          {defaultVar.targetSets && (
                            <span>{defaultVar.targetSets} sets</span>
                          )}
                        </div>
                      </div>
                      {hasMultipleVars && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {vars.map((v, vi) => (
                            <span
                              key={vi}
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                v.default
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  : 'bg-slate-700/50 text-slate-400 border-slate-600/40'
                              }`}
                            >
                              {v.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logging section — admin only */}
          {isAdmin && (
            <>
              {/* Mode Toggle */}
              <div className="flex gap-3 bg-slate-800/30 backdrop-blur-md rounded-xl p-2">
                <button
                  onClick={() => setMode('quick')}
                  className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
                    mode === 'quick'
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Quick Log
                </button>
                <button
                  onClick={() => setMode('detailed')}
                  className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
                    mode === 'detailed'
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Detailed Log
                </button>
              </div>

              {/* Quick Mode */}
              {mode === 'quick' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-800/30 backdrop-blur-md rounded-2xl border border-slate-700/50 p-8 text-center"
                >
                  <h3 className="text-2xl font-bold text-slate-100 mb-3">
                    Complete Day {selectedDay}
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Mark this workout as complete
                  </p>
                  <button
                    onClick={handleQuickLog}
                    disabled={logging}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-12 py-4 rounded-xl font-black text-xl uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {logging ? 'Logging...' : 'Complete Workout'}
                  </button>
                </motion.div>
              )}

              {/* Detailed Mode */}
              {mode === 'detailed' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
                    <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wide mb-2">
                      Exercise Checklist
                    </h3>
                    <p className="text-slate-400 mb-6 text-sm">
                      Check off exercises as you complete them and log your actual weights/reps
                    </p>

                    {exercises.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No exercises defined for this day yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {completedExercises.map((exercise, idx) => (
                          <div
                            key={idx}
                            className={`bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border transition-all ${
                              exercise.completed
                                ? 'border-cyan-500/50 bg-cyan-500/10'
                                : 'border-slate-600/40'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <input
                                type="checkbox"
                                checked={exercise.completed}
                                onChange={(e) => updateExercise(idx, 'completed', e.target.checked)}
                                className="mt-1 w-6 h-6 rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                              />
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-100 mb-1">
                                  {exercise.name}
                                  {exercise.variation && exercise.variation !== 'Standard' && (
                                    <span className="text-cyan-400 text-sm font-normal ml-2">({exercise.variation})</span>
                                  )}
                                </h4>
                                {(() => {
                                  const exDef = exercises[idx];
                                  const vars = exDef?.variations || [];
                                  const hasMultipleVars = vars.length > 1;
                                  const selectedVar = vars.find(v => v.name === exercise.variation) || getDefaultVariation(exDef || {});
                                  return (
                                    <>
                                      {hasMultipleVars && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                          {vars.map((v, vi) => (
                                            <button
                                              key={vi}
                                              type="button"
                                              onClick={() => {
                                                updateExercise(idx, 'variation', v.name);
                                                updateExercise(idx, 'weight', v.targetWeight || '');
                                                updateExercise(idx, 'reps', v.targetReps || '');
                                                updateExercise(idx, 'sets', v.targetSets || '');
                                              }}
                                              className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                                                exercise.variation === v.name
                                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                                  : 'bg-slate-700/50 text-slate-400 border-slate-600/40 hover:border-slate-500'
                                              }`}
                                            >
                                              {v.name}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      <div className="text-sm text-slate-400 mb-3">
                                        {selectedVar.targetWeight && (
                                          <span>Target: {selectedVar.targetWeight} lbs</span>
                                        )}
                                        {selectedVar.targetReps && (
                                          <span> x {selectedVar.targetReps} reps</span>
                                        )}
                                        {selectedVar.targetSets && (
                                          <span> x {selectedVar.targetSets} sets</span>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}

                                {exercise.completed && (
                                  <div className="grid grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      placeholder="Weight (lbs)"
                                      value={exercise.weight}
                                      onChange={(e) => updateExercise(idx, 'weight', e.target.value)}
                                      className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Reps"
                                      value={exercise.reps}
                                      onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                                      className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Sets"
                                      value={exercise.sets}
                                      onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
                                      className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleDetailedLog}
                    disabled={logging || completedExercises.every(ex => !ex.completed)}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-black text-xl uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {logging ? 'Saving...' : 'Save Workout'}
                  </button>
                </motion.div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles (inline, matching app pattern)
// ---------------------------------------------------------------------------

const styles = {
  dayStrip: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayPill: {
    width: 44,
    height: 44,
    borderRadius: 10,
    border: `1px solid ${colors.border.subtle}`,
    backgroundColor: colors.bg.surface,
    color: colors.text.secondary,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  dayPillSelected: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: colors.accent.cyan,
    color: colors.accent.cyan,
    boxShadow: `0 0 12px rgba(34, 211, 238, 0.2)`,
  },
  dayPillCurrent: {
    borderColor: 'rgba(90, 142, 112, 0.5)',
  },
  dayPillNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: colors.accent.green,
  },
};
