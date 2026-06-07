// ─── Agent OS — useEventStream Hook ─────────────────────────
// Polls for new events and provides them to the Office UI.

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { OfficeEvent } from './useOfficeData';

export function useEventStream(workspaceId: string | null, pollInterval = 4000) {
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [newEvents, setNewEvents] = useState<OfficeEvent[]>([]);
  const lastEventId = useRef<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const params = new URLSearchParams({ limit: '50' });
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const fetched: OfficeEvent[] = data.events ?? [];

      if (fetched.length > 0) {
        // Find new events since last poll
        const latestId = fetched[0]?.id;
        if (lastEventId.current && latestId !== lastEventId.current) {
          const newOnes = fetched.filter(
            (e) => !lastEventId.current || e.id > lastEventId.current
          );
          if (newOnes.length > 0) {
            setNewEvents((prev) => [...newOnes, ...prev].slice(0, 100));
          }
        }
        lastEventId.current = latestId;
        setEvents(fetched);
      }
    } catch {
      // Silent fail for polling
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchEvents();
    const interval = setInterval(fetchEvents, pollInterval);
    return () => clearInterval(interval);
  }, [workspaceId, pollInterval, fetchEvents]);

  const clearNewEvents = useCallback(() => {
    setNewEvents([]);
  }, []);

  return { events, newEvents, clearNewEvents };
}
