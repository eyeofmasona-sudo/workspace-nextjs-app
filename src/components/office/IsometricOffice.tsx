// ─── Agent OS — Isometric Office ──────────────────────────────
// The main 2.5D isometric office scene.
// A single floor with zones as areas, furniture, and agent characters.
// Uses CSS transform for isometric view: rotateX(60deg) rotateZ(-45deg).
// No card grid — this is a miniature office diorama.

'use client';

import { IsometricAgent } from './IsometricAgent';
import {
  IsoDesk,
  IsoCommandBoard,
  IsoMeetingTable,
  IsoServerRack,
  IsoBookshelf,
  IsoSofa,
  IsoMonitorWall,
} from './IsometricFurniture';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';
import type { AgentAnimationState, ZoneAnimationState } from '@/hooks/useOfficeAnimations';
import { getZoneVisual } from '@/lib/office/zoneMapping';

// ─── Props ──────────────────────────────────────────────────────
interface IsometricOfficeProps {
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
  agentAnimations?: Record<string, AgentAnimationState>;
  zoneAnimations?: Record<string, ZoneAnimationState>;
}

// ─── Runtime-first helpers ──────────────────────────────────────
function getRuntimeStatus(agent: OfficeAgent): string {
  return agent.runtimeState?.status ?? agent.status;
}
function getRuntimeZone(agent: OfficeAgent): string {
  return agent.runtimeState?.locationZone ?? agent.locationZone;
}

// ─── Zone layout on the floor (720 × 500 floor rectangle) ──────
// Row 1 (back): Command, Meeting, Situation
// Row 2 (mid):   Development (large), Design
// Row 3 (front): Server, Research, Lounge

interface ZoneLayout {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tint: string;
  border: string;
}

const ZONES: ZoneLayout[] = [
  // Row 1 — back of office
  { key: 'command_area',   x: 8,   y: 8,   w: 230, h: 150, tint: 'rgba(139,92,246,0.06)',  border: 'rgba(139,92,246,0.18)' },
  { key: 'meeting_room',   x: 246, y: 8,   w: 230, h: 150, tint: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.18)' },
  { key: 'situation_room', x: 484, y: 8,   w: 228, h: 150, tint: 'rgba(59,130,246,0.06)',   border: 'rgba(59,130,246,0.18)' },
  // Row 2 — middle
  { key: 'development_area', x: 8,   y: 166, w: 350, h: 150, tint: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.18)' },
  { key: 'design_area',      x: 366, y: 166, w: 346, h: 150, tint: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.18)' },
  // Row 3 — front
  { key: 'server_room',   x: 8,   y: 324, w: 230, h: 168, tint: 'rgba(20,184,166,0.06)',   border: 'rgba(20,184,166,0.18)' },
  { key: 'research_area',  x: 246, y: 324, w: 230, h: 168, tint: 'rgba(139,92,246,0.06)',   border: 'rgba(139,92,246,0.18)' },
  { key: 'lounge_area',    x: 484, y: 324, w: 228, h: 168, tint: 'rgba(168,162,158,0.06)',  border: 'rgba(168,162,158,0.18)' },
  // Marketing Department
  { key: 'marketing_area',  x: 8,   y: 500, w: 230, h: 150, tint: 'rgba(217,70,239,0.06)',  border: 'rgba(217,70,239,0.18)' },
  { key: 'content_studio',  x: 246, y: 500, w: 228, h: 150, tint: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.18)' },
  { key: 'growth_lab',      x: 484, y: 500, w: 228, h: 150, tint: 'rgba(6,182,212,0.06)',   border: 'rgba(6,182,212,0.18)' },
];

// ─── Furniture positions per zone (absolute on floor) ───────────
interface FurniturePlacement {
  type: 'desk' | 'command_board' | 'meeting_table' | 'server_rack' | 'bookshelf' | 'sofa' | 'monitor_wall';
  x: number;
  y: number;
  props?: Record<string, unknown>;
}

