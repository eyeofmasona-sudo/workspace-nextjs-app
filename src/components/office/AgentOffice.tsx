// ─── Agent OS — AgentOffice V2 ────────────────────────────────
// Main Agent Office component — the isometric office simulation.
// Office is the PRIMARY and ONLY view. Management panels are overlays.
// The office always fills the screen. Panels slide over, never replace.

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
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  ListChecks, BarChart3, Crown,
  AlertTriangle, Radio, Loader2, RefreshCw,
  Building2,
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
  tasks: { label: 'Tasks', icon: ListChecks, color: 'text-blue-500' },
  situation: { label: 'Situation', icon: BarChart3, color: 'text-emerald-500' },
  orchestrator: { label: 'Orchestrator', icon: Crown, color: 'text-violet-500' },
  approvals: { label: 'Approvals', icon: AlertTriangle, color: 'text-orange-500' },
  events: { label: 'Events', icon: Radio, color: 'text-sky-500' },
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

  // Loading state — show minimal loader over the office background
  if (loading && !state) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500" />
          <p className="text-sm text-muted-foreground">Loading Agent Office...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !state) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-600">Error: {error}</p>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // No workspace — show seed prompt
  if (!state || state.agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-5xl">🏢</div>
          <h2 className="text-xl font-bold">Welcome to Agent OS</h2>
          <p className="text-sm text-muted-foreground">
            Initialize your workspace to see the Agent Office with 10 AI specialists.
          </p>
          <Button onClick={onSeed} size="lg" className="bg-violet-600 hover:bg-violet-700">
            🚀 Initialize System
          </Button>
        </div>
      </div>
    );
  }

  const { agents, tasks, approvals, toolExecutions, recentEvents, situation } = state;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ─── Minimal Top Bar (translucent, overlays office) ─── */}
      <div className="flex items-center justify-between px-3 py-1 bg-white/70 backdrop-blur-md border-b border-slate-200/50 z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-violet-500" />
          <h1 className="text-sm font-bold text-gray-800">Agent OS</h1>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
            {workspaceId?.slice(-8)}
          </Badge>
          <span className="text-[9px] text-gray-400 ml-1">
            {agents.filter(a => {
              const s = a.runtimeState?.status ?? a.status;
              return s !== 'offline';
            }).length}/{agents.length} active
          </span>
        </div>

        {/* Situation indicators */}
        <div className="flex items-center gap-1.5">
          {situation.approvalsNeeded > 0 && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1.5 cursor-pointer" onClick={() => openPanel('approvals')}>
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              {situation.approvalsNeeded}
            </Badge>
          )}
          {situation.runningTools > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
              <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
              {situation.runningTools}
            </Badge>
          )}
          {newEvents.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 cursor-pointer" onClick={() => openPanel('events')}>
              <Radio className="w-2.5 h-2.5 mr-0.5" />
              {newEvents.length}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={refetch}>
            <RefreshCw className="w-3 h-3" />
          </Button>
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

        {/* ─── Floating Management Toolbar (overlays office) ─── */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-40">
          {(Object.entries(PANEL_CONFIG) as [ManagementPanel, typeof PANEL_CONFIG[ManagementPanel]][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              const count =
                key === 'tasks' ? tasks.length :
                key === 'approvals' ? approvals.length :
                key === 'events' ? recentEvents.length : 0;

              return (
                <Button
                  key={key}
                  variant={activePanel === key ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 w-9 p-0 shadow-lg backdrop-blur-sm relative transition-all ${
                    activePanel === key
                      ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600'
                      : 'bg-white/85 hover:bg-white border-slate-200'
                  }`}
                  onClick={() => activePanel === key ? closePanel() : openPanel(key)}
                  title={config.label}
                >
                  <Icon className={`w-4 h-4 ${activePanel === key ? 'text-white' : config.color}`} />
                  {count > 0 && key !== 'situation' && key !== 'orchestrator' && (
                    <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Button>
              );
            },
          )}
        </div>

        {/* ─── Management Panel Slide-over (overlays office) ─── */}
        <Sheet open={!!activePanel} onOpenChange={(open) => { if (!open) closePanel(); }}>
          <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                {activePanel && (() => {
                  const config = PANEL_CONFIG[activePanel];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <SheetTitle className="text-sm">{config.label}</SheetTitle>
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
