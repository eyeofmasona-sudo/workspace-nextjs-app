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
];

export function OfficeCanvas({
  agents,
  tasks,
  onAgentClick,
  agentAnimations = {},
  zoneAnimations = {},
}: OfficeCanvasProps) {
  // Group agents by zone
  const agentsByZone: Record<string, OfficeAgent[]> = {};
  for (const agent of agents) {
    const zone = agent.locationZone ?? 'lounge_area';
    if (!agentsByZone[zone]) agentsByZone[zone] = [];
    agentsByZone[zone].push(agent);
  }

  // Unique zones for the grid
  const uniqueZones = ['command_area', 'situation_room', 'meeting_room', 'development_area', 'design_area', 'server_room', 'research_area', 'lounge_area'];

  return (
    <div className="w-full h-full relative">
      {/* Office floor label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Agent Office — Live
        </h2>
        <span className="text-[10px] text-gray-400">
          {agents.filter((a) => a.status !== 'offline').length}/{agents.length} active
        </span>
      </div>

      {/* 2.5D Office Canvas — scrollable horizontally on mobile */}
      <div className="overflow-x-auto overflow-y-auto h-[calc(100%-28px)]">
        <div
          className="min-w-[700px] max-w-[1000px] mx-auto"
          style={{
            /* Subtle perspective for 2.5D feel */
            perspective: '2000px',
          }}
        >
          {/* Floor plane with subtle tilt */}
          <div
            className="relative rounded-xl p-3"
            style={{
              /* Very subtle rotateX for isometric feel */
              transform: 'rotateX(1.5deg)',
              transformOrigin: 'center bottom',
              /* Floor background with tile pattern */
              background: `
                linear-gradient(180deg, rgba(241,245,249,0.5) 0%, rgba(248,250,252,0.3) 100%),
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 23px,
                  rgba(148,163,184,0.06) 23px,
                  rgba(148,163,184,0.06) 24px
                ),
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 23px,
                  rgba(148,163,184,0.06) 23px,
                  rgba(148,163,184,0.06) 24px
                ),
                #f8fafc
              `,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            {/* Floor plan grid */}
            <div
              className="grid gap-2.5"
              style={{
                gridTemplateColumns: '1fr 1fr 1.5fr',
                gridTemplateRows: 'auto auto auto',
                gridTemplateAreas: `
                  "command   situation  meeting"
                  "dev       dev        design"
                  "server    research   lounge"
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