const ZONE_FURNITURE: Record<string, FurniturePlacement[]> = {
  command_area: [
    { type: 'command_board', x: 20, y: 20 },
    { type: 'desk', x: 40, y: 60, props: { monitorLabel: 'CMD', color: '#8B5CF6' } },
  ],
  meeting_room: [
    { type: 'meeting_table', x: 70, y: 25 },
  ],
  situation_room: [
    { type: 'monitor_wall', x: 20, y: 15 },
    { type: 'desk', x: 30, y: 70, props: { monitorLabel: 'ANA', color: '#3B82F6' } },
  ],
  development_area: [
    { type: 'desk', x: 20,  y: 30, props: { monitorLabel: 'FE', color: '#10B981' } },
    { type: 'desk', x: 120, y: 30, props: { monitorLabel: 'BE', color: '#6366F1' } },
    { type: 'desk', x: 220, y: 30, props: { monitorLabel: 'QA', color: '#F43F5E' } },
  ],
  design_area: [
    { type: 'desk', x: 40, y: 30, props: { monitorLabel: 'DSG', color: '#EC4899' } },
  ],
  server_room: [
    { type: 'server_rack', x: 25,  y: 20 },
    { type: 'server_rack', x: 80,  y: 20 },
    { type: 'desk', x: 30, y: 90, props: { monitorLabel: 'DB', color: '#14B8A6' } },
    { type: 'desk', x: 120, y: 90, props: { monitorLabel: 'OPS', color: '#F97316' } },
  ],
  research_area: [
    { type: 'bookshelf', x: 20, y: 20 },
    { type: 'desk', x: 80, y: 50, props: { monitorLabel: 'R&D', color: '#8B5CF6' } },
  ],
  lounge_area: [
    { type: 'sofa', x: 30, y: 30 },
  ],
  marketing_area: [
    { type: 'desk', x: 20, y: 30, props: { monitorLabel: 'MKT', color: '#D946EF' } },
    { type: 'desk', x: 100, y: 30, props: { monitorLabel: 'RSR', color: '#0EA5E9' } },
    { type: 'bookshelf', x: 20, y: 15 },
  ],
  content_studio: [
    { type: 'desk', x: 40, y: 30, props: { monitorLabel: 'CNT', color: '#F59E0B' } },
    { type: 'bookshelf', x: 20, y: 10 },
  ],
  growth_lab: [
    { type: 'desk', x: 20, y: 30, props: { monitorLabel: 'GRW', color: '#22C55E' } },
    { type: 'desk', x: 100, y: 30, props: { monitorLabel: 'ANL', color: '#06B6D4' } },
    { type: 'monitor_wall', x: 20, y: 10 },
  ],
};

// ─── Agent seat positions per zone ──────────────────────────────
// Agents sit/stand near their desks
const ZONE_SEATS: Record<string, Array<{ x: number; y: number; sitting: boolean }>> = {
  command_area:   [{ x: 58, y: 55, sitting: true }],
  meeting_room:   [{ x: 95, y: 50, sitting: false }, { x: 135, y: 50, sitting: false }, { x: 95, y: 80, sitting: false }, { x: 135, y: 80, sitting: false }],
  situation_room: [{ x: 48, y: 65, sitting: true }],
  development_area: [{ x: 38, y: 30, sitting: true }, { x: 138, y: 30, sitting: true }, { x: 238, y: 30, sitting: true }],
  design_area:      [{ x: 58, y: 30, sitting: true }],
  server_room:      [{ x: 48, y: 85, sitting: true }, { x: 138, y: 85, sitting: true }],
  research_area:    [{ x: 98, y: 45, sitting: true }],
  lounge_area:      [{ x: 55, y: 40, sitting: false }],
  marketing_area:  [{ x: 38, y: 30, sitting: true }, { x: 118, y: 30, sitting: true }],
  content_studio:  [{ x: 58, y: 30, sitting: true }],
  growth_lab:      [{ x: 38, y: 30, sitting: true }, { x: 118, y: 30, sitting: true }],
};

// ─── Render furniture by type ───────────────────────────────────
function renderFurniture(f: FurniturePlacement, agentsInZone: OfficeAgent[]) {
  const hasWorking = agentsInZone.some(a => getRuntimeStatus(a) === 'working');
  const hasWaiting = agentsInZone.some(a => getRuntimeStatus(a) === 'waiting_api');
  const isOccupied = agentsInZone.length > 0;

  const furnitureKey = `${f.type}-${f.x}-${f.y}`;
  const extraProps = f.props ?? {};

  switch (f.type) {
    case 'desk':
      return <IsoDesk key={furnitureKey} x={f.x} y={f.y} {...extraProps} isActive={hasWorking} occupied={isOccupied} />;
    case 'command_board':
      return <IsoCommandBoard key={furnitureKey} x={f.x} y={f.y} isActive={hasWorking} />;
    case 'meeting_table':
      return <IsoMeetingTable key={furnitureKey} x={f.x} y={f.y} />;
    case 'server_rack':
      return <IsoServerRack key={furnitureKey} x={f.x} y={f.y} isActive={hasWorking || hasWaiting} />;
    case 'bookshelf':
      return <IsoBookshelf key={furnitureKey} x={f.x} y={f.y} />;
    case 'sofa':
      return <IsoSofa key={furnitureKey} x={f.x} y={f.y} />;
    case 'monitor_wall':
      return <IsoMonitorWall key={furnitureKey} x={f.x} y={f.y} isActive={hasWorking} />;
    default:
      return null;
  }
}

