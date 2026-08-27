// Calendar view of workout history with week/month/year views. Each day cell is
// color-coded by the day's accent color, looked up by slug so a workout logged
// under a day that has since been renamed or retired keeps its own color. Each
// record stripe opens the app's shared record detail; empty days can start a log.
//
// Filter bar lets you toggle visibility of specific workout types —
// useful for seeing patterns like "how often do I do compound days?"
//
// Hover interaction: hovering a workout type in the legend or calendar dims all
// other types, making it easy to visually isolate one workout type across time.
//
// The chronological list view is a separate tab (ListTab.jsx).

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getDays } from '../utils/dayConfig';
import { dayColor } from '../utils/dayDesign';
import { CARDIO_CONFIG, cardioColor } from '../utils/cardioConfig';
import { useDataSource } from '../api/snapshotContext.jsx';
import { dateToLocal } from '../utils/dateUtils';

const SORENESS_COLOR = '#f97316'; // orange-500

export function HistoryTab({ onDayClick, onWorkoutClick, onCardioClick, onSorenessClick, viewToggle }) {
  const [calendarPeriod, setCalendarPeriod] = useState('month'); // 'week', 'month', or 'year'
  const [workouts, setWorkouts] = useState([]);
  const [cardioSessions, setCardioSessions] = useState([]);
  const [sorenessEntries, setSorenessEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  // Filter state: tracks which workout types and cardio types are enabled, keyed by
  // day slug so a filter follows its day rather than a position.
  const [enabledWorkoutTypes, setEnabledWorkoutTypes] = useState({
    ...Object.fromEntries(getDays().map(day => [day.slug, true])),
    treadmill: true,
    bike: true,
    soreness: true,
  });
  // Hover state: tracks which workout type is currently being hovered
  const [hoveredWorkoutType, setHoveredWorkoutType] = useState(null);
  const { fetchWorkouts: fetchWorkoutsFromSource, fetchCardioSessions, fetchSoreness, isReady } = useDataSource();

  useEffect(() => {
    if (!isReady) return;
    loadData();
  }, [isReady]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workoutData, cardioData, sorenessData] = await Promise.all([
        fetchWorkoutsFromSource(),
        fetchCardioSessions(),
        fetchSoreness(),
      ]);
      setWorkouts(workoutData.workouts || []);
      setCardioSessions(cardioData.sessions || []);
      setSorenessEntries(sorenessData.entries || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getWorkoutsForDate = (date) => {
    const dateString = dateToLocal(date);
    return workouts.filter(w =>
      w.date === dateString && enabledWorkoutTypes[w.daySlug]
    );
  };

  const getCardioForDate = (date) => {
    const dateString = dateToLocal(date);
    return cardioSessions.filter(s =>
      s.date === dateString && enabledWorkoutTypes[s.activity]
    );
  };

  const getSorenessForDate = (date) => {
    const dateString = dateToLocal(date);
    return sorenessEntries.filter(e =>
      e.date === dateString && enabledWorkoutTypes.soreness
    );
  };

  // Combined items for a date (workouts + cardio + soreness), each tagged with a kind
  const getItemsForDate = (date) => {
    const w = getWorkoutsForDate(date).map(item => ({ ...item, _kind: 'workout' }));
    const c = getCardioForDate(date).map(item => ({ ...item, _kind: 'cardio' }));
    const s = getSorenessForDate(date).map(item => ({ ...item, _kind: 'soreness' }));
    return [...w, ...c, ...s];
  };

  const changeMonth = (direction) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      if (calendarPeriod === 'year') {
        newDate.setFullYear(newDate.getFullYear() + direction);
      } else if (calendarPeriod === 'week') {
        newDate.setDate(newDate.getDate() + (direction * 7));
      } else {
        newDate.setMonth(newDate.getMonth() + direction);
      }
      return newDate;
    });
  };

  const goToCurrentTime = () => {
    setSelectedMonth(new Date());
  };

  // Check if there are any workouts in the future or past
  const hasWorkoutsInFuture = () => {
    const endOfCurrentPeriod = new Date(selectedMonth);
    if (calendarPeriod === 'week') {
      endOfCurrentPeriod.setDate(endOfCurrentPeriod.getDate() + 6);
    } else if (calendarPeriod === 'month') {
      endOfCurrentPeriod.setMonth(endOfCurrentPeriod.getMonth() + 1);
      endOfCurrentPeriod.setDate(0); // Last day of current month
    } else if (calendarPeriod === 'year') {
      endOfCurrentPeriod.setFullYear(endOfCurrentPeriod.getFullYear() + 1);
      endOfCurrentPeriod.setDate(0); // Last day of year
    }
    
    // Always allow navigating forward up to the current date
    if (endOfCurrentPeriod < new Date()) return true;

    const allItems = [...workouts, ...cardioSessions, ...sorenessEntries];
    return allItems.some(w => {
      const itemDate = new Date(w.date);
      return itemDate > endOfCurrentPeriod;
    });
  };

  const hasWorkoutsInPast = () => {
    const startOfCurrentPeriod = new Date(selectedMonth);
    if (calendarPeriod === 'week') {
      startOfCurrentPeriod.setDate(startOfCurrentPeriod.getDate() - startOfCurrentPeriod.getDay());
    } else if (calendarPeriod === 'month') {
      startOfCurrentPeriod.setDate(1);
    } else if (calendarPeriod === 'year') {
      startOfCurrentPeriod.setMonth(0);
      startOfCurrentPeriod.setDate(1);
    }

    const allItems = [...workouts, ...cardioSessions, ...sorenessEntries];
    return allItems.some(w => {
      const itemDate = new Date(w.date);
      return itemDate < startOfCurrentPeriod;
    });
  };

  // Every calendar swatch is painted inline now. Day colors used to be Tailwind
  // class names on DAY_CONFIG; they live in dayDesign.js keyed by slug, as hex.
  const getItemColorStyle = (item) => {
    if (item._kind === 'cardio') {
      return { backgroundColor: cardioColor(item.activity) };
    }
    if (item._kind === 'soreness') {
      return { backgroundColor: SORENESS_COLOR };
    }
    return { backgroundColor: dayColor(item.daySlug) };
  };

  const getItemFilterKey = (item) => {
    if (item._kind === 'cardio') return item.activity;
    if (item._kind === 'soreness') return 'soreness';
    return item.daySlug;
  };

  const getItemTitle = (item) => {
    if (item._kind === 'cardio') {
      const cfg = CARDIO_CONFIG[item.activity];
      return `${cfg?.name || item.activity}${item.durationMinutes ? ` — ${item.durationMinutes} min` : ''}`;
    }
    if (item._kind === 'soreness') {
      const muscleNames = item.muscles.map(m => m.muscle || m.group).join(', ');
      const source = item.sourceWorkoutDay != null
        ? ` (from Day ${item.sourceWorkoutDay})`
        : '';
      return `Soreness${source}: ${muscleNames}`;
    }
    return `Day ${item.dayNumber}: ${item.dayName}`;
  };

  const handleItemClick = (item) => {
    if (item._kind === 'cardio') {
      onCardioClick?.(item);
    } else if (item._kind === 'soreness') {
      onSorenessClick?.(item);
    } else {
      onWorkoutClick?.(item);
    }
  };

  const toggleWorkoutType = (key) => {
    setEnabledWorkoutTypes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const enableAllWorkoutTypes = () => {
    setEnabledWorkoutTypes({
      ...Object.fromEntries(getDays().map(day => [day.slug, true])),
      treadmill: true,
      bike: true,
      soreness: true,
    });
  };

  const disableAllWorkoutTypes = () => {
    setEnabledWorkoutTypes({
      ...Object.fromEntries(getDays().map(day => [day.slug, false])),
      treadmill: false,
      bike: false,
      soreness: false,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📊</div>
          <p className="text-slate-400">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {viewToggle}

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 backdrop-blur-md rounded-2xl border border-cyan-500/50 p-4 sm:p-6">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
          <div>
            <div className="text-2xl sm:text-4xl font-black text-white">{workouts.length}</div>
            <div className="text-slate-300 text-[10px] sm:text-sm uppercase tracking-wide">Workouts</div>
          </div>
          <div>
            <div className="text-2xl sm:text-4xl font-black text-white">{cardioSessions.length}</div>
            <div className="text-slate-300 text-[10px] sm:text-sm uppercase tracking-wide">Cardio</div>
          </div>
          <div>
            <div className="text-2xl sm:text-4xl font-black text-white">
              {new Set([...workouts.map(w => w.date), ...cardioSessions.map(s => s.date), ...sorenessEntries.map(e => e.date)]).size}
            </div>
            <div className="text-slate-300 text-[10px] sm:text-sm uppercase tracking-wide">Days Active</div>
          </div>
          <div>
            <div className="text-2xl sm:text-4xl font-black text-white">
              {new Set(workouts.map(w => w.daySlug)).size}
            </div>
            <div className="text-slate-300 text-[10px] sm:text-sm uppercase tracking-wide">Cycle Days</div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-800/30 backdrop-blur-md rounded-2xl border border-slate-700/50 p-3 sm:p-6"
        >
          {/* Period Toggle */}
          <div className="flex gap-1 sm:gap-2 bg-slate-700/30 backdrop-blur-md rounded-xl p-1.5 sm:p-2 mb-4 sm:mb-6">
            <button
              onClick={() => {
                goToCurrentTime();
                setCalendarPeriod('week');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-bold uppercase text-sm tracking-wide transition-all ${
                calendarPeriod === 'week'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => {
                goToCurrentTime();
                setCalendarPeriod('month');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-bold uppercase text-sm tracking-wide transition-all ${
                calendarPeriod === 'month'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => {
                goToCurrentTime();
                setCalendarPeriod('year');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-bold uppercase text-sm tracking-wide transition-all ${
                calendarPeriod === 'year'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Year
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={() => changeMonth(-1)}
              disabled={!hasWorkoutsInPast()}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-sm sm:text-base transition-all ${
                hasWorkoutsInPast()
                  ? 'bg-slate-700/60 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  : 'bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-40'
              }`}
            >
              <span className="sm:hidden">←</span>
              <span className="hidden sm:inline">← Prev</span>
            </button>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-100">
              {calendarPeriod === 'year'
                ? selectedMonth.getFullYear()
                : selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => changeMonth(1)}
              disabled={!hasWorkoutsInFuture()}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-sm sm:text-base transition-all ${
                hasWorkoutsInFuture()
                  ? 'bg-slate-700/60 hover:bg-slate-700 text-slate-200 cursor-pointer'
                  : 'bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-40'
              }`}
            >
              <span className="sm:hidden">→</span>
              <span className="hidden sm:inline">Next →</span>
            </button>
          </div>

          {/* Week View */}
          {calendarPeriod === 'week' && (
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center font-bold text-slate-400 text-xs sm:text-sm py-1 sm:py-2">
                    <span className="sm:hidden">{day}</span>
                    <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
                  </div>
                ))}
              </div>

              {/* Week calendar grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {(() => {
                  const days = [];
                  const startOfWeek = new Date(selectedMonth);
                  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

                  for (let i = 0; i < 7; i++) {
                    const date = new Date(startOfWeek);
                    date.setDate(startOfWeek.getDate() + i);
                    const dayItems = getItemsForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isCurrentMonth = date.getMonth() === selectedMonth.getMonth();

                    days.push(
                      <div
                        key={i}
                        onClick={() => {
                          if (dayItems.length === 0) onDayClick?.(null, dateToLocal(date));
                        }}
                        className={`min-h-[80px] sm:min-h-[120px] rounded-lg sm:rounded-xl border transition-all overflow-hidden cursor-pointer hover:scale-105 ${
                          isToday
                            ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                            : isCurrentMonth
                            ? 'border-slate-700 hover:border-slate-600'
                            : 'border-slate-800'
                        }`}
                      >
                        {dayItems.length > 0 ? (
                          <div className="h-full flex flex-col relative">
                            {dayItems.map((item, idx) => (
                              <div
                                key={idx}
                                className={`flex-1 transition-opacity ${
                                  idx < dayItems.length - 1 ? 'border-b border-black/20' : ''
                                } ${hoveredWorkoutType && hoveredWorkoutType !== getItemFilterKey(item) ? 'opacity-30' : 'opacity-100'}`}
                                style={getItemColorStyle(item)}
                                title={getItemTitle(item)}
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleItemClick(item);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleItemClick(item);
                                  }
                                }}
                                onMouseEnter={() => setHoveredWorkoutType(getItemFilterKey(item))}
                                onMouseLeave={() => setHoveredWorkoutType(null)}
                              />
                            ))}
                            {/* Day number overlay */}
                            <div className="absolute top-0.5 left-1 sm:top-1 sm:left-2 text-white font-black text-sm sm:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
                              {date.getDate()}
                            </div>
                          </div>
                        ) : (
                          <div className={`h-full p-3 ${
                            isToday
                              ? 'bg-cyan-500/10'
                              : isCurrentMonth
                              ? 'bg-slate-800/20'
                              : 'bg-slate-900/20'
                          }`}>
                            <div className={`text-center ${isCurrentMonth ? 'text-slate-200' : 'text-slate-600'}`}>
                              <div className="text-lg sm:text-2xl font-black">
                                {date.getDate()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return days;
                })()}
              </div>
            </div>
          )}

          {/* Month View */}
          {calendarPeriod === 'month' && (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Day headers */}
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="text-center font-bold text-slate-400 text-xs sm:text-sm py-1 sm:py-2">
                  <span className="sm:hidden">{day}</span>
                  <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
                </div>
              ))}

              {/* Calendar days */}
              {(() => {
                const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedMonth);
                const days = [];

                // Empty cells for days before month starts
                for (let i = 0; i < startingDayOfWeek; i++) {
                  days.push(<div key={`empty-${i}`} className="h-14 sm:h-20" />);
                }

                // Days of the month
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(year, month, day);
                  const dayItems = getItemsForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();

                  days.push(
                    <div
                      key={day}
                      onClick={() => {
                        if (dayItems.length === 0) onDayClick?.(null, dateToLocal(date));
                      }}
                      className={`h-14 sm:h-20 rounded-md sm:rounded-lg border transition-all overflow-hidden cursor-pointer hover:scale-105 ${
                        isToday
                          ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {dayItems.length > 0 ? (
                        <div className="h-full flex flex-col relative">
                          {dayItems.map((item, idx) => (
                            <div
                              key={idx}
                              className={`flex-1 transition-opacity ${
                                idx < dayItems.length - 1 ? 'border-b border-black/20' : ''
                              } ${hoveredWorkoutType && hoveredWorkoutType !== getItemFilterKey(item) ? 'opacity-30' : 'opacity-100'}`}
                              style={getItemColorStyle(item)}
                              title={getItemTitle(item)}
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleItemClick(item);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleItemClick(item);
                                }
                              }}
                              onMouseEnter={() => setHoveredWorkoutType(getItemFilterKey(item))}
                              onMouseLeave={() => setHoveredWorkoutType(null)}
                            />
                          ))}
                          {/* Day number overlay */}
                          <div className="absolute top-0.5 left-1 sm:top-1 sm:left-2 text-white font-black text-xs sm:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
                            {day}
                          </div>
                        </div>
                      ) : (
                        <div className={`h-full relative ${
                          isToday ? 'bg-cyan-500/10' : 'bg-slate-800/20'
                        }`}>
                          <div className="absolute top-0.5 left-1 sm:top-1 sm:left-2 text-slate-200 font-black text-xs sm:text-lg">
                            {day}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return days;
              })()}
            </div>
          )}

          {/* Year View */}
          {calendarPeriod === 'year' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const monthDate = new Date(selectedMonth.getFullYear(), monthIndex, 1);
                const { daysInMonth, startingDayOfWeek } = getDaysInMonth(monthDate);

                return (
                  <div
                    key={monthIndex}
                    className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-3 border border-slate-600/40 hover:border-slate-500 transition-all"
                  >
                    {/* Month name */}
                    <div 
                      className="text-center text-slate-200 font-bold text-sm mb-2 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => {
                        setSelectedMonth(monthDate);
                        setCalendarPeriod('month');
                      }}
                      title="Click to view this month"
                    >
                      {monthDate.toLocaleDateString('en-US', { month: 'short' })}
                    </div>

                    {/* Mini calendar */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Day headers */}
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={idx} className="text-center text-[8px] text-slate-500 font-bold">
                          {day}
                        </div>
                      ))}

                      {/* Empty cells before month starts */}
                      {Array.from({ length: startingDayOfWeek }, (_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                      ))}

                      {/* Days of the month */}
                      {Array.from({ length: daysInMonth }, (_, day) => {
                        const date = new Date(selectedMonth.getFullYear(), monthIndex, day + 1);
                        const dayItems = getItemsForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();

                        // For year view color, pick the first item's color
                        const firstItem = dayItems[0];
                        const yearCellClass = firstItem
                          ? 'text-white hover:ring-white/50'
                          : 'bg-slate-800/40 text-slate-500 hover:bg-slate-700/40';
                        const yearCellStyle = firstItem
                          ? { ...getItemColorStyle(firstItem), color: 'white' }
                          : {};

                        return (
                          <div
                            key={day}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (dayItems.length > 0) {
                                setSelectedMonth(date);
                                setCalendarPeriod('month');
                              } else {
                                onDayClick?.(null, dateToLocal(date));
                              }
                            }}
                            className={`aspect-square rounded-sm flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer hover:scale-110 hover:ring-1 hover:ring-white/30 ${
                              isToday
                                ? 'bg-cyan-500 text-white ring-1 ring-cyan-400'
                                : yearCellClass
                            }`}
                            style={!isToday ? yearCellStyle : {}}
                            title={
                              dayItems.length > 0
                                ? `${dayItems.length} record${dayItems.length === 1 ? '' : 's'} — open month`
                                : 'Click to log'
                            }
                          >
                            {dayItems.length > 1 ? (
                              <span className="text-[7px]">●{dayItems.length}</span>
                            ) : (
                              day + 1
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend with Filters */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <p className="text-slate-200 text-sm font-bold uppercase tracking-wide">
                Filter by Workout Type:
              </p>
              <div className="flex gap-2">
                <button
                  onClick={enableAllWorkoutTypes}
                  className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 border border-green-500/50 hover:border-green-400/70 text-green-400 hover:text-green-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105"
                >
                  ✓ Enable All
                </button>
                <button
                  onClick={disableAllWorkoutTypes}
                  className="bg-gradient-to-r from-red-600/20 to-rose-600/20 hover:from-red-600/30 hover:to-rose-600/30 border border-red-500/50 hover:border-red-400/70 text-red-400 hover:text-red-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105"
                >
                  ✕ Disable All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 text-xs">
              {getDays().map((day) => {
                const isEnabled = enabledWorkoutTypes[day.slug];
                const isDimmed = hoveredWorkoutType && hoveredWorkoutType !== day.slug;
                return (
                  <button
                    key={day.slug}
                    onClick={() => toggleWorkoutType(day.slug)}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all ${
                      isEnabled
                        ? 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60'
                        : 'border-slate-800 bg-slate-900/40 opacity-40 hover:opacity-60'
                    } ${isDimmed ? 'opacity-30' : ''}`}
                    title={`Click to ${isEnabled ? 'hide' : 'show'} ${day.name}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex-shrink-0 transition-all ${
                        isEnabled ? 'shadow-lg' : 'grayscale'
                      }`}
                      style={{ backgroundColor: dayColor(day.slug) }}
                    />
                    <div className="text-left flex-1">
                      <div className={`font-bold ${isEnabled ? 'text-slate-200' : 'text-slate-600'}`}>
                        {day.name}
                      </div>
                      <div className={`text-[10px] ${isEnabled ? 'text-slate-400' : 'text-slate-700'}`}>
                        Day {day.number}
                      </div>
                    </div>
                    <div className={`text-lg ${isEnabled ? 'text-green-400' : 'text-slate-700'}`}>
                      {isEnabled ? '✓' : '○'}
                    </div>
                  </button>
                );
              })}

              {/* Cardio filters */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-4 mt-2 pt-2 border-t border-slate-700/50">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1.5">Cardio</p>
              </div>
              {Object.entries(CARDIO_CONFIG).map(([key, config]) => {
                const isEnabled = enabledWorkoutTypes[key];
                const isDimmed = hoveredWorkoutType && hoveredWorkoutType !== key;
                return (
                  <button
                    key={key}
                    onClick={() => toggleWorkoutType(key)}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all ${
                      isEnabled
                        ? 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60'
                        : 'border-slate-800 bg-slate-900/40 opacity-40 hover:opacity-60'
                    } ${isDimmed ? 'opacity-30' : ''}`}
                    title={`Click to ${isEnabled ? 'hide' : 'show'} ${config.name}`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 transition-all"
                      style={{ backgroundColor: config.color, filter: isEnabled ? 'none' : 'grayscale(1)' }}
                    />
                    <div className="text-left flex-1">
                      <div className={`font-bold ${isEnabled ? 'text-slate-200' : 'text-slate-600'}`}>
                        {config.name}
                      </div>
                    </div>
                    <div className={`text-lg ${isEnabled ? 'text-green-400' : 'text-slate-700'}`}>
                      {isEnabled ? '✓' : '○'}
                    </div>
                  </button>
                );
              })}

              {/* Soreness filter */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-4 mt-2 pt-2 border-t border-slate-700/50">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1.5">Wellness</p>
              </div>
              {(() => {
                const isEnabled = enabledWorkoutTypes.soreness;
                const isDimmed = hoveredWorkoutType && hoveredWorkoutType !== 'soreness';
                return (
                  <button
                    onClick={() => toggleWorkoutType('soreness')}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all ${
                      isEnabled
                        ? 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60'
                        : 'border-slate-800 bg-slate-900/40 opacity-40 hover:opacity-60'
                    } ${isDimmed ? 'opacity-30' : ''}`}
                    title={`Click to ${isEnabled ? 'hide' : 'show'} Soreness`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 transition-all"
                      style={{ backgroundColor: SORENESS_COLOR, filter: isEnabled ? 'none' : 'grayscale(1)' }}
                    />
                    <div className="text-left flex-1">
                      <div className={`font-bold ${isEnabled ? 'text-slate-200' : 'text-slate-600'}`}>
                        Soreness
                      </div>
                    </div>
                    <div className={`text-lg ${isEnabled ? 'text-green-400' : 'text-slate-700'}`}>
                      {isEnabled ? '✓' : '○'}
                    </div>
                  </button>
                );
              })()}
            </div>
          </div>
        </motion.div>
    </div>
  );
}
