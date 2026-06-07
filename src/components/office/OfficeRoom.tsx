// ─── Agent OS — OfficeRoom ───────────────────────────────────
// A single room/zone in the 2.5D office.
// Has floor tiles, 3D walls, zone label, workstations, and agent sprites.

'use client';

import { motion } from 'framer-motion';
import { getZoneVisual } from '@/lib/office/zoneMapping';
import { AgentSprite } from './AgentSprite';
import { Workstation, ServerRack, MeetingTable, CommandBoard, LoungeArea } from './Workstation';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';
import type { AgentAnimationState, ZoneAnimationState } from '@/hooks/useOfficeAnimations';
import {
  Crown, Monitor, Code, Palette, BookOpen, Server, Users, Coffee,
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

// Zone-specific furniture type
type FurnitureType = 'workstation' | 'command' | 'meeting' | 'server' | 'lounge';

interface OfficeRoomProps {
  zoneKey: string;
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
  agentAnimations?: Record<string, AgentAnimationState>;
  zoneAnimation?: ZoneAnimationState | null;
}

// Map zones to their furniture type
const ZONE_FURNITURE: Record<string, FurnitureType> = {
  command_area: 'command',
  situation_room: 'workstation',
  meeting_room: 'meeting',
  development_area: 'workstation',
  design_area: 'workstation',
  research_area: 'workstation',
  server_room: 'server',
  lounge_area: 'lounge',
};

export function OfficeRoom({
  zoneKey,
  agents,
  tasks,
  onAgentClick,
  agentAnimations = {},
  zoneAnimation,
}: OfficeRoomProps) {
  const zone = getZoneVisual(zoneKey);
  const Icon = ZONE_ICONS[zoneKey] ?? Users;
  const furnitureType = ZONE_FURNITURE[zoneKey] ?? 'workstation';
  const isHighlighted = !!zoneAnimation;
  const activeAgents = agents.filter((a) => a.status !== 'offline');
  const activeTaskCount = tasks.filter(
    (t) => ['in_progress', 'review', 'waiting_approval'].includes(t.status) &&
      agents.some((a) => a.id === t.assignedAgentId)
  ).length;

  return (
    <motion.div
      className={`
        relative rounded-lg overflow-hidden
        border-2 ${zone.borderColor}
        min-h-[120px] flex flex-col
        transition-shadow duration-300
      `}
      style={{
        background: `
          linear-gradient(180deg, ${zone.color.replace('bg-', '').includes('-50') ? 'rgba(248,250,252,0.8)' : 'rgba(255,255,255,0.6)'} 0%, rgba(255,255,255,0.3) 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 15px,
            rgba(0,0,0,0.015) 15px,
            rgba(0,0,0,0.015) 16px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 15px,
            rgba(0,0,0,0.015) 15px,
            rgba(0,0,0,0.015) 16px
          )
        `,
        boxShadow: isHighlighted
          ? `0 0 20px rgba(59,130,246,0.2), inset 0 0 30px rgba(59,130,246,0.05)`
          : `inset 0 0 15px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.06)`,
      }}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 3D Wall effect — top & left lighter, bottom & right darker */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        borderTop: '3px solid rgba(255,255,255,0.5)',
        borderLeft: '2px solid rgba(255,255,255,0.3)',
        borderRight: '2px solid rgba(0,0,0,0.06)',
        borderBottom: '2px solid rgba(0,0,0,0.08)',
      }} />

      {/* Zone header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/40 backdrop-blur-sm border-b border-black/5">
        <div className={`w-5 h-5 rounded flex items-center justify-center`} style={{
          backgroundColor: `${zone.color.replace('bg-', '').includes('50') ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)'}`,
        }}>
          <Icon className="w-3 h-3 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[10px] font-bold text-gray-700 truncate flex items-center gap-0.5">
            {zone.emoji} {zone.label}
          </h3>
        </div>
        {/* Active indicator */}
        {activeAgents.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[8px] text-gray-500 font-medium">{activeAgents.length}</span>
          </div>
        )}
        {activeTaskCount > 0 && (
          <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full font-medium">
            {activeTaskCount}t
          </span>
        )}
      </div>

      {/* Room content — furniture + agents */}
      <div className="flex-1 p-2 relative">
        {/* Furniture layer (behind agents) */}
        <div className="absolute inset-2 flex items-end justify-center gap-2 pointer-events-none opacity-60">
          {furnitureType === 'command' && <CommandBoard isActive={agents.some((a) => a.status === 'working')} />}
          {furnitureType === 'meeting' && <MeetingTable />}
          {furnitureType === 'server' && (
            <>
              <ServerRack isActive={agents.some((a) => a.status === 'working')} />
              <ServerRack isActive={agents.some((a) => a.status === 'waiting_api')} />
            </>
          )}
          {furnitureType === 'lounge' && <LoungeArea />}
          {furnitureType === 'workstation' && agents.map((agent) => (
            <Workstation
              key={agent.id}
              role={agent.role}
              occupied={agent.status !== 'offline'}
              isActive={agent.status === 'working' || agent.status === 'thinking'}
              compact
            />
          ))}
        </div>

        {/* Agent sprites layer (on top of furniture) */}
        <div className="relative z-10 flex flex-wrap gap-1 justify-center items-end min-h-[50px]">
          {agents.length > 0 ? (
            agents.map((agent) => (
              <AgentSprite
                key={agent.id}
                agent={agent}
                animationState={agentAnimations[agent.id] ?? null}
                onClick={() => onAgentClick?.(agent.id)}
              />
            ))
          ) : (
            <p className="text-[9px] text-gray-400 italic flex items-center gap-1 py-3">
              <span className="opacity-30">{zone.emoji}</span> Empty room
            </p>
          )}
        </div>
      </div>

      {/* Zone highlight pulse animation */}
      {isHighlighted && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          initial={{ backgroundColor: 'rgba(59,130,246,0.08)' }}
          animate={{ backgroundColor: ['rgba(59,130,246,0.08)', 'rgba(59,130,246,0.02)', 'rgba(59,130,246,0.08)'] }}
          transition={{ duration: 1, repeat: 2 }}
        />
      )}

      {/* Zone emoji decoration */}
      <div className="absolute bottom-1 right-2 text-3xl opacity-[0.04] select-none pointer-events-none">
        {zone.emoji}
      </div>
    </motion.div>
  );
}
