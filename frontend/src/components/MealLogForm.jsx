// Meal logging — saved meals and the meal log, kept visibly separate.
//
// The flow has three screens, and each does one thing:
//
//   choose      — the saved meals list, "+ New saved meal", and "Log a meal
//                 without saving it"
//   saved-meal  — create, edit or delete a saved meal. Logs nothing.
//   log         — log one meal: a saved meal picked from the list, or a one-off
//                 typed in. Never creates or changes a saved meal.
//
// A saved meal holds numbers for ONE portion. A logged meal is stored with its
// numbers multiplied by the portion, so the log keeps what was actually eaten even
// if the saved meal is later changed or deleted.

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Pencil } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { todayLocal, nowLocalTime } from '../utils/dateUtils';
import {
  MEAL_COLOR, PORTIONS, scaleMeal, unscaleMeal, formatMealNumbers,
} from '../utils/mealConfig.js';

const inputClass = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-200/70';
const labelClass = 'block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide';
const primaryButtonClass = 'w-full text-slate-900 px-8 py-4 rounded-xl font-black text-xl uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryButtonClass = 'w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold uppercase tracking-wide border border-slate-700 transition-all';

const validNumber = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

export function MealLogForm({ viewMeal = null, initialDate = null, onSaved, onBack }) {
  const { fetchMealTemplates } = useApi();
  const [savedMeals, setSavedMeals] = useState([]);
  const [savedMealsLoaded, setSavedMealsLoaded] = useState(false);
  const [screen, setScreen] = useState(viewMeal ? 'log' : 'choose');
  const [loadError, setLoadError] = useState(null);

  // Which saved meal the log screen is for (null = a one-off meal), and which
  // saved meal the saved-meal screen is editing (null = a new one).
  const [loggingSavedMeal, setLoggingSavedMeal] = useState(null);
  const [editingSavedMeal, setEditingSavedMeal] = useState(null);

  useEffect(() => {
    let active = true;
    fetchMealTemplates()
      .then((data) => { if (active) setSavedMeals(data?.templates || []); })
      .catch((err) => { if (active) setLoadError(`Saved meals could not be loaded: ${err.message}`); })
      .finally(() => { if (active) setSavedMealsLoaded(true); });
    return () => { active = false; };
  }, [fetchMealTemplates]);

  // Editing a logged meal: show it as its saved meal if that still exists.
  useEffect(() => {
    if (!viewMeal || !savedMealsLoaded) return;
    setLoggingSavedMeal(savedMeals.find((meal) => meal.id === viewMeal.templateId) || null);
    // Only on load: later changes to the list must not swap the meal being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMeal, savedMealsLoaded]);

  if (screen === 'saved-meal') {
    return (
      <>
        <BackButton onClick={() => { setEditingSavedMeal(null); setScreen('choose'); }} />
        <SavedMealForm
          savedMeal={editingSavedMeal}
          onDone={(change) => {
            if (change?.saved) {
              setSavedMeals((current) => [
                ...current.filter((meal) => meal.id !== change.saved.id),
                change.saved,
              ].sort((a, b) => a.name.localeCompare(b.name)));
            }
            if (change?.deletedId) {
              setSavedMeals((current) => current.filter((meal) => meal.id !== change.deletedId));
            }
            setEditingSavedMeal(null);
            setScreen('choose');
          }}
        />
      </>
    );
  }

  if (screen === 'log') {
    // Editing a logged meal waits for the saved meals, so it can tell whether
    // the meal came from one.
    if (viewMeal && !savedMealsLoaded) return <p className="text-slate-400">Loading…</p>;
    return (
      <>
        {!viewMeal && <BackButton onClick={() => { setLoggingSavedMeal(null); setScreen('choose'); }} />}
        <LogMealForm
          key={`${viewMeal?.id || 'new'}-${loggingSavedMeal?.id || 'one-off'}`}
          viewMeal={viewMeal}
          savedMeal={loggingSavedMeal}
          initialDate={initialDate}
          onSaved={onSaved}
        />
      </>
    );
  }

  return (
    <>
      {onBack && <BackButton onClick={onBack} />}
      <div className="mb-6">
        <h2 className="text-4xl font-black uppercase tracking-wide mb-2" style={{ color: MEAL_COLOR }}>
          Log Meal
        </h2>
        <p className="text-slate-400">Pick a saved meal, or log one without saving it.</p>
      </div>

      <h3 className={labelClass}>Saved meals</h3>
      {loadError && <p className="mb-3 text-sm text-red-400">{loadError}</p>}
      {savedMealsLoaded && savedMeals.length === 0 && !loadError && (
        <p className="mb-3 text-slate-400">No saved meals yet.</p>
      )}
      <div className="flex flex-col gap-2">
        {savedMeals.map((meal) => (
          <div key={meal.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => { setLoggingSavedMeal(meal); setScreen('log'); }}
              className="flex-1 min-w-0 text-left rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 hover:border-slate-400 transition-colors"
            >
              <span className="block truncate font-bold text-slate-100">{meal.name}</span>
              <span className="block mt-0.5 text-xs font-mono text-slate-400">{formatMealNumbers(meal)}</span>
            </button>
            <button
              type="button"
              onClick={() => { setEditingSavedMeal(meal); setScreen('saved-meal'); }}
              aria-label={`Edit saved meal ${meal.name}`}
              className="shrink-0 w-12 grid place-items-center rounded-lg border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-400"
            >
              <Pencil size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => { setEditingSavedMeal(null); setScreen('saved-meal'); }}
        className="mt-3 w-full rounded-lg border border-dashed border-slate-500 px-4 py-3 font-bold text-slate-200 hover:border-slate-300 transition-colors"
      >
        + New saved meal
      </button>

      <div className="mt-8 border-t border-slate-700/60 pt-6">
        <button
          type="button"
          onClick={() => { setLoggingSavedMeal(null); setScreen('log'); }}
          className={secondaryButtonClass}
        >
          Log a meal without saving it
        </button>
      </div>
    </>
  );
}

function SavedMealForm({ savedMeal, onDone }) {
  const isNew = !savedMeal;
  const [name, setName] = useState(savedMeal?.name || '');
  const [calories, setCalories] = useState(savedMeal ? String(savedMeal.calories) : '');
  const [proteinGrams, setProteinGrams] = useState(savedMeal ? String(savedMeal.proteinGrams) : '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const canSave = name.trim() && validNumber(calories) && validNumber(proteinGrams) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const body = JSON.stringify({ name: name.trim(), calories: Number(calories), proteinGrams: Number(proteinGrams) });
    try {
      const result = isNew
        ? await apiFetch('/api/meal-templates', { method: 'POST', body })
        : await apiFetch(`/api/meal-templates/${encodeURIComponent(savedMeal.id)}`, { method: 'PUT', body });
      onDone({ saved: result.template });
    } catch (err) {
      setError(`The saved meal was not saved: ${err.message}`);
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/meal-templates/${encodeURIComponent(savedMeal.id)}`, { method: 'DELETE' });
      onDone({ deletedId: savedMeal.id });
    } catch (err) {
      setError(`The saved meal was not deleted: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-4xl font-black uppercase tracking-wide mb-2" style={{ color: MEAL_COLOR }}>
          {isNew ? 'New Saved Meal' : 'Edit Saved Meal'}
        </h2>
        <p className="text-slate-400">
          {isNew
            ? 'Saves a meal you eat often. Nothing is logged.'
            : 'Meals already logged keep their own numbers.'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <NumberFields
          calories={calories}
          proteinGrams={proteinGrams}
          onCalories={setCalories}
          onProteinGrams={setProteinGrams}
          caption="For one portion."
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={primaryButtonClass}
          style={{ backgroundColor: MEAL_COLOR }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={() => onDone(null)} className={secondaryButtonClass}>
          Cancel
        </button>

        {!isNew && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
              >
                Keep It
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full bg-transparent text-slate-500 hover:text-red-400 px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
            >
              Delete Saved Meal
            </button>
          )
        )}
      </div>
    </>
  );
}

function LogMealForm({ viewMeal, savedMeal, initialDate, onSaved }) {
  const isEditMode = !!viewMeal;
  // A logged meal reopens with its own numbers; a saved meal fills in its numbers.
  const start = viewMeal ? unscaleMeal(viewMeal) : savedMeal;

  const [date, setDate] = useState(viewMeal?.date || initialDate || todayLocal());
  const [time, setTime] = useState(viewMeal ? (viewMeal.time || '') : nowLocalTime());
  const [name, setName] = useState(viewMeal?.name || '');
  const [portion, setPortion] = useState(viewMeal?.portion || 1);
  const [calories, setCalories] = useState(start ? String(start.calories) : '');
  const [proteinGrams, setProteinGrams] = useState(start ? String(start.proteinGrams) : '');
  const [notes, setNotes] = useState(viewMeal?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);
  const dateRef = useRef(null);

  const mealName = (savedMeal && !viewMeal ? savedMeal.name : name).trim();
  const numbersValid = validNumber(calories) && validNumber(proteinGrams);
  const eaten = scaleMeal({ calories, proteinGrams }, portion);
  const canSubmit = numbersValid && mealName && !submitting;
  const changedFromSaved = !!savedMeal && !viewMeal && (
    Number(calories) !== savedMeal.calories || Number(proteinGrams) !== savedMeal.proteinGrams
  );

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const body = JSON.stringify({
      date,
      time: time || null,
      templateId: viewMeal ? (viewMeal.templateId || null) : (savedMeal?.id || null),
      name: mealName,
      portion,
      calories: eaten.calories,
      proteinGrams: eaten.proteinGrams,
      notes,
    });
    try {
      if (isEditMode) {
        await apiFetch(`/api/meals/${encodeURIComponent(viewMeal.id)}`, { method: 'PUT', body });
      } else {
        await apiFetch('/api/meals', { method: 'POST', body });
      }
      onSaved?.();
    } catch (err) {
      setError(`The meal was not saved: ${err.message}`);
      setSubmitting(false);
    }
  };

  const remove = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/meals/${encodeURIComponent(viewMeal.id)}`, { method: 'DELETE' });
      onSaved?.();
    } catch (err) {
      setError(`The meal was not deleted: ${err.message}`);
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-4xl font-black uppercase tracking-wide mb-2" style={{ color: MEAL_COLOR }}>
          {isEditMode ? 'Edit Meal' : 'Log Meal'}
        </h2>
      </div>

      {savedMeal && !isEditMode ? (
        <div className="mb-5 rounded-lg border px-4 py-3" style={{ borderColor: `${MEAL_COLOR}99`, background: `${MEAL_COLOR}14` }}>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Saved meal</div>
          <div className="mt-0.5 text-lg font-bold text-slate-100">{savedMeal.name}</div>
        </div>
      ) : (
        <div className="mb-5">
          <label className={labelClass}>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          {!isEditMode && (
            <p className="mt-1.5 text-xs text-slate-500">This meal is logged once and not saved.</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label className={labelClass}>Date</label>
            <input
              ref={dateRef}
              type="date"
              value={date}
              max={todayLocal()}
              onChange={(e) => setDate(e.target.value)}
              onClick={() => { try { dateRef.current?.showPicker(); } catch { /* showPicker is optional */ } }}
              className={`${inputClass} cursor-pointer`}
            />
          </div>
          <div className="w-full sm:w-40 sm:shrink-0">
            <label className={labelClass}>Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`${inputClass} px-3 cursor-pointer`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Portion</label>
          <div className="flex gap-2 bg-slate-800/30 rounded-xl p-1.5">
            {PORTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPortion(option.value)}
                aria-pressed={portion === option.value}
                className={`flex-1 py-2.5 rounded-lg font-bold transition-all ${
                  portion === option.value ? 'text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
                style={portion === option.value ? { backgroundColor: MEAL_COLOR } : {}}
              >
                ×{option.label}
              </button>
            ))}
          </div>
        </div>

        <NumberFields
          calories={calories}
          proteinGrams={proteinGrams}
          onCalories={setCalories}
          onProteinGrams={setProteinGrams}
          caption={changedFromSaved
            ? `For one portion. Changed for this meal only; ${savedMeal.name} keeps its saved numbers.`
            : 'For one portion.'}
        />

        {numbersValid && (
          <p className="text-sm text-slate-400">
            Total for this meal:{' '}
            <span className="font-mono font-bold text-slate-200">{formatMealNumbers(eaten)}</span>
          </p>
        )}

        <div>
          <label className={labelClass}>Notes (optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className={primaryButtonClass}
          style={{ backgroundColor: MEAL_COLOR }}
        >
          {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Log Meal'}
        </button>

        {isEditMode && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 px-6 py-3 rounded-xl font-bold uppercase tracking-wide border border-slate-700 hover:border-red-500/50 transition-all"
            >
              Delete Meal
            </button>
          )
        )}
      </div>
    </>
  );
}

// Calories and protein for one portion. The grey hints give the rough scale.
function NumberFields({ calories, proteinGrams, onCalories, onProteinGrams, caption }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Calories</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={calories}
            onChange={(e) => onCalories(e.target.value)}
            placeholder="650"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Protein (g)</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={proteinGrams}
            onChange={(e) => onProteinGrams(e.target.value)}
            placeholder="45"
            className={inputClass}
          />
        </div>
      </div>
      {caption && <p className="mt-1.5 text-xs text-slate-500">{caption}</p>}
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 mb-4 text-slate-400 hover:text-slate-200 transition-colors font-bold uppercase tracking-wide text-sm"
    >
      <ChevronLeft size={18} /> Back
    </button>
  );
}
