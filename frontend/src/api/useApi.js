// Public reads and authenticated writes share the same same-origin AKS API.
//
// This intentionally has no readiness state: Cosmos DB is the single source of
// truth for every visitor, and each screen owns its ordinary request loading and
// error state.

import { apiFetch } from './client.js';

const api = Object.freeze({
  fetchWorkoutModel: () => apiFetch('/api/workout-model'),
  fetchCurrentDay: () => apiFetch('/api/current-day'),
  fetchWorkoutDay: (daySlug) => apiFetch(`/api/workout-days/${daySlug}`),
  fetchExercises: (daySlug) => apiFetch(`/api/exercises/day/${daySlug}`),
  fetchAllExercises: () => apiFetch('/api/exercises'),
  fetchWorkouts: () => apiFetch('/api/logged-workouts'),
  fetchSoreness: () => apiFetch('/api/soreness'),
  fetchCardioSessions: () => apiFetch('/api/cardio-sessions'),
  fetchCardioTemplates: () => apiFetch('/api/cardio-templates'),
});

export function useApi() {
  return api;
}
