// ─── Agent OS — AgentDetailsDrawer ───────────────────────────
// Slide-out drawer showing detailed agent information.

'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentStatusBadge } from './AgentStatusBadge';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import { getZoneVisual } from '@/lib/office/zoneMapping';
import type { OfficeAgent, OfficeEvent, OfficeToolExecution } from '@/hooks/useOfficeData';

interface AgentDetailsDrawerProps {
  agent: OfficeAgent | null;
  open: boolean;
  onClose: () => void;
  recentEvents: OfficeEvent[];
  toolExecutions: OfficeToolExecution[];
}

export function AgentDetailsDrawer({
  agent,
  open,
  onClose,
  recentEvents,
  toolExecutions,
}: AgentDetailsDrawerProps) {
  if (!agent) return null;

  // Runtime-first: prefer runtimeState over static agent fields
  const runtimeStatus = agent.runtimeState?.status ?? agent.status;
  const runtimeZone = agent.runtimeState?.locationZone ?? agent.locationZone;

  const visual = getAgentVisual(agent.role);
  const displayName = agent.profile?.displayName ?? agent.name;
  const zone = getZoneVisual(runtimeZone);

  // Filter events and executions for this agent
  const agentEvents = recentEvents.filter(
    (e) => e.payload && typeof e.payload === 'object' && 'agentId' in (e.payload as Record<string, unknown>) && (e.payload as Record<string, unknown>).agentId === agent.id
  ).slice(0, 20);

  const agentExecutions = toolExecutions
    .filter((e) => e.agentId === agent.id)
    .slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[400px] sm:w-[480px] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl ${visual.bgColor} flex items-center justify-center text-3xl shadow-lg`}>
              {visual.emoji}
            </div>
            <div>
              <SheetTitle className="text-lg">{displayName}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {agent.role.replace('_', ' ')}
                </Badge>
                <AgentStatusBadge status={runtimeStatus} showLabel />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {zone.emoji} {zone.label}
              </p>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="h-[calc(100%-100px)]">
          <TabsList className="w-full justify-start px-4 pt-2">
            <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
            <TabsTrigger value="capabilities" className="text-xs">Skills</TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs">Access</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="px-4 mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 py-2">
                {agent.profile?.bio && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Bio</p>
                    <p className="text-xs text-muted-foreground">{agent.profile.bio}</p>
                  </div>
                )}
                {agent.profile?.seniority && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Seniority</p>
                    <Badge variant="secondary" className="text-xs">{agent.profile.seniority}</Badge>
                  </div>
                )}
                {agent.profile?.strengths && agent.profile.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Strengths</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.profile.strengths.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {agent.profile?.limitations && agent.profile.limitations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Limitations</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.profile.limitations.map((l, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] text-amber-600 border-amber-200">{l}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {agent.runtimeState?.currentActivity && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Current Activity</p>
                    <p className="text-xs text-muted-foreground">{agent.runtimeState.currentActivity}</p>
                  </div>
                )}
                {agent.modelConfigs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Model Config</p>
                    <div className="space-y-1">
                      {agent.modelConfigs.map((mc, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px]">{mc.preferenceType}</Badge>
                          <span>{mc.provider}/{mc.model}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="capabilities" className="px-4 mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-1 py-2">
                {agent.capabilities.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No capabilities configured</p>
                )}
                {agent.capabilities.map((cap) => (
                  <div key={cap.capabilityKey} className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-xs">{cap.capabilityKey.replace(/_/g, ' ')}</span>
                    <Badge variant="outline" className="text-[10px]">{cap.level}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="permissions" className="px-4 mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-1 py-2">
                {agent.permissions.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No permissions configured</p>
                )}
                {agent.permissions.map((perm) => (
                  <div key={perm.permissionKey} className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-xs">{perm.permissionKey}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        perm.permissionLevel === 'none'
                          ? 'text-red-600 border-red-200'
                          : perm.permissionLevel === 'admin'
                          ? 'text-emerald-600 border-emerald-200'
                          : ''
                      }`}
                    >
                      {perm.permissionLevel}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="px-4 mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="py-2 space-y-2">
                <p className="text-xs font-semibold">Tool Executions</p>
                {agentExecutions.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No recent executions</p>
                )}
                {agentExecutions.map((exec) => (
                  <div key={exec.id} className="p-2 bg-slate-50 rounded text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        exec.status === 'success' ? 'bg-emerald-400' :
                        exec.status === 'failed' ? 'bg-red-400' :
                        exec.status === 'running' ? 'bg-blue-400 animate-pulse' :
                        'bg-slate-400'
                      }`} />
                      <span className="font-medium">{exec.tool?.name ?? exec.action}</span>
                      <span className="text-muted-foreground">{exec.status}</span>
                    </div>
                    {exec.errorMessage && (
                      <p className="text-red-600 text-[10px] mt-0.5">{exec.errorMessage}</p>
                    )}
                  </div>
                ))}

                <p className="text-xs font-semibold mt-3">Related Events</p>
                {agentEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No recent events</p>
                )}
                {agentEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-2 text-[10px] py-0.5">
                    <span className="text-muted-foreground">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className="text-[8px] h-3 px-0.5">
                      {evt.eventType.split('.').pop()}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
