// ─── Agent OS — AgentOffice (pixel-agents style) ────────────────
// Main Agent Office component — the isometric office simulation.
// Full-screen canvas with dark background, minimal overlays.
// Management panels are accessible via compact side buttons.

'use client';

import { useState, useCallback } from 'react';
import { useOfficeData } from '@/hooks/useOfficeData';
import { useEventStream } from '@/hooks/useEventStream';
import { useOfficeAnimations } from '@/hooks/useOfficeAnimations';
import { PixelOfficeCanvas } from './PixelOfficeCanvas';
import { TaskBoard } from './TaskBoard';
import { SituationRoom } from './SituationRoom';
import { OrchestratorPanel } from './OrchestratorPanel';
import { ApprovalQueue } from './ApprovalQueue';
import { EventTimeline } from './EventTimeline';
import { AgentDetailsDrawer } from './AgentDetailsDrawer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  ListChecks, BarChart3, Crown,
  AlertTriangle, Radio, Loader2, RefreshCw,
  Monitor,
} from 'lucide-react';
import type { OfficeAgent } from '@/hooks/useOfficeData';

// Panel types for the management overlay
type ManagementPanel = 'tasks' | 'situation' | 'orchestrator' | 'approvals' | 'events';

interface AgentOfficeProps {
  workspaceId: string | null;
  onSeed?: () => void;
}

const PANEL_CONFIG: Record<ManagementPanel, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  tasks: { label: 'Tasks', icon: ListChecks, color: 'text-emerald-400' },
  situation: { label: 'Situation', icon: BarChart3, color: 'text-sky-400' },
  orchestrator: { label: 'Orchestrator', icon: Crown, color: 'text-amber-400' },
  approvals: { label: 'Approvals', icon: AlertTriangle, color: 'text-orange-400' },
  events: { label: 'Events', icon: Radio, color: 'text-cyan-400' },
};

