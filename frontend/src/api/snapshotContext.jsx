// Snapshot data layer — loads a SQLite snapshot for anonymous visitors.
//
// When no signed-in user is detected, fetches /snapshot.db and opens it with
// sql.js (SQLite compiled to WASM). Provides a useDataSource() hook that
// routes reads to either the local snapshot or the live API depending on
// auth state.
//
// If the snapshot is missing (404) or fails to load, falls back to live API
// calls for all users.

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiFetch } from './client.js';
import {
  getCurrentDay,
  getWorkoutModel,
  getWorkoutDay,
  getExercisesForDay,
  getAllExercises,
  getLoggedWorkouts,
  getSorenessEntries,
  getCardioSessions,
  getCardioTemplates,
} from './snapshot.js';

const SnapshotContext = createContext(null);

// Load sql.js WASM and open the snapshot database
async function loadSnapshot() {
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });

  const response = await fetch('/snapshot.db');
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  return new SQL.Database(new Uint8Array(buffer));
}

export function SnapshotProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadAttempted = useRef(false);

  useEffect(() => {
    // Wait for the boot-time /api/auth/me probe to settle before deciding
    // whether to spin up the snapshot. Once we know: signed-in → skip;
    // anonymous → load snapshot (once).
    if (authLoading) return;
    if (user || loadAttempted.current) {
      setLoading(false);
      return;
    }
    loadAttempted.current = true;

    loadSnapshot()
      .then((database) => setDb(database))
      .catch((err) => console.warn('Snapshot load failed, using live API:', err))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  // Clean up the database when the user authenticates (switch to live API)
  useEffect(() => {
    if (user && db) {
      db.close();
      setDb(null);
    }
  }, [user]);

  return (
    <SnapshotContext.Provider value={{ db, loading }}>
      {children}
    </SnapshotContext.Provider>
  );
}

export function useSnapshot() {
  const ctx = useContext(SnapshotContext);
  if (!ctx) throw new Error('useSnapshot must be used within SnapshotProvider');
  return ctx;
}

// Unified data source hook — routes reads to snapshot or live API.
// Write operations always go through apiFetch regardless of auth state.
//
// IMPORTANT: Callers MUST check `isReady` before calling any fetch function.
// On first render the snapshot is still loading (WASM init + fetch). During
// that window `db` is null, so `isLive` evaluates to true and fetches hit the
// live API — which doesn't exist for anonymous visitors. The result is a
// permanent loading spinner. Correct usage:
//
//   const { fetchWorkouts, isReady } = useDataSource();
//   useEffect(() => {
//     if (!isReady) return;
//     fetchWorkouts().then(setWorkouts);
//   }, [isReady]);
//
export function useDataSource() {
  const { user } = useAuth();
  const { db, loading: snapshotLoading } = useSnapshot();

  const isLive = !!user || !db;
  const isReady = !snapshotLoading;

  async function fetchWorkoutModel() {
    if (isLive) return apiFetch('/api/workout-model');
    return getWorkoutModel(db);
  }

  async function fetchCurrentDay() {
    if (isLive) return apiFetch('/api/current-day');
    return getCurrentDay(db);
  }

  async function fetchWorkoutDay(daySlug) {
    if (isLive) return apiFetch(`/api/workout-days/${daySlug}`);
    return getWorkoutDay(db, daySlug);
  }

  async function fetchExercises(daySlug) {
    if (isLive) return apiFetch(`/api/exercises/day/${daySlug}`);
    return getExercisesForDay(db, daySlug);
  }

  async function fetchAllExercises() {
    if (isLive) return apiFetch('/api/exercises');
    return getAllExercises(db);
  }

  async function fetchWorkouts() {
    if (isLive) return apiFetch('/api/logged-workouts');
    return getLoggedWorkouts(db);
  }

  async function fetchSoreness() {
    if (isLive) return apiFetch('/api/soreness');
    return getSorenessEntries(db);
  }

  async function fetchCardioSessions() {
    if (isLive) return apiFetch('/api/cardio-sessions');
    return getCardioSessions(db);
  }

  async function fetchCardioTemplates() {
    if (isLive) return apiFetch('/api/cardio-templates');
    return getCardioTemplates(db);
  }

  return {
    fetchWorkoutModel,
    fetchCurrentDay,
    fetchWorkoutDay,
    fetchExercises,
    fetchAllExercises,
    fetchWorkouts,
    fetchSoreness,
    fetchCardioSessions,
    fetchCardioTemplates,
    isLive,
    isReady,
  };
}
