// Soreness journal tab — tracks muscle soreness caused by a specific workout.
//
// Public: anyone can view. Admin: can add/edit entries.
//
// An entry names the workout that caused the soreness, and you log against that
// same workout repeatedly as it fades. Squat on the 19th, then log level 7 on
// the 20th, 5 on the 21st, 2 on the 22nd — those three entries are one recovery
// curve, which is what the Timeline view draws. Every record has its own id;
// date and originating workout are editable attributes, not hidden identity.
//
// Entries written before workout attribution existed have no source workout and
// show up as "unattributed"; they still render and can still be edited.
//
// Data model: { id, date, level, muscles: [{ group, muscle, level }],
//               sourceWorkoutId, sourceWorkoutDaySlug, sourceWorkoutDay,
//               sourceWorkoutDate }.

import { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch } from '../api/client';
import { useDataSource } from '../api/snapshotContext.jsx';
import { MUSCLE_TAXONOMY, MUSCLE_GROUPS, searchMuscles } from '../utils/muscleTaxonomy';
import { todayLocal } from '../utils/dateUtils';
import { getDayInfo, describeLoggedDay } from '../utils/dayConfig';
import { dayColor, pad2, sorenessTierColor } from '../utils/dayDesign';
import { buildRecoveryCurves, daysBetween, groupsForDay, sorenessDocId } from '../utils/sorenessLink';
import { AnatomyDiagram } from './AnatomyDiagrams';
import { SorenessLanes } from './SorenessLanes';
import { colors } from '../colors';
import { Check, Wrench, ChevronLeft } from 'lucide-react';

// Map soreness levels to colors (green → yellow → red gradient)
function getLevelColor(level) {
  if (level <= 2) return colors.accent.green;
  if (level <= 4) return colors.accent.cyan;
  if (level <= 6) return colors.accent.gold;
  if (level <= 8) return colors.accent.amber;
  return colors.accent.red;
}

function getLevelLabel(level) {
  if (level <= 2) return 'Mild';
  if (level <= 4) return 'Noticeable';
  if (level <= 6) return 'Moderate';
  if (level <= 8) return 'Significant';
  return 'Severe';
}

// Legacy entries stored intensity only on each muscle. New entries have one
// record-level intensity; deriving the old value keeps historical rows editable.
function entryLevel(entry) {
  if (Number.isInteger(entry?.level) && entry.level >= 1 && entry.level <= 10) {
    return entry.level;
  }
  const levels = (entry?.muscles || []).map((m) => m.level).filter(Number.isFinite);
  return levels.length ? Math.max(...levels) : null;
}

// Format date as "Mon, Jan 15"
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Format date as "Jan 15"
function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// "today" / "1 day later" / "3 days later"
function relativeLabel(offset) {
  if (offset === 0) return 'same day';
  return `${offset} day${offset === 1 ? '' : 's'} later`;
}

// Alias for readability within this component
const todayStr = todayLocal;

// Normalise a logged-workout document into the compact source shape the editor
// and the saved entry both use.
function toSource(workout) {
  if (!workout) return null;
  return {
    id: workout.id,
    daySlug: workout.daySlug,
    dayNumber: workout.dayNumber,
    dayName: describeLoggedDay(workout),
    date: workout.date,
  };
}

function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return mobile;
}

