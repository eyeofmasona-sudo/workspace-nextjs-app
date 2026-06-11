// ─── Agent OS — AgentOffice V3 (Pixel Agents Style) ────────────────
// Main Agent Office component — pixel-art office with real sprites.
// Adapted from pixel-agents (MIT) architecture.
// Office is the PRIMARY and ONLY view. Management panels are overlays.

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useOfficeData } from '@/hooks/useOfficeData';
import { useEventStream } from '@/hooks/useEventStream';
import { PixelOfficeCanvas } from '@/components/pixel-office/PixelOfficeCanvas';
import { TaskBoard } from '@/components/office/TaskBoard';
import { SituationRoom } from '@/components/office/SituationRoom';
import { OrchestratorPanel } from '@/components/office/OrchestratorPanel';
import { ApprovalQueue } from '@/components/office/ApprovalQueue';
import { EventTimeline } from '@/components/office/EventTimeline';
import { AgentDetailsDrawer } from '@/components/office/AgentDetailsDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  ListChecks, BarChart3, Crown,
  AlertTriangle, Radio, Loader2, RefreshCw,
  Building2,
} from 'lucide-react';
import type { OfficeAgent } from '@/hooks/useOfficeData';
import { OfficeState } from '@/lib/pixel-office/engine/officeState';
import { BehaviorState } from '@/lib/pixel-office/types';
import { loadAllAssets } from '@/lib/pixel-office/assetLoader';
import type { ZoneDestination, ZoneLabel, TileType as TileTypeVal } from '@/lib/pixel-office/types';

// Agent OS status → pixel-agents character state mapping
function mapAgentStatusToActive(status: string): boolean {
  const s = status?.toLowerCase() ?? 'idle';
  return !['offline', 'idle', 'done'].includes(s);
}

function mapAgentStatusToTool(status: string): string | null {
  const s = status?.toLowerCase() ?? '';
  if (s.includes('thinking') || s.includes('working')) return 'Write';
  if (s.includes('review') || s.includes('reading') || s.includes('waiting_api')) return 'Read';
  if (s.includes('waiting_approval')) return null;
  return null;
}

function mapAgentStatusToBubble(status: string): 'permission' | 'waiting' | null {
  const s = status?.toLowerCase() ?? '';
  if (s.includes('waiting_approval')) return 'permission';
  if (s.includes('waiting_api')) return 'waiting';
  return null;
}

// Map agent status to behavior state
function mapAgentStatusToBehavior(status: string): BehaviorState {
  const s = status?.toLowerCase() ?? 'idle';
  if (s.includes('working') || s.includes('thinking')) return BehaviorState.WORKING;
  if (s.includes('reviewing')) return BehaviorState.MEETING;
  if (s.includes('waiting_approval')) return BehaviorState.MEETING;
  if (s.includes('waiting_api')) return BehaviorState.RESEARCH;
  if (s.includes('done')) return BehaviorState.IDLE;
  return BehaviorState.IDLE;
}

// Panel types for the management overlay
type ManagementPanel = 'tasks' | 'situation' | 'orchestrator' | 'approvals' | 'events';

interface AgentOfficeProps {
  workspaceId: string | null;
  onSeed?: () => void;
}

const PANEL_CONFIG: Record<ManagementPanel, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  tasks: { label: 'Tasks', icon: ListChecks, color: 'text-blue-500' },
  situation: { label: 'Situation', icon: BarChart3, color: 'text-emerald-500' },
  orchestrator: { label: 'Orchestrator', icon: Crown, color: 'text-violet-500' },
  approvals: { label: 'Approvals', icon: AlertTriangle, color: 'text-orange-500' },
  events: { label: 'Events', icon: Radio, color: 'text-sky-500' },
};

// ─── New Dense Office Layout (40×26) ────────────────────────
// 6 rooms + 1 lounge, internal walls with doors, dense furniture

const COLS = 40;
const ROWS = 26;

