// ─── Agent OS — Agent Office MVP ─────────────────────────────
// Main page showing the pixel-art Agent Office visualization.
// Dark theme matching pixel-agents style.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { AgentOffice } from '@/components/pixel-office/AgentOfficeV3';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const checkSystem = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      const status = data.status;

      if (status?.users > 0 && status?.agents > 0) {
        setInitialized(true);
        // Get workspace ID from agents
        const agentsRes = await fetch('/api/agents');
        const agentsData = await agentsRes.json();
        if (agentsData.agents?.length > 0) {
          setWorkspaceId(agentsData.agents[0].workspaceId);
        }
      }
    } catch {
      console.error('Failed to check system status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSystem();
  }, [checkSystem]);

  const initSystem = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.workspace?.id) {
        setWorkspaceId(data.workspace.id);
      }
      setInitialized(true);
    } catch {
      console.error('Failed to initialize system');
    } finally {
      setSeeding(false);
    }
  };

  // Full-screen Agent Office with dark background
  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e] overflow-hidden">
      {/* Agent Office fills the entire viewport */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.4s]" />
              </div>
              <p className="text-xs text-slate-400 font-mono">Loading Agent Office...</p>
            </div>
          </div>
        ) : (
          <AgentOffice workspaceId={workspaceId} onSeed={initSystem} />
        )}
      </div>
    </div>
  );
}
