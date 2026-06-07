// ─── Agent OS — AgentOffice ──────────────────────────────────
// Main Agent Office component — the 2.5D office visualization.
// Combines all sub-components into a cohesive layout.

'use client';

import { useState, useCallback } from 'react';
import { useOfficeData } from '@/hooks/useOfficeData';
import { useEventStream } from '@/hooks/useEventStream';
import { OfficeLayout } from './OfficeLayout';
import { TaskBoard } from './TaskBoard';
import { SituationRoom } from './SituationRoom';
import { OrchestratorPanel } from './OrchestratorPanel';
import { ApprovalQueue } from './ApprovalQueue';
import { EventTimeline } from './EventTimeline';
import { AgentDetailsDrawer } from './AgentDetailsDrawer';
import { SplitWorkspacePanel } from './SplitWorkspacePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  LayoutDashboard, ListChecks, BarChart3, Crown,
  AlertTriangle, Radio, ChevronDown, ChevronUp,
  Loader2, RefreshCw,
} from 'lucide-react';
import type { OfficeAgent } from '@/hooks/useOfficeData';

interface AgentOfficeProps {
  workspaceId: string | null;
  onSeed?: () => void;
}

export function AgentOffice({ workspaceId, onSeed }: AgentOfficeProps) {
  const { state, loading, error, refetch } = useOfficeData(workspaceId, 5000);
  const { newEvents, clearNewEvents } = useEventStream(workspaceId, 4000);
  const [selectedAgent, setSelectedAgent] = useState<OfficeAgent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSplitPanel, setShowSplitPanel] = useState(true);
  const [activeTab, setActiveTab] = useState('office');

  const handleAgentClick = useCallback((agentId: string) => {
    const agent = state?.agents.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setDrawerOpen(true);
    }
  }, [state?.agents]);

  const handleApprovalAction = useCallback((_approvalId: string, _action: 'approve' | 'reject') => {
    // Refresh after approval action
    setTimeout(() => refetch(), 500);
  }, [refetch]);

  // Loading state
  if (loading && !state) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading Agent Office...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !state) {
    return (
      <div className="h-full flex items-center justify-center">
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
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-5xl">🏢</div>
          <h2 className="text-xl font-bold">Welcome to Agent OS</h2>
          <p className="text-sm text-muted-foreground">
            Initialize your workspace to see the Agent Office with 10 AI specialists.
          </p>
          <Button onClick={onSeed} size="lg">
            🚀 Initialize System
          </Button>
        </div>
      </div>
    );
  }

  const { agents, tasks, approvals, toolExecutions, recentEvents, situation } = state;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold flex items-center gap-1.5">
            🏢 Agent OS
          </h1>
          <Badge variant="outline" className="text-[10px]">
            {workspaceId?.slice(-8)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Situation indicators */}
          {situation.approvalsNeeded > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              <AlertTriangle className="w-3 h-3 mr-0.5" />
              {situation.approvalsNeeded} approval{situation.approvalsNeeded > 1 ? 's' : ''}
            </Badge>
          )}
          {situation.runningTools > 0 && (
            <Badge variant="outline" className="text-[10px] h-5">
              <Loader2 className="w-3 h-3 mr-0.5 animate-spin" />
              {situation.runningTools} running
            </Badge>
          )}
          {newEvents.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              <Radio className="w-3 h-3 mr-0.5" />
              {newEvents.length} new
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={refetch}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={showSplitPanel ? 72 : 95} minSize={40}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b px-2">
                <TabsList className="h-9">
                  <TabsTrigger value="office" className="text-xs gap-1">
                    <LayoutDashboard className="w-3 h-3" /> Office
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs gap-1">
                    <ListChecks className="w-3 h-3" /> Tasks
                    {tasks.length > 0 && (
                      <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-0.5">
                        {tasks.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="situation" className="text-xs gap-1">
                    <BarChart3 className="w-3 h-3" /> Situation
                  </TabsTrigger>
                  <TabsTrigger value="orchestrator" className="text-xs gap-1">
                    <Crown className="w-3 h-3" /> Orchestrator
                  </TabsTrigger>
                  <TabsTrigger value="approvals" className="text-xs gap-1">
                    <AlertTriangle className="w-3 h-3" /> Approvals
                    {approvals.length > 0 && (
                      <Badge variant="destructive" className="text-[9px] h-3.5 px-1 ml-0.5">
                        {approvals.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="events" className="text-xs gap-1">
                    <Radio className="w-3 h-3" /> Events
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <TabsContent value="office" className="h-full m-0 p-3 overflow-auto">
                  <OfficeLayout
                    agents={agents}
                    tasks={tasks}
                    onAgentClick={handleAgentClick}
                  />
                </TabsContent>

                <TabsContent value="tasks" className="h-full m-0 p-3">
                  <TaskBoard tasks={tasks} />
                </TabsContent>

                <TabsContent value="situation" className="h-full m-0 p-3">
                  <SituationRoom
                    situation={situation}
                    agents={agents}
                    recentEvents={recentEvents}
                  />
                </TabsContent>

                <TabsContent value="orchestrator" className="h-full m-0 p-3">
                  <OrchestratorPanel
                    workspaceId={workspaceId!}
                    agents={agents}
                  />
                </TabsContent>

                <TabsContent value="approvals" className="h-full m-0 p-3">
                  <ApprovalQueue
                    approvals={approvals}
                    onAction={handleApprovalAction}
                  />
                </TabsContent>

                <TabsContent value="events" className="h-full m-0 p-3">
                  <EventTimeline events={recentEvents} />
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>

          {showSplitPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={28} minSize={15} maxSize={40}>
                <div className="flex items-center justify-between px-2 py-1 border-b bg-slate-50">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Workspace
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => setShowSplitPanel(false)}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
                <SplitWorkspacePanel approvals={approvals} events={recentEvents} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Toggle split panel button */}
      {!showSplitPanel && (
        <div className="border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-[10px] text-muted-foreground"
            onClick={() => setShowSplitPanel(true)}
          >
            <ChevronUp className="w-3 h-3 mr-1" /> Show Workspace Panel
          </Button>
        </div>
      )}

      {/* Agent details drawer */}
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
