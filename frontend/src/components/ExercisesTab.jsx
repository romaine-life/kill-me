// Exercise library — card carousel view with filtering and anatomy visualization.
//
// Displays one exercise at a time in a detailed card with anatomy diagrams
// showing which muscle groups are worked. Supports filtering by tags, days,
// equipment, and text search. Admin users can add new exercises or copy
// existing exercises from other days.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Copy, X, Search } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { useDataSource } from '../api/snapshotContext.jsx';
import { getDays, getDaySlugs, getDayInfo } from '../utils/dayConfig.js';
import { AnatomyDiagram } from './AnatomyDiagrams.jsx';
import { ExercisePose } from './ExercisePoses.jsx';
import { colors } from '../colors.js';

// Map exercise tags to anatomy diagram muscle groups.
// Tags that don't map to a diagram group are skipped (e.g. "compound", "press").
const TAG_TO_ANATOMY_GROUP = {
  'quads': 'Quadriceps',
  'hamstrings': 'Hamstrings',
  'glutes': 'Glutes',
  'calves': 'Calves',
  'chest': 'Pecs',
  'back': 'Lats & Back',
  'lats': 'Lats & Back',
  'traps': 'Lats & Back',
  'erector-spinae': 'Lats & Back',
  'front-delt': 'Deltoids',
  'side-delt': 'Deltoids',
  'rear-delt': 'Deltoids',
  'rotator-cuff': 'Deltoids',
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'forearms': 'Forearms & Grip',
  'grip': 'Forearms & Grip',
  'abs': 'Abs & Core',
  'core': 'Abs & Core',
  'obliques': 'Abs & Core',
  'hip': 'Hip & Adductors',
  'hip-flexors': 'Hip & Adductors',
  'adductors': 'Hip & Adductors',
  'abductors': 'Hip & Adductors',
};

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

// Collect all unique tags from exercises for the filter UI
function collectAllTags(exercises) {
  const tagSet = new Set();
  for (const ex of exercises) {
    if (Array.isArray(ex.tags)) {
      for (const t of ex.tags) tagSet.add(t);
    }
  }
  return [...tagSet].sort();
}

// Get anatomy groups for an exercise based on its tags
function getAnatomyGroups(exercise) {
  const groups = new Set();
  if (Array.isArray(exercise.tags)) {
    for (const tag of exercise.tags) {
      const group = TAG_TO_ANATOMY_GROUP[tag];
      if (group) groups.add(group);
    }
  }
  return [...groups];
}

