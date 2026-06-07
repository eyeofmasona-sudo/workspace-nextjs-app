// ─── Agent OS — EventTimeline ────────────────────────────────
// Shows a timeline of recent system events.

'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { OfficeEvent } from '@/hooks/useOfficeData';

const EVENT_CATEGORY_COLORS: Record<string, string> = {
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

function getEventCategory(eventType: string): string {
  const prefix = eventType.split('.')[0];
  return prefix in EVENT_CATEGORY_COLORS ? prefix : 'agent';
}

interface EventTimelineProps {
  events: OfficeEvent[];
  maxItems?: number;
}

export function EventTimeline({ events, maxItems = 30 }: EventTimelineProps) {
  const displayEvents = events.slice(0, maxItems);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">📡 Event Timeline</h3>
        <span className="text-[10px] text-muted-foreground">
          {events.length} events
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-1 pr-2">
          {displayEvents.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No events yet
            </p>
          )}
          {displayEvents.map((event, index) => {
            const category = getEventCategory(event.eventType);
            const color = EVENT_CATEGORY_COLORS[category] ?? 'bg-gray-400';
            const parts = event.eventType.split('.');
            const label = parts[parts.length - 1];
            const payload = event.payload as Record<string, unknown> | null;

            return (
              <div
                key={event.id}
                className="flex items-start gap-2 py-1 text-xs group"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-2 h-2 rounded-full ${color} ${index === 0 ? 'animate-pulse' : ''}`} />
                  {index < displayEvents.length - 1 && (
                    <div className="w-0.5 h-4 bg-slate-200 mt-0.5" />
                  )}
                </div>

                {/* Event info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-mono">
                      {label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(event.createdAt).toLocaleTimeString('en', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  {/* Brief payload summary */}
                  {payload && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {typeof payload.toolKey === 'string' ? `${payload.toolKey} ` : ''}
                      {typeof payload.agentId === 'string' ? `agent:${payload.agentId.slice(-6)} ` : ''}
                      {typeof payload.correlationId === 'string' ? `🔗${payload.correlationId.slice(-8)}` : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
