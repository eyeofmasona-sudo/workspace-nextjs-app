// ─── Agent OS — PreviewPanel ─────────────────────────────────
// Split-screen preview panel showing agent details, situation
// overview, and recent events. Used in the right sidebar on
// desktop, and collapsible on mobile.

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentStatusBadge } from './AgentStatusBadge';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import { getZoneVisual } from '@/lib/office/zoneMapping';
import type {
  OfficeAgent,
  OfficeTask,
  OfficeSituation,
  OfficeEvent,
  OfficeToolExecution,
} from '@/hooks/useOfficeData';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Loader2,
  Radio,
  XCircle,
  ChevronDown,
  ChevronUp,
  User,
  ListChecks,
} from 'lucide-react';

// ─── Preview Tab Types ──────────────────────────────────────
type PreviewTab = 'overview' | 'agent' | 'activity';

interface PreviewPanelProps {
  selectedAgent: OfficeAgent | null;
  situation: OfficeSituation;
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  recentEvents: OfficeEvent[];
  toolExecutions: OfficeToolExecution[];
  approvalsCount: number;
  isMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ─── Overview Card ──────────────────────────────────────────
function OverviewSection({
  situation,
  agents,
  tasks,
  approvalsCount,
}: {
  situation: OfficeSituation;
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  approvalsCount: number;
}) {
  const workingAgents = agents.filter((a) => {
    const s = a.runtimeState?.status ?? a.status;
    return s === 'working' || s === 'thinking';
  }).length;
  const idleAgents = agents.filter((a) => {
    const s = a.runtimeState?.status ?? a.status;
    return s === 'idle' || s === 'offline';
  }).length;
  const errorAgents = agents.filter((a) => {
    const s = a.runtimeState?.status ?? a.status;
    return s === 'error';
  }).length;
  const totalAgents = agents.length;
  const utilization = totalAgents > 0 ? Math.round((workingAgents / totalAgents) * 100) : 0;

  const stats = [
    { label: 'Active Tasks', value: situation.activeTasks, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Approvals', value: approvalsCount, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Running Tools', value: situation.runningTools, icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Failed', value: situation.failedExecutions, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-3">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <Card key={stat.label} className="py-0">
            <CardContent className="p-2 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-none">{stat.value}</p>
                <p className="text-[9px] text-muted-foreground truncate">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent utilization */}
      <Card className="py-0">
        <CardContent className="p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium">Agent Utilization</span>
            <span className="text-[11px] text-muted-foreground">{utilization}%</span>
          </div>
          <Progress value={utilization} className="h-1.5" />
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
            <span>🟢 {workingAgents} working</span>
            <span>☕ {idleAgents} idle</span>
            {errorAgents > 0 && <span>❌ {errorAgents} error</span>}
          </div>
        </CardContent>
      </Card>

      {/* Task summary */}
      <Card className="py-0">
        <CardContent className="p-2">
          <p className="text-[11px] font-medium mb-1.5">📋 Tasks</p>
          <div className="space-y-1">
            {['in_progress', 'waiting_approval', 'review', 'backlog'].map((status) => {
              const count = tasks.filter((t) => t.status === status).length;
              if (count === 0) return null;
              const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const colors: Record<string, string> = {
                in_progress: 'bg-emerald-400',
                waiting_approval: 'bg-orange-400',
                review: 'bg-violet-400',
                backlog: 'bg-slate-400',
              };
              return (
                <div key={status} className="flex items-center gap-1.5 text-[10px]">
                  <div className={`w-2 h-2 rounded-full ${colors[status] ?? 'bg-slate-300'}`} />
                  <span className="text-muted-foreground">{label}</span>
                  <span className="ml-auto font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agent roster */}
      <Card className="py-0">
        <CardContent className="p-2">
          <p className="text-[11px] font-medium mb-1.5">👥 Agents</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {agents.map((agent) => {
              const visual = getAgentVisual(agent.role);
              const status = agent.runtimeState?.status ?? agent.status;
              return (
                <div key={agent.id} className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-xs">{visual.emoji}</span>
                  <span className="truncate flex-1">{agent.profile?.displayName ?? agent.name}</span>
                  <AgentStatusBadge status={status} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Agent Detail Section ───────────────────────────────────
function AgentDetailSection({
  agent,
  recentEvents,
  toolExecutions,
}: {
  agent: OfficeAgent;
  recentEvents: OfficeEvent[];
  toolExecutions: OfficeToolExecution[];
}) {
  const visual = getAgentVisual(agent.role);
  const displayName = agent.profile?.displayName ?? agent.name;
  const runtimeStatus = agent.runtimeState?.status ?? agent.status;
  const runtimeZone = agent.runtimeState?.locationZone ?? agent.locationZone;
  const zone = getZoneVisual(runtimeZone);

  const agentEvents = recentEvents
    .filter(
      (e) =>
        e.payload &&
        typeof e.payload === 'object' &&
        'agentId' in (e.payload as Record<string, unknown>) &&
        (e.payload as Record<string, unknown>).agentId === agent.id
    )
    .slice(0, 15);

  const agentExecutions = toolExecutions.filter((e) => e.agentId === agent.id).slice(0, 8);

  return (
    <div className="space-y-3">
      {/* Agent header */}
      <Card className="py-0">
        <CardContent className="p-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl ${visual.bgColor} flex items-center justify-center text-xl shadow-md flex-shrink-0`}>
              {visual.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {agent.role.replace(/_/g, ' ')}
                </Badge>
                <AgentStatusBadge status={runtimeStatus} showLabel />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {zone.emoji} {zone.label}
              </p>
            </div>
          </div>

          {agent.runtimeState?.currentActivity && (
            <div className="mt-2 p-1.5 bg-slate-50 dark:bg-slate-800 rounded text-[10px]">
              <span className="text-muted-foreground">Current: </span>
              <span className="font-medium">{agent.runtimeState.currentActivity}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths & Bio */}
      {agent.profile && (
        <Card className="py-0">
          <CardContent className="p-2.5 space-y-2">
            {agent.profile.bio && (
              <p className="text-[10px] text-muted-foreground">{agent.profile.bio}</p>
            )}
            {agent.profile.strengths && agent.profile.strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold mb-1">Strengths</p>
                <div className="flex flex-wrap gap-1">
                  {agent.profile.strengths.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[8px] h-3.5 px-1">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent executions */}
      {agentExecutions.length > 0 && (
        <Card className="py-0">
          <CardContent className="p-2.5">
            <p className="text-[10px] font-semibold mb-1.5">🔧 Tool Executions</p>
            <div className="space-y-1">
              {agentExecutions.map((exec) => (
                <div key={exec.id} className="flex items-center gap-1.5 text-[9px] p-1 bg-slate-50 dark:bg-slate-800 rounded">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      exec.status === 'success'
                        ? 'bg-emerald-400'
                        : exec.status === 'failed'
                          ? 'bg-red-400'
                          : exec.status === 'running'
                            ? 'bg-blue-400 animate-pulse'
                            : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-medium truncate flex-1">{exec.tool?.name ?? exec.action}</span>
                  <Badge variant="outline" className="text-[7px] h-3 px-0.5">
                    {exec.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent events */}
      {agentEvents.length > 0 && (
        <Card className="py-0">
          <CardContent className="p-2.5">
            <p className="text-[10px] font-semibold mb-1.5">📡 Events</p>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {agentEvents.map((evt) => (
                <div key={evt.id} className="flex items-center gap-1.5 text-[9px]">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(evt.createdAt).toLocaleTimeString('en', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <Badge variant="outline" className="text-[7px] h-3 px-0.5 font-mono">
                    {evt.eventType.split('.').pop()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model config */}
      {agent.modelConfigs.length > 0 && (
        <Card className="py-0">
          <CardContent className="p-2.5">
            <p className="text-[10px] font-semibold mb-1">🤖 Model</p>
            {agent.modelConfigs.slice(0, 2).map((mc, i) => (
              <div key={i} className="text-[9px] text-muted-foreground">
                {mc.provider}/{mc.model}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Activity Section ───────────────────────────────────────
function ActivitySection({ recentEvents }: { recentEvents: OfficeEvent[] }) {
  const EVENT_COLORS: Record<string, string> = {
    project: 'bg-violet-500',
    epic: 'bg-violet-400',
    task: 'bg-blue-500',
    agent: 'bg-emerald-500',
    approval: 'bg-orange-500',
    memory: 'bg-purple-500',
    cost: 'bg-amber-500',
    orchestrator: 'bg-indigo-500',
    tool: 'bg-teal-500',
  };

  function getCategory(eventType: string): string {
    const prefix = eventType.split('.')[0];
    return prefix in EVENT_COLORS ? prefix : 'agent';
  }

  return (
    <div className="space-y-1.5">
      {recentEvents.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Radio className="w-6 h-6 mx-auto mb-1 opacity-40" />
          <p className="text-[10px]">No events yet</p>
        </div>
      )}
      {recentEvents.slice(0, 30).map((event, index) => {
        const category = getCategory(event.eventType);
        const color = EVENT_COLORS[category] ?? 'bg-gray-400';
        const label = event.eventType.split('.').pop();

        return (
          <div key={event.id} className="flex items-start gap-1.5 text-[10px]">
            <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${color} ${index === 0 ? 'animate-pulse' : ''}`} />
              {index < Math.min(recentEvents.length, 30) - 1 && (
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mt-0.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[7px] h-3 px-0.5 font-mono">
                  {label}
                </Badge>
                <span className="text-[8px] text-muted-foreground">
                  {new Date(event.createdAt).toLocaleTimeString('en', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main PreviewPanel Component ────────────────────────────
export function PreviewPanel({
  selectedAgent,
  situation,
  agents,
  tasks,
  recentEvents,
  toolExecutions,
  approvalsCount,
  isMobile = false,
  collapsed = false,
  onToggleCollapse,
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>(
    selectedAgent ? 'agent' : 'overview'
  );

  // Auto-switch to agent tab when an agent is selected
  const currentTab = selectedAgent ? (activeTab === 'agent' ? 'agent' : activeTab) : activeTab;

  // Mobile collapsed state
  if (isMobile && collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-black/60 backdrop-blur-md border-t border-white/10 text-white text-xs"
      >
        <ChevronUp className="w-3.5 h-3.5" />
        <span className="font-medium">Preview</span>
        <Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-1">
          {agents.filter((a) => {
            const s = a.runtimeState?.status ?? a.status;
            return s !== 'offline';
          }).length}/{agents.length}
        </Badge>
      </button>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1a2e] text-white">
      {/* Header with tabs */}
      <div className="flex-shrink-0 border-b border-white/10">
        <div className="flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold">Preview</span>
          </div>
          <div className="flex items-center gap-1">
            {isMobile && onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-slate-400 hover:text-white"
                onClick={onToggleCollapse}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        <Tabs value={currentTab} onValueChange={(v) => setActiveTab(v as PreviewTab)} className="w-full">
          <TabsList className="w-full justify-start px-2 h-7 bg-transparent">
            <TabsTrigger
              value="overview"
              className="text-[10px] h-5 px-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <BarChart3 className="w-3 h-3 mr-0.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="agent"
              className="text-[10px] h-5 px-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
              disabled={!selectedAgent}
            >
              <User className="w-3 h-3 mr-0.5" />
              Agent
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="text-[10px] h-5 px-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <Radio className="w-3 h-3 mr-0.5" />
              Activity
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2.5">
          {currentTab === 'overview' && (
            <OverviewSection
              situation={situation}
              agents={agents}
              tasks={tasks}
              approvalsCount={approvalsCount}
            />
          )}
          {currentTab === 'agent' && selectedAgent && (
            <AgentDetailSection
              agent={selectedAgent}
              recentEvents={recentEvents}
              toolExecutions={toolExecutions}
            />
          )}
          {currentTab === 'activity' && (
            <ActivitySection recentEvents={recentEvents} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