export function ExercisesTab({ currentDay, isAdmin, initialDay, initialExercise }) {
  const [allExercises, setAllExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const { fetchAllExercises, isReady } = useDataSource();

  // Filters
  const [searchText, setSearchText] = useState('');
  const [enabledDays, setEnabledDays] = useState(() => {
    // If navigated with a specific day, start filtered to that day
    if (initialDay) {
      const days = {};
      for (const slug of getDaySlugs()) days[slug] = slug === initialDay;
      return days;
    }
    const days = {};
    for (const slug of getDaySlugs()) days[slug] = true;
    return days;
  });
  const [activeTags, setActiveTags] = useState(new Set());

  // Add existing exercise flow
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [addTargetDay, setAddTargetDay] = useState(currentDay);
  const [addSearchText, setAddSearchText] = useState('');
  const [adding, setAdding] = useState(false);

  // New exercise form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '', equipment: '', notes: '', targetWeight: '', targetReps: '', targetSets: '', tags: '',
  });
  const [newTargetDay, setNewTargetDay] = useState(currentDay);

  // Fetch all exercises on mount
  useEffect(() => {
    if (!isReady) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAllExercises();
        setAllExercises(data.exercises || []);
      } catch (error) {
        console.error('Error fetching all exercises:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isReady]);

  // When navigated from another tab with a specific exercise, find it after load
  useEffect(() => {
    if (!loading && initialExercise && allExercises.length > 0) {
      const idx = filteredExercises.findIndex(e => e.name === initialExercise);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [loading, initialExercise, allExercises]);

  const allTags = useMemo(() => collectAllTags(allExercises), [allExercises]);

  // Apply filters
  const filteredExercises = useMemo(() => {
    let result = allExercises;

    // Day filter
    result = result.filter(e => enabledDays[e.daySlug]);

    // Tag filter (AND logic — exercise must have all active tags)
    if (activeTags.size > 0) {
      result = result.filter(e => {
        const eTags = new Set(e.tags || []);
        for (const t of activeTags) {
          if (!eTags.has(t)) return false;
        }
        return true;
      });
    }

    // Text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.equipment && e.equipment.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allExercises, enabledDays, activeTags, searchText]);

  // Clamp index when filter changes
  useEffect(() => {
    if (currentIndex >= filteredExercises.length) {
      setCurrentIndex(Math.max(0, filteredExercises.length - 1));
    }
  }, [filteredExercises.length]);

  // Exercises available for "add existing" (not already on target day)
  const addableExercises = useMemo(() => {
    const namesOnTargetDay = new Set(
      allExercises.filter(e => e.daySlug === addTargetDay).map(e => e.name)
    );
    let result = allExercises.filter(e => !namesOnTargetDay.has(e.name));
    if (addSearchText.trim()) {
      const q = addSearchText.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.equipment && e.equipment.toLowerCase().includes(q))
      );
    }
    // Deduplicate by name (same exercise on multiple days)
    const seen = new Set();
    return result.filter(e => {
      if (seen.has(e.name)) return false;
      seen.add(e.name);
      return true;
    });
  }, [allExercises, addTargetDay, addSearchText]);

  const exercise = filteredExercises[currentIndex];

  const navigate = useCallback((dir) => {
    setDirection(dir);
    setCurrentIndex(prev => {
      const next = prev + dir;
      if (next < 0) return filteredExercises.length - 1;
      if (next >= filteredExercises.length) return 0;
      return next;
    });
  }, [filteredExercises.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const toggleDay = (day) => {
    setEnabledDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const toggleTag = (tag) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const enableAllDays = () => {
    const days = {};
    for (const slug of getDaySlugs()) days[slug] = true;
    setEnabledDays(days);
  };

  const clearAllDays = () => {
    const days = {};
    for (const slug of getDaySlugs()) days[slug] = false;
    setEnabledDays(days);
  };

  const handleAddExisting = async (sourceExercise) => {
    setAdding(true);
    try {
      const defaultVar = getDefaultVariation(sourceExercise);
      await apiFetch('/api/exercises', {
        method: 'POST',
        body: JSON.stringify({
          daySlug: addTargetDay,
          name: sourceExercise.name,
          equipment: sourceExercise.equipment,
          notes: sourceExercise.notes,
          tags: sourceExercise.tags || [],
          variations: [{
            name: defaultVar.name || 'Standard',
            default: true,
            targetWeight: defaultVar.targetWeight ?? null,
            weightFields: defaultVar.weightFields,
            targetInclineDegrees: defaultVar.targetInclineDegrees ?? null,
            targetReps: defaultVar.targetReps ?? null,
            targetSets: defaultVar.targetSets ?? null,
          }],
        }),
      });
      // Refetch all exercises
      const data = await fetchAllExercises();
      setAllExercises(data.exercises || []);
      setShowAddExisting(false);
      setAddSearchText('');
    } catch (error) {
      console.error('Error adding existing exercise:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleAddNew = async () => {
    if (!newExercise.name.trim()) return;
    setAdding(true);
    try {
      const tags = newExercise.tags
        ? newExercise.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        : [];
      await apiFetch('/api/exercises', {
        method: 'POST',
        body: JSON.stringify({
          daySlug: newTargetDay,
          name: newExercise.name.trim(),
          equipment: newExercise.equipment.trim(),
          notes: newExercise.notes.trim(),
          tags,
          variations: [{
            name: 'Standard',
            default: true,
            targetWeight: newExercise.targetWeight ? Number(newExercise.targetWeight) : null,
            targetReps: newExercise.targetReps || null,
            targetSets: newExercise.targetSets ? Number(newExercise.targetSets) : null,
          }],
        }),
      });
      const data = await fetchAllExercises();
      setAllExercises(data.exercises || []);
      setShowNewForm(false);
      setNewExercise({ name: '', equipment: '', notes: '', targetWeight: '', targetReps: '', targetSets: '', tags: '' });
    } catch (error) {
      console.error('Error adding new exercise:', error);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-400">Loading exercises...</p>
      </div>
    );
  }

  const anatomyGroups = exercise ? getAnatomyGroups(exercise) : [];
  const dayConfig = exercise ? getDayInfo(exercise.daySlug) : null;

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-5xl font-black text-cyan-400 uppercase tracking-wide">
          Exercises
        </h2>
        <div className="text-slate-400 text-sm">
          {filteredExercises.length} of {allExercises.length}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={styles.searchRow}>
        <Search size={16} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={styles.searchInput}
        />
        {searchText && (
          <button onClick={() => setSearchText('')} style={styles.clearBtn}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Day filter strip ── */}
      <div style={styles.filterSection}>
        <div style={styles.filterRow}>
          <div style={styles.dayStrip}>
            {getDays().map((day) => {
              const enabled = enabledDays[day.slug];
              const isCurrent = day.slug === currentDay;
              return (
                <button
                  key={day.slug}
                  onClick={() => toggleDay(day.slug)}
                  style={{
                    ...styles.dayPill,
                    ...(enabled ? styles.dayPillEnabled : styles.dayPillDisabled),
                    ...(isCurrent ? { boxShadow: `0 0 0 2px ${colors.accent.green}` } : {}),
                  }}
                  title={`Day ${day.number}: ${day.name}`}
                >
                  {day.number}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={enableAllDays} style={styles.smallBtn}>All</button>
            <button onClick={clearAllDays} style={styles.smallBtn}>None</button>
          </div>
        </div>
      </div>

      {/* ── Tag filters ── */}
      {allTags.length > 0 && (
        <div style={styles.tagFilterWrap}>
          {allTags.map(tag => {
            const isActive = activeTags.has(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  ...styles.tagPill,
                  ...(isActive ? styles.tagPillActive : {}),
                }}
              >
                {tag}
              </button>
            );
          })}
          {activeTags.size > 0 && (
            <button
              onClick={() => setActiveTags(new Set())}
              style={{ ...styles.smallBtn, marginLeft: 4 }}
            >
              Clear tags
            </button>
          )}
        </div>
      )}

      {/* ── Card carousel ── */}
      {filteredExercises.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          No exercises match current filters.
        </div>
      ) : (
        <div style={styles.carouselWrap}>
          {/* Nav arrows */}
          <button
            onClick={() => navigate(-1)}
            style={styles.navArrow}
            disabled={filteredExercises.length <= 1}
          >
            <ChevronLeft size={28} />
          </button>

          <div style={styles.cardContainer}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={exercise.id || `${exercise.daySlug}-${exercise.name}`}
                initial={{ x: direction * 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction * -80, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={styles.card}
              >
                {/* Day badge + exercise name */}
                <div style={styles.cardHeader}>
                  <div style={styles.dayBadge}>
                    Day {dayConfig?.number ?? '—'}
                    <span style={styles.dayBadgeName}>
                      {dayConfig?.name}
                    </span>
                  </div>
                  <div style={styles.counter}>
                    {currentIndex + 1} / {filteredExercises.length}
                  </div>
                </div>

                <h3 style={styles.exerciseName}>{exercise.name}</h3>

                {exercise.equipment && (
                  <div style={styles.equipmentLine}>
                    {exercise.equipment}
                    {exercise.location && (
                      <span style={styles.locationBadge}>{exercise.location}</span>
                    )}
                  </div>
                )}

                {exercise.notes && (
                  <p style={styles.notes}>{exercise.notes}</p>
                )}

                {/* Tags */}
                {exercise.tags && exercise.tags.length > 0 && (
                  <div style={styles.tagsRow}>
                    {exercise.tags.map(tag => (
                      <span key={tag} style={styles.tagChip}>{tag}</span>
                    ))}
                  </div>
                )}

                {/* Exercise pose illustration */}
                <ExercisePose exercise={exercise} />

                {/* Variations */}
                <div style={styles.variationsSection}>
                  <h4 style={styles.sectionLabel}>Variations</h4>
                  <div style={styles.variationsList}>
                    {(exercise.variations || []).map((v, vi) => (
                      <div
                        key={vi}
                        style={{
                          ...styles.variationCard,
                          ...(v.default ? styles.variationDefault : {}),
                        }}
                      >
                        <div style={styles.variationHeader}>
                          <span style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: v.default ? colors.accent.cyan : colors.text.primary,
                          }}>
                            {v.name}
                          </span>
                          {v.default && <span style={styles.defaultBadge}>default</span>}
                        </div>
                        <div style={styles.variationTargets}>
                          {v.targetWeight != null && (
                            <span style={styles.targetChip}>{v.targetWeight} lbs</span>
                          )}
                          {(v.weightFields || []).map((field) => (
                            <span key={field.key} style={styles.targetChip}>
                              {field.label}: {field.targetWeight} lbs
                            </span>
                          ))}
                          {v.targetInclineDegrees != null && (
                            <span style={styles.targetChip}>{v.targetInclineDegrees}° incline</span>
                          )}
                          {v.targetReps != null && (
                            <span style={styles.targetChip}>{v.targetReps} reps</span>
                          )}
                          {v.targetSets != null && (
                            <span style={styles.targetChip}>{v.targetSets} sets</span>
                          )}
                          {v.cableSetting != null && (
                            <span style={styles.targetChip}>Cable: {v.cableSetting || '—'}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anatomy visualization */}
                {anatomyGroups.length > 0 && (
                  <div style={styles.anatomySection}>
                    <h4 style={styles.sectionLabel}>Muscles Worked</h4>
                    <div style={styles.anatomyGrid}>
                      {anatomyGroups.map(group => (
                        <div key={group} style={styles.anatomyItem}>
                          <AnatomyDiagram group={group} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={() => navigate(1)}
            style={styles.navArrow}
            disabled={filteredExercises.length <= 1}
          >
            <ChevronRight size={28} />
          </button>
        </div>
      )}

      {/* ── Admin actions ── */}
      {isAdmin && (
        <div style={styles.adminActions}>
          {!showAddExisting && !showNewForm && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowAddExisting(true); setShowNewForm(false); }}
                style={styles.actionBtn}
              >
                <Copy size={16} /> Add Existing to Day
              </button>
              <button
                onClick={() => { setShowNewForm(true); setShowAddExisting(false); }}
                style={styles.actionBtn}
              >
                <Plus size={16} /> New Exercise
              </button>
            </div>
          )}

          {/* ── Add Existing Exercise panel ── */}
          {showAddExisting && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.panel}
            >
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>Add Existing Exercise</h3>
                <button onClick={() => { setShowAddExisting(false); setAddSearchText(''); }} style={styles.closeBtn}>
                  <X size={18} />
                </button>
              </div>

              {/* Target day selector */}
              <div style={{ marginBottom: 12 }}>
                <label style={styles.fieldLabel}>Add to Day:</label>
                <div style={styles.dayStrip}>
                  {getDays().map((day) => {
                    return (
                      <button
                        key={day.slug}
                        onClick={() => setAddTargetDay(day.slug)}
                        style={{
                          ...styles.dayPill,
                          ...(day.slug === addTargetDay ? styles.dayPillEnabled : styles.dayPillDisabled),
                        }}
                        title={day.name}
                      >
                        {day.number}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search */}
              <div style={{ ...styles.searchRow, marginBottom: 12 }}>
                <Search size={16} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search exercises to add..."
                  value={addSearchText}
                  onChange={e => setAddSearchText(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              {/* Exercise list */}
              <div style={styles.addList}>
                {addableExercises.length === 0 ? (
                  <div style={{ padding: 16, color: colors.text.tertiary, textAlign: 'center', fontSize: 13 }}>
                    No exercises available to add.
                  </div>
                ) : (
                  addableExercises.map(ex => (
                    <div key={`${ex.daySlug}-${ex.name}`} style={styles.addListItem}>
                      <div>
                        <span style={{ color: colors.text.primary, fontWeight: 500, fontSize: 14 }}>
                          {ex.name}
                        </span>
                        {ex.equipment && (
                          <span style={{ color: colors.text.tertiary, fontSize: 12, marginLeft: 8 }}>
                            ({ex.equipment})
                          </span>
                        )}
                        <span style={styles.fromDayBadge}>Day {getDayInfo(ex.daySlug)?.number ?? '—'}</span>
                      </div>
                      <button
                        onClick={() => handleAddExisting(ex)}
                        disabled={adding}
                        style={styles.addBtn}
                      >
                        {adding ? '...' : 'Add'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ── New Exercise form ── */}
          {showNewForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.panel}
            >
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>New Exercise</h3>
                <button onClick={() => setShowNewForm(false)} style={styles.closeBtn}>
                  <X size={18} />
                </button>
              </div>

              {/* Target day */}
              <div style={{ marginBottom: 12 }}>
                <label style={styles.fieldLabel}>Day:</label>
                <div style={styles.dayStrip}>
                  {getDays().map((day) => {
                    return (
                      <button
                        key={day.slug}
                        onClick={() => setNewTargetDay(day.slug)}
                        style={{
                          ...styles.dayPill,
                          ...(day.slug === newTargetDay ? styles.dayPillEnabled : styles.dayPillDisabled),
                        }}
                        title={day.name}
                      >
                        {day.number}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                placeholder="Exercise name *"
                value={newExercise.name}
                onChange={e => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Equipment (e.g. Smith Machine, Dumbbells)"
                value={newExercise.equipment}
                onChange={e => setNewExercise(prev => ({ ...prev, equipment: e.target.value }))}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={newExercise.notes}
                onChange={e => setNewExercise(prev => ({ ...prev, notes: e.target.value }))}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Tags (comma-separated, e.g. compound, press, chest)"
                value={newExercise.tags}
                onChange={e => setNewExercise(prev => ({ ...prev, tags: e.target.value }))}
                style={styles.input}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Weight (lbs)"
                  value={newExercise.targetWeight}
                  onChange={e => setNewExercise(prev => ({ ...prev, targetWeight: e.target.value }))}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Reps"
                  value={newExercise.targetReps}
                  onChange={e => setNewExercise(prev => ({ ...prev, targetReps: e.target.value }))}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Sets"
                  value={newExercise.targetSets}
                  onChange={e => setNewExercise(prev => ({ ...prev, targetSets: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <button
                onClick={handleAddNew}
                disabled={adding || !newExercise.name.trim()}
                style={{
                  ...styles.submitBtn,
                  opacity: adding || !newExercise.name.trim() ? 0.5 : 1,
                }}
              >
                {adding ? 'Adding...' : 'Add Exercise'}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 10,
    padding: '8px 14px',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: colors.text.primary,
    fontSize: 14,
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.text.tertiary,
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
  },

  filterSection: {
    marginBottom: 10,
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  dayStrip: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  dayPill: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  dayPillEnabled: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderColor: colors.accent.cyan,
    color: colors.accent.cyan,
  },
  dayPillDisabled: {
    backgroundColor: colors.bg.surface,
    borderColor: colors.border.subtle,
    color: colors.text.disabled,
  },
  smallBtn: {
    background: 'transparent',
    border: `1px solid ${colors.border.subtle}`,
    color: colors.text.tertiary,
    fontSize: 11,
    padding: '4px 8px',
    borderRadius: 6,
    cursor: 'pointer',
  },

  tagFilterWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  tagPill: {
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    border: `1px solid ${colors.border.subtle}`,
    backgroundColor: colors.bg.surface,
    color: colors.text.tertiary,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tagPillActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderColor: colors.accent.cyan,
    color: colors.accent.cyan,
  },

  // Carousel
  carouselWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },
  navArrow: {
    background: 'transparent',
    border: 'none',
    color: colors.text.tertiary,
    cursor: 'pointer',
    padding: 8,
    marginTop: 120,
    borderRadius: 8,
    flexShrink: 0,
  },
  cardContainer: {
    flex: 1,
    minHeight: 300,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.bg.raised,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 16,
    padding: 24,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.accent.cyan,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  dayBadgeName: {
    color: colors.text.tertiary,
    fontWeight: 400,
    marginLeft: 8,
    textTransform: 'none',
  },
  counter: {
    fontSize: 12,
    color: colors.text.disabled,
    fontFamily: 'monospace',
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: 900,
    color: colors.text.primary,
    margin: '4px 0 8px',
    lineHeight: 1.2,
  },
  equipmentLine: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  locationBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 6,
    backgroundColor: colors.bg.overlay,
    color: colors.text.tertiary,
  },
  notes: {
    fontSize: 13,
    color: colors.text.tertiary,
    margin: '0 0 12px',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  tagChip: {
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: colors.bg.overlay,
    color: colors.text.secondary,
  },

  // Variations
  variationsSection: {
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  variationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  variationCard: {
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${colors.border.subtle}`,
    backgroundColor: colors.bg.surface,
  },
  variationDefault: {
    borderColor: 'rgba(34, 211, 238, 0.3)',
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
  },
  variationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  defaultBadge: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '1px 5px',
    borderRadius: 4,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    color: colors.accent.cyan,
  },
  variationTargets: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  targetChip: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Anatomy
  anatomySection: {
    marginTop: 20,
  },
  anatomyGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  anatomyItem: {
    width: 140,
    flexShrink: 0,
  },

  // Admin actions
  adminActions: {
    marginTop: 20,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    borderRadius: 10,
    border: `2px dashed ${colors.border.strong}`,
    backgroundColor: 'transparent',
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  panel: {
    backgroundColor: colors.bg.raised,
    border: `1px solid rgba(34, 211, 238, 0.3)`,
    borderRadius: 14,
    padding: 20,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.text.tertiary,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
    display: 'block',
  },

  addList: {
    maxHeight: 280,
    overflowY: 'auto',
    borderRadius: 8,
    border: `1px solid ${colors.border.subtle}`,
  },
  addListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: `1px solid ${colors.border.subtle}`,
  },
  fromDayBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.accent.cyan,
    marginLeft: 8,
  },
  addBtn: {
    padding: '4px 14px',
    borderRadius: 6,
    border: `1px solid ${colors.accent.cyan}`,
    backgroundColor: 'transparent',
    color: colors.accent.cyan,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },

  input: {
    width: '100%',
    backgroundColor: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 8,
    padding: '10px 14px',
    color: colors.text.primary,
    fontSize: 14,
    outline: 'none',
    marginBottom: 8,
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '12px 0',
    borderRadius: 10,
    border: 'none',
    background: `linear-gradient(to right, ${colors.accent.cyan}, ${colors.accent.blue})`,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    marginTop: 4,
  },
};