function buildTiles(): TileTypeVal[] {
  const W = 0 as TileTypeVal; // WALL
  const F1 = 1 as TileTypeVal; // Command Center
  const F2 = 2 as TileTypeVal; // Meeting Room
  const F3 = 3 as TileTypeVal; // Design Area
  const F4 = 4 as TileTypeVal; // Development Area
  const F5 = 5 as TileTypeVal; // Server Room
  const F6 = 6 as TileTypeVal; // Research Area
  const F7 = 7 as TileTypeVal; // Lounge
  const F8 = 8 as TileTypeVal; // Door/transition

  const tiles: TileTypeVal[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Outer walls
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        tiles.push(W);
        continue;
      }

      // Horizontal divider row 10 (between upper and lower rooms)
      if (r === 10) {
        if ((c >= 5 && c <= 6) || (c >= 18 && c <= 19) || (c >= 31 && c <= 32)) {
          tiles.push(F8); // door openings
        } else {
          tiles.push(W);
        }
        continue;
      }

      // Horizontal divider row 20 (between lower rooms and lounge)
      if (r === 20) {
        if ((c >= 8 && c <= 9) || (c >= 28 && c <= 29)) {
          tiles.push(F8); // door openings
        } else {
          tiles.push(W);
        }
        continue;
      }

      // Upper section (rows 1-9)
      if (r >= 1 && r <= 9) {
        // Vertical wall col 13
        if (c === 13) {
          if (r >= 4 && r <= 5) tiles.push(F8); // door
          else tiles.push(W);
          continue;
        }
        // Vertical wall col 25
        if (c === 25) {
          if (r >= 4 && r <= 5) tiles.push(F8); // door
          else tiles.push(W);
          continue;
        }
        if (c >= 1 && c <= 12) tiles.push(F1);    // Command Center
        else if (c >= 14 && c <= 24) tiles.push(F2); // Meeting Room
        else if (c >= 26 && c <= 38) tiles.push(F3); // Design Area
        else tiles.push(W);
        continue;
      }

      // Lower section (rows 11-19)
      if (r >= 11 && r <= 19) {
        // Vertical wall col 13
        if (c === 13) {
          if (r >= 14 && r <= 15) tiles.push(F8); // door
          else tiles.push(W);
          continue;
        }
        // Vertical wall col 25
        if (c === 25) {
          if (r >= 14 && r <= 15) tiles.push(F8); // door
          else tiles.push(W);
          continue;
        }
        if (c >= 1 && c <= 12) tiles.push(F4);    // Development Area
        else if (c >= 14 && c <= 24) tiles.push(F5); // Server Room
        else if (c >= 26 && c <= 38) tiles.push(F6); // Research Area
        else tiles.push(W);
        continue;
      }

      // Lounge (rows 21-24)
      tiles.push(F7);
    }
  }
  return tiles;
}

function buildTileColors(): Array<{ h: number; s: number; b: number; c: number } | null> {
  const wallColor = { h: 214, s: 30, b: -100, c: -55 };
  const cmdColor = { h: 30, s: 50, b: -43, c: -88 };       // warm wood
  const meetColor = { h: 210, s: 35, b: -30, c: -75 };     // blue-gray business
  const designColor = { h: 330, s: 40, b: -35, c: -80 };   // creative pink
  const devColor = { h: 150, s: 40, b: -40, c: -82 };      // tech green-gray
  const serverColor = { h: 200, s: 45, b: -50, c: -70 };   // cool blue
  const researchColor = { h: 35, s: 55, b: -38, c: -85 };  // library amber
  const loungeColor = { h: 20, s: 60, b: -35, c: -85 };    // cozy warm
  const doorColor = { h: 35, s: 25, b: 10, c: 0 };

  const tiles = buildTiles();
  const colors: Array<{ h: number; s: number; b: number; c: number } | null> = [];

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const W = 0;
    if (tile === W) { colors.push(wallColor); continue; }
    if (tile === 8) { colors.push(doorColor); continue; }
    if (tile === 1) { colors.push(cmdColor); continue; }
    if (tile === 2) { colors.push(meetColor); continue; }
    if (tile === 3) { colors.push(designColor); continue; }
    if (tile === 4) { colors.push(devColor); continue; }
    if (tile === 5) { colors.push(serverColor); continue; }
    if (tile === 6) { colors.push(researchColor); continue; }
    if (tile === 7) { colors.push(loungeColor); continue; }
    colors.push(wallColor);
  }
  return colors;
}

