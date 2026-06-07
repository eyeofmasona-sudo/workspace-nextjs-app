// ─── Agent OS — Agent Office MVP ─────────────────────────────
// Main page showing the 2.5D Agent Office visualization.
// Replaces the old flat dashboard with a live office view.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { AgentOffice } from '@/components/office/AgentOffice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle2, Cpu } from 'lucide-react';

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

  // Full-screen Agent Office
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Agent Office fills the entire viewport */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Loading Agent Office...</p>
            </div>
          </div>
        ) : (
          <AgentOffice workspaceId={workspaceId} onSeed={initSystem} />
        )}
      </div>
    </div>
  );
}
