// Log tab — single form for both creating new workouts and editing existing ones.
// Also handles cardio session logging (treadmill with templates, bike with manual entry).
//
// When viewWorkout is null (create mode): form starts with defaults, submits via
// POST, no delete option. When viewWorkout is set (edit mode): form pre-fills
// with that workout's data, submits via PUT, delete button appears.
//
// The form looks and feels identical either way — you're always "editing a workout",
// it just happens to be new or existing. Backing out discards changes.

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getDayInfo, getDays } from '../utils/dayConfig';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { todayLocal, nowLocalTime } from '../utils/dateUtils';
import { useDataSource } from '../api/snapshotContext.jsx';
import { getTotalDuration } from '../utils/cardioTemplates.js';
import { CARDIO_CONFIG } from '../utils/cardioConfig.js';

const buildWeightEntries = (variation = {}, savedWeights = []) => {
  const savedByKey = new Map(
    Array.isArray(savedWeights)
      ? savedWeights.map((entry) => [entry.key, entry])
      : Object.entries(savedWeights || {}).map(([key, value]) => [key, { key, value }])
  );

  return (variation.weightFields || []).map((field) => {
    const saved = savedByKey.get(field.key);
    return {
      key: field.key,
      label: saved?.label ?? field.label,
      value: saved?.value ?? field.targetWeight ?? '',
    };
  });
};