const DEFAULT_AGENT_OS_LAYOUT = {
  version: 1 as const,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 3,
  tiles: buildTiles(),
  tileColors: buildTileColors(),
  furniture: [
    // ═══════════════════════════════════════════════════════════
    // COMMAND CENTER (cols 1-12, rows 1-9)
    // ═══════════════════════════════════════════════════════════

    // ── Wall decorations ──
    { uid: 'cmd-shelf1', type: 'DOUBLE_BOOKSHELF', col: 1, row: 0 },
    { uid: 'cmd-clock', type: 'CLOCK', col: 5, row: 0 },
    { uid: 'cmd-wb', type: 'WHITEBOARD', col: 7, row: 0 },
    { uid: 'cmd-paint1', type: 'SMALL_PAINTING', col: 10, row: 0 },
    { uid: 'cmd-paint2', type: 'SMALL_PAINTING_2', col: 11, row: 0 },

    // ── Orchestrator workstation ──
    { uid: 'desk-orc', type: 'DESK_FRONT', col: 2, row: 2 },
    { uid: 'pc-orc', type: 'PC_FRONT_OFF', col: 3, row: 2 },
    { uid: 'chair-orc', type: 'WOODEN_CHAIR_BACK', col: 3, row: 4 },

    // ── Architect workstation ──
    { uid: 'desk-arch', type: 'DESK_FRONT', col: 7, row: 2 },
    { uid: 'pc-arch', type: 'PC_FRONT_OFF', col: 8, row: 2 },
    { uid: 'chair-arch', type: 'WOODEN_CHAIR_BACK', col: 8, row: 4 },

    // ── Analyst workstation ──
    { uid: 'desk-anl', type: 'DESK_FRONT', col: 2, row: 6 },
    { uid: 'pc-anl', type: 'PC_FRONT_OFF', col: 3, row: 6 },
    { uid: 'chair-anl', type: 'WOODEN_CHAIR_BACK', col: 3, row: 8 },

    // ── Decorations ──
    { uid: 'cmd-plant1', type: 'LARGE_PLANT', col: 1, row: 1 },
    { uid: 'cmd-plant2', type: 'PLANT', col: 11, row: 5 },
    { uid: 'cmd-cactus', type: 'CACTUS', col: 12, row: 1 },
    { uid: 'cmd-bin', type: 'BIN', col: 12, row: 9 },

    // ═══════════════════════════════════════════════════════════
    // MEETING ROOM (cols 14-24, rows 1-9)
    // ═══════════════════════════════════════════════════════════

    // ── Wall decorations ──
    { uid: 'meet-clock', type: 'CLOCK', col: 15, row: 0 },
    { uid: 'meet-wb', type: 'WHITEBOARD', col: 18, row: 0 },
    { uid: 'meet-paint', type: 'LARGE_PAINTING', col: 22, row: 0 },

    // ── Meeting table with chairs ──
    { uid: 'meet-table', type: 'TABLE_FRONT', col: 18, row: 4 },
    { uid: 'meet-bench1', type: 'CUSHIONED_BENCH', col: 17, row: 5 },
    { uid: 'meet-bench2', type: 'CUSHIONED_BENCH', col: 21, row: 5 },
    { uid: 'meet-chair1', type: 'CUSHIONED_CHAIR_FRONT', col: 18, row: 3 },
    { uid: 'meet-chair2', type: 'CUSHIONED_CHAIR_BACK', col: 18, row: 6 },
    { uid: 'meet-chair3', type: 'CUSHIONED_CHAIR_FRONT', col: 20, row: 3 },
    { uid: 'meet-chair4', type: 'CUSHIONED_CHAIR_BACK', col: 20, row: 6 },

    // ── Decorations ──
    { uid: 'meet-plant1', type: 'PLANT_2', col: 14, row: 1 },
    { uid: 'meet-plant2', type: 'LARGE_PLANT', col: 23, row: 8 },
    { uid: 'meet-shelf', type: 'BOOKSHELF', col: 14, row: 0 },

    // ═══════════════════════════════════════════════════════════
    // DESIGN AREA (cols 26-38, rows 1-9)
    // ═══════════════════════════════════════════════════════════

    // ── Wall decorations ──
    { uid: 'des-shelf', type: 'DOUBLE_BOOKSHELF', col: 26, row: 0 },
    { uid: 'des-hplant', type: 'HANGING_PLANT', col: 30, row: 0 },
    { uid: 'des-paint1', type: 'SMALL_PAINTING', col: 34, row: 0 },
    { uid: 'des-paint2', type: 'SMALL_PAINTING_2', col: 37, row: 0 },

    // ── Designer workstation ──
    { uid: 'desk-des', type: 'DESK_FRONT', col: 29, row: 2 },
    { uid: 'pc-des', type: 'PC_FRONT_OFF', col: 30, row: 2 },
    { uid: 'chair-des', type: 'WOODEN_CHAIR_BACK', col: 30, row: 4 },

    // ── Extra design workspace ──
    { uid: 'des-table', type: 'COFFEE_TABLE', col: 29, row: 7 },
    { uid: 'des-bench', type: 'CUSHIONED_BENCH', col: 28, row: 8 },
    { uid: 'des-bench2', type: 'CUSHIONED_BENCH', col: 31, row: 8 },

    // ── Decorations ──
    { uid: 'des-plant1', type: 'PLANT', col: 37, row: 1 },
    { uid: 'des-cactus', type: 'CACTUS', col: 26, row: 6 },
    { uid: 'des-bin', type: 'BIN', col: 37, row: 9 },

    // ═══════════════════════════════════════════════════════════
    // DEVELOPMENT AREA (cols 1-12, rows 11-19)
    // ═══════════════════════════════════════════════════════════

    // ── Wall decorations ──
    { uid: 'dev-shelf', type: 'BOOKSHELF', col: 1, row: 10 },
    { uid: 'dev-wb', type: 'WHITEBOARD', col: 7, row: 10 },
    { uid: 'dev-clock', type: 'CLOCK', col: 11, row: 10 },

    // ── Frontend workstation ──
    { uid: 'desk-fe', type: 'DESK_FRONT', col: 2, row: 12 },
    { uid: 'pc-fe', type: 'PC_FRONT_OFF', col: 3, row: 12 },
    { uid: 'chair-fe', type: 'WOODEN_CHAIR_BACK', col: 3, row: 14 },

    // ── Backend workstation ──
    { uid: 'desk-be', type: 'DESK_FRONT', col: 7, row: 12 },
    { uid: 'pc-be', type: 'PC_FRONT_OFF', col: 8, row: 12 },
    { uid: 'chair-be', type: 'WOODEN_CHAIR_BACK', col: 8, row: 14 },

    // ── QA workstation ──
    { uid: 'desk-qa', type: 'DESK_FRONT', col: 2, row: 16 },
    { uid: 'pc-qa', type: 'PC_FRONT_OFF', col: 3, row: 16 },
    { uid: 'chair-qa', type: 'WOODEN_CHAIR_BACK', col: 3, row: 18 },

    // ── DevOps workstation ──
    { uid: 'desk-devops', type: 'DESK_FRONT', col: 7, row: 16 },
    { uid: 'pc-devops', type: 'PC_FRONT_OFF', col: 8, row: 16 },
    { uid: 'chair-devops', type: 'WOODEN_CHAIR_BACK', col: 8, row: 18 },

    // ── Decorations ──
    { uid: 'dev-plant1', type: 'LARGE_PLANT', col: 1, row: 11 },
    { uid: 'dev-plant2', type: 'PLANT', col: 11, row: 13 },
    { uid: 'dev-cactus', type: 'CACTUS', col: 12, row: 17 },
    { uid: 'dev-bin', type: 'BIN', col: 12, row: 19 },

    // ═══════════════════════════════════════════════════════════
    // SERVER ROOM (cols 14-24, rows 11-19)
    // ═══════════════════════════════════════════════════════════

    // ── Wall decorations ──
    { uid: 'srv-shelf', type: 'DOUBLE_BOOKSHELF', col: 14, row: 10 },
    { uid: 'srv-clock', type: 'CLOCK', col: 17, row: 10 },
    { uid: 'srv-paint', type: 'LARGE_PAINTING', col: 23, row: 10 },

    // ── Data Engineer workstation ──
    { uid: 'desk-data', type: 'DESK_FRONT', col: 16, row: 12 },
    { uid: 'pc-data', type: 'PC_FRONT_OFF', col: 17, row: 12 },
    { uid: 'chair-data', type: 'WOODEN_CHAIR_BACK', col: 17, row: 14 },

    // ── Server racks (using desks as proxy) ──
    { uid: 'srv-rack1', type: 'DESK_SIDE', col: 21, row: 12 },
    { uid: 'srv-rack2', type: 'DESK_SIDE', col: 21, row: 16 },

    // ── Monitor wall ──
    { uid: 'srv-pc1', type: 'PC_FRONT_OFF', col: 23, row: 11 },
    { uid: 'srv-pc2', type: 'PC_FRONT_OFF', col: 24, row: 11 },

    // ── Decorations ──
    { uid: 'srv-plant1', type: 'PLANT_2', col: 14, row: 17 },
    { uid: 'srv-bin', type: 'BIN', col: 23, row: 19 },
    { uid: 'srv-pot', type: 'POT', col: 15, row: 18 },

    // ═══════════════════════════════════════════════════════════
    // RESEARCH AREA (cols 26-38, rows 11-19)
    // ═══════════════════════════════════════════════════════════

    // ── Wall decorations ──
    { uid: 'res-wb', type: 'WHITEBOARD', col: 30, row: 10 },
    { uid: 'res-shelf1', type: 'DOUBLE_BOOKSHELF', col: 26, row: 10 },
    { uid: 'res-shelf2', type: 'BOOKSHELF', col: 36, row: 10 },

    // ── Researcher workstation ──
    { uid: 'desk-res', type: 'DESK_FRONT', col: 29, row: 12 },
    { uid: 'pc-res', type: 'PC_FRONT_OFF', col: 30, row: 12 },
    { uid: 'chair-res', type: 'WOODEN_CHAIR_BACK', col: 30, row: 14 },

    // ── Research library ──
    { uid: 'res-htable', type: 'SMALL_TABLE', col: 33, row: 15 },
    { uid: 'res-hchair1', type: 'WOODEN_CHAIR_FRONT', col: 32, row: 16 },
    { uid: 'res-hchair2', type: 'WOODEN_CHAIR_FRONT', col: 35, row: 16 },

    // ── Decorations ──
    { uid: 'res-plant1', type: 'LARGE_PLANT', col: 26, row: 11 },
    { uid: 'res-cactus', type: 'CACTUS', col: 37, row: 17 },
    { uid: 'res-plant2', type: 'PLANT', col: 37, row: 11 },
    { uid: 'res-bin', type: 'BIN', col: 37, row: 19 },

    // ═══════════════════════════════════════════════════════════
    // LOUNGE (cols 1-38, rows 21-24)
    // ═══════════════════════════════════════════════════════════

    // ── Wall decorations ──
    { uid: 'lng-paint1', type: 'LARGE_PAINTING', col: 12, row: 20 },
    { uid: 'lng-paint2', type: 'SMALL_PAINTING', col: 28, row: 20 },
    { uid: 'lng-clock', type: 'CLOCK', col: 20, row: 20 },
    { uid: 'lng-hplant1', type: 'HANGING_PLANT', col: 6, row: 20 },
    { uid: 'lng-hplant2', type: 'HANGING_PLANT', col: 35, row: 20 },

    // ── Sofa area ──
    { uid: 'lng-sofa1', type: 'SOFA_FRONT', col: 2, row: 22 },
    { uid: 'lng-sofa2', type: 'SOFA_FRONT', col: 5, row: 22 },
    { uid: 'lng-ctable', type: 'COFFEE_TABLE', col: 3, row: 21 },

    // ── Coffee / kitchen area ──
    { uid: 'lng-coffee', type: 'COFFEE', col: 9, row: 21 },
    { uid: 'lng-pot', type: 'POT', col: 10, row: 21 },  // water cooler proxy

    // ── Dining area ──
    { uid: 'lng-table', type: 'TABLE_FRONT', col: 16, row: 22 },
    { uid: 'lng-bench1', type: 'CUSHIONED_BENCH', col: 15, row: 23 },
    { uid: 'lng-bench2', type: 'CUSHIONED_BENCH', col: 18, row: 23 },

    // ── Reading corner ──
    { uid: 'lng-rtable', type: 'SMALL_TABLE', col: 24, row: 22 },
    { uid: 'lng-rchair1', type: 'CUSHIONED_CHAIR_FRONT', col: 23, row: 23 },
    { uid: 'lng-rchair2', type: 'CUSHIONED_CHAIR_FRONT', col: 26, row: 23 },
    { uid: 'lng-rchair3', type: 'WOODEN_CHAIR_FRONT', col: 24, row: 21 },

    // ── TV area ──
    { uid: 'lng-tv', type: 'PC_FRONT_OFF', col: 32, row: 20 },  // TV proxy
    { uid: 'lng-sofa3', type: 'SOFA_BACK', col: 31, row: 23 },
    { uid: 'lng-sofa4', type: 'SOFA_BACK', col: 34, row: 23 },

    // ── Decorations ──
    { uid: 'lng-plant1', type: 'LARGE_PLANT', col: 1, row: 21 },
    { uid: 'lng-plant2', type: 'PLANT', col: 14, row: 21 },
    { uid: 'lng-plant3', type: 'PLANT_2', col: 29, row: 21 },
    { uid: 'lng-plant4', type: 'CACTUS', col: 37, row: 22 },
    { uid: 'lng-bin1', type: 'BIN', col: 12, row: 24 },
    { uid: 'lng-bin2', type: 'BIN', col: 37, row: 24 },
    { uid: 'lng-shelf', type: 'BOOKSHELF', col: 1, row: 20 },
  ],
};

