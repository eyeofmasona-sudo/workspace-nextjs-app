// ─── Agent OS — OfficeCanvas ─────────────────────────────────
// The main 2.5D office canvas.
// Pseudo-isometric office floor plan with rooms, agents, and furniture.
// Mobile: horizontal scroll. Desktop: full view.

'use client';

import { OfficeRoom } from './OfficeRoom';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';
import type { AgentAnimationState, ZoneAnimationState } from '@/hooks/useOfficeAnimations';

interface OfficeCanvasProps {
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
  agentAnimations?: Record<string, AgentAnimationState>;
  zoneAnimations?: Record<string, ZoneAnimationState>;
}

// Zone order for the floor plan grid
const GRID_ZONES = [
  // Row 1: Front office
  { zone: 'command_area', area: 'command' },
  { zone: 'situation_room', area: 'situation' },
  { zone: 'meeting_room', area: 'meeting' },
  // Row 2: Main work area
  { zone: 'development_area', area: 'dev' },
  { zone: 'development_area', area: 'dev2' }, // Second dev cell
  { zone: 'design_area', area: 'design' },
  // Row 3: Back office
  { zone: 'server_room', area: 'server' },
  { zone: 'research_area', area: 'research' },
  { zone: 'lounge_area', area: 'lounge' },
  // Row 4: Marketing department
  { zone: 'marketing_area', area: 'marketing' },
  { zone: 'content_studio', area: 'content' },
  { zone: 'growth_lab', area: 'growth' },
];

// Runtime-first helper: prefer runtimeState over static agent fields
function getRuntimeStatus(agent: OfficeAgent): string {
  return agent.runtimeState?.status ?? agent.status;
}
function getRuntimeZone(agent: OfficeAgent): string {
  return agent.runtimeState?.locationZone ?? agent.locationZone;
}