export function LogTab({
  initialDay = null,
  initialDate = null,
  onSuccess,
  onViewWorkout,
  onViewCardio,
  onWorkoutChanged,
  onCardioChanged,
  onLogSoreness,
  viewWorkout = null,
  viewCardio = null,
  currentDay = null,
}) {
  // Top-level toggle: 'weight' or 'cardio'
  const [logType, setLogType] = useState(viewCardio ? 'cardio' : 'weight');
  const [logStep, setLogStep] = useState(viewWorkout || viewCardio ? 'form' : 'picker'); // 'picker' | 'form'

  const isEditMode = !!viewWorkout;

  // --- Form state (shared for create and edit) ---
  const [selectedDay, setSelectedDay] = useState(currentDay);
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [selectedTime, setSelectedTime] = useState(nowLocalTime());
  const [mode, setMode] = useState('quick');
  const [exercises, setExercises] = useState([]);
  const [completedExercises, setCompletedExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [useNextWorkout, setUseNextWorkout] = useState(true);
  // The picker lists every day in the cycle (see the cycle dial — the list has to
  // line up with it), so it starts on the current day rather than an arbitrary one.
  const [dropdownDay, setDropdownDay] = useState(currentDay);

  // --- Delete state (edit mode only) ---
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);


  // --- Cardio form state ---
  const [cardioActivity, setCardioActivity] = useState('treadmill');
  const [cardioDate, setCardioDate] = useState(todayLocal());
  const [cardioTime, setCardioTime] = useState(nowLocalTime());
  // Treadmill templates come entirely from the data source (Cosmos via the live
  // API, or the SQLite snapshot for anonymous visitors) — no hardcoded list.
  const [templates, setTemplates] = useState([]);
  const [cardioTemplateId, setCardioTemplateId] = useState('');
  const [cardioNotes, setCardioNotes] = useState('');
  const [cardioSubmitting, setCardioSubmitting] = useState(false);
  const [cardioDeleting, setCardioDeleting] = useState(false);
  const [cardioConfirmDelete, setCardioConfirmDelete] = useState(false);
  const [cardioCooldown, setCardioCooldown] = useState(false);
  const [cardioToast, setCardioToast] = useState(null);
  const cooldownTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  // Bike manual fields
  const [bikeDuration, setBikeDuration] = useState('');
  const [bikeDistance, setBikeDistance] = useState('');
  const [bikeAvgSpeed, setBikeAvgSpeed] = useState('');
  const [bikeAvgHR, setBikeAvgHR] = useState('');
  const [bikeCalories, setBikeCalories] = useState('');

  const isCardioEditMode = !!viewCardio;

  const dateInputRef = useRef(null);
  const cardioDateRef = useRef(null);
  const { fetchCardioTemplates, isReady } = useDataSource();

  const dayInfo = getDayInfo(selectedDay);

  // ─────────────────────────────────────────────
  // Populate form from viewWorkout (edit) or defaults (create)
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (viewWorkout) {
      // Edit mode: populate from existing workout
      setSelectedDay(viewWorkout.daySlug);
      setSelectedDate(viewWorkout.date);
      setSelectedTime(viewWorkout.time || '');
      setMode(viewWorkout.mode || 'quick');
      setConfirmDelete(false);

      setDropdownDay(viewWorkout.daySlug);
      setUseNextWorkout(viewWorkout.daySlug === currentDay);
    } else {
      // Create mode: populate from initialDay/initialDate or defaults
      if (initialDay) {
        setSelectedDay(initialDay);
        setDropdownDay(initialDay);
        setUseNextWorkout(initialDay === currentDay);
      } else {
        setSelectedDay(currentDay);
        setDropdownDay(currentDay);
        setUseNextWorkout(true);
      }
      setSelectedDate(initialDate || todayLocal());
      setSelectedTime(nowLocalTime());
      setMode('quick');
      setConfirmDelete(false);
    }
  }, [viewWorkout, initialDay, initialDate, currentDay]);

  // Fetch exercise definitions when day changes, then overlay saved data if editing
  useEffect(() => {
    if (selectedDay) {
      fetchExercises();
    }
  }, [selectedDay, viewWorkout]);

  // Load treadmill templates from the data source (live API or snapshot).
  useEffect(() => {
    if (!isReady) return;
    fetchCardioTemplates()
      .then((data) => {
        const list = data?.templates || [];
        setTemplates(list);
        // In create mode, default to the first (lowest sortOrder) template,
        // keeping the current selection if it's still present.
        if (!viewCardio) {
          setCardioTemplateId((prev) =>
            list.some((t) => t.id === prev) ? prev : (list[0]?.id || '')
          );
        }
      })
      .catch((err) => {
        console.warn('Cardio template load failed:', err);
        setTemplates([]);
      });
  }, [isReady, viewCardio]);

  // Switch logType/step when viewCardio/viewWorkout changes. Edit mode jumps
  // straight to the form; create mode starts on the type picker.
  useEffect(() => {
    if (viewCardio) { setLogType('cardio'); setLogStep('form'); }
    else if (viewWorkout) { setLogType('weight'); setLogStep('form'); }
    else { setLogStep('picker'); }
  }, [viewCardio, viewWorkout]);

  // Populate cardio form from viewCardio (edit) or defaults (create)
  useEffect(() => {
    if (viewCardio) {
      setCardioActivity(viewCardio.activity || 'treadmill');
      setCardioDate(viewCardio.date || todayLocal());
      setCardioTime(viewCardio.time || '');
      setCardioNotes(viewCardio.notes || '');
      setCardioConfirmDelete(false);
      if (viewCardio.treadmill?.templateId) {
        setCardioTemplateId(viewCardio.treadmill.templateId);
      }
      if (viewCardio.bike) {
        setBikeDuration(viewCardio.durationMinutes || '');
        setBikeDistance(viewCardio.bike.distanceMiles || '');
        setBikeAvgSpeed(viewCardio.bike.avgSpeedMph || '');
        setBikeAvgHR(viewCardio.bike.avgHeartRate || '');
        setBikeCalories(viewCardio.bike.calories || '');
      }
    } else {
      setCardioDate(todayLocal());
      setCardioTime(nowLocalTime());
      setCardioNotes('');
      setCardioConfirmDelete(false);
      setBikeDuration('');
      setBikeDistance('');
      setBikeAvgSpeed('');
      setBikeAvgHR('');
      setBikeCalories('');
    }
  }, [viewCardio]);

  // Clean up cooldown/toast timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(cooldownTimerRef.current);
      clearTimeout(toastTimerRef.current);
    };
  }, []);


  // ─────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────

  // Get the default variation for an exercise (handles pre-migration flat fields)
  const getDefaultVariation = (ex) => {
    const vars = ex.variations;
    if (!vars || !Array.isArray(vars) || vars.length === 0) {
      return {
        name: 'Standard',
        targetWeight: ex.targetWeight,
        targetReps: ex.targetReps,
        targetSets: ex.targetSets,
      };
    }
    return vars.find(v => v.default) || vars[0];
  };

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/exercises/day/${selectedDay}`);
      const defs = data.exercises || [];
      setExercises(defs);

      // Build the checklist — if editing, overlay saved exercise data
      const savedExercises = viewWorkout?.exercises || [];
      const savedByName = Object.fromEntries(
        savedExercises.map(ex => [ex.name, ex])
      );

      const checklist = defs.map(ex => {
        const saved = savedByName[ex.name];
        const dv = getDefaultVariation(ex);
        if (saved) {
          delete savedByName[ex.name];
          // Use saved variation, or fall back to default
          const savedVarName = saved.variation || 'Standard';
          const vars = ex.variations || [];
          const matchedVar = vars.find(v => v.name === savedVarName) || dv;
          return {
            name: ex.name,
            variation: savedVarName,
            completed: true,
            weight: saved.weight ?? matchedVar.targetWeight ?? '',
            weights: buildWeightEntries(matchedVar, saved.weights),
            inclineDegrees: saved.inclineDegrees ?? matchedVar.targetInclineDegrees ?? '',
            reps: saved.reps ?? matchedVar.targetReps ?? '',
            sets: saved.sets ?? matchedVar.targetSets ?? '',
            cableSetting: saved.cableSetting ?? matchedVar.cableSetting ?? '',
          };
        }
        return {
          name: ex.name,
          variation: dv.name,
          completed: false,
          weight: dv.targetWeight ?? '',
          weights: buildWeightEntries(dv),
          inclineDegrees: dv.targetInclineDegrees ?? '',
          reps: dv.targetReps ?? '',
          sets: dv.targetSets ?? '',
          cableSetting: dv.cableSetting ?? '',
        };
      });

      // Append any saved exercises that didn't match a definition
      for (const ex of Object.values(savedByName)) {
        checklist.push({
          name: ex.name,
          variation: ex.variation || 'Standard',
          completed: true,
          weight: ex.weight ?? '',
          weights: ex.weights ?? [],
          inclineDegrees: ex.inclineDegrees ?? '',
          reps: ex.reps ?? '',
          sets: ex.sets ?? '',
          cableSetting: ex.cableSetting ?? '',
        });
      }

      setCompletedExercises(checklist);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Submit (create or update)
  // ─────────────────────────────────────────────

  const handleSubmit = async () => {
    const completed = completedExercises.filter(ex => ex.completed);

    if (mode === 'detailed' && completed.length === 0) {
      alert('Please complete at least one exercise');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        // PUT — update existing
        await apiFetch(`/api/logged-workouts/${viewWorkout.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            date: selectedDate,
            time: selectedTime || null,
            daySlug: selectedDay,
            mode,
            exercises: mode === 'detailed' ? completed : [],
          })
        });
        onWorkoutChanged?.();
      } else {
        // POST — create new
        const result = await apiFetch('/api/log-workout', {
          method: 'POST',
          body: JSON.stringify({
            daySlug: selectedDay,
            mode,
            date: selectedDate,
            time: selectedTime || null,
            ...(mode === 'detailed' ? { exercises: completed } : {}),
          })
        });
        onSuccess?.(result.advancedTo);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save workout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/logged-workouts/${viewWorkout.id}`, {
        method: 'DELETE'
      });
      onWorkoutChanged?.();
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout.');
    } finally {
      setDeleting(false);
    }
  };

  const updateExercise = (index, field, value) => {
    setCompletedExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateExerciseFields = (index, fields) => {
    setCompletedExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...fields };
      return updated;
    });
  };

  const updateExerciseWeight = (index, key, value) => {
    setCompletedExercises(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        weights: (updated[index].weights || []).map((entry) =>
          entry.key === key ? { ...entry, value } : entry
        ),
      };
      return updated;
    });
  };

  const switchToCreateMode = () => {
    onViewWorkout?.(null);
  };

  const switchToCardioCreateMode = () => {
    onViewCardio?.(null);
  };

  // ─────────────────────────────────────────────
  // Cardio submit (create or update)
  // ─────────────────────────────────────────────

  const handleCardioSubmit = async () => {
    setCardioSubmitting(true);
    try {
      const selectedTemplate = templates.find(t => t.id === cardioTemplateId);

      const body = {
        date: cardioDate,
        time: cardioTime || null,
        activity: cardioActivity,
        notes: cardioNotes || '',
      };

      if (cardioActivity === 'treadmill' && selectedTemplate) {
        body.durationMinutes = getTotalDuration(selectedTemplate.intervals);
        body.treadmill = {
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          intervals: selectedTemplate.intervals,
        };
      } else if (cardioActivity === 'bike') {
        body.durationMinutes = bikeDuration ? parseFloat(bikeDuration) : null;
        body.bike = {
          source: 'manual',
          distanceMiles: bikeDistance ? parseFloat(bikeDistance) : null,
          avgSpeedMph: bikeAvgSpeed ? parseFloat(bikeAvgSpeed) : null,
          avgHeartRate: bikeAvgHR ? parseInt(bikeAvgHR) : null,
          calories: bikeCalories ? parseInt(bikeCalories) : null,
        };
      }

      if (isCardioEditMode) {
        await apiFetch(`/api/cardio-sessions/${viewCardio.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        onCardioChanged?.();
      } else {
        await apiFetch('/api/cardio-sessions', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        onCardioChanged?.();
      }

      // Success: show toast and start cooldown
      const label = cardioActivity === 'treadmill' ? 'Treadmill session' : 'Bike ride';
      setCardioToast(`${label} logged`);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setCardioToast(null), 4000);

      setCardioCooldown(true);
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => setCardioCooldown(false), 10000);
    } catch (error) {
      console.error('Error saving cardio session:', error);
      alert('Failed to save cardio session. Please try again.');
    } finally {
      setCardioSubmitting(false);
    }
  };

  const handleCardioDelete = async () => {
    setCardioDeleting(true);
    try {
      await apiFetch(`/api/cardio-sessions/${viewCardio.id}`, {
        method: 'DELETE',
      });
      onCardioChanged?.();
    } catch (error) {
      console.error('Error deleting cardio session:', error);
      alert('Failed to delete cardio session.');
    } finally {
      setCardioDeleting(false);
    }
  };

  // ─────────────────────────────────────────────
  // Render — one form, always
  // ─────────────────────────────────────────────

  const selectedTemplate = templates.find(t => t.id === cardioTemplateId);

  return (
    <div className="max-w-2xl">
      {/* Type picker (create mode) */}
      {logStep === 'picker' && !viewWorkout && !viewCardio && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { setLogType('weight'); onViewCardio?.(null); setLogStep('form'); }}
            className="flex items-center justify-between px-6 py-6 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-cyan-500/60 hover:bg-slate-800/70 transition-all"
          >
            <span className="text-2xl font-black text-slate-100 uppercase tracking-wide">Strength</span>
            <ChevronRight className="text-slate-400" size={24} />
          </button>
          <button
            onClick={() => { setLogType('cardio'); onViewWorkout?.(null); setLogStep('form'); }}
            className="flex items-center justify-between px-6 py-6 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-emerald-500/60 hover:bg-slate-800/70 transition-all"
          >
            <span className="text-2xl font-black text-slate-100 uppercase tracking-wide">Cardio</span>
            <ChevronRight className="text-slate-400" size={24} />
          </button>
        </div>
      )}

      {/* Back to picker (create mode only) */}
      {logStep === 'form' && !viewWorkout && !viewCardio && (
        <button
          onClick={() => setLogStep('picker')}
          className="flex items-center gap-1.5 mb-4 text-slate-400 hover:text-slate-200 transition-colors font-bold uppercase tracking-wide text-sm"
        >
          <ChevronLeft size={18} /> Back
        </button>
      )}

      {logStep === 'form' && logType === 'weight' && (<>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-4xl font-black text-cyan-400 uppercase tracking-wide mb-2">
          {isEditMode ? 'Edit Workout' : 'Log Workout'}
        </h2>
        {isEditMode ? (
          <button
            onClick={switchToCreateMode}
            className="text-sm text-slate-500 hover:text-cyan-400 transition-colors"
          >
            ← Log New Workout
          </button>
        ) : (
          <p className="text-slate-400">Track your training session</p>
        )}
      </div>

      {/* Date & Time Picker */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
            Workout Date
          </label>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onClick={() => {
              try { dateInputRef.current?.showPicker(); } catch { /* showPicker is optional */ }
            }}
            max={todayLocal()}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all cursor-pointer"
          />
        </div>
        <div className="w-32">
          <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
            Time
          </label>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Workout to Log - Flipper Toggle */}
      <div>
        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
          Workout Day
        </label>

        <div className="flex items-center gap-4">
          {/* Flipper Toggle Switch */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                if (useNextWorkout) {
                  setUseNextWorkout(false);
                  setSelectedDay(dropdownDay);
                } else {
                  setSelectedDay(currentDay);
                  setUseNextWorkout(true);
                }
              }}
              className="relative w-16 h-32 bg-slate-800 border-2 border-slate-600 rounded-full p-1 transition-all hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <motion.div
                animate={{ y: useNextWorkout ? 0 : '100%' }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="absolute top-1 left-1 right-1 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/50"
              />

              <div className="absolute top-2 left-0 right-0 flex flex-col items-center justify-center pointer-events-none z-10 h-14">
                <motion.div
                  animate={{ scale: useNextWorkout ? 1 : 0.7, opacity: useNextWorkout ? 1 : 0.3 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className={`flex flex-col items-center transition-all ${useNextWorkout ? 'text-white' : 'text-slate-600'}`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                  </svg>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${useNextWorkout ? 'text-white drop-shadow-lg' : 'text-slate-600'}`}>
                    Next
                  </span>
                </motion.div>
              </div>

              <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center justify-center pointer-events-none z-10 h-14">
                <motion.div
                  animate={{ scale: !useNextWorkout ? 1 : 0.7, opacity: !useNextWorkout ? 1 : 0.3 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className={`flex flex-col items-center transition-all ${!useNextWorkout ? 'text-white' : 'text-slate-600'}`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                  </svg>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${!useNextWorkout ? 'text-white drop-shadow-lg' : 'text-slate-600'}`}>
                    Pick
                  </span>
                </motion.div>
              </div>
            </button>

            <span className="text-xs text-slate-400 font-medium">Flip</span>
          </div>

          {/* Flipper Container with Two Boxes */}
          <div className="flex-1 space-y-3">
            <div
              onClick={() => {
                if (!useNextWorkout) {
                  setUseNextWorkout(true);
                  setSelectedDay(currentDay);
                }
              }}
              className={`relative rounded-xl px-4 py-4 font-bold text-white transition-all border-2 ${
                useNextWorkout
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400 shadow-lg shadow-cyan-500/30 cursor-default'
                  : 'bg-slate-800/30 border-slate-600/50 text-slate-500 opacity-50 cursor-pointer hover:opacity-70 hover:border-slate-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wide">Use Next</span>
              </div>
              <div className="mt-2 text-lg font-black">
                {getDayInfo(currentDay)?.name || 'Today'}
              </div>
            </div>

            <div
              className={`relative rounded-xl transition-all border-2 ${
                !useNextWorkout
                  ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-500/50'
                  : 'bg-slate-800/20 border-slate-600/50 opacity-50'
              }`}
            >
              <select
                value={dropdownDay}
                onChange={(e) => {
                  const newDay = e.target.value;
                  setDropdownDay(newDay);
                  if (!useNextWorkout) {
                    setSelectedDay(newDay);
                  }
                }}
                onClick={() => {
                  if (useNextWorkout) {
                    setUseNextWorkout(false);
                    setSelectedDay(dropdownDay);
                  }
                }}
                className={`w-full backdrop-blur-md rounded-xl px-4 py-4 font-bold text-white focus:outline-none focus:ring-2 transition-all bg-transparent cursor-pointer ${
                  !useNextWorkout ? 'hover:border-cyan-400/70 focus:ring-cyan-500/50' : ''
                }`}
              >
                {getDays().map((day) => (
                  <option key={day.slug} value={day.slug} className="bg-slate-800 text-white font-bold">
                    Day {day.number} · {day.name}
                    {day.slug === currentDay ? ' (today)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Day Info */}
      <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-2xl font-bold text-cyan-300 mb-1">
              {dayInfo?.name}
            </h3>
            <p className="text-slate-400">{dayInfo?.focus}</p>
            {dayInfo?.description && (
              <p className="text-slate-500 text-sm mt-1">{dayInfo.description}</p>
            )}
          </div>
          <span className={`${dayInfo?.color} text-white text-sm font-bold px-3 py-1 rounded-full`}>
            Day {dayInfo?.number ?? '—'}
          </span>
        </div>

        {dayInfo?.safetyNotes && (
          <div className="mt-4 bg-amber-900/30 border-2 border-amber-500/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-2xl">⚠️</span>
              <p className="text-amber-200 text-sm font-medium">{dayInfo.safetyNotes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-3 bg-slate-800/30 backdrop-blur-md rounded-xl p-2 mb-6">
        <button
          onClick={() => setMode('quick')}
          className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
            mode === 'quick'
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚡ Quick Log
        </button>
        <button
          onClick={() => setMode('detailed')}
          className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
            mode === 'detailed'
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📋 Detailed Log
        </button>
      </div>

      {/* Quick Mode */}
      {mode === 'quick' && (
        <div className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-700/50 p-8 text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-2xl font-bold text-slate-100 mb-3">
            {isEditMode ? `Day ${dayInfo?.number ?? '—'}` : `Complete Day ${dayInfo?.number ?? '—'}`}
          </h3>
          <p className="text-slate-400 mb-6">
            {isEditMode
              ? 'Save this workout without detailed exercise tracking'
              : 'Mark this workout as complete without detailed tracking'}
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-black text-xl uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? '⏳ Saving...'
              : isEditMode ? '💾 Save Changes' : '✓ Complete Workout'}
          </button>
        </div>
      )}

      {/* Detailed Mode */}
      {mode === 'detailed' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2 animate-pulse">🏋️</div>
              <p className="text-slate-400">Loading exercises...</p>
            </div>
          ) : completedExercises.length === 0 ? (
            <div className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-700/50 p-8 text-center">
              <div className="text-5xl mb-3 opacity-50">📝</div>
              <p className="text-slate-400">No exercises defined for this day yet</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-xl font-bold text-slate-100 mb-4">
                  📋 Exercise Checklist
                </h3>
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
                                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                    {/* Labelled so the chips read as a control, not as tags. */}
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
                                      Variation
                                    </span>
                                    {vars.map((v, vi) => (
                                      <button
                                        key={vi}
                                        type="button"
                                        aria-pressed={exercise.variation === v.name}
                                        onClick={() => {
                                          updateExerciseFields(idx, {
                                            variation: v.name,
                                            weight: v.targetWeight ?? '',
                                            weights: buildWeightEntries(v),
                                            inclineDegrees: v.targetInclineDegrees ?? '',
                                            reps: v.targetReps ?? '',
                                            sets: v.targetSets ?? '',
                                            cableSetting: v.cableSetting ?? '',
                                          });
                                        }}
                                        className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                                          exercise.variation === v.name
                                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                                            : 'bg-slate-700 text-slate-200 border-slate-500 hover:border-slate-400'
                                        }`}
                                      >
                                        {v.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {(selectedVar.targetWeight != null || selectedVar.weightFields?.length > 0 || selectedVar.targetInclineDegrees != null || selectedVar.targetReps != null || selectedVar.targetSets != null || selectedVar.cableSetting) && (
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-400 mb-3">
                                    {selectedVar.cableSetting && (
                                      <span className="text-amber-400">Cable: {selectedVar.cableSetting}</span>
                                    )}
                                    {selectedVar.targetWeight != null && (
                                      <span>Target: {selectedVar.targetWeight} lbs</span>
                                    )}
                                    {(selectedVar.weightFields || []).map((field) => (
                                      <span key={field.key}>{field.label}: {field.targetWeight} lbs</span>
                                    ))}
                                    {selectedVar.targetInclineDegrees != null && (
                                      <span>Incline: {selectedVar.targetInclineDegrees}°</span>
                                    )}
                                    {selectedVar.targetReps != null && (
                                      <span>{selectedVar.targetReps} reps</span>
                                    )}
                                    {selectedVar.targetSets != null && (
                                      <span>{selectedVar.targetSets} sets</span>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {exercise.completed && (() => {
                            const exDef = exercises[idx];
                            const vars = exDef?.variations || [];
                            const selectedVar = vars.find(v => v.name === exercise.variation) || getDefaultVariation(exDef || {});
                            return (
                            <div className="space-y-2">
                              {Object.hasOwn(selectedVar, 'cableSetting') && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wide whitespace-nowrap">Cable</span>
                                  <input
                                    type="text"
                                    placeholder="e.g. 11/2"
                                    value={exercise.cableSetting}
                                    onChange={(e) => updateExercise(idx, 'cableSetting', e.target.value)}
                                    className="w-24 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                                  />
                                </div>
                              )}
                              {selectedVar.weightFields?.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  {selectedVar.weightFields.map((field) => (
                                    <label key={field.key} className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                                      {field.label} (lbs)
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={exercise.weights?.find((entry) => entry.key === field.key)?.value ?? ''}
                                        onChange={(e) => updateExerciseWeight(idx, field.key, e.target.value)}
                                        className="mt-1 w-full bg-slate-800 border border-slate-600 rounded px-3 py-3 text-base font-normal normal-case tracking-normal text-slate-200 focus:outline-none focus:border-cyan-500"
                                      />
                                    </label>
                                  ))}
                                </div>
                              )}
                              <div className={`grid gap-2 ${selectedVar.targetInclineDegrees != null ? 'grid-cols-3' : selectedVar.weightFields?.length > 0 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {selectedVar.weightFields?.length > 0 ? null : (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Weight (lbs)"
                                    value={exercise.weight}
                                    onChange={(e) => updateExercise(idx, 'weight', e.target.value)}
                                    className="bg-slate-800 border border-slate-600 rounded px-3 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                  />
                                )}
                                {selectedVar.targetInclineDegrees != null && (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    aria-label="Incline degrees"
                                    placeholder="Incline (°)"
                                    value={exercise.inclineDegrees}
                                    onChange={(e) => updateExercise(idx, 'inclineDegrees', e.target.value)}
                                    className="bg-slate-800 border border-slate-600 rounded px-3 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                  />
                                )}
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Reps"
                                  value={exercise.reps}
                                  onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                                  className="bg-slate-800 border border-slate-600 rounded px-3 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Sets"
                                  value={exercise.sets}
                                  onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
                                  className="bg-slate-800 border border-slate-600 rounded px-3 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                />
                              </div>
                            </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || completedExercises.every(ex => !ex.completed)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-black text-xl uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? '⏳ Saving...'
                  : isEditMode ? '💾 Save Changes' : '💾 Save Workout'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Record the soreness this workout caused (edit mode only) */}
      {isEditMode && onLogSoreness && (
        <button
          onClick={() => onLogSoreness(viewWorkout)}
          className="w-full mt-4 bg-slate-800 hover:bg-orange-900/40 text-orange-300 px-6 py-3 rounded-xl font-bold uppercase tracking-wide border border-orange-500/30 hover:border-orange-500/60 transition-all"
        >
          Log Soreness From This Workout
        </button>
      )}

      {/* Delete (edit mode only) */}
      {isEditMode && (
        <div className="mt-4">
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              >
                {deleting ? '⏳ Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 px-6 py-3 rounded-xl font-bold uppercase tracking-wide border border-slate-700 hover:border-red-500/50 transition-all"
            >
              Delete Workout
            </button>
          )}
        </div>
      )}

      </>)} {/* end logType === 'weight' */}

      {logStep === 'form' && logType === 'cardio' && (<>
        {/* Cardio Header */}
        <div className="mb-6">
          <h2 className="text-4xl font-black uppercase tracking-wide mb-2" style={{ color: CARDIO_CONFIG[cardioActivity]?.color || '#10b981' }}>
            {isCardioEditMode ? 'Edit Cardio' : 'Log Cardio'}
          </h2>
          {isCardioEditMode ? (
            <button
              onClick={switchToCardioCreateMode}
              className="text-sm text-slate-500 hover:text-emerald-400 transition-colors"
            >
              ← Log New Cardio Session
            </button>
          ) : (
            <p className="text-slate-400">Track your cardio session</p>
          )}
        </div>

        {/* Activity Toggle */}
        <div className="flex gap-3 bg-slate-800/30 backdrop-blur-md rounded-xl p-2 mb-6">
          <button
            onClick={() => setCardioActivity('treadmill')}
            className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
              cardioActivity === 'treadmill'
                ? 'text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={cardioActivity === 'treadmill' ? { backgroundColor: CARDIO_CONFIG.treadmill.color, boxShadow: `0 10px 15px -3px ${CARDIO_CONFIG.treadmill.color}50` } : {}}
          >
            Treadmill
          </button>
          <button
            onClick={() => setCardioActivity('bike')}
            className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
              cardioActivity === 'bike'
                ? 'text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={cardioActivity === 'bike' ? { backgroundColor: CARDIO_CONFIG.bike.color, boxShadow: `0 10px 15px -3px ${CARDIO_CONFIG.bike.color}50` } : {}}
          >
            Bike
          </button>
        </div>

        {/* Cardio Date & Time Picker */}
        <div className="mb-4 flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
              Date
            </label>
            <input
              ref={cardioDateRef}
              type="date"
              value={cardioDate}
              onChange={(e) => setCardioDate(e.target.value)}
              onClick={() => { try { cardioDateRef.current?.showPicker(); } catch { /* showPicker is optional */ } }}
              max={todayLocal()}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
              Time
            </label>
            <input
              type="time"
              value={cardioTime}
              onChange={(e) => setCardioTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Treadmill Form */}
        {cardioActivity === 'treadmill' && (
          <div className="space-y-4">
            {/* Template Selector */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                Template
              </label>
              <select
                value={cardioTemplateId}
                onChange={(e) => setCardioTemplateId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-800">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Interval Preview */}
            {selectedTemplate && (
              <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Intervals</h4>
                  <span className="text-emerald-400 font-bold text-sm">
                    {getTotalDuration(selectedTemplate.intervals)} min total
                  </span>
                </div>
                <div className="space-y-1">
                  {selectedTemplate.intervals.map((interval, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                        interval.type === 'jog'
                          ? 'bg-emerald-900/30 border border-emerald-700/30'
                          : 'bg-slate-700/30 border border-slate-600/30'
                      }`}
                    >
                      <span className={`font-bold uppercase text-xs ${
                        interval.type === 'jog' ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {interval.type}
                      </span>
                      <span className="text-slate-300">
                        {interval.durationMinutes} min @ {interval.speedMph} mph
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                Notes (optional)
              </label>
              <input
                type="text"
                value={cardioNotes}
                onChange={(e) => setCardioNotes(e.target.value)}
                placeholder="How did it feel?"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleCardioSubmit}
              disabled={cardioSubmitting || cardioCooldown}
              className="w-full text-white px-8 py-4 rounded-xl font-black text-xl uppercase tracking-wider shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              style={{ background: `linear-gradient(to right, ${CARDIO_CONFIG.treadmill.color}, #059669)` }}
            >
              {cardioCooldown && (
                <span className="absolute inset-0 bg-black/30 origin-right" style={{ animation: 'cooldown-shrink 10s linear forwards' }} />
              )}
              <span className="relative">
                {cardioSubmitting
                  ? 'Saving...'
                  : cardioCooldown
                    ? '✓ Logged'
                    : isCardioEditMode ? 'Save Changes' : 'Log Treadmill Session'}
              </span>
            </button>
          </div>
        )}

        {/* Bike Form */}
        {cardioActivity === 'bike' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={bikeDuration}
                  onChange={(e) => setBikeDuration(e.target.value)}
                  placeholder="45"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                  Distance (mi)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bikeDistance}
                  onChange={(e) => setBikeDistance(e.target.value)}
                  placeholder="12.5"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                  Avg Speed (mph)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bikeAvgSpeed}
                  onChange={(e) => setBikeAvgSpeed(e.target.value)}
                  placeholder="15.2"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                  Avg Heart Rate
                </label>
                <input
                  type="number"
                  value={bikeAvgHR}
                  onChange={(e) => setBikeAvgHR(e.target.value)}
                  placeholder="142"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                  Calories
                </label>
                <input
                  type="number"
                  value={bikeCalories}
                  onChange={(e) => setBikeCalories(e.target.value)}
                  placeholder="450"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                Notes (optional)
              </label>
              <input
                type="text"
                value={cardioNotes}
                onChange={(e) => setCardioNotes(e.target.value)}
                placeholder="Route, conditions, etc."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleCardioSubmit}
              disabled={cardioSubmitting || cardioCooldown}
              className="w-full text-white px-8 py-4 rounded-xl font-black text-xl uppercase tracking-wider shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              style={{ background: `linear-gradient(to right, ${CARDIO_CONFIG.bike.color}, #0d9488)` }}
            >
              {cardioCooldown && (
                <span className="absolute inset-0 bg-black/30 origin-right" style={{ animation: 'cooldown-shrink 10s linear forwards' }} />
              )}
              <span className="relative">
                {cardioSubmitting
                  ? 'Saving...'
                  : cardioCooldown
                    ? '✓ Logged'
                    : isCardioEditMode ? 'Save Changes' : 'Log Bike Ride'}
              </span>
            </button>
          </div>
        )}

        {/* Delete (cardio edit mode only) */}
        {isCardioEditMode && (
          <div className="mt-4">
            {cardioConfirmDelete ? (
              <div className="flex gap-2">
                <button
                  onClick={handleCardioDelete}
                  disabled={cardioDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                >
                  {cardioDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => setCardioConfirmDelete(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCardioConfirmDelete(true)}
                className="w-full bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 px-6 py-3 rounded-xl font-bold uppercase tracking-wide border border-slate-700 hover:border-red-500/50 transition-all"
              >
                Delete Cardio Session
              </button>
            )}
          </div>
        )}
      </>)} {/* end logType === 'cardio' */}

      {/* Cardio success toast */}
      {cardioToast && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg font-bold text-lg tracking-wide"
        >
          ✓ {cardioToast}
        </motion.div>
      )}

      {/* Cooldown progress bar animation */}
      <style>{`
        @keyframes cooldown-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