export function AgentOffice({ workspaceId, onSeed }: AgentOfficeProps) {
  const { state, loading, error, refetch } = useOfficeData(workspaceId, 5000);
  const { newEvents, clearNewEvents } = useEventStream(workspaceId, 4000);
  const { agentAnimations, zoneAnimations } = useOfficeAnimations(
    newEvents,
    clearNewEvents,
    state?.agents ?? [],
  );
  const [selectedAgent, setSelectedAgent] = useState<OfficeAgent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ManagementPanel | null>(null);

  const handleAgentClick = useCallback((agentId: string) => {
    const agent = state?.agents.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setDrawerOpen(true);
    }
  }, [state?.agents]);

  const handleApprovalAction = useCallback((_approvalId: string, _action: 'approve' | 'reject') => {
    setTimeout(() => refetch(), 500);
  }, [refetch]);

  const openPanel = useCallback((panel: ManagementPanel) => {
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  // Loading state — show loader over dark background (pixel-agents style)
  if (loading && !state) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.2s]" />
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.4s]" />
          </div>
          <p className="text-xs text-slate-400 font-mono">Connecting to office...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !state) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-400 font-mono">Error: {error}</p>
          <Button variant="outline" onClick={refetch} className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // No workspace — show seed prompt
  if (!state || state.agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-4 max-w-md px-4">
          <Monitor className="w-12 h-12 mx-auto text-emerald-400/60" />
          <h2 className="text-lg font-bold text-slate-200 font-mono">Agent OS</h2>
          <p className="text-sm text-slate-400 font-mono">
            Initialize your workspace to see the Agent Office with 10 AI specialists.
          </p>
          <Button onClick={onSeed} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono">
            Initialize System
          </Button>
        </div>
      </div>
    );
  }

  const { agents, tasks, approvals, toolExecutions, recentEvents, situation } = state;
  const activeCount = agents.filter(a => {
    const s = a.runtimeState?.status ?? a.status;
    return s !== 'offline';
  }).length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#1a1a2e]">
      {/* ─── Minimal Header (dark, translucent, overlays office) ─── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/50 backdrop-blur-md border-b border-white/5 z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-emerald-400" />
          <h1 className="text-xs font-bold text-slate-200 font-mono tracking-wide">AGENT OS</h1>
          <span className="text-[9px] text-slate-500 font-mono ml-1">
            {activeCount}/{agents.length} agents
          </span>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-1.5">
          {situation.approvalsNeeded > 0 && (
            <button
              className="flex items-center gap-1 text-[9px] font-mono bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
              onClick={() => openPanel('approvals')}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              {situation.approvalsNeeded}
            </button>
          )}
          {situation.runningTools > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-sky-400/80">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              {situation.runningTools}
            </span>
          )}
          {newEvents.length > 0 && (
            <button
              className="flex items-center gap-1 text-[9px] font-mono bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
              onClick={() => openPanel('events')}
            >
              <Radio className="w-2.5 h-2.5" />
              {newEvents.length}
            </button>
          )}
          <button
            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
            onClick={refetch}
            aria-label="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ─── Main Content: Office Scene fills everything ─── */}
      <div className="flex-1 min-h-0 relative">
        {/* Pixel Office Canvas — the hero, fills the entire area */}
        <PixelOfficeCanvas
          agents={agents}
          tasks={tasks}
          onAgentClick={handleAgentClick}
        />

        {/* ─── Floating Management Toolbar (compact, dark, overlays office) ─── */}
        <div className="absolute left-3 top-3 flex flex-col gap-1 z-40">
          {(Object.entries(PANEL_CONFIG) as [ManagementPanel, typeof PANEL_CONFIG[ManagementPanel]][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              const count =
                key === 'tasks' ? tasks.length :
                key === 'approvals' ? approvals.length :
                key === 'events' ? recentEvents.length : 0;

              return (
                <button
                  key={key}
                  className={`group relative w-8 h-8 flex items-center justify-center rounded-md shadow-lg backdrop-blur-sm transition-all border ${
                    activePanel === key
                      ? 'bg-emerald-600/80 border-emerald-400/50 text-white'
                      : 'bg-black/50 border-white/10 hover:bg-black/70 hover:border-white/20'
                  }`}
                  onClick={() => activePanel === key ? closePanel() : openPanel(key)}
                  title={config.label}
                >
                  <Icon className={`w-3.5 h-3.5 ${activePanel === key ? 'text-white' : config.color}`} />
                  {count > 0 && key !== 'situation' && key !== 'orchestrator' && (
                    <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </button>
              );
            },
          )}
        </div>

        {/* ─── Management Panel Slide-over (dark themed) ─── */}
        <Sheet open={!!activePanel} onOpenChange={(open) => { if (!open) closePanel(); }}>
          <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0 bg-[#1a1a2e] border-white/10 text-slate-200">
            <SheetHeader className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                {activePanel && (() => {
                  const config = PANEL_CONFIG[activePanel];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <SheetTitle className="text-sm text-slate-200 font-mono">{config.label}</SheetTitle>
                    </>
                  );
                })()}
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-auto p-4">
              {activePanel === 'tasks' && <TaskBoard tasks={tasks} />}
              {activePanel === 'situation' && (
                <SituationRoom situation={situation} agents={agents} recentEvents={recentEvents} />
              )}
              {activePanel === 'orchestrator' && (
                <OrchestratorPanel workspaceId={workspaceId!} agents={agents} />
              )}
              {activePanel === 'approvals' && (
                <ApprovalQueue approvals={approvals} workspaceId={workspaceId!} onAction={handleApprovalAction} />
              )}
              {activePanel === 'events' && <EventTimeline events={recentEvents} />}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ─── Agent Details Drawer ─── */}
      <AgentDetailsDrawer
        agent={selectedAgent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        recentEvents={recentEvents}
        toolExecutions={toolExecutions}
      />
    </div>
  );
}
