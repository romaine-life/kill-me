// Central state hook for workout data. Tracks which day of the cycle you are on,
// as a day slug — the day's permanent identity, not its position.
//
// It is persisted server-side as a `settings` document in Cosmos DB so it survives
// across devices and sessions. Public reads use the same AKS API as signed-in reads.

import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { getDays } from '../utils/dayConfig';

export const useWorkouts = () => {
  const [currentDay, setCurrentDay] = useState(() => getDays()[0]?.slug ?? null);
  const { fetchCurrentDay } = useApi();

  // Fetch current day from the public API.
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCurrentDay();
        setCurrentDay(data.currentDaySlug);
      } catch (err) {
        console.error('Failed to fetch current day:', err);
      }
    };
    load();
  }, [fetchCurrentDay]);

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
