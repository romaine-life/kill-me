// Central state hook for workout data. Tracks which day of the cycle you are on,
// as a day slug — the day's permanent identity, not its position.
//
// It is persisted server-side as a `settings` document in Cosmos DB so it survives
// across devices and sessions. For anonymous visitors it comes from the SQLite
// snapshot via useDataSource().

import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { useDataSource } from '../api/snapshotContext.jsx';
import { getDays } from '../utils/dayConfig';

export const useWorkouts = () => {
  const [currentDay, setCurrentDay] = useState(() => getDays()[0]?.slug ?? null);
  const { fetchCurrentDay, isReady } = useDataSource();

  // Fetch current day from snapshot or API
  useEffect(() => {
    if (!isReady) return;
    const load = async () => {
      try {
        const data = await fetchCurrentDay();
        setCurrentDay(data.currentDaySlug);
      } catch (err) {
        console.error('Failed to fetch current day:', err);
      }
    };
    load();
  }, [isReady]);

  // setDay always uses live API (admin-only write operation)
  const setDay = async (daySlug) => {
    try {
      const data = await apiFetch('/api/current-day', {
        method: 'PUT',
        body: JSON.stringify({ currentDaySlug: daySlug })
      });
      setCurrentDay(data.currentDaySlug);
    } catch (err) {
      console.error('Failed to update current day:', err);
      throw err;
    }
  };

  return { currentDay, setDay, setCurrentDay };
};
