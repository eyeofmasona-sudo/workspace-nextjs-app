// ─── Agent OS — OfficeRoom ───────────────────────────────────
// A single room/zone in the 2.5D office.
// Has floor tiles, 3D walls, zone label, workstations, and agent sprites.
// Runtime-first: uses agent.runtimeState?.status ?? agent.status

'use client';

import { motion } from 'framer-motion';
import { getZoneVisual } from '@/lib/office/zoneMapping';
import { AgentSprite } from './AgentSprite';
import { Workstation, ServerRack, MeetingTable, CommandBoard, LoungeArea } from './Workstation';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';
import type { AgentAnimationState, ZoneAnimationState } from '@/hooks/useOfficeAnimations';
import {
  Crown, Monitor, Code, Palette, BookOpen, Server, Users, Coffee,
  Megaphone, PenTool, TrendingUp,
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
  marketing_area: Megaphone,
  content_studio: PenTool,
  growth_lab: TrendingUp,
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
  marketing_area: 'workstation',
  content_studio: 'workstation',
  growth_lab: 'workstation',
};

// Runtime-first helpers
function getRuntimeStatus(agent: OfficeAgent): string {
  return agent.runtimeState?.status ?? agent.status;
}
function getRuntimeZone(agent: OfficeAgent): string {
  return agent.runtimeState?.locationZone ?? agent.locationZone;
}

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

  // Runtime-first: use runtimeState?.status for active filtering
  const activeAgents = agents.filter((a) => getRuntimeStatus(a) !== 'offline');
  const activeTaskCount = tasks.filter(
    (t) => ['in_progress', 'review', 'waiting_approval'].includes(t.status) &&
      agents.some((a) => a.id === t.assignedAgentId)
  ).length;

  // Runtime-first status checks for furniture
  const hasWorkingAgent = agents.some((a) => getRuntimeStatus(a) === 'working');
  const hasWaitingApiAgent = agents.some((a) => getRuntimeStatus(a) === 'waiting_api');

  return (
    <motion.div
      className={`
        relative rounded-lg overflow-hidden
        border-2 ${zone.borderColor}
        min-h-[130px] flex flex-col
        transition-shadow duration-300
      `}
      style={{
        background: `
          linear-gradient(180deg, rgba(248,250,252,0.85) 0%, rgba(241,245,249,0.6) 40%, rgba(226,232,240,0.4) 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 18px,
            rgba(0,0,0,0.03) 18px,
            rgba(0,0,0,0.03) 19px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 18px,
            rgba(0,0,0,0.03) 18px,
            rgba(0,0,0,0.03) 19px
          )
        `,
        boxShadow: isHighlighted
          ? `0 0 24px rgba(59,130,246,0.25), inset 0 0 30px rgba(59,130,246,0.06)`
          : `
            inset 0 2px 4px rgba(255,255,255,0.4),
            inset 0 -2px 8px rgba(0,0,0,0.06),
            0 4px 16px rgba(0,0,0,0.1),
            0 1px 4px rgba(0,0,0,0.06)
          `,
      }}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 3D Wall effect — top wall (ceiling edge light), bottom wall (floor shadow), side walls */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        borderTop: '4px solid rgba(255,255,255,0.6)',
        borderLeft: '3px solid rgba(255,255,255,0.35)',
        borderRight: '3px solid rgba(0,0,0,0.08)',
        borderBottom: '4px solid rgba(0,0,0,0.1)',
      }} />

      {/* Room inner depth — top shadow creates ceiling illusion */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: `
          linear-gradient(180deg, rgba(203,213,225,0.15) 0%, transparent 12%),
          linear-gradient(0deg, rgba(30,41,59,0.06) 0%, transparent 8%),
          linear-gradient(90deg, rgba(0,0,0,0.03) 0%, transparent 5%),
          linear-gradient(270deg, rgba(0,0,0,0.03) 0%, transparent 5%)
        `,
      }} />

      {/* Zone header — room label bar with wall depth */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 border-b relative z-10"
        style={{
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(4px)',
          borderBottom: '2px solid rgba(0,0,0,0.06)',
          boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.4)',
        }}
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center`} style={{
          backgroundColor: 'rgba(255,255,255,0.75)',
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
        {/* Furniture layer (behind agents) — higher opacity for visibility */}
        <div className="absolute inset-2 flex items-end justify-center gap-2 pointer-events-none opacity-85">
          {furnitureType === 'command' && <CommandBoard isActive={hasWorkingAgent} />}
          {furnitureType === 'meeting' && <MeetingTable />}
          {furnitureType === 'server' && (
            <>
              <ServerRack isActive={hasWorkingAgent} />
              <ServerRack isActive={hasWaitingApiAgent} />
            </>
          )}
          {furnitureType === 'lounge' && <LoungeArea />}
          {furnitureType === 'workstation' && agents.map((agent) => (
            <Workstation
              key={agent.id}
              role={agent.role}
              occupied={getRuntimeStatus(agent) !== 'offline'}
              isActive={getRuntimeStatus(agent) === 'working' || getRuntimeStatus(agent) === 'thinking'}
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

      {/* Zone emoji decoration — watermark */}
      <div className="absolute bottom-1 right-2 text-4xl opacity-[0.05] select-none pointer-events-none">
        {zone.emoji}
      </div>
    </motion.div>
  );
}
