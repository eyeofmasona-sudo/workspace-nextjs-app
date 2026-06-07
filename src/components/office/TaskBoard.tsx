// ─── Agent OS — TaskBoard ────────────────────────────────────
// Kanban-style task board with status columns.

'use client';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import type { OfficeTask } from '@/hooks/useOfficeData';

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'bg-slate-100', border: 'border-slate-200' },
  { key: 'planned', label: 'Planned', color: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'review', label: 'Review', color: 'bg-violet-50', border: 'border-violet-200' },
  { key: 'waiting_approval', label: 'Approval', color: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'done', label: 'Done', color: 'bg-green-50', border: 'border-green-200' },
  { key: 'failed', label: 'Failed', color: 'bg-red-50', border: 'border-red-200' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-200 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const RISK_ICONS: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
};

interface TaskBoardProps {
  tasks: OfficeTask[];
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  const tasksByStatus = COLUMNS.reduce<Record<string, OfficeTask[]>>((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">📋 Task Board</h3>
        <span className="text-[10px] text-muted-foreground">{tasks.length} tasks</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex gap-2 pb-4 min-w-max">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`w-56 flex-shrink-0 rounded-lg border ${col.border} ${col.color} p-2`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">{col.label}</span>
                <span className="text-[10px] text-muted-foreground bg-white/60 px-1.5 rounded">
                  {tasksByStatus[col.key]?.length ?? 0}
                </span>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {(tasksByStatus[col.key] ?? []).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {(!tasksByStatus[col.key] || tasksByStatus[col.key].length === 0) && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-4">No tasks</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TaskCard({ task }: { task: OfficeTask }) {
  const agentVisual = task.assignedAgent
    ? getAgentVisual(task.assignedAgent.role)
    : null;

  return (
    <div className="bg-white rounded-lg p-2 shadow-sm border border-white/60 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] font-medium leading-tight line-clamp-2">{task.title}</p>
        {task.requiresApproval && (
          <span className="text-[10px]">⚠️</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        {task.assignedAgent && (
          <span className="text-[10px]" title={task.assignedAgent.name}>
            {agentVisual?.emoji}
          </span>
        )}
        <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${PRIORITY_COLORS[task.priority] ?? ''}`}>
          {task.priority}
        </Badge>
        <span className="text-[9px]" title={`Risk: ${task.riskLevel}`}>
          {RISK_ICONS[task.riskLevel] ?? '🟢'}
        </span>
        {task.pendingApprovals > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-orange-50 text-orange-700 border-orange-200">
            {task.pendingApprovals} pending
          </Badge>
        )}
      </div>
    </div>
  );
}
