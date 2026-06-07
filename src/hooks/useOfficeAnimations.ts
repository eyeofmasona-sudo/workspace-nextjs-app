// ─── Agent OS — useOfficeAnimations Hook ──────────────────────
// Processes events from useEventStream and provides animation state
// to the 2.5D Office UI. Connects animationMapping.ts and eventToVisualState.ts.

'use client';

import { useState, useCallback, useRef } from 'react';
import { getAnimationForEvent, type AnimationTrigger } from '@/lib/office/animationMapping';
import { eventToVisualState, type VisualStateChange } from '@/lib/office/eventToVisualState';
import type { OfficeEvent, OfficeAgent } from '@/hooks/useOfficeData';

export interface AgentAnimationState {
  animation: AnimationTrigger['animationType'] | null;
  highlight: boolean;
  notification: string | null;
  expiresAt: number;
}

export interface ZoneAnimationState {
  animation: AnimationTrigger['animationType'] | null;
  expiresAt: number;
}

export function useOfficeAnimations(
  newEvents: OfficeEvent[],
  clearNewEvents: () => void,
  _agents: OfficeAgent[],
) {
  // Use refs for mutable state that doesn't need to trigger re-renders directly
  const agentAnimsRef = useRef<Record<string, AgentAnimationState>>({});
  const zoneAnimsRef = useRef<Record<string, ZoneAnimationState>>({});
  const processedIds = useRef<Set<string>>(new Set());
  const lastProcessedCount = useRef(0);

  // React state for re-rendering when animations change
  const [agentAnimations, setAgentAnimations] = useState<Record<string, AgentAnimationState>>({});
  const [zoneAnimations, setZoneAnimations] = useState<Record<string, ZoneAnimationState>>({});

  // Process new events — called synchronously, not in an effect
  if (newEvents.length > 0 && newEvents.length !== lastProcessedCount.current) {
    lastProcessedCount.current = newEvents.length;
    const now = Date.now();
    const newAgentAnims: Record<string, AgentAnimationState> = {};
    const newZoneAnims: Record<string, ZoneAnimationState> = {};
    let hasChanges = false;

    for (const event of newEvents) {
      if (processedIds.current.has(event.id)) continue;
      processedIds.current.add(event.id);

      const trigger = getAnimationForEvent(event.eventType);
      if (!trigger) continue;

      const visualChange = eventToVisualState(event.eventType, event.payload ?? {});
      const expiresAt = now + trigger.duration + 500;

      const agentId = visualChange?.agentId ?? trigger.targetAgent;
      if (agentId) {
        newAgentAnims[agentId] = {
          animation: trigger.animationType,
          highlight: visualChange?.highlight ?? false,
          notification: visualChange?.notification ?? null,
          expiresAt,
        };
        hasChanges = true;
      }

      const zone = trigger.targetZone ?? visualChange?.newZone;
      if (zone) {
        newZoneAnims[zone as string] = {
          animation: trigger.animationType,
          expiresAt,
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      // Update refs
      agentAnimsRef.current = { ...agentAnimsRef.current, ...newAgentAnims };
      zoneAnimsRef.current = { ...zoneAnimsRef.current, ...newZoneAnims };
      // Schedule state updates (outside render cycle via microtask)
      queueMicrotask(() => {
        setAgentAnimations({ ...agentAnimsRef.current });
        setZoneAnimations({ ...zoneAnimsRef.current });
        clearNewEvents();
      });
    }
  }

  // Auto-expire animations — use a callback ref pattern
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  if (expiryTimerRef.current === null) {
    expiryTimerRef.current = setInterval(() => {
      const now = Date.now();
      let agentChanged = false;
      let zoneChanged = false;

      const nextAgent = { ...agentAnimsRef.current };
      for (const [id, state] of Object.entries(nextAgent)) {
        if (now > state.expiresAt) {
          delete nextAgent[id];
          agentChanged = true;
        }
      }

      const nextZone = { ...zoneAnimsRef.current };
      for (const [id, state] of Object.entries(nextZone)) {
        if (now > state.expiresAt) {
          delete nextZone[id];
          zoneChanged = true;
        }
      }

      if (agentChanged || zoneChanged) {
        agentAnimsRef.current = nextAgent;
        zoneAnimsRef.current = nextZone;
        if (agentChanged) setAgentAnimations({ ...nextAgent });
        if (zoneChanged) setZoneAnimations({ ...nextZone });
      }
    }, 200);
  }

  // Clean up processed IDs set periodically
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  if (cleanupTimerRef.current === null) {
    cleanupTimerRef.current = setInterval(() => {
      if (processedIds.current.size > 500) {
        processedIds.current = new Set(Array.from(processedIds.current).slice(-200));
      }
    }, 30000);
  }

  const clearAnimation = useCallback((agentId: string) => {
    const next = { ...agentAnimsRef.current };
    delete next[agentId];
    agentAnimsRef.current = next;
    setAgentAnimations({ ...next });
  }, []);

  const getAgentAnimation = useCallback(
    (agentId: string): AgentAnimationState | null => {
      return agentAnimations[agentId] ?? null;
    },
    [agentAnimations],
  );

  const getZoneAnimation = useCallback(
    (zoneKey: string): ZoneAnimationState | null => {
      return zoneAnimations[zoneKey] ?? null;
    },
    [zoneAnimations],
  );

  return {
    agentAnimations,
    zoneAnimations,
    getAgentAnimation,
    getZoneAnimation,
    clearAnimation,
  };
}
