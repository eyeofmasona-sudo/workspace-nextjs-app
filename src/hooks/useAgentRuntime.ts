// ─── Agent OS — useAgentRuntime Hook ────────────────────────
// Manages agent runtime state updates.

'use client';

import { useState, useCallback } from 'react';
import type { OfficeAgent } from './useOfficeData';

export function useAgentRuntime() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const updateAgentStatus = useCallback(async (agentId: string, status: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/runtime`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setUpdating(false);
    }
  }, []);

  const updateAgentLocation = useCallback(async (agentId: string, locationZone: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/runtime`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationZone }),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setUpdating(false);
    }
  }, []);

  return {
    selectedAgentId,
    setSelectedAgentId,
    updating,
    updateAgentStatus,
    updateAgentLocation,
  };
}