export function OfficeCanvas({
  agents,
  tasks,
  onAgentClick,
  agentAnimations = {},
  zoneAnimations = {},
}: OfficeCanvasProps) {
  // Group agents by runtime zone (runtime-first)
  const agentsByZone: Record<string, OfficeAgent[]> = {};
  for (const agent of agents) {
    const zone = getRuntimeZone(agent) ?? 'lounge_area';
    if (!agentsByZone[zone]) agentsByZone[zone] = [];
    agentsByZone[zone].push(agent);
  }

  // Unique zones for the grid
  const uniqueZones = ['command_area', 'situation_room', 'meeting_room', 'development_area', 'design_area', 'server_room', 'research_area', 'lounge_area', 'marketing_area', 'content_studio', 'growth_lab'];

  return (
    <div className="w-full h-full relative">
      {/* Office floor label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Agent Office — Live
        </h2>
        <span className="text-[10px] text-gray-400">
          {agents.filter((a) => getRuntimeStatus(a) !== 'offline').length}/{agents.length} active
        </span>
      </div>

      {/* 2.5D Office Canvas — scrollable horizontally on mobile */}
      <div className="overflow-x-auto overflow-y-auto h-[calc(100%-28px)]">
        <div
          className="min-w-[700px] max-w-[1000px] mx-auto"
          style={{
            /* Stronger perspective for 2.5D depth */
            perspective: '1200px',
          }}
        >
          {/* Floor plane with pseudo-isometric tilt */}
          <div
            className="relative rounded-xl p-3"
            style={{
              /* Pseudo-isometric tilt for 2.5D feel */
              transform: 'rotateX(10deg) skewX(-2deg)',
              transformOrigin: 'center bottom',
              /* Floor background with visible tile pattern */
              background: `
                linear-gradient(180deg, rgba(226,232,240,0.5) 0%, rgba(241,245,249,0.3) 50%, rgba(248,250,252,0.2) 100%),
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 28px,
                  rgba(148,163,184,0.12) 28px,
                  rgba(148,163,184,0.12) 29px
                ),
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 28px,
                  rgba(148,163,184,0.12) 28px,
                  rgba(148,163,184,0.12) 29px
                ),
                #e2e8f0
              `,
              boxShadow: `
                0 8px 40px rgba(0,0,0,0.15),
                0 2px 10px rgba(0,0,0,0.08),
                inset 0 2px 4px rgba(255,255,255,0.6),
                inset 0 -2px 8px rgba(0,0,0,0.06)
              `,
            }}
          >
            {/* Floor edge highlight — top wall */}
            <div
              className="absolute inset-x-0 top-0 h-3 rounded-t-xl pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(148,163,184,0.15) 0%, transparent 100%)',
                borderTop: '2px solid rgba(255,255,255,0.5)',
              }}
            />
            {/* Floor edge shadow — bottom wall depth */}
            <div
              className="absolute inset-x-0 bottom-0 h-4 rounded-b-xl pointer-events-none"
              style={{
                background: 'linear-gradient(0deg, rgba(30,41,59,0.12) 0%, transparent 100%)',
                borderBottom: '2px solid rgba(30,41,59,0.1)',
              }}
            />
            {/* Left wall depth */}
            <div
              className="absolute inset-y-0 left-0 w-3 rounded-l-xl pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, rgba(148,163,184,0.08) 0%, transparent 100%)',
                borderLeft: '1px solid rgba(255,255,255,0.3)',
              }}
            />
            {/* Right wall depth */}
            <div
              className="absolute inset-y-0 right-0 w-3 rounded-r-xl pointer-events-none"
              style={{
                background: 'linear-gradient(270deg, rgba(30,41,59,0.06) 0%, transparent 100%)',
                borderRight: '1px solid rgba(30,41,59,0.06)',
              }}
            />

            {/* Floor plan grid */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: '1fr 1fr 1.5fr',
                gridTemplateRows: 'auto auto auto auto',
                gridTemplateAreas: `
                  "command   situation  meeting"
                  "dev       dev        design"
                  "server    research   lounge"
                  "marketing content   growth"
                `,
              }}
            >
              {/* Command Center */}
              <div style={{ gridArea: 'command' }}>
                <OfficeRoom
                  zoneKey="command_area"
                  agents={agentsByZone['command_area'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['command_area'] ?? null}
                />
              </div>

              {/* Situation Room */}
              <div style={{ gridArea: 'situation' }}>
                <OfficeRoom
                  zoneKey="situation_room"
                  agents={agentsByZone['situation_room'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['situation_room'] ?? null}
                />
              </div>

              {/* Meeting Room */}
              <div style={{ gridArea: 'meeting' }}>
                <OfficeRoom
                  zoneKey="meeting_room"
                  agents={agentsByZone['meeting_room'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['meeting_room'] ?? null}
                />
              </div>

              {/* Development Floor (spans 2 columns) */}
              <div style={{ gridArea: 'dev' }}>
                <OfficeRoom
                  zoneKey="development_area"
                  agents={agentsByZone['development_area'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['development_area'] ?? null}
                />
              </div>

              {/* Design Studio */}
              <div style={{ gridArea: 'design' }}>
                <OfficeRoom
                  zoneKey="design_area"
                  agents={agentsByZone['design_area'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['design_area'] ?? null}
                />
              </div>

              {/* Server Room */}
              <div style={{ gridArea: 'server' }}>
                <OfficeRoom
                  zoneKey="server_room"
                  agents={agentsByZone['server_room'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['server_room'] ?? null}
                />
              </div>

              {/* Research Lab */}
              <div style={{ gridArea: 'research' }}>
                <OfficeRoom
                  zoneKey="research_area"
                  agents={agentsByZone['research_area'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['research_area'] ?? null}
                />
              </div>

              {/* Lounge */}
              <div style={{ gridArea: 'lounge' }}>
                <OfficeRoom
                  zoneKey="lounge_area"
                  agents={agentsByZone['lounge_area'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['lounge_area'] ?? null}
                />
              </div>

              {/* Marketing HQ */}
              <div style={{ gridArea: 'marketing' }}>
                <OfficeRoom
                  zoneKey="marketing_area"
                  agents={agentsByZone['marketing_area'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['marketing_area'] ?? null}
                />
              </div>

              {/* Content Studio */}
              <div style={{ gridArea: 'content' }}>
                <OfficeRoom
                  zoneKey="content_studio"
                  agents={agentsByZone['content_studio'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['content_studio'] ?? null}
                />
              </div>

              {/* Growth Lab */}
              <div style={{ gridArea: 'growth' }}>
                <OfficeRoom
                  zoneKey="growth_lab"
                  agents={agentsByZone['growth_lab'] ?? []}
                  tasks={tasks}
                  onAgentClick={onAgentClick}
                  agentAnimations={agentAnimations}
                  zoneAnimation={zoneAnimations['growth_lab'] ?? null}
                />
              </div>
            </div>

            {/* Floor decorations */}
            <div className="mt-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-[9px] text-gray-400">
                <span>🏢 Floor 1 — Main Office</span>
                <span>•</span>
                <span>{agents.length} agents</span>
                <span>•</span>
                <span>{tasks.length} tasks</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Busy
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> Error
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
