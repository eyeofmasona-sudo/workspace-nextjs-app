// ─── Agent OS — SituationRoom ────────────────────────────────
// Dashboard showing current operational situation.

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { OfficeSituation, OfficeAgent, OfficeEvent } from '@/hooks/useOfficeData';
import { Activity, AlertTriangle, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

interface SituationRoomProps {
  situation: OfficeSituation;
  agents: OfficeAgent[];
  recentEvents: OfficeEvent[];
}

export function SituationRoom({ situation, agents, recentEvents }: SituationRoomProps) {
  const workingAgents = agents.filter((a) => a.status === 'working').length;
  const idleAgents = agents.filter((a) => a.status === 'idle').length;
  const errorAgents = agents.filter((a) => a.status === 'error').length;
  const totalAgents = agents.length;
  const utilizationPercent = totalAgents > 0 ? Math.round((workingAgents / totalAgents) * 100) : 0;

  const stats = [
    {
      label: 'Active Tasks',
      value: situation.activeTasks,
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Waiting Approval',
      value: situation.approvalsNeeded,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Running Tools',
      value: situation.runningTools,
      icon: Loader2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Failed Executions',
      value: situation.failedExecutions,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <h3 className="text-sm font-semibold">📊 Situation Room</h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="py-0">
            <CardContent className="p-2.5 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent utilization */}
      <Card className="py-0 mb-3">
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">Agent Utilization</span>
            <span className="text-xs text-muted-foreground">{utilizationPercent}%</span>
          </div>
          <Progress value={utilizationPercent} className="h-2" />
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>🟢 {workingAgents} working</span>
            <span>☕ {idleAgents} idle</span>
            <span>❌ {errorAgents} error</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity summary */}
      <Card className="py-0 flex-1 min-h-0">
        <CardContent className="p-2.5 h-full flex flex-col">
          <p className="text-xs font-medium mb-1.5">Recent Activity</p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {recentEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="flex items-start gap-1.5 text-[10px]">
                <span className="text-muted-foreground whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-mono text-[9px] bg-slate-100 px-1 rounded">
                  {event.eventType.split('.').pop()}
                </span>
              </div>
            ))}
            {recentEvents.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
