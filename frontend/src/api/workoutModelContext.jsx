// Loads the active workout model once at boot and installs it for the rest of the app.
//
// The cycle used to be a literal in the bundle, which meant the code and the database
// could disagree about what day 8 was. It is data now: it comes from the public API,
// and everything downstream reads it through utils/dayConfig.js.
//
// Children do not render until it has loaded. Every day-aware component would
// otherwise have to handle an empty cycle for the first frame, and there is nothing
// meaningful to show without one.

import { createContext, useContext, useEffect, useState } from 'react';
import { useApi } from './useApi.js';
import { setWorkoutModel } from '../utils/dayConfig';

const WorkoutModelContext = createContext(null);

export function WorkoutModelProvider({ children, fallback = null }) {
  const { fetchWorkoutModel } = useApi();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchWorkoutModel()
      .then((data) => {
        if (cancelled) return;
        if (!data?.model) throw new Error('No active workout model');
        setWorkoutModel(data.model);
        setModel(data.model);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
        console.error('Failed to load the workout model:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, fetchWorkoutModel]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, color: '#ef6f6f', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p>Could not load the workout cycle. {error.message}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!model) {
    return fallback ?? (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#8a8a8a', fontFamily: 'system-ui, sans-serif' }}>
        Loading workout data…
      </div>
    );
  }

  return <WorkoutModelContext.Provider value={model}>{children}</WorkoutModelContext.Provider>;
}

export function useWorkoutModel() {
  const model = useContext(WorkoutModelContext);
  if (!model) throw new Error('useWorkoutModel must be used within WorkoutModelProvider');
  return model;
}
