// Meal log form — creates or edits one meal entry.
//
// Most meals are repeats, so the form leads with the saved defaults: tap one,
// adjust the portion if needed, log. Anything else is typed in by hand and can be
// saved as a new default on the way through.
//
// The calorie and protein fields always hold the numbers for ONE portion, which
// is what a default stores. The entry is saved with those numbers multiplied by
// the portion, so the log keeps what was actually eaten even if the default is
// later changed or deleted.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { todayLocal, nowLocalTime } from '../utils/dateUtils';
import {
  MEAL_COLOR, PORTIONS, scaleMeal, unscaleMeal, formatMealNumbers,
} from '../utils/mealConfig.js';

const OTHER = '';

const inputClass = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-200/70';
const labelClass = 'block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide';

export function MealLogForm({ viewMeal = null, initialDate = null, onSaved }) {
  const { fetchMealTemplates } = useApi();
  const isEditMode = !!viewMeal;

  const [templates, setTemplates] = useState([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState(OTHER);
  const [date, setDate] = useState(initialDate || todayLocal());
  const [time, setTime] = useState(nowLocalTime());
  const [name, setName] = useState('');
  const [portion, setPortion] = useState(1);
  const [calories, setCalories] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [notes, setNotes] = useState('');
  const [saveDefault, setSaveDefault] = useState(false);
  const [managing, setManaging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const dateRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetchMealTemplates()
      .then((data) => { if (active) setTemplates(data?.templates || []); })
      .catch((err) => { if (active) setError(`Meal defaults could not be loaded: ${err.message}`); })
      .finally(() => { if (active) setTemplatesLoaded(true); });
    return () => { active = false; };
  }, [fetchMealTemplates]);

  // Reopening a logged meal shows its own numbers, per portion, and reselects
  // its default only if that default still exists.
  useEffect(() => {
    if (!viewMeal) return;
    const perPortion = unscaleMeal(viewMeal);
    setDate(viewMeal.date || todayLocal());
    setTime(viewMeal.time || '');
    setName(viewMeal.name || '');
    setPortion(viewMeal.portion || 1);
    setCalories(String(perPortion.calories));
    setProteinGrams(String(perPortion.proteinGrams));
    setNotes(viewMeal.notes || '');
    setSaveDefault(false);
    setConfirmDelete(false);
  }, [viewMeal]);

  useEffect(() => {
    if (!viewMeal || !templatesLoaded) return;
    setSelectedId(templates.some((t) => t.id === viewMeal.templateId) ? viewMeal.templateId : OTHER);
    // Only on load: the template list changing afterwards must not reset a choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMeal, templatesLoaded]);

  const selected = templates.find((t) => t.id === selectedId) || null;
  const perPortion = { calories: Number(calories), proteinGrams: Number(proteinGrams) };
  const eaten = scaleMeal(perPortion, portion);
  const numbersValid = calories !== '' && proteinGrams !== ''
    && Number.isFinite(perPortion.calories) && Number.isFinite(perPortion.proteinGrams)
    && perPortion.calories >= 0 && perPortion.proteinGrams >= 0;
  const trimmedName = (selected ? selected.name : name).trim();
  const canSubmit = numbersValid && trimmedName && !submitting;

  const numbersDifferFromDefault = useMemo(() => (
    !!selected && (
      Math.round(perPortion.calories) !== selected.calories
      || Math.round(perPortion.proteinGrams) !== selected.proteinGrams
    )
  ), [selected, perPortion.calories, perPortion.proteinGrams]);

  const chooseTemplate = (template) => {
    setError(null);
    setSaveDefault(false);
    if (!template) {
      setSelectedId(OTHER);
      setName('');
      setCalories('');
      setProteinGrams('');
      return;
    }
    setSelectedId(template.id);
    setName(template.name);
    setCalories(String(template.calories));
    setProteinGrams(String(template.proteinGrams));
  };

  const deleteTemplate = async (template) => {
    if (!window.confirm(`Delete the "${template.name}" default? Meals already logged keep their numbers.`)) return;
    try {
      await apiFetch(`/api/meal-templates/${encodeURIComponent(template.id)}`, { method: 'DELETE' });
      setTemplates((current) => current.filter((t) => t.id !== template.id));
      if (selectedId === template.id) setSelectedId(OTHER);
    } catch (err) {
      setError(`The default could not be deleted: ${err.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const numbers = {
        name: trimmedName,
        calories: Math.round(perPortion.calories),
        proteinGrams: Math.round(perPortion.proteinGrams),
      };
      let templateId = selected?.id || null;

      // The default is written before the meal, as with the walk default: if it
      // cannot be saved, nothing is logged, so the two never disagree.
      if (saveDefault && selected && numbersDifferFromDefault) {
        await apiFetch(`/api/meal-templates/${encodeURIComponent(selected.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ ...numbers, name: selected.name }),
        });
      } else if (saveDefault && !selected) {
        const created = await apiFetch('/api/meal-templates', {
          method: 'POST',
          body: JSON.stringify(numbers),
        });
        templateId = created.template.id;
      }

      const body = {
        date,
        time: time || null,
        templateId,
        name: trimmedName,
        portion,
        calories: eaten.calories,
        proteinGrams: eaten.proteinGrams,
        notes,
      };

      if (isEditMode) {
        await apiFetch(`/api/meals/${encodeURIComponent(viewMeal.id)}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/api/meals', { method: 'POST', body: JSON.stringify(body) });
      }
      onSaved?.();
    } catch (err) {
      setError(`The meal was not saved: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/meals/${encodeURIComponent(viewMeal.id)}`, { method: 'DELETE' });
      onSaved?.();
    } catch (err) {
      setError(`The meal was not deleted: ${err.message}`);
      setDeleting(false);
    }
  };

  const chipStyle = (active) => ({
    borderColor: active ? MEAL_COLOR : undefined,
    background: active ? `${MEAL_COLOR}1f` : undefined,
  });

  return (
    <>
      <div className="mb-6">
        <h2 className="text-4xl font-black uppercase tracking-wide mb-2" style={{ color: MEAL_COLOR }}>
          {isEditMode ? 'Edit Meal' : 'Log Meal'}
        </h2>
        <p className="text-slate-400">Calories and protein as eaten</p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
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

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">Meal</span>
          {templates.length > 0 && (
            <button
              type="button"
              onClick={() => setManaging((value) => !value)}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wide"
            >
              {managing ? 'Done' : 'Edit defaults'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => chooseTemplate(template)}
                className="flex-1 min-w-0 text-left rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 hover:border-slate-500 transition-colors"
                style={chipStyle(selectedId === template.id)}
              >
                <span className="block truncate font-bold text-slate-100">{template.name}</span>
                <span className="block mt-0.5 text-xs font-mono text-slate-400">{formatMealNumbers(template)}</span>
              </button>
              {managing && (
                <button
                  type="button"
                  onClick={() => deleteTemplate(template)}
                  aria-label={`Delete the ${template.name} default`}
                  className="shrink-0 w-11 grid place-items-center rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/50"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => chooseTemplate(null)}
            className="text-left rounded-lg border border-dashed border-slate-600 bg-transparent px-4 py-3 hover:border-slate-400 transition-colors"
            style={chipStyle(selectedId === OTHER)}
          >
            <span className="block font-bold text-slate-200">Something else</span>
            <span className="block mt-0.5 text-xs text-slate-400">Type it in</span>
          </button>
        </div>
        {templatesLoaded && templates.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">
            No defaults yet. Log a meal as something else and tick “Save as a default”.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {!selected && (
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rice and beans bowl"
              className={inputClass}
            />
          </div>
        )}

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Calories</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
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
              onChange={(e) => setProteinGrams(e.target.value)}
              placeholder="45"
              className={inputClass}
            />
          </div>
        </div>

        {portion !== 1 && numbersValid && (
          <p className="text-sm text-slate-400">
            Numbers above are for one portion. Logged as eaten:{' '}
            <span className="font-mono font-bold text-slate-200">{formatMealNumbers(eaten)}</span>
          </p>
        )}

        {(!selected || numbersDifferFromDefault) && (
          <label
            className={`flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition-colors ${
              saveDefault ? 'bg-amber-100/5' : 'border-slate-600/60 bg-slate-800/40 hover:border-slate-500'
            }`}
            style={saveDefault ? { borderColor: `${MEAL_COLOR}99` } : {}}
          >
            <input
              type="checkbox"
              checked={saveDefault}
              onChange={(e) => setSaveDefault(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded bg-slate-800 border-slate-600 cursor-pointer"
            />
            <span>
              <span className="block text-sm font-bold text-slate-200">
                {selected ? 'This is the new default' : 'Save as a default'}
              </span>
              <span className="block mt-0.5 text-xs text-slate-400">
                {selected
                  ? `Update ${selected.name} to these numbers. Meals already logged keep theirs.`
                  : 'Log it in one tap next time.'}
              </span>
            </span>
          </label>
        )}

        <div>
          <label className={labelClass}>Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Extra dressing, skipped the cheese…"
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full text-slate-900 px-8 py-4 rounded-xl font-black text-xl uppercase tracking-wider shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ backgroundColor: MEAL_COLOR }}
        >
          {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Log Meal'}
        </button>

        {isEditMode && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
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