export function SorenessTab({
  isAdmin,
  view = 'lanes',
  viewToggle,
  initialSource = null,
  onSourceConsumed,
  initialEditEntry = null,
  onEditConsumed,
  onOpenWorkout,
  onOpenCardio,
  onOpenSoreness,
}) {
  const [entries, setEntries] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [cardioSessions, setCardioSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { fetchSoreness, fetchWorkouts, fetchCardioSessions, isReady } = useDataSource();
  const isMobile = useIsMobile();

  // Editor state
  const [editing, setEditing] = useState(false);
  const [editorStep, setEditorStep] = useState('source'); // 'source' | 'muscles'
  // True while the source picker was reached from "Change workout" mid-edit, as
  // opposed to starting a new entry. Re-attributing an entry must not throw away
  // the muscles and date already filled in.
  const [changingSource, setChangingSource] = useState(false);
  const [editDate, setEditDate] = useState(todayStr());
  const [editSource, setEditSource] = useState(null); // { id, daySlug, dayNumber, dayName, date }
  const [originalId, setOriginalId] = useState(null); // pre-edit doc id, for moves
  const [editLevel, setEditLevel] = useState(null);
  const [editMuscles, setEditMuscles] = useState([]);
  const [saving, setSaving] = useState(false);

  // Muscle picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredMuscle, setHoveredMuscle] = useState(null); // { group, muscle } for diagram highlight
  const [showAllGroups, setShowAllGroups] = useState(false); // escape hatch past the day filter

  // List view — pinned muscle stays visible; hover temporarily overrides
  const [pinnedMuscle, setPinnedMuscle] = useState(null); // { group, muscle }
  const [listHover, setListHover] = useState(null); // { group, muscle }

  // Fetch the recovery records and the strength/cardio activity that gives
  // them context on the shared date rail.
  useEffect(() => {
    if (!isReady) return;
    loadData();
  }, [isReady]);

  async function loadData() {
    try {
      setLoading(true);
      const [sorenessData, workoutData, cardioData] = await Promise.all([
        fetchSoreness(),
        fetchWorkouts(),
        fetchCardioSessions(),
      ]);
      setEntries(sorenessData.entries || []);
      setWorkouts(workoutData.workouts || []);
      setCardioSessions(cardioData.sessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Workouts, newest first — the order both the source picker and timeline want.
  const workoutsByDate = useMemo(
    () => [...workouts].sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '')),
    [workouts],
  );

  // Arriving from "Log soreness" on a workout elsewhere in the app: open the
  // editor straight onto that workout, skipping the source picker.
  const consumedSource = useRef(null);
  const sourceConsumedCallback = useRef(onSourceConsumed);
  const beginCreateCallback = useRef(beginCreateForWorkout);
  sourceConsumedCallback.current = onSourceConsumed;
  beginCreateCallback.current = beginCreateForWorkout;
  useEffect(() => {
    if (!initialSource || consumedSource.current === initialSource) return;
    consumedSource.current = initialSource;
    beginCreateCallback.current(initialSource);
    sourceConsumedCallback.current?.();
  }, [initialSource]);

  const consumedEdit = useRef(null);
  const editConsumedCallback = useRef(onEditConsumed);
  const startEditCallback = useRef(startEdit);
  editConsumedCallback.current = onEditConsumed;
  startEditCallback.current = startEdit;
  useEffect(() => {
    if (!initialEditEntry || consumedEdit.current === initialEditEntry) return;
    consumedEdit.current = initialEditEntry;
    startEditCallback.current(initialEditEntry);
    editConsumedCallback.current?.();
  }, [initialEditEntry]);

  // Search results, restricted to the source day's groups unless overridden
  const visibleGroups = useMemo(() => {
    if (showAllGroups || !editSource) return MUSCLE_GROUPS;
    return groupsForDay(editSource.daySlug);
  }, [showAllGroups, editSource]);

  const searchResults = useMemo(() => {
    const all = searchMuscles(searchQuery);
    if (showAllGroups || !editSource) return all;
    return all.filter((r) => visibleGroups.includes(r.group));
  }, [searchQuery, visibleGroups, showAllGroups, editSource]);

  // The global Add action opens the workout browser. Choosing a workout is
  // navigation to its detail page, never an implicit create or edit command.
  function startNew() {
    setChangingSource(false);
    setEditorStep('source');
    setEditing(true);
    resetPicker();
  }

  function showWorkout(workout) {
    setEditing(false);
    setChangingSource(false);
    resetPicker();
    onOpenWorkout?.(workout);
  }

  // Only the explicit Add soreness command on a workout detail page reaches
  // this function. It always starts a clean record.
  function beginCreateForWorkout(workout = null) {
    const source = workout ? toSource(workout) : null;
    setEditDate(todayStr());
    setEditSource(source);
    setOriginalId(null);
    setEditLevel(null);
    setEditMuscles([]);
    setShowAllGroups(!source);
    setChangingSource(false);
    setEditorStep('muscles');
    setEditing(true);
    resetPicker();
  }

  // Changing the source is an explicit edit action and preserves every other
  // field on the record.
  function changeEntrySource(source) {
    setEditSource(source);
    setShowAllGroups(!source);
    setChangingSource(false);
    setEditorStep('muscles');
    resetPicker();
  }

  // Edit an existing entry.
  function startEdit(entry) {
    setEditDate(entry.date);
    setEditSource(
      entry.sourceWorkoutId
        ? {
            id: entry.sourceWorkoutId,
            daySlug: entry.sourceWorkoutDaySlug,
            dayNumber: entry.sourceWorkoutDay,
            dayName: getDayInfo(entry.sourceWorkoutDaySlug)?.name || `Day ${entry.sourceWorkoutDay}`,
            date: entry.sourceWorkoutDate,
          }
        : null,
    );
    setShowAllGroups(!entry.sourceWorkoutId);
    setOriginalId(entry.id || sorenessDocId(entry.date, entry.sourceWorkoutId));
    setEditLevel(entryLevel(entry));
    setEditMuscles(entry.muscles.map((m) => ({ ...m })));
    setEditorStep('muscles');
    setEditing(true);
    resetPicker();
  }

  function resetPicker(open = false) {
    setPickerOpen(open);
    setExpandedGroup(null);
    setSearchQuery('');
    setHoveredMuscle(null);
  }

  // Select a muscle in the draft. The picker stays open: Save, not the muscle
  // row, is the action that commits the visible selection.
  function selectMuscle(group, muscleName) {
    setEditMuscles((current) => {
      if (current.some(m => m.group === group && m.muscle === muscleName)) return current;

      // A whole-group selection and its individual muscles are alternative
      // levels of specificity, so replace one with the other within a group.
      const withoutConflicts = muscleName === null
        ? current.filter(m => m.group !== group)
        : current.filter(m => !(m.group === group && m.muscle === null));
      return [...withoutConflicts, { group, muscle: muscleName, level: editLevel || 1 }];
    });
  }

  // Expanding a previously untouched group visibly primes its general option.
  // If that group already has draft selections, expanding it only reveals them.
  function expandAndSelectGroup(group) {
    if (expandedGroup === group) {
      setExpandedGroup(null);
      return;
    }
    setExpandedGroup(group);
    if (!editMuscles.some(m => m.group === group)) selectMuscle(group, null);
  }

  // Remove a muscle from the edit
  function removeMuscle(index) {
    setEditMuscles(editMuscles.filter((_, i) => i !== index));
  }

  // Save the entry
  async function saveEntry() {
    if (editLevel == null) {
      setError('Choose an overall soreness intensity.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const cleanMuscles = editMuscles.map(({ carryForward, ...rest }) => ({ ...rest, level: editLevel }));
      await apiFetch(originalId ? `/api/soreness/${encodeURIComponent(originalId)}` : '/api/soreness', {
        method: originalId ? 'PUT' : 'POST',
        body: JSON.stringify({
          date: editDate,
          level: editLevel,
          muscles: cleanMuscles,
          sourceWorkoutId: editSource?.id || null,
          sourceWorkoutDaySlug: editSource?.daySlug || null,
          sourceWorkoutDay: editSource?.dayNumber ?? null,
          sourceWorkoutDate: editSource?.date || null,
        }),
      });
      setEditing(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Remove the entry being edited. Only reachable for an entry that already
  // exists — there is nothing to delete before the first save.
  async function deleteEntry() {
    if (!originalId) return;
    try {
      setSaving(true);
      setError(null);
      await apiFetch(`/api/soreness/${encodeURIComponent(originalId)}`, { method: 'DELETE' });
      setEditing(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ color: colors.text.tertiary, padding: 24 }}>Loading soreness data...</div>;
  }

  // The group to show in the diagram panel — either the expanded picker group or
  // the hovered muscle's group (hovered takes priority for search results).
  const diagramGroup = hoveredMuscle?.group || expandedGroup;

  // ── Source picker step ───────────────────────────────────────────────
  if (editing && isAdmin && editorStep === 'source') {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => {
              if (changingSource) {
                setChangingSource(false);
                setEditorStep('muscles');
              } else {
                setEditing(false);
              }
            }}
            style={styles.backBtn}
          >
            <ChevronLeft size={13} style={{ verticalAlign: -2 }} /> Back
          </button>
          <h2 style={styles.heading}>{changingSource ? 'Change originating workout' : 'Workouts'}</h2>
        </div>
        <p style={{ color: colors.text.tertiary, fontSize: 12, margin: '0 0 18px 0' }}>
          {changingSource
            ? 'Choose a different workout. The rest of the soreness record stays intact.'
            : 'Select a workout to view it and its associated soreness records.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 460, overflowY: 'auto' }}>
          {workoutsByDate.length === 0 && (
            <p style={{ color: colors.text.tertiary, fontSize: 13 }}>No logged workouts to attribute to.</p>
          )}
          {workoutsByDate.map((w) => {
            const since = daysBetween(w.date, todayStr());
            const logged = entries.filter((e) => e.sourceWorkoutId === w.id).length;
            return (
              <button
                key={w.id}
                onClick={() => changingSource ? changeEntrySource(toSource(w)) : showWorkout(w)}
                style={styles.sourceOption}
              >
                <span style={{ ...styles.dayChip, borderColor: dayColor(w.daySlug) }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: dayColor(w.daySlug) }} />
                  D{pad2(w.dayNumber)}
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text.primary }}>
                    {describeLoggedDay(w)}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: colors.text.tertiary }}>
                    {formatShortDate(w.date)} · {since === 0 ? 'today' : `${since} day${since === 1 ? '' : 's'} ago`}
                    {logged > 0 && ` · ${logged} soreness log${logged === 1 ? '' : 's'}`}
                  </span>
                </span>
                <span style={styles.sourceAction}>{changingSource ? 'Select workout' : 'View workout'} →</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => changingSource ? changeEntrySource(null) : beginCreateForWorkout(null)}
          style={{ ...styles.sourceOption, marginTop: 12, borderStyle: 'dashed' }}
        >
          <span style={{ fontSize: 13, color: colors.text.secondary }}>
            {changingSource ? 'Remove originating workout' : 'Add soreness without an originating workout'}
          </span>
          <span style={{ ...styles.sourceAction, marginLeft: 'auto' }}>
            {changingSource ? 'Remove link' : 'Create record'} →
          </span>
        </button>
      </div>
    );
  }

  // ── Muscle editor step ───────────────────────────────────────────────
  if (editing && isAdmin) {
    const offset = editSource?.date ? daysBetween(editSource.date, editDate) : null;
    const filtered = !showAllGroups && editSource;
    const isEditingEntry = Boolean(originalId);
    const canSave = editLevel != null;
    const saveSummary = editLevel == null
      ? 'Choose an overall intensity'
      : `Intensity ${editLevel} · ${editMuscles.length === 0
        ? 'no muscles specified'
        : `${editMuscles.length} muscle${editMuscles.length === 1 ? '' : 's'}`}`;

    return (
      <div style={{ maxWidth: 960 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button onClick={() => setEditing(false)} style={styles.backBtn}>
            <ChevronLeft size={13} style={{ verticalAlign: -2 }} /> Back
          </button>
          <h2 style={styles.heading}>{isEditingEntry ? 'Edit soreness' : 'Add soreness'}</h2>
        </div>
        <p style={{ color: colors.text.tertiary, fontSize: 12, margin: '0 0 14px 0' }}>
          {isEditingEntry ? `Editing ${formatDate(editDate)}` : `New entry for ${formatDate(editDate)}`}
        </p>

        {/* Originating workout */}
        <div style={styles.fieldLabel}>Originating workout</div>
        <div style={styles.sourceBanner}>
          {editSource ? (
            <>
              <span style={{ ...styles.dayChip, borderColor: dayColor(editSource.daySlug) }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dayColor(editSource.daySlug) }} />
                D{pad2(editSource.dayNumber)}
              </span>
              <span style={{ fontSize: 13, color: colors.text.primary, fontWeight: 600 }}>{editSource.dayName}</span>
              <span style={{ fontSize: 11, color: colors.text.tertiary }}>
                {formatShortDate(editSource.date)}
                {offset != null && ` · soreness logged ${relativeLabel(offset)}`}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: colors.text.tertiary }}>Not attributed to a workout</span>
          )}
          <span style={{ flex: 1 }} />
          <button onClick={() => { setChangingSource(true); setEditorStep('source'); }} style={styles.linkBtn}>
            {editSource ? 'Change workout' : 'Link a workout'}
          </button>
        </div>

        {offset != null && offset < 0 && (
          <p style={{ color: colors.accent.amber, fontSize: 12, margin: '0 0 12px 0' }}>
            This date is before the workout — soreness can't precede its cause.
          </p>
        )}

        {/* Date picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: colors.text.secondary, fontSize: 12, marginRight: 8 }}>Date:</label>
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>

        <div style={styles.fieldLabel}>Overall intensity</div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(32px, 1fr))', gap: 6, maxWidth: 560 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => { setEditLevel(level); setError(null); }}
                aria-pressed={editLevel === level}
                style={{
                  ...styles.intensityBtn,
                  ...(editLevel === level ? {
                    color: colors.bg.base,
                    background: getLevelColor(level),
                    borderColor: getLevelColor(level),
                  } : {}),
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <div style={{ minHeight: 18, marginTop: 6, color: editLevel ? getLevelColor(editLevel) : colors.text.tertiary, fontSize: 12 }}>
            {editLevel ? getLevelLabel(editLevel) : 'Choose 1–10'}
          </div>
        </div>

        {/* Two-column layout: left = muscles + picker, right = anatomy diagram (single column on mobile) */}
        <div style={{ display: 'flex', gap: isMobile ? 16 : 24, alignItems: 'flex-start', overflowX: isMobile ? 'auto' : undefined }}>
          {/* Left column — muscle list + picker */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.fieldLabel}>Muscles (optional)</div>
            <div style={{ marginBottom: 16 }}>
              {editMuscles.length === 0 ? (
                <p style={{ color: colors.text.tertiary, fontSize: 13, margin: '0 0 10px' }}>
                  No muscles specified.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {editMuscles.map((m, i) => (
                    <div key={`${m.group}-${m.muscle || 'group'}`} style={styles.muscleEntry}>
                      <Check size={15} color={colors.accent.cyan} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: colors.text.primary, fontWeight: 600 }}>
                          {m.muscle || m.group}
                        </div>
                        {m.muscle && <div style={{ fontSize: 11, color: colors.text.tertiary }}>{m.group}</div>}
                      </div>
                      <button onClick={() => removeMuscle(i)} style={styles.removeBtn} aria-label={`Remove ${m.muscle || m.group}`}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Muscle draft picker */}
            {!pickerOpen ? (
              <button onClick={() => setPickerOpen(true)} style={styles.addBtn}>
                {editMuscles.length ? '+ Add or change muscles' : '+ Add optional muscles'}
              </button>
            ) : (
              <MusclePicker
                groups={visibleGroups}
                filtered={filtered}
                sourceLabel={editSource?.dayName}
                onShowAll={() => setShowAllGroups(true)}
                expandedGroup={expandedGroup}
                onExpandGroup={expandAndSelectGroup}
                onSelect={selectMuscle}
                onClose={() => { setPickerOpen(false); setSearchQuery(''); setHoveredMuscle(null); }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchResults={searchResults}
                existingMuscles={editMuscles}
                onHoverMuscle={setHoveredMuscle}
              />
            )}

            {error && <p style={{ color: colors.accent.red, fontSize: 12, marginTop: 8 }}>{error}</p>}
          </div>

          {/* Right column — anatomy diagram, shown when picker is open and a group is active */}
          {pickerOpen && diagramGroup && (
            <div style={{ ...styles.diagramPanel, ...(isMobile ? { width: 220, flexShrink: 0 } : {}) }}>
              <AnatomyDiagram group={diagramGroup} highlightMuscle={hoveredMuscle?.muscle} />
              {hoveredMuscle?.muscle && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.accent.cyan }}>
                    {hoveredMuscle.muscle}
                  </div>
                  <div style={{ fontSize: 11, color: colors.text.tertiary }}>
                    {MUSCLE_TAXONOMY[hoveredMuscle.group]?.muscles.find(
                      m => m.name === hoveredMuscle.muscle
                    )?.location}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky commit bar — the selection scrolls, the action never disappears. */}
        <div style={styles.saveBar}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ color: colors.text.tertiary, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {isEditingEntry ? 'Editing soreness' : 'New soreness entry'}
            </div>
            <div style={{ color: canSave ? colors.text.primary : colors.text.secondary, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {saveSummary}
            </div>
          </div>
          <button
            onClick={saveEntry}
            disabled={saving || !canSave}
            style={{ ...styles.saveBtn, ...(!canSave ? styles.disabledBtn : {}) }}
          >
            {saving ? 'Saving...' : isEditingEntry ? 'Save changes' : 'Create soreness'}
          </button>
          <button onClick={() => setEditing(false)} style={styles.cancelBtn}>
            Cancel
          </button>
          {originalId && (
            <button
              onClick={deleteEntry}
              disabled={saving}
              style={{ ...styles.cancelBtn, color: colors.accent.red }}
            >
              Delete entry
            </button>
          )}
        </div>
      </div>
    );
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      <div>
        <h2 style={styles.heading}>
          {view === 'lanes' ? 'Activity & Recovery' : view === 'timeline' ? 'Recovery Timeline' : 'Soreness Journal'}
        </h2>
        <p style={{ color: colors.text.tertiary, fontSize: 12, margin: '4px 0 0 0' }}>
          {view === 'journal'
            ? 'Soreness logged per workout'
            : view === 'lanes'
              ? 'Strength, cardio, and recovery over time'
              : 'Each workout and the soreness it caused'}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {viewToggle}
        {isAdmin && (
          <button onClick={startNew} style={styles.addBtn}>
            + Add soreness
          </button>
        )}
      </div>
    </div>
  );

  // ── Lanes view ───────────────────────────────────────────────────────
  if (view === 'lanes') {
    return (
      <div style={{ width: '100%', maxWidth: 1200, minWidth: 0, boxSizing: 'border-box' }}>
        {header}
        {error && <p style={{ color: colors.accent.red, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <SorenessLanes
          entries={entries}
          workouts={workoutsByDate}
          cardioSessions={cardioSessions}
          onOpenWorkout={showWorkout}
          onOpenCardio={onOpenCardio}
        />
      </div>
    );
  }

  // ── Timeline view ────────────────────────────────────────────────────
  if (view === 'timeline') {
    return (
      <div style={{ width: '100%', maxWidth: 1000, minWidth: 0, boxSizing: 'border-box' }}>
        {header}
        {error && <p style={{ color: colors.accent.red, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <RecoveryTimeline
          workouts={workoutsByDate}
          entries={entries}
          isAdmin={isAdmin}
          isMobile={isMobile}
          onOpenWorkout={showWorkout}
          onOpenSoreness={onOpenSoreness}
          onEditEntry={startEdit}
        />
      </div>
    );
  }

  // Active muscle for the diagram: hover takes priority, then pinned
  const activeMuscle = listHover || pinnedMuscle;
  const activeDiagramGroup = activeMuscle?.group;

  // ── Journal (list) view ──────────────────────────────────────────────
  return (
    <div style={{ maxWidth: isMobile ? undefined : 1000 }}>
      {header}
      {error && <p style={{ color: colors.accent.red, fontSize: 12, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: isMobile ? 16 : 24, alignItems: 'flex-start', overflowX: 'auto' }}>
        {/* Left column — entry list */}
        <div style={{ flex: '1 0 auto', minWidth: 0, ...(isMobile ? { width: 'calc(100vw - 80px)' } : {}) }}>
          {entries.length === 0 ? (
            <p style={{ color: colors.text.tertiary, fontSize: 14 }}>No soreness entries yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map((entry) => {
                const offset =
                  entry.sourceWorkoutDate ? daysBetween(entry.sourceWorkoutDate, entry.date) : null;
                return (
                  <div
                    key={entry.id || sorenessDocId(entry.date, entry.sourceWorkoutId)}
                    role={onOpenSoreness ? 'button' : undefined}
                    tabIndex={onOpenSoreness ? 0 : undefined}
                    onClick={() => onOpenSoreness?.(entry)}
                    onKeyDown={(event) => {
                      if (onOpenSoreness && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        onOpenSoreness(entry);
                      }
                    }}
                    style={{
                      ...styles.entryRow,
                      cursor: onOpenSoreness ? 'pointer' : 'default',
                      ...(isMobile ? { flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '10px 12px' } : {}),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                      <div>
                        <div style={{ fontSize: 13, color: colors.text.secondary, fontWeight: 600 }}>
                          {formatDate(entry.date)}
                        </div>
                        <div style={{ fontSize: 10, color: colors.text.disabled }}>{entry.date}</div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(event) => { event.stopPropagation(); startEdit(entry); }}
                          style={styles.editIconBtn}
                          title="Edit soreness"
                        >
                          <Wrench size={13} />
                          Edit
                        </button>
                      )}
                    </div>
                    <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {/* Originating workout */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        {entry.sourceWorkoutId ? (
                          <>
                            <span style={{ ...styles.dayChip, borderColor: dayColor(entry.sourceWorkoutDaySlug) }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: dayColor(entry.sourceWorkoutDaySlug) }} />
                              D{pad2(entry.sourceWorkoutDay)}
                            </span>
                            <span style={{ fontSize: 11, color: colors.text.tertiary }}>
                              {getDayInfo(entry.sourceWorkoutDaySlug)?.name}
                              {offset != null && ` · ${relativeLabel(offset)}`}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: colors.text.disabled, fontStyle: 'italic' }}>
                            unattributed
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ color: entryLevel(entry) ? getLevelColor(entryLevel(entry)) : colors.accent.amber, fontSize: 13, fontWeight: 700 }}>
                          {entryLevel(entry) ? `Intensity ${entryLevel(entry)}` : 'Intensity not recorded'}
                        </span>
                      </div>
                      {entry.muscles.map((m) => {
                        const isPinned = pinnedMuscle?.group === m.group && pinnedMuscle?.muscle === m.muscle;
                        return (
                          <div
                            key={`${m.group}-${m.muscle || 'group'}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setPinnedMuscle(isPinned ? null : { group: m.group, muscle: m.muscle });
                            }}
                            onMouseEnter={() => setListHover({ group: m.group, muscle: m.muscle })}
                            onMouseLeave={() => setListHover(null)}
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 6,
                              fontSize: 13,
                              cursor: 'pointer',
                              borderRadius: 4,
                              padding: '1px 4px',
                              margin: '0 -4px',
                              backgroundColor: isPinned ? 'rgba(34, 211, 238, 0.08)' : 'transparent',
                            }}
                          >
                            <span style={{ color: isPinned ? colors.accent.cyan : colors.text.secondary }}>
                              {m.muscle
                                ? <>{m.group} <span style={{ color: colors.text.tertiary }}>›</span> {m.muscle}</>
                                : m.group
                              }
                            </span>
                          </div>
                        );
                      })}
                      {entry.muscles.length === 0 && (
                        <div style={{ fontSize: 12, color: colors.text.tertiary }}>
                          No muscles specified
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column — anatomy diagram (pinned or hovered muscle), scrollable on mobile */}
        <div style={{
          ...styles.diagramPanel,
          ...(isMobile ? { width: 220, flexShrink: 0 } : {}),
          opacity: activeDiagramGroup ? 1 : 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: activeDiagramGroup ? 'auto' : 'none',
        }}>
          {activeDiagramGroup ? (
            <>
              <AnatomyDiagram group={activeDiagramGroup} highlightMuscle={activeMuscle?.muscle} />
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.accent.cyan }}>
                  {activeMuscle?.muscle || activeDiagramGroup}
                </div>
                {activeMuscle?.muscle && (
                  <div style={{ fontSize: 11, color: colors.text.tertiary }}>
                    {MUSCLE_TAXONOMY[activeDiagramGroup]?.muscles.find(
                      m => m.name === activeMuscle.muscle
                    )?.location}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ height: 300 }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline — workout history and the soreness each workout caused, side by side
// ---------------------------------------------------------------------------
// Every workout in reverse-chronological order with its recovery curve beneath
// it. Workouts with nothing logged are still listed — the gaps are part of the
// picture, and they double as the entry point for logging.
function RecoveryTimeline({ workouts, entries, isAdmin, isMobile, onOpenWorkout, onOpenSoreness, onEditEntry }) {
  const curves = useMemo(() => buildRecoveryCurves(entries), [entries]);
  const unattributed = useMemo(
    () => entries.filter((e) => !e.sourceWorkoutId),
    [entries],
  );

  if (workouts.length === 0 && unattributed.length === 0) {
    return <p style={{ color: colors.text.tertiary, fontSize: 14 }}>No workouts logged yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {workouts.map((w) => (
        <WorkoutRecoveryCard
          key={w.id}
          workout={w}
          curve={curves.get(w.id)}
          isMobile={isMobile}
          onOpenWorkout={onOpenWorkout}
        />
      ))}

      {unattributed.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ ...styles.heading, fontSize: 15, marginBottom: 4 }}>Unattributed</h3>
          <p style={{ color: colors.text.tertiary, fontSize: 11, margin: '0 0 10px 0' }}>
            Logged without an originating workout — no recovery curve can be drawn for these.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unattributed.map((e) => (
              <div
                key={e.id || e.date}
                role={onOpenSoreness ? 'button' : undefined}
                tabIndex={onOpenSoreness ? 0 : undefined}
                onClick={() => onOpenSoreness?.(e)}
                onKeyDown={(event) => {
                  if (onOpenSoreness && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onOpenSoreness(e);
                  }
                }}
                style={{ ...styles.entryRow, gap: 12, cursor: onOpenSoreness ? 'pointer' : 'default' }}
              >
                <span style={{ fontSize: 12, color: colors.text.secondary, fontWeight: 600, minWidth: 110 }}>
                  {formatDate(e.date)}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: colors.text.tertiary }}>
                  {entryLevel(e) ? `Intensity ${entryLevel(e)}` : 'Intensity not recorded'}
                  {' · '}
                  {e.muscles.length ? e.muscles.map((m) => m.muscle || m.group).join(' · ') : 'No muscles specified'}
                </span>
                {isAdmin && (
                  <button onClick={(event) => { event.stopPropagation(); onEditEntry(e); }} style={styles.editIconBtn} title="Edit entry">
                    <Wrench size={13} /> Edit
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkoutRecoveryCard({ workout, curve, isMobile, onOpenWorkout }) {
  const color = dayColor(workout.daySlug);
  const span = curve ? Math.max(1, ...curve.muscles.map((m) => m.spanDays)) : 0;
  const columns = span + 1; // day 0 (the workout) through the last log
  const labelWidth = isMobile ? undefined : 150;

  return (
    <div style={{ ...styles.timelineCard, borderLeft: `3px solid ${color}` }}>
      {/* Header. On mobile the meta and action drop to their own line rather
          than being pushed off the right edge — the page itself never scrolls
          sideways, so anything overflowing here would be silently cut off. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ ...styles.dayChip, borderColor: color }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          D{pad2(workout.dayNumber)}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary }}>
          {describeLoggedDay(workout)}
        </span>
        <span style={{ fontSize: 11, color: colors.text.tertiary }}>{formatShortDate(workout.date)}</span>
        {!isMobile && <span style={{ flex: 1 }} />}
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', ...(isMobile ? { width: '100%' } : {}) }}>
          {curve ? (
            <span style={{ fontSize: 11, color: colors.text.tertiary }}>
              {curve.entries.length} log{curve.entries.length === 1 ? '' : 's'} · {curve.muscles.length} muscle
              {curve.muscles.length === 1 ? '' : 's'}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: colors.text.disabled, fontStyle: 'italic' }}>no soreness logged</span>
          )}
          <button onClick={() => onOpenWorkout(workout)} style={styles.linkBtn}>
            View workout
          </button>
        </span>
      </div>

      {curve && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 5 }}>
          {/* Day-offset ruler. Desktop keeps it in a column aligned with the
              muscle labels; mobile drops the label gutter and puts the muscle
              name on its own line above its strip. */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!isMobile && <span style={{ width: labelWidth, flexShrink: 0 }} />}
            <div style={styles.stripScroller}>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: columns }, (_, i) => (
                  <span key={i} style={styles.rulerCell}>{i === 0 ? 'W' : `+${i}`}</span>
                ))}
              </div>
            </div>
          </div>

          {curve.muscles.map((m) => (
            <div
              key={`${m.group}-${m.muscle || 'group'}`}
              style={{
                display: 'flex',
                gap: isMobile ? 4 : 12,
                alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
              }}
            >
              <span
                style={{
                  width: labelWidth,
                  maxWidth: '100%',
                  flexShrink: 0,
                  fontSize: 11,
                  color: colors.text.secondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={m.muscle ? `${m.group} › ${m.muscle}` : m.group}
              >
                {m.muscle || m.group}
              </span>

              {/* One cell per day since the workout; filled where a level was
                  logged. Long recoveries scroll inside the card. */}
              <div style={styles.stripScroller}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: columns }, (_, i) => {
                    const point = m.points.find((p) => p.dayOffset === i);
                    return (
                      <span
                        key={i}
                        title={
                          point
                            ? `${point.date} — level ${point.level}`
                            : undefined
                        }
                        style={{
                          ...styles.levelCell,
                          background: point ? sorenessTierColor(point.level) : 'rgba(255,255,255,0.04)',
                          color: point ? '#101010' : 'transparent',
                        }}
                      >
                        {point ? point.level : ''}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* The arrow sequence repeats what the cells already show, so it
                  only earns its space on desktop. */}
              {!isMobile && (
                <span style={{ fontSize: 11, color: colors.text.tertiary, whiteSpace: 'nowrap' }}>
                  {m.points.map((p) => p.level).join('→')}
                </span>
              )}
              <span
                style={{
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  color: m.resolved ? colors.accent.green : colors.accent.amber,
                }}
              >
                {m.resolved
                  ? `faded after ${m.spanDays} day${m.spanDays === 1 ? '' : 's'}`
                  : `still ${m.lastLevel} at day ${m.spanDays}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Muscle picker — browse groups or search.
// onHoverMuscle({ group, muscle }) drives the right-panel anatomy diagram.
// `groups` is narrowed to the source workout's muscles unless the user opts out.
// ---------------------------------------------------------------------------

function MusclePicker({ groups, filtered, sourceLabel, onShowAll, expandedGroup, onExpandGroup, onSelect, onClose, searchQuery, onSearchChange, searchResults, existingMuscles, onHoverMuscle }) {
  const isAlreadyAdded = (group, muscle) =>
    existingMuscles.some(m => m.group === group && m.muscle === muscle);
  const isGroupAdded = (group) =>
    existingMuscles.some(m => m.group === group && !m.muscle);

  return (
    <div style={styles.pickerContainer}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.primary }}>Select Muscle</span>
        <button onClick={onClose} style={styles.removeBtn}>✕</button>
      </div>

      {filtered && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 10px', borderRadius: 6, background: colors.bg.tertiary }}>
          <span style={{ fontSize: 11, color: colors.text.secondary, flex: 1 }}>
            Showing muscles worked by {sourceLabel}
          </span>
          <button onClick={onShowAll} style={{ fontSize: 11, color: colors.accent.cyan, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
            Show all
          </button>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search muscles..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={styles.searchInput}
        autoFocus
      />

      {/* Search results */}
      {searchQuery.length >= 2 ? (
        <div style={{ maxHeight: 400, overflowY: 'auto', marginTop: 8 }}>
          {searchResults.length === 0 ? (
            <p style={{ color: colors.text.tertiary, fontSize: 12 }}>
              No matches{filtered ? ' in this workout’s muscles' : ''}
            </p>
          ) : (
            searchResults.map((r) => (
              <button
                key={`${r.group}-${r.muscle || 'group'}`}
                onClick={() => onSelect(r.group, r.muscle)}
                onMouseEnter={() => onHoverMuscle({ group: r.group, muscle: r.muscle })}
                onMouseLeave={() => onHoverMuscle(null)}
                aria-pressed={r.muscle ? isAlreadyAdded(r.group, r.muscle) : isGroupAdded(r.group)}
                style={{
                  ...styles.muscleOption,
                  ...((r.muscle ? isAlreadyAdded(r.group, r.muscle) : isGroupAdded(r.group)) ? styles.selectedOption : {}),
                }}
              >
                <span style={styles.optionCheck}>
                  {(r.muscle ? isAlreadyAdded(r.group, r.muscle) : isGroupAdded(r.group)) ? <Check size={14} /> : null}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: r.muscle ? colors.text.primary : colors.accent.cyan, fontSize: 13, fontWeight: r.muscle ? 400 : 600 }}>
                    {r.muscle || `${r.group} (general)`}
                  </span>
                  <span style={{ display: 'block', color: colors.text.disabled, fontSize: 11 }}>
                    {r.muscle ? `${r.group} · ${r.location}` : 'Whole group'}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Group browse */
        <div style={{ maxHeight: 400, overflowY: 'auto', marginTop: 8 }}>
          {groups.map((group) => (
            <div key={group}>
              <button
                onClick={() => onExpandGroup(group)}
                aria-expanded={expandedGroup === group}
                style={{
                  ...styles.groupBtn,
                  backgroundColor: expandedGroup === group ? 'rgba(34, 211, 238, 0.06)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={styles.optionCheck}>
                    {existingMuscles.some(m => m.group === group) ? <Check size={14} /> : null}
                  </span>
                  <span style={{ color: colors.text.primary, fontSize: 13, fontWeight: 600 }}>{group}</span>
                </span>
                <span style={{ color: colors.text.disabled, fontSize: 11 }}>
                  {MUSCLE_TAXONOMY[group].muscles.length} muscles {expandedGroup === group ? '▾' : '▸'}
                </span>
              </button>

              {expandedGroup === group && (
                <div style={{ paddingLeft: 8 }}>
                  {/* Group-level option */}
                  <button
                    onClick={() => onSelect(group, null)}
                    onMouseEnter={() => onHoverMuscle({ group, muscle: null })}
                    onMouseLeave={() => onHoverMuscle(null)}
                    aria-pressed={isGroupAdded(group)}
                    style={{
                      ...styles.muscleOption,
                      backgroundColor: 'rgba(34, 211, 238, 0.05)',
                      ...(isGroupAdded(group) ? styles.selectedOption : {}),
                    }}
                  >
                    <span style={styles.optionCheck}>{isGroupAdded(group) ? <Check size={14} /> : null}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', color: colors.accent.cyan, fontSize: 13, fontWeight: 600 }}>{group} (general)</span>
                      <span style={{ display: 'block', color: colors.text.disabled, fontSize: 11 }}>Whole group, not a specific muscle</span>
                    </span>
                  </button>

                  {/* Muscle list — diagram moved to right panel */}
                  {MUSCLE_TAXONOMY[group].muscles.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => onSelect(group, m.name)}
                      onMouseEnter={() => onHoverMuscle({ group, muscle: m.name })}
                      onMouseLeave={() => onHoverMuscle(null)}
                      aria-pressed={isAlreadyAdded(group, m.name)}
                      style={{
                        ...styles.muscleOption,
                        ...(isAlreadyAdded(group, m.name) ? styles.selectedOption : {}),
                      }}
                    >
                      <span style={styles.optionCheck}>{isAlreadyAdded(group, m.name) ? <Check size={14} /> : null}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', color: colors.text.primary, fontSize: 13 }}>{m.name}</span>
                        <span style={{ display: 'block', color: colors.text.disabled, fontSize: 11 }}>{m.location}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  heading: {
    margin: 0,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'monospace',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    background: 'none',
    border: `1px solid ${colors.border.subtle}`,
    color: colors.text.secondary,
    padding: '4px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  linkBtn: {
    background: 'none',
    border: `1px solid ${colors.border.subtle}`,
    color: colors.accent.cyan,
    padding: '4px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  dayChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 8px',
    borderRadius: 9999,
    border: '1px solid',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'monospace',
    color: colors.text.secondary,
    flexShrink: 0,
  },
  sourceOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    background: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
  },
  sourceAction: {
    flexShrink: 0,
    color: colors.accent.cyan,
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'right',
  },
  fieldLabel: {
    marginBottom: 5,
    color: colors.text.tertiary,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  sourceBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    padding: '8px 12px',
    marginBottom: 14,
    background: colors.bg.raised,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 8,
  },
  timelineCard: {
    padding: '12px 14px',
    backgroundColor: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 8,
  },
  // Long recoveries scroll inside their own card rather than widening the page —
  // the app body never scrolls sideways, so overflow here would be cut off.
  stripScroller: {
    overflowX: 'auto',
    maxWidth: '100%',
    minWidth: 0,
  },
  rulerCell: {
    width: 22,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.text.disabled,
  },
  levelCell: {
    width: 22,
    height: 20,
    borderRadius: 3,
    display: 'grid',
    placeItems: 'center',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  dateInput: {
    background: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    color: colors.text.primary,
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'monospace',
    colorScheme: 'dark',
  },
  intensityBtn: {
    minHeight: 38,
    padding: 0,
    background: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 7,
    color: colors.text.secondary,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  },
  entryRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px 16px',
    padding: '10px 14px',
    backgroundColor: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 8,
  },
  editIconBtn: {
    background: 'none',
    border: `1px solid ${colors.border.subtle}`,
    color: colors.accent.cyan,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  muscleEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    backgroundColor: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 8,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: colors.text.disabled,
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 8px',
  },
  addBtn: {
    background: 'none',
    border: `1px solid ${colors.accent.cyan}`,
    color: colors.accent.cyan,
    padding: '6px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  saveBtn: {
    backgroundColor: colors.accent.cyan,
    border: 'none',
    color: colors.bg.base,
    padding: '8px 24px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.38,
    cursor: 'not-allowed',
  },
  saveBar: {
    position: 'sticky',
    bottom: 0,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 24,
    padding: '12px 0 max(12px, env(safe-area-inset-bottom))',
    background: `linear-gradient(to bottom, ${colors.bg.base}ee, ${colors.bg.base})`,
    borderTop: `1px solid ${colors.border.strong}`,
    boxShadow: `0 -12px 24px ${colors.bg.base}`,
  },
  cancelBtn: {
    background: 'none',
    border: `1px solid ${colors.border.subtle}`,
    color: colors.text.secondary,
    padding: '8px 24px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  diagramPanel: {
    width: 300,
    flexShrink: 0,
    position: 'sticky',
    top: 80,
    padding: 16,
    backgroundColor: colors.bg.raised,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 10,
  },
  pickerContainer: {
    backgroundColor: colors.bg.raised,
    border: `1px solid ${colors.border.strong}`,
    borderRadius: 10,
    padding: 16,
  },
  searchInput: {
    width: '100%',
    background: colors.bg.surface,
    border: `1px solid ${colors.border.subtle}`,
    color: colors.text.primary,
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  groupBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${colors.border.subtle}`,
    cursor: 'pointer',
    textAlign: 'left',
  },
  muscleOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 12px',
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${colors.border.subtle}`,
    cursor: 'pointer',
    textAlign: 'left',
  },
  selectedOption: {
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    boxShadow: `inset 3px 0 0 ${colors.accent.cyan}`,
  },
  optionCheck: {
    width: 18,
    height: 18,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.accent.cyan,
    border: `1px solid ${colors.border.strong}`,
    borderRadius: 4,
  },
};
