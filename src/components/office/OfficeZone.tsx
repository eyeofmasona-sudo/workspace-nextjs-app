// ─── Agent OS — OfficeZone ───────────────────────────────────
// A single zone/room in the office layout.
// Displays zone header, agents inside, and active events.

'use client';

import { motion } from 'framer-motion';
import { getZoneVisual } from '@/lib/office/zoneMapping';
import { AgentCharacter } from './AgentCharacter';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';
import {
  Crown, Monitor, Code, Palette, BookOpen, Server, Users, Coffee
} from 'lucide-react';

const ZONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  command_area: Crown,
  situation_room: Monitor,
  development_area: Code,
  design_area: Palette,
  research_area: BookOpen,
  server_room: Server,
  meeting_room: Users,
  lounge_area: Coffee,
};

interface OfficeZoneProps {
  zoneKey: string;
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
}

export function OfficeZone({ zoneKey, agents, tasks, onAgentClick }: OfficeZoneProps) {
  const zone = getZoneVisual(zoneKey);
  const Icon = ZONE_ICONS[zoneKey] ?? Users;

  const activeTaskCount = tasks.filter(
    (t) => ['in_progress', 'review', 'waiting_approval'].includes(t.status) &&
      agents.some((a) => a.id === t.assignedAgentId)
  ).length;

  return (
    <motion.div
      className={`
        relative rounded-xl border-2 ${zone.borderColor} ${zone.color}
        p-3 min-h-[140px] flex flex-col
        transition-all hover:shadow-md overflow-hidden
      `}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Zone header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${zone.borderColor.replace('border-', 'bg-').replace('-200', '-100')} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-current opacity-70" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold truncate">{zone.emoji} {zone.label}</h3>
          <p className="text-[10px] text-muted-foreground truncate">{zone.description}</p>
        </div>
        {/* Active task indicator */}
        {activeTaskCount > 0 && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
            {activeTaskCount} task{activeTaskCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Agents grid */}
      <div className="flex-1 flex flex-wrap gap-1 content-start">
        {agents.length > 0 ? (
          agents.map((agent) => (
            <AgentCharacter
              key={agent.id}
              agent={agent}
              compact
              onClick={() => onAgentClick?.(agent.id)}
            />
          ))
        ) : (
          <p className="text-[10px] text-muted-foreground italic">Empty room</p>
        )}
      </div>

      {/* Subtle zone decoration */}
      <div className="absolute bottom-1 right-2 text-4xl opacity-5 select-none pointer-events-none">
        {zone.emoji}
      </div>
    </motion.div>
  );
}