// Zone destinations for agent behavior (meeting, break, research)
const ZONE_DESTINATIONS: Record<string, ZoneDestination[]> = {
  [BehaviorState.MEETING]: [
    { col: 17, row: 5 }, { col: 18, row: 5 }, { col: 19, row: 5 }, { col: 20, row: 5 },
    { col: 18, row: 7 }, { col: 19, row: 7 },
  ],
  [BehaviorState.BREAK]: [
    { col: 3, row: 23 }, { col: 6, row: 23 }, { col: 4, row: 21 },
    { col: 15, row: 22 }, { col: 19, row: 22 },
    { col: 25, row: 22 }, { col: 32, row: 22 }, { col: 35, row: 22 },
  ],
  [BehaviorState.RESEARCH]: [
    { col: 29, row: 11 }, { col: 30, row: 11 }, { col: 31, row: 11 },
    { col: 34, row: 14 }, { col: 27, row: 14 },
  ],
};

// Zone labels for rendering
const ZONE_LABELS: ZoneLabel[] = [
  { text: '⚙ COMMAND CENTER', col: 6, row: 1, color: '#C4B5FD' },
  { text: '🤝 MEETING ROOM', col: 19, row: 1, color: '#93C5FD' },
  { text: '🎨 DESIGN', col: 32, row: 1, color: '#F9A8D4' },
  { text: '💻 DEVELOPMENT', col: 6, row: 11, color: '#6EE7B7' },
  { text: '🖥 SERVER ROOM', col: 19, row: 11, color: '#67E8F9' },
  { text: '📚 RESEARCH', col: 32, row: 11, color: '#FCD34D' },
  { text: '☕ LOUNGE', col: 19, row: 21, color: '#FDBA74' },
];