// ─── Main component ─────────────────────────────────────────────
export function IsometricOffice({
  agents,
  tasks,
  onAgentClick,
  agentAnimations = {},
  zoneAnimations = {},
}: IsometricOfficeProps) {
  // Group agents by runtime zone
  const agentsByZone: Record<string, OfficeAgent[]> = {};
  for (const agent of agents) {
    const zone = getRuntimeZone(agent) ?? 'lounge_area';
    if (!agentsByZone[zone]) agentsByZone[zone] = [];
    agentsByZone[zone].push(agent);
  }

  // Counter-rotation for zone labels
  const labelStyle: React.CSSProperties = {
    transform: 'rotateZ(45deg) rotateX(-60deg)',
    transformOrigin: 'center center',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 px-1 flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Agent Office — Live
        </h2>
        <span className="text-[10px] text-gray-400">
          {agents.filter((a) => getRuntimeStatus(a) !== 'offline').length}/{agents.length} active
        </span>
      </div>

      {/* Isometric scene viewport */}
      <div
        className="flex-1 min-h-0 overflow-auto flex items-center justify-center"
        style={{ perspective: '1500px', perspectiveOrigin: '50% 35%' }}
      >
        <div
          className="relative flex-shrink-0"
          style={{
            width: 720,
            height: 680,
            transform: 'rotateX(60deg) rotateZ(-45deg)',
            transformOrigin: 'center center',
            transformStyle: 'flat',
          }}
        >
          {/* ─── Office Floor ─── */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 39px,
                  rgba(148,163,184,0.08) 39px,
                  rgba(148,163,184,0.08) 40px
                ),
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 39px,
                  rgba(148,163,184,0.08) 39px,
                  rgba(148,163,184,0.08) 40px
                ),
                linear-gradient(180deg, #dde3ea 0%, #e8ecf1 50%, #e2e8f0 100%)
              `,
              boxShadow: `
                0 0 0 2px rgba(148,163,184,0.2),
                8px 8px 0 rgba(0,0,0,0.04),
                16px 16px 0 rgba(0,0,0,0.02),
                0 12px 40px rgba(0,0,0,0.12)
              `,
            }}
          />

          {/* ─── Zone Floor Areas ─── */}
          {ZONES.map((zone) => {
            const zoneVisual = getZoneVisual(zone.key);
            const isHighlighted = !!zoneAnimations[zone.key];
            const zoneAgents = agentsByZone[zone.key] ?? [];

            return (
              <div
                key={zone.key}
                className="absolute rounded-md"
                style={{
                  left: zone.x,
                  top: zone.y,
                  width: zone.w,
                  height: zone.h,
                  background: zone.tint,
                  border: `1.5px dashed ${zone.border}`,
                  zIndex: 1,
                }}
              >
                {/* Zone label (counter-rotated for readability) */}
                <div
                  className="absolute top-1 left-1"
                  style={labelStyle}
                >
                  <span className="text-[9px] font-bold text-gray-500 bg-white/70 px-1.5 py-0.5 rounded">
                    {zoneVisual.emoji} {zoneVisual.label}
                  </span>
                  {zoneAgents.length > 0 && (
                    <span className="ml-1 text-[8px] text-gray-400">
                      {zoneAgents.filter(a => getRuntimeStatus(a) !== 'offline').length}/{zoneAgents.length}
                    </span>
                  )}
                </div>

                {/* Zone highlight pulse */}
                {isHighlighted && (
                  <div
                    className="absolute inset-0 rounded-md animate-pulse"
                    style={{ background: 'rgba(59,130,246,0.06)' }}
                  />
                )}
              </div>
            );
          })}

          {/* ─── Furniture ─── */}
          {ZONES.map((zone) => {
            const furnitureList = ZONE_FURNITURE[zone.key] ?? [];
            const zoneAgents = agentsByZone[zone.key] ?? [];
            return (
              <div key={`furniture-${zone.key}`} className="absolute" style={{ left: zone.x, top: zone.y, zIndex: 5 }}>
                {furnitureList.map((f) => renderFurniture(f, zoneAgents))}
              </div>
            );
          })}

          {/* ─── Agent Characters ─── */}
          {ZONES.map((zone) => {
            const zoneAgents = agentsByZone[zone.key] ?? [];
            const seats = ZONE_SEATS[zone.key] ?? [];

            return (
              <div key={`agents-${zone.key}`} className="absolute" style={{ left: zone.x, top: zone.y, zIndex: 10 }}>
                {zoneAgents.map((agent, i) => {
                  const seat = seats[i] ?? { x: 20 + i * 30, y: 60, sitting: false };
                  return (
                    <IsometricAgent
                      key={agent.id}
                      agent={agent}
                      x={seat.x}
                      y={seat.y}
                      sitting={seat.sitting}
                      animationState={agentAnimations[agent.id] ?? null}
                      onClick={() => onAgentClick?.(agent.id)}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* ─── Floor label ─── */}
          <div
            className="absolute bottom-2 right-3"
            style={labelStyle}
          >
            <span className="text-[8px] text-gray-400 font-medium">
              🏢 Floor 1 — {agents.length} agents · {tasks.length} tasks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
