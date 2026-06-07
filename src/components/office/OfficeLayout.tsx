// ─── Agent OS — OfficeLayout ─────────────────────────────────
// The main 2.5D office floor plan layout.
// CSS Grid-based with stylized zone positioning.

'use client';

import { OfficeZone } from './OfficeZone';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';

interface OfficeLayoutProps {
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
}

const ZONE_ORDER = [
  'command_area',
  'situation_room',
  'meeting_room',
  'development_area',
  'design_area',
  'research_area',
  'server_room',
  'lounge_area',
];

export function OfficeLayout({ agents, tasks, onAgentClick }: OfficeLayoutProps) {
  // Group agents by zone
  const agentsByZone = ZONE_ORDER.reduce<Record<string, OfficeAgent[]>>((acc, zone) => {
    acc[zone] = agents.filter((a) => a.locationZone === zone);
    return acc;
  }, {});

  return (
    <div className="w-full h-full">
      {/* Office floor label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Agent Office — Live
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {agents.filter((a) => a.status !== 'offline').length}/{agents.length} active
        </span>
      </div>

      {/* Floor plan grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-min">
        {ZONE_ORDER.map((zone) => (
          <OfficeZone
            key={zone}
            zoneKey={zone}
            agents={agentsByZone[zone] ?? []}
            tasks={tasks}
            onAgentClick={onAgentClick}
          />
        ))}
      </div>

      {/* Floor decoration */}
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>🏢 Floor 1 — Main Office</span>
        <span>•</span>
        <span>{agents.length} agents</span>
        <span>•</span>
        <span>{tasks.length} tasks</span>
      </div>
    </div>
  );
}