export function AgentOffice({ workspaceId, onSeed }: AgentOfficeProps) {
  const { state, loading, error, refetch } = useOfficeData(workspaceId, 5000);
  const { newEvents, clearNewEvents } = useEventStream(workspaceId, 4000);
  const [selectedAgent, setSelectedAgent] = useState<OfficeAgent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ManagementPanel | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [zoom, setZoom] = useState(2);
  const panRef = useRef({ x: 0, y: 0 });

  // Create OfficeState from default layout (stable across renders)
  const [officeState] = useState(() => {
    const os = new OfficeState(DEFAULT_AGENT_OS_LAYOUT);
    os.setZoneDestinations(ZONE_DESTINATIONS);
    os.setZoneLabels(ZONE_LABELS);
    return os;
  });

  // Load assets on mount
  useEffect(() => {
    let mounted = true;
    loadAllAssets().then((success) => {
      if (mounted && success) {
        setAssetsLoaded(true);
        // Rebuild layout after assets are loaded (furniture catalog is now available)
        const layout = DEFAULT_AGENT_OS_LAYOUT;
        officeState.rebuildFromLayout(layout);
        officeState.setZoneDestinations(ZONE_DESTINATIONS);
        officeState.setZoneLabels(ZONE_LABELS);
        console.log('✓ Pixel office assets loaded and layout rebuilt');
      }
    });
    return () => { mounted = false; };
  }, [officeState]);

  useEffect(() => {
    if (!state?.agents) return;

    const currentAgentIds = new Set(state.agents.map((a) => a.id));

    // Add new agents
    for (const agent of state.agents) {
      const numericId = hashAgentId(agent.id);
      if (!officeState.characters.has(numericId)) {
        const status = agent.runtimeState?.status ?? agent.status;
        officeState.addAgent(
          numericId,
          agent.name || agent.role,
          agent.role,
        );
        officeState.setAgentActive(numericId, mapAgentStatusToActive(status));
        officeState.setAgentTool(numericId, mapAgentStatusToTool(status));

        // Set initial behavior based on status
        const behavior = mapAgentStatusToBehavior(status);
        if (behavior !== BehaviorState.WORKING) {
          officeState.setAgentBehavior(numericId, behavior);
        }

        const bubble = mapAgentStatusToBubble(status);
        if (bubble === 'permission') officeState.showPermissionBubble(numericId);
        else if (bubble === 'waiting') officeState.showWaitingBubble(numericId);
      } else {
        // Update existing agent state
        const status = agent.runtimeState?.status ?? agent.status;
        const ch = officeState.characters.get(numericId);
        if (ch) {
          const isActive = mapAgentStatusToActive(status);
          if (ch.isActive !== isActive) {
            officeState.setAgentActive(numericId, isActive);
          }
          officeState.setAgentTool(numericId, mapAgentStatusToTool(status));
          officeState.setAgentStatus(numericId, status);

          // Update name/role
          ch.name = agent.name || agent.role;
          ch.role = agent.role;

          // Handle bubbles
          const bubble = mapAgentStatusToBubble(status);
          if (bubble === 'permission' && ch.bubbleType !== 'permission') {
            officeState.showPermissionBubble(numericId);
          } else if (bubble === 'waiting' && ch.bubbleType !== 'waiting') {
            officeState.showWaitingBubble(numericId);
          } else if (!bubble && ch.bubbleType && ch.bubbleType !== 'done') {
            officeState.dismissBubble(numericId);
          }
        }
      }
    }

    // Remove agents that no longer exist
    for (const [id] of officeState.characters) {
      const idStr = unhashAgentId(id);
      if (idStr && !currentAgentIds.has(idStr)) {
        officeState.removeAgent(id);
      }
    }

  }, [state?.agents, officeState]);

  // Handle event-driven visual reactions
  useEffect(() => {
    if (!newEvents.length) return;
    for (const event of newEvents) {
      if (event.entityType === 'agent' && event.entityId) {
        const numericId = hashAgentId(event.entityId);
        const ch = officeState.characters.get(numericId);
        if (!ch) continue;

        switch (event.eventType) {
          case 'agent.status_changed':
            if (event.payload?.newStatus) {
              const newStatus = event.payload.newStatus as string;
              officeState.setAgentActive(numericId, mapAgentStatusToActive(newStatus));
              officeState.setAgentTool(numericId, mapAgentStatusToTool(newStatus));
              // Set behavior based on new status
              const behavior = mapAgentStatusToBehavior(newStatus);
              officeState.setAgentBehavior(numericId, behavior);
            }
            break;
          case 'task.assigned':
            // Agent sits at computer and starts working
            officeState.setAgentBehavior(numericId, BehaviorState.WORKING);
            break;
          case 'task.started':
            officeState.setAgentBehavior(numericId, BehaviorState.WORKING);
            break;
          case 'task.completed':
            // Show ✓ Done bubble, then idle briefly
            officeState.showDoneBubble(numericId);
            officeState.setAgentBehavior(numericId, BehaviorState.IDLE, 5);
            break;
          case 'task.failed':
            officeState.setAgentBehavior(numericId, BehaviorState.IDLE, 5);
            break;
          case 'tool.execution_started':
            // Agent sits and types
            officeState.setAgentBehavior(numericId, BehaviorState.WORKING);
            officeState.setAgentTool(numericId, event.payload?.toolKey as string || 'Write');
            break;
          case 'tool.execution_succeeded':
          case 'tool.execution_failed':
            officeState.setAgentTool(numericId, null);
            break;
          case 'approval.requested':
            // Agent goes to meeting / orchestrator area
            officeState.showPermissionBubble(numericId);
            officeState.setAgentBehavior(numericId, BehaviorState.MEETING, 15);
            break;
          case 'approval.approved':
          case 'approval.rejected':
            officeState.dismissBubble(numericId);
            officeState.setAgentBehavior(numericId, BehaviorState.WORKING);
            break;
        }
      }
    }
    clearNewEvents();
  }, [newEvents, clearNewEvents, officeState]);

  const handleAgentClick = useCallback((numericId: number) => {
    // Find the agent in our state by numeric ID
    const agent = state?.agents.find((a) => hashAgentId(a.id) === numericId);
    if (agent) {
      setSelectedAgent(agent);
      setDrawerOpen(true);
    }
  }, [state?.agents]);

  const handleApprovalAction = useCallback((_approvalId: string, _action: 'approve' | 'reject') => {
    setTimeout(() => refetch(), 500);
  }, [refetch]);

  const openPanel = useCallback((panel: ManagementPanel) => {
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  // Loading state
  if (loading && !state) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-400" />
          <p className="text-sm text-slate-400">Loading Pixel Office...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !state) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-400">Error: {error}</p>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // No workspace — show seed prompt
  if (!state || state.agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-5xl">🏢</div>
          <h2 className="text-xl font-bold text-white">Welcome to Agent OS</h2>
          <p className="text-sm text-slate-400">
            Initialize your workspace to see the Pixel Agent Office with 10 AI specialists.
          </p>
          <Button onClick={onSeed} size="lg" className="bg-violet-600 hover:bg-violet-700">
            🚀 Initialize System
          </Button>
        </div>
      </div>
    );
  }

  const { agents, tasks, approvals, toolExecutions, recentEvents, situation } = state;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ─── Minimal Top Bar (translucent, overlays office) ─── */}
      <div className="flex items-center justify-between px-3 py-1 bg-black/60 backdrop-blur-md border-b border-white/10 z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-violet-400" />
          <h1 className="text-sm font-bold text-white">Agent OS</h1>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-white/20 text-slate-300">
            {workspaceId?.slice(-8)}
          </Badge>
          <span className="text-[9px] text-slate-400 ml-1">
            {agents.filter(a => {
              const s = a.runtimeState?.status ?? a.status;
              return s !== 'offline';
            }).length}/{agents.length} active
          </span>
        </div>

        {/* Situation indicators */}
        <div className="flex items-center gap-1.5">
          {situation.approvalsNeeded > 0 && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1.5 cursor-pointer" onClick={() => openPanel('approvals')}>
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              {situation.approvalsNeeded}
            </Badge>
          )}
          {situation.runningTools > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-white/20 text-slate-300">
              <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
              {situation.runningTools}
            </Badge>
          )}
          {newEvents.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 cursor-pointer" onClick={() => openPanel('events')}>
              <Radio className="w-2.5 h-2.5 mr-0.5" />
              {newEvents.length}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-white" onClick={refetch}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* ─── Main Content: Pixel Office Scene fills everything ─── */}
      <div className="flex-1 min-h-0 relative">
        {/* Pixel Office Canvas — the hero, fills the entire area */}
        <PixelOfficeCanvas
          officeState={officeState}
          onAgentClick={handleAgentClick}
          zoom={zoom}
          onZoomChange={setZoom}
          panRef={panRef}
        />

        {/* Asset loading overlay */}
        {!assetsLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/80 z-20 pointer-events-none">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-violet-400" />
              <p className="text-xs text-slate-400">Loading pixel assets...</p>
            </div>
          </div>
        )}

        {/* ─── Floating Management Toolbar (overlays office) ─── */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-40">
          {(Object.entries(PANEL_CONFIG) as [ManagementPanel, typeof PANEL_CONFIG[ManagementPanel]][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              const count =
                key === 'tasks' ? tasks.length :
                key === 'approvals' ? approvals.length :
                key === 'events' ? recentEvents.length : 0;

              return (
                <Button
                  key={key}
                  variant={activePanel === key ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 w-9 p-0 shadow-lg backdrop-blur-sm relative transition-all ${
                    activePanel === key
                      ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600'
                      : 'bg-black/50 hover:bg-black/70 border-white/10 text-white'
                  }`}
                  onClick={() => activePanel === key ? closePanel() : openPanel(key)}
                  title={config.label}
                >
                  <Icon className={`w-4 h-4 ${activePanel === key ? 'text-white' : 'text-slate-300'}`} />
                  {count > 0 && key !== 'situation' && key !== 'orchestrator' && (
                    <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Button>
              );
            },
          )}
        </div>

        {/* ─── Zoom Controls ─── */}
        <div className="absolute left-3 bottom-3 flex items-center gap-1 z-40">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 bg-black/50 border-white/10 text-white hover:bg-black/70"
            onClick={() => setZoom(Math.max(1, zoom - 1))}
          >
            −
          </Button>
          <span className="text-[10px] text-slate-400 w-6 text-center">{zoom}x</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 bg-black/50 border-white/10 text-white hover:bg-black/70"
            onClick={() => setZoom(Math.min(10, zoom + 1))}
          >
            +
          </Button>
        </div>

        {/* ─── Management Panel Slide-over ─── */}
        <Sheet open={!!activePanel} onOpenChange={(open) => { if (!open) closePanel(); }}>
          <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                {activePanel && (() => {
                  const config = PANEL_CONFIG[activePanel];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <SheetTitle className="text-sm">{config.label}</SheetTitle>
                    </>
                  );
                })()}
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-auto p-4">
              {activePanel === 'tasks' && <TaskBoard tasks={tasks} />}
              {activePanel === 'situation' && (
                <SituationRoom situation={situation} agents={agents} recentEvents={recentEvents} />
              )}
              {activePanel === 'orchestrator' && (
                <OrchestratorPanel workspaceId={workspaceId!} agents={agents} />
              )}
              {activePanel === 'approvals' && (
                <ApprovalQueue approvals={approvals} workspaceId={workspaceId!} onAction={handleApprovalAction} />
              )}
              {activePanel === 'events' && <EventTimeline events={recentEvents} />}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ─── Agent Details Drawer ─── */}
      <AgentDetailsDrawer
        agent={selectedAgent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        recentEvents={recentEvents}
        toolExecutions={toolExecutions}
      />
    </div>
  );
}

// Bidirectional mapping between string agent IDs and numeric IDs for the pixel engine
const idToNumeric = new Map<string, number>();
const numericToId = new Map<number, string>();
let nextNumericId = 1;

function hashAgentId(id: string): number {
  const existing = idToNumeric.get(id);
  if (existing !== undefined) return existing;
  const num = nextNumericId++;
  idToNumeric.set(id, num);
  numericToId.set(num, id);
  return num;
}

function unhashAgentId(num: number): string | undefined {
  return numericToId.get(num);
}
