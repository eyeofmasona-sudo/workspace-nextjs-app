// ─── Agent OS — Pixel Agents Office + Orchestrator Chat ──────────
// The pixel office is the PRIMARY view. The orchestrator chat is a
// floating panel on the left. All 11 agents displayed as pixel
// characters in a multi-room office with real-time behavior.
// Management panels (tasks, approvals, events) are overlays.

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Cpu, Send, RefreshCw, Zap, Clock, Hash,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Sparkles,
  Crown, Wrench, ChevronDown, ChevronUp, UserPlus, Trash2,
  ListChecks, BarChart3, Radio, Building2, MessageSquare,
  PanelLeftClose, PanelLeftOpen, Globe, Sparkle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useResponsive } from '@/hooks/use-breakpoint';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Pixel Office components ──────────────────────────────────
import { PixelOfficeCanvas } from '@/components/pixel-office/PixelOfficeCanvas';
import { ContractBadge } from '@/components/orchestrator/ContractBadge';
import { OfficeState, ROLE_SEAT_MAP } from '@/lib/pixel-office/engine/officeState';
import { BehaviorState } from '@/lib/pixel-office/types';
import { loadAllAssets } from '@/lib/pixel-office/assetLoader';
import type { ZoneDestination, ZoneLabel, TileType as TileTypeVal } from '@/lib/pixel-office/types';

// ─── Office data hooks ────────────────────────────────────────
import { useOfficeData } from '@/hooks/useOfficeData';
import { useEventStream } from '@/hooks/useEventStream';
import type { OfficeAgent } from '@/hooks/useOfficeData';

// ─── Browser Operator ─────────────────────────────────────────
import { BrowserOperatorPanel } from '@/components/browser-operator/BrowserOperatorPanel';

// ─── Ecosystem Panel ───────────────────────────────────────────
import { EcosystemPanel } from '@/components/ecosystem';

// ─── Types ────────────────────────────────────────────────────

interface AgentSkillRef {
  skillId: string;
  enabled: boolean;
  hasConfig: boolean;
}

interface AgentToolRef {
  toolId: string;
  enabled: boolean;
  requiredPermission: string;
}

interface RuntimeAgent {
  id: string;
  name: string;
  role: string;
  type: string;
  description: string;
  status: string;
  model: {
    preferred: string;
    fallback: string | null;
  };
  execution: {
    temperature: number;
    maxTokens: number;
  };
  skills: AgentSkillRef[];
  tools: AgentToolRef[];
  hooks: string[];
  visualProfile: {
    color: string;
    icon: string;
    avatarEmoji: string;
  };
  executionCount: number;
  lastActivityAt: number | null;
}

interface RuntimeStatus {
  agents: RuntimeAgent[];
  stats: {
    totalAgents: number;
    permanentAgents: number;
    temporaryAgents: number;
    agentsByRole: Record<string, number>;
    agentsByStatus: Record<string, number>;
  };
  registrySize: number;
  skills: {
    totalSkills: number;
    skillIds: string[];
    registrations: Array<{
      id: string;
      name: string;
      version?: string;
      source: string;
    }>;
  };
  tools: {
    totalTools: number;
    toolIds: string[];
    toolsByPermission: Record<string, number>;
    registrations: Array<{
      id: string;
      name: string;
      version?: string;
      permission: string;
      source: string;
    }>;
  };
}

interface AIStatus {
  configured: boolean;
  providers: Array<{ id: string; name: string; available: boolean }>;
  registeredProviderIds: string[];
  error?: string;
}

interface DelegatedTask {
  agentId: string;
  agentName: string;
  task: string;
  status: 'completed' | 'failed' | 'running';
  result?: string;
  durationMs?: number;
}

interface OrchestratorChatResponse {
  orchestratorResponse: string;
  delegatedTasks: DelegatedTask[];
  totalDurationMs: number;
  modelUsed: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'delegation';
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs?: number;
  timestamp: number;
  error?: boolean;
  delegatedTasks?: DelegatedTask[];
  totalDurationMs?: number;
  // Contract metadata (from TaskContract)
  riskLevel?: string;
  routingConfidence?: number;
  approvalRequired?: boolean;
  qualityStatus?: 'passed' | 'needs_review' | 'blocked' | 'escalated';
  qualityScore?: number;
  qualityIssues?: string[];
}

interface HiredAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  model: string;
  skills: string[];
  tools: string[];
}

// ─── Color Scheme for All 11 Roles ────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; glow: string; ring: string }> = {
  orchestrator: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300', glow: 'shadow-purple-500/20', ring: 'ring-purple-500/50' },
  analyst: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300', glow: 'shadow-blue-500/20', ring: 'ring-blue-500/50' },
  architect: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300', glow: 'shadow-amber-500/20', ring: 'ring-amber-500/50' },
  designer: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300', glow: 'shadow-pink-500/20', ring: 'ring-pink-500/50' },
  frontend_engineer: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300', glow: 'shadow-emerald-500/20', ring: 'ring-emerald-500/50' },
  backend_engineer: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300', glow: 'shadow-indigo-500/20', ring: 'ring-indigo-500/50' },
  data_engineer: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300', glow: 'shadow-teal-500/20', ring: 'ring-teal-500/50' },
  qa_engineer: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300', glow: 'shadow-rose-500/20', ring: 'ring-rose-500/50' },
  devops_engineer: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300', glow: 'shadow-orange-500/20', ring: 'ring-orange-500/50' },
  researcher: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300', glow: 'shadow-violet-500/20', ring: 'ring-violet-500/50' },
  security_engineer: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300', glow: 'shadow-red-500/20', ring: 'ring-red-500/50' },
  custom: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', badge: 'bg-slate-500/20 text-slate-300', glow: 'shadow-slate-500/20', ring: 'ring-slate-500/50' },
};

const DEFAULT_ROLE_COLORS = ROLE_COLORS.custom;

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-slate-400',
  thinking: 'bg-yellow-400 animate-pulse',
  working: 'bg-emerald-400 animate-pulse',
  waiting_api: 'bg-blue-400 animate-pulse',
  reviewing: 'bg-amber-400',
  waiting_approval: 'bg-orange-400',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
  offline: 'bg-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  working: 'Working',
  waiting_api: 'API Wait',
  reviewing: 'Reviewing',
  waiting_approval: 'Awaiting',
  done: 'Done',
  error: 'Error',
  offline: 'Offline',
};

const SKILL_COLORS: Record<string, string> = {
  planning: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  summarization: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  validation: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
  code_generation: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  testing: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  research: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  design: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
  security_audit: 'bg-red-500/15 text-red-300 border-red-500/20',
};

const TOOL_COLORS: Record<string, string> = {
  calculator: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  http_request: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  file_reader: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
  code_executor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  browser: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  database_query: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
};

const DEFAULT_SKILL_COLOR = 'bg-rose-500/15 text-rose-300 border-rose-500/20';
const DEFAULT_TOOL_COLOR = 'bg-amber-500/15 text-amber-300 border-amber-500/20';

const CAPABILITY_OPTIONS = [
  'planning', 'validation', 'summarization', 'code_generation',
  'testing', 'research', 'design', 'security_audit',
  'code_review', 'deployment', 'monitoring', 'documentation',
];

// ─── Pixel Office Layout (40×31, 9 rooms in 3×3 grid) ────────
const COLS = 40;
const ROWS = 31;

function buildTiles(): TileTypeVal[] {
  const W = 0 as TileTypeVal;
  const F1 = 1 as TileTypeVal; // Command Center
  const F2 = 2 as TileTypeVal; // Meeting Room
  const F3 = 3 as TileTypeVal; // Design Studio
  const F4 = 4 as TileTypeVal; // Development
  const F5 = 5 as TileTypeVal; // Server Room
  const F6 = 6 as TileTypeVal; // Research Lab
  const F7 = 7 as TileTypeVal; // Marketing Area
  const F9 = 9 as TileTypeVal; // Content Studio
  const F10 = 10 as TileTypeVal; // Growth Lab
  const D = 8 as TileTypeVal;  // Doorway

  const tiles: TileTypeVal[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Outer walls
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) { tiles.push(W); continue; }
      // Horizontal interior wall (row 10) with doorways
      if (r === 10) {
        tiles.push(
          (c >= 5 && c <= 6) || (c >= 18 && c <= 19) || (c >= 31 && c <= 32) ? D : W
        );
        continue;
      }
      // Horizontal interior wall (row 20) with doorways
      if (r === 20) {
        tiles.push(
          (c >= 5 && c <= 6) || (c >= 18 && c <= 19) || (c >= 31 && c <= 32) ? D : W
        );
        continue;
      }
      // Vertical interior wall (col 13) with doorways
      if (c === 13) {
        tiles.push((r >= 4 && r <= 5) || (r >= 14 && r <= 15) || (r >= 24 && r <= 25) ? D : W);
        continue;
      }
      // Vertical interior wall (col 26) with doorways
      if (c === 26) {
        tiles.push((r >= 4 && r <= 5) || (r >= 14 && r <= 15) || (r >= 24 && r <= 25) ? D : W);
        continue;
      }
      // Room 1: Command Center (cols 1-12, rows 1-9)
      if (r >= 1 && r <= 9 && c >= 1 && c <= 12) { tiles.push(F1); continue; }
      // Room 2: Meeting Room (cols 14-25, rows 1-9)
      if (r >= 1 && r <= 9 && c >= 14 && c <= 25) { tiles.push(F2); continue; }
      // Room 3: Design Studio (cols 27-38, rows 1-9)
      if (r >= 1 && r <= 9 && c >= 27 && c <= 38) { tiles.push(F3); continue; }
      // Room 4: Development (cols 1-12, rows 11-19)
      if (r >= 11 && r <= 19 && c >= 1 && c <= 12) { tiles.push(F4); continue; }
      // Room 5: Server Room (cols 14-25, rows 11-19)
      if (r >= 11 && r <= 19 && c >= 14 && c <= 25) { tiles.push(F5); continue; }
      // Room 6: Research Lab (cols 27-38, rows 11-19)
      if (r >= 11 && r <= 19 && c >= 27 && c <= 38) { tiles.push(F6); continue; }
      // Room 7: Marketing Area (cols 1-12, rows 21-29)
      if (r >= 21 && r <= 29 && c >= 1 && c <= 12) { tiles.push(F7); continue; }
      // Room 8: Content Studio (cols 14-25, rows 21-29)
      if (r >= 21 && r <= 29 && c >= 14 && c <= 25) { tiles.push(F9); continue; }
      // Room 9: Growth Lab (cols 27-38, rows 21-29)
      if (r >= 21 && r <= 29 && c >= 27 && c <= 38) { tiles.push(F10); continue; }
      tiles.push(W);
    }
  }
  return tiles;
}

function buildTileColors(): Array<{ h: number; s: number; b: number; c: number } | null> {
  const wallColor = { h: 214, s: 30, b: -100, c: -55 };
  const cmdColor = { h: 30, s: 50, b: -43, c: -88 };     // warm beige
  const meetColor = { h: 210, s: 35, b: -30, c: -75 };    // cool blue-gray
  const designColor = { h: 330, s: 40, b: -35, c: -80 };  // pink-tinted
  const devColor = { h: 150, s: 40, b: -40, c: -82 };     // green-tinted
  const serverColor = { h: 200, s: 45, b: -50, c: -70 };  // steel blue
  const researchColor = { h: 35, s: 55, b: -38, c: -85 }; // warm amber
  const marketingColor = { h: 300, s: 45, b: -40, c: -82 }; // fuchsia-tinted
  const contentColor = { h: 40, s: 55, b: -38, c: -85 };   // amber-tinted
  const growthColor = { h: 190, s: 50, b: -40, c: -80 };   // cyan-tinted
  const doorColor = { h: 35, s: 25, b: 10, c: 0 };
  const tiles = buildTiles();
  const colors: Array<{ h: number; s: number; b: number; c: number } | null> = [];
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    if (tile === 0) { colors.push(wallColor); continue; }
    if (tile === 8) { colors.push(doorColor); continue; }
    if (tile === 1) { colors.push(cmdColor); continue; }
    if (tile === 2) { colors.push(meetColor); continue; }
    if (tile === 3) { colors.push(designColor); continue; }
    if (tile === 4) { colors.push(devColor); continue; }
    if (tile === 5) { colors.push(serverColor); continue; }
    if (tile === 6) { colors.push(researchColor); continue; }
    if (tile === 7) { colors.push(marketingColor); continue; }
    if (tile === 9) { colors.push(contentColor); continue; }
    if (tile === 10) { colors.push(growthColor); continue; }
    colors.push(wallColor);
  }
  return colors;
}

const DEFAULT_AGENT_OS_LAYOUT = {
  version: 1 as const,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 6,
  tiles: buildTiles(),
  tileColors: buildTileColors(),
  furniture: [
    // ═══════════════════════════════════════════════════════════════
    // ROOM 1: COMMAND CENTER (cols 1-12, rows 1-9)
    // Orchestrator, Architect, Analyst
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations (row 0)
    { uid: 'cmd-shelf1', type: 'DOUBLE_BOOKSHELF', col: 1, row: 0 },
    { uid: 'cmd-clock', type: 'CLOCK', col: 5, row: 0 },
    { uid: 'cmd-wb', type: 'WHITEBOARD', col: 7, row: 0 },
    { uid: 'cmd-paint1', type: 'SMALL_PAINTING', col: 10, row: 0 },
    { uid: 'cmd-paint2', type: 'SMALL_PAINTING_2', col: 11, row: 0 },
    // Orchestrator workstation (desk+PC on row 2, chair on row 4)
    { uid: 'desk-orc', type: 'DESK_FRONT', col: 2, row: 2 },
    { uid: 'pc-orc', type: 'PC_FRONT_OFF', col: 3, row: 2 },
    { uid: 'chair-orc', type: 'WOODEN_CHAIR_BACK', col: 3, row: 4 },
    // Architect workstation
    { uid: 'desk-arch', type: 'DESK_FRONT', col: 7, row: 2 },
    { uid: 'pc-arch', type: 'PC_FRONT_OFF', col: 8, row: 2 },
    { uid: 'chair-arch', type: 'WOODEN_CHAIR_BACK', col: 8, row: 4 },
    // Analyst workstation
    { uid: 'desk-anl', type: 'DESK_FRONT', col: 2, row: 6 },
    { uid: 'pc-anl', type: 'PC_FRONT_OFF', col: 3, row: 6 },
    { uid: 'chair-anl', type: 'WOODEN_CHAIR_BACK', col: 3, row: 8 },
    // Decor
    { uid: 'cmd-plant1', type: 'LARGE_PLANT', col: 1, row: 1 },
    { uid: 'cmd-plant2', type: 'PLANT', col: 11, row: 5 },
    { uid: 'cmd-cactus', type: 'CACTUS', col: 12, row: 1 },
    { uid: 'cmd-coffee', type: 'COFFEE', col: 10, row: 3 },
    { uid: 'cmd-bin', type: 'BIN', col: 12, row: 9 },

    // ═══════════════════════════════════════════════════════════════
    // ROOM 2: MEETING ROOM (cols 14-25, rows 1-9)
    // Group meetings, collaboration space
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations
    { uid: 'meet-shelf', type: 'BOOKSHELF', col: 14, row: 0 },
    { uid: 'meet-clock', type: 'CLOCK', col: 17, row: 0 },
    { uid: 'meet-wb', type: 'WHITEBOARD', col: 19, row: 0 },
    { uid: 'meet-paint', type: 'LARGE_PAINTING', col: 23, row: 0 },
    // Meeting table with chairs
    { uid: 'meet-table', type: 'TABLE_FRONT', col: 18, row: 4 },
    { uid: 'meet-chair1', type: 'CUSHIONED_CHAIR_FRONT', col: 18, row: 3 },
    { uid: 'meet-chair2', type: 'CUSHIONED_CHAIR_FRONT', col: 20, row: 3 },
    { uid: 'meet-bench1', type: 'CUSHIONED_BENCH', col: 17, row: 5 },
    { uid: 'meet-bench2', type: 'CUSHIONED_BENCH', col: 21, row: 5 },
    { uid: 'meet-chair3', type: 'CUSHIONED_CHAIR_BACK', col: 18, row: 6 },
    { uid: 'meet-chair4', type: 'CUSHIONED_CHAIR_BACK', col: 20, row: 6 },
    // Side table with coffee
    { uid: 'meet-ctable', type: 'COFFEE_TABLE', col: 15, row: 7 },
    { uid: 'meet-coffee', type: 'COFFEE', col: 16, row: 7 },
    // Decor
    { uid: 'meet-plant1', type: 'PLANT_2', col: 14, row: 1 },
    { uid: 'meet-plant2', type: 'LARGE_PLANT', col: 24, row: 8 },
    { uid: 'meet-hplant', type: 'HANGING_PLANT', col: 22, row: 0 },
    { uid: 'meet-bin', type: 'BIN', col: 24, row: 9 },

    // ═══════════════════════════════════════════════════════════════
    // ROOM 3: DESIGN STUDIO (cols 27-38, rows 1-9)
    // Designer + collaboration area
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations
    { uid: 'des-shelf', type: 'DOUBLE_BOOKSHELF', col: 27, row: 0 },
    { uid: 'des-hplant', type: 'HANGING_PLANT', col: 31, row: 0 },
    { uid: 'des-paint1', type: 'SMALL_PAINTING', col: 34, row: 0 },
    { uid: 'des-paint2', type: 'SMALL_PAINTING_2', col: 37, row: 0 },
    // Designer workstation
    { uid: 'desk-des', type: 'DESK_FRONT', col: 29, row: 2 },
    { uid: 'pc-des', type: 'PC_FRONT_OFF', col: 30, row: 2 },
    { uid: 'chair-des', type: 'WOODEN_CHAIR_BACK', col: 30, row: 4 },
    // Review/collaboration area
    { uid: 'des-ctable', type: 'COFFEE_TABLE', col: 29, row: 7 },
    { uid: 'des-bench', type: 'CUSHIONED_BENCH', col: 28, row: 8 },
    { uid: 'des-bench2', type: 'CUSHIONED_BENCH', col: 31, row: 8 },
    // Decor
    { uid: 'des-plant1', type: 'PLANT', col: 37, row: 1 },
    { uid: 'des-cactus', type: 'CACTUS', col: 27, row: 6 },
    { uid: 'des-plant2', type: 'PLANT_2', col: 35, row: 5 },
    { uid: 'des-bin', type: 'BIN', col: 37, row: 9 },

    // ═══════════════════════════════════════════════════════════════
    // ROOM 4: DEVELOPMENT (cols 1-12, rows 11-19)
    // Frontend, Backend, QA engineers
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations (row 10)
    { uid: 'dev-shelf', type: 'BOOKSHELF', col: 1, row: 10 },
    { uid: 'dev-wb', type: 'WHITEBOARD', col: 7, row: 10 },
    { uid: 'dev-clock', type: 'CLOCK', col: 11, row: 10 },
    // Frontend workstation
    { uid: 'desk-fe', type: 'DESK_FRONT', col: 2, row: 12 },
    { uid: 'pc-fe', type: 'PC_FRONT_OFF', col: 3, row: 12 },
    { uid: 'chair-fe', type: 'WOODEN_CHAIR_BACK', col: 3, row: 14 },
    // Backend workstation
    { uid: 'desk-be', type: 'DESK_FRONT', col: 7, row: 12 },
    { uid: 'pc-be', type: 'PC_FRONT_OFF', col: 8, row: 12 },
    { uid: 'chair-be', type: 'WOODEN_CHAIR_BACK', col: 8, row: 14 },
    // QA workstation
    { uid: 'desk-qa', type: 'DESK_FRONT', col: 2, row: 16 },
    { uid: 'pc-qa', type: 'PC_FRONT_OFF', col: 3, row: 16 },
    { uid: 'chair-qa', type: 'WOODEN_CHAIR_BACK', col: 3, row: 18 },
    // Decor
    { uid: 'dev-plant1', type: 'LARGE_PLANT', col: 1, row: 11 },
    { uid: 'dev-plant2', type: 'PLANT', col: 11, row: 13 },
    { uid: 'dev-cactus', type: 'CACTUS', col: 12, row: 17 },
    { uid: 'dev-coffee', type: 'COFFEE', col: 10, row: 13 },
    { uid: 'dev-bin', type: 'BIN', col: 12, row: 19 },

    // ═══════════════════════════════════════════════════════════════
    // ROOM 5: SERVER ROOM (cols 14-25, rows 11-19)
    // Data Engineer, DevOps + server racks
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations (row 10)
    { uid: 'srv-shelf', type: 'DOUBLE_BOOKSHELF', col: 14, row: 10 },
    { uid: 'srv-clock', type: 'CLOCK', col: 17, row: 10 },
    { uid: 'srv-paint', type: 'LARGE_PAINTING', col: 23, row: 10 },
    // Data Engineer workstation
    { uid: 'desk-data', type: 'DESK_FRONT', col: 15, row: 12 },
    { uid: 'pc-data', type: 'PC_FRONT_OFF', col: 16, row: 12 },
    { uid: 'chair-data', type: 'WOODEN_CHAIR_BACK', col: 16, row: 14 },
    // DevOps workstation
    { uid: 'desk-ops', type: 'DESK_FRONT', col: 15, row: 16 },
    { uid: 'pc-ops', type: 'PC_FRONT_OFF', col: 16, row: 16 },
    { uid: 'chair-ops', type: 'WOODEN_CHAIR_BACK', col: 16, row: 18 },
    // Server racks (using DESK_SIDE as rack props)
    { uid: 'srv-rack1', type: 'DESK_SIDE', col: 20, row: 12 },
    { uid: 'srv-rack2', type: 'DESK_SIDE', col: 20, row: 15 },
    { uid: 'srv-rack3', type: 'DESK_SIDE', col: 23, row: 12 },
    { uid: 'srv-rack4', type: 'DESK_SIDE', col: 23, row: 15 },
    // Monitoring displays
    { uid: 'srv-pc1', type: 'PC_FRONT_OFF', col: 21, row: 11 },
    { uid: 'srv-pc2', type: 'PC_FRONT_OFF', col: 24, row: 11 },
    // Decor
    { uid: 'srv-plant1', type: 'PLANT_2', col: 14, row: 17 },
    { uid: 'srv-pot', type: 'POT', col: 15, row: 19 },
    { uid: 'srv-bin', type: 'BIN', col: 24, row: 19 },

    // ═══════════════════════════════════════════════════════════════
    // ROOM 6: RESEARCH LAB (cols 27-38, rows 11-19)
    // Researcher + library/reading area
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations (row 10)
    { uid: 'res-shelf1', type: 'DOUBLE_BOOKSHELF', col: 27, row: 10 },
    { uid: 'res-wb', type: 'WHITEBOARD', col: 31, row: 10 },
    { uid: 'res-shelf2', type: 'BOOKSHELF', col: 36, row: 10 },
    // Researcher workstation
    { uid: 'desk-res', type: 'DESK_FRONT', col: 29, row: 12 },
    { uid: 'pc-res', type: 'PC_FRONT_OFF', col: 30, row: 12 },
    { uid: 'chair-res', type: 'WOODEN_CHAIR_BACK', col: 30, row: 14 },
    // Reading table
    { uid: 'res-table', type: 'SMALL_TABLE', col: 33, row: 15 },
    { uid: 'res-rchair1', type: 'WOODEN_CHAIR_FRONT', col: 32, row: 16 },
    { uid: 'res-rchair2', type: 'WOODEN_CHAIR_FRONT', col: 35, row: 16 },
    // Decor
    { uid: 'res-plant1', type: 'LARGE_PLANT', col: 27, row: 11 },
    { uid: 'res-plant2', type: 'PLANT', col: 37, row: 11 },
    { uid: 'res-cactus', type: 'CACTUS', col: 37, row: 17 },
    { uid: 'res-coffee', type: 'COFFEE', col: 34, row: 14 },
    { uid: 'res-bin', type: 'BIN', col: 37, row: 19 },

    // ═══════════════════════════════════════════════════════════════
    // ROOM 7: MARKETING AREA (cols 1-12, rows 21-29)
    // Marketing Lead, Market Researcher
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations (row 20)
    { uid: 'mkt-shelf', type: 'DOUBLE_BOOKSHELF', col: 1, row: 20 },
    { uid: 'mkt-wb', type: 'WHITEBOARD', col: 5, row: 20 },
    { uid: 'mkt-clock', type: 'CLOCK', col: 9, row: 20 },
    // Marketing Lead workstation
    { uid: 'desk-mktl', type: 'DESK_FRONT', col: 2, row: 22 },
    { uid: 'pc-mktl', type: 'PC_FRONT_OFF', col: 3, row: 22 },
    { uid: 'chair-mktl', type: 'WOODEN_CHAIR_BACK', col: 3, row: 24 },
    // Market Researcher workstation
    { uid: 'desk-mktr', type: 'DESK_FRONT', col: 7, row: 22 },
    { uid: 'pc-mktr', type: 'PC_FRONT_OFF', col: 8, row: 22 },
    { uid: 'chair-mktr', type: 'WOODEN_CHAIR_BACK', col: 8, row: 24 },
    // Trend Analyst workstation (row 26)
    { uid: 'desk-trnd', type: 'DESK_FRONT', col: 2, row: 26 },
    { uid: 'pc-trnd', type: 'PC_FRONT_OFF', col: 3, row: 26 },
    { uid: 'chair-trnd', type: 'WOODEN_CHAIR_BACK', col: 3, row: 28 },
    // Decor
    { uid: 'mkt-plant1', type: 'LARGE_PLANT', col: 1, row: 21 },
    { uid: 'mkt-cactus', type: 'CACTUS', col: 12, row: 27 },
    { uid: 'mkt-bin', type: 'BIN', col: 12, row: 29 },

    // ═══════════════════════════════════════════════════════════════
    // ROOM 8: CONTENT STUDIO (cols 14-25, rows 21-29)
    // Content Strategist
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations (row 20)
    { uid: 'cnt-shelf', type: 'BOOKSHELF', col: 14, row: 20 },
    { uid: 'cnt-wb', type: 'WHITEBOARD', col: 18, row: 20 },
    { uid: 'cnt-paint', type: 'LARGE_PAINTING', col: 23, row: 20 },
    // Content Strategist workstation (row 22, col 15)
    { uid: 'desk-cnts', type: 'DESK_FRONT', col: 15, row: 22 },
    { uid: 'pc-cnts', type: 'PC_FRONT_OFF', col: 16, row: 22 },
    { uid: 'chair-cnts', type: 'WOODEN_CHAIR_BACK', col: 16, row: 24 },
    // Copywriter workstation (row 22, col 20)
    { uid: 'desk-cpyw', type: 'DESK_FRONT', col: 20, row: 22 },
    { uid: 'pc-cpyw', type: 'PC_FRONT_OFF', col: 21, row: 22 },
    { uid: 'chair-cpyw', type: 'WOODEN_CHAIR_BACK', col: 21, row: 24 },
    // Visual Designer workstation (row 26, col 15)
    { uid: 'desk-visd', type: 'DESK_FRONT', col: 15, row: 26 },
    { uid: 'pc-visd', type: 'PC_FRONT_OFF', col: 16, row: 26 },
    { uid: 'chair-visd', type: 'WOODEN_CHAIR_BACK', col: 16, row: 28 },
    // Video Editor workstation (row 26, col 20)
    { uid: 'desk-vide', type: 'DESK_FRONT', col: 20, row: 26 },
    { uid: 'pc-vide', type: 'PC_FRONT_OFF', col: 21, row: 26 },
    { uid: 'chair-vide', type: 'WOODEN_CHAIR_BACK', col: 21, row: 28 },
    // Brand Guardian — standalone desk col 23 (guardian post)
    { uid: 'desk-brnd', type: 'DESK_SIDE', col: 23, row: 24 },
    { uid: 'pc-brnd', type: 'PC_FRONT_OFF', col: 23, row: 22 },
    { uid: 'chair-brnd', type: 'WOODEN_CHAIR_BACK', col: 23, row: 24 },
    // Decor
    { uid: 'cnt-plant1', type: 'PLANT_2', col: 14, row: 21 },
    { uid: 'cnt-plant2', type: 'PLANT', col: 24, row: 25 },
    { uid: 'cnt-bin', type: 'BIN', col: 24, row: 29 },

    // ═══════════════════════════════════════════════════════════════
    // ROOM 9: GROWTH LAB (cols 27-38, rows 21-29)
    // Growth Manager, Marketing Analyst
    // ═══════════════════════════════════════════════════════════════
    // Wall decorations (row 20)
    { uid: 'grw-shelf', type: 'DOUBLE_BOOKSHELF', col: 27, row: 20 },
    { uid: 'grw-hplant', type: 'HANGING_PLANT', col: 32, row: 20 },
    { uid: 'grw-paint', type: 'SMALL_PAINTING', col: 36, row: 20 },
    // Growth Manager workstation
    { uid: 'desk-grwm', type: 'DESK_FRONT', col: 29, row: 22 },
    { uid: 'pc-grwm', type: 'PC_FRONT_OFF', col: 30, row: 22 },
    { uid: 'chair-grwm', type: 'WOODEN_CHAIR_BACK', col: 30, row: 24 },
    // Marketing Analyst workstation (row 22, col 33)
    { uid: 'desk-mkta', type: 'DESK_FRONT', col: 33, row: 22 },
    { uid: 'pc-mkta', type: 'PC_FRONT_OFF', col: 34, row: 22 },
    { uid: 'chair-mkta', type: 'WOODEN_CHAIR_BACK', col: 34, row: 24 },
    // Publisher workstation (row 22, col 36)
    { uid: 'desk-pub', type: 'DESK_FRONT', col: 36, row: 22 },
    { uid: 'pc-pub', type: 'PC_FRONT_OFF', col: 37, row: 22 },
    { uid: 'chair-pub', type: 'WOODEN_CHAIR_BACK', col: 37, row: 24 },
    // Sales Agent workstation (row 26, col 29)
    { uid: 'desk-sal', type: 'DESK_FRONT', col: 29, row: 26 },
    { uid: 'pc-sal', type: 'PC_FRONT_OFF', col: 30, row: 26 },
    { uid: 'chair-sal', type: 'WOODEN_CHAIR_BACK', col: 30, row: 28 },
    // Community Manager workstation (row 26, col 33)
    { uid: 'desk-comm', type: 'DESK_FRONT', col: 33, row: 26 },
    { uid: 'pc-comm', type: 'PC_FRONT_OFF', col: 34, row: 26 },
    { uid: 'chair-comm', type: 'WOODEN_CHAIR_BACK', col: 34, row: 28 },
    // Messenger Support workstation (row 26, col 36)
    { uid: 'desk-msg', type: 'DESK_FRONT', col: 36, row: 26 },
    { uid: 'pc-msg', type: 'PC_FRONT_OFF', col: 37, row: 26 },
    { uid: 'chair-msg', type: 'WOODEN_CHAIR_BACK', col: 37, row: 28 },
    // Analytics displays
    { uid: 'grw-pc1', type: 'PC_FRONT_OFF', col: 28, row: 21 },
    { uid: 'grw-pc2', type: 'PC_FRONT_OFF', col: 37, row: 21 },
    // Decor
    { uid: 'grw-plant1', type: 'LARGE_PLANT', col: 27, row: 21 },
    { uid: 'grw-cactus', type: 'CACTUS', col: 38, row: 27 },
    { uid: 'grw-bin', type: 'BIN', col: 38, row: 29 },
  ],
};

const ZONE_DESTINATIONS: Record<string, ZoneDestination[]> = {
  [BehaviorState.MEETING]: [
    // Meeting room benches and chairs
    { col: 17, row: 5 }, { col: 18, row: 5 }, { col: 19, row: 5 }, { col: 20, row: 5 }, { col: 21, row: 5 },
    { col: 18, row: 7 }, { col: 19, row: 7 }, { col: 20, row: 7 },
    // Marketing area collaboration
    { col: 4, row: 28 }, { col: 5, row: 28 }, { col: 6, row: 28 }, { col: 7, row: 28 },
  ],
  [BehaviorState.BREAK]: [
    // Design studio collaboration area
    { col: 28, row: 8 }, { col: 29, row: 8 }, { col: 30, row: 8 }, { col: 31, row: 8 },
    // Meeting room side
    { col: 15, row: 7 }, { col: 16, row: 7 },
    // Content studio review area
    { col: 18, row: 28 }, { col: 19, row: 28 }, { col: 20, row: 28 },
  ],
  [BehaviorState.RESEARCH]: [
    // Research lab reading area
    { col: 32, row: 16 }, { col: 33, row: 16 }, { col: 34, row: 16 }, { col: 35, row: 16 },
    { col: 30, row: 15 }, { col: 31, row: 15 },
    // Growth Lab analytics displays
    { col: 28, row: 21 }, { col: 29, row: 21 }, { col: 34, row: 21 }, { col: 35, row: 21 },
  ],
};

const ZONE_LABELS: ZoneLabel[] = [
  { text: '⚙ COMMAND', col: 5, row: 1, color: '#C4B5FD' },
  { text: '🤝 MEETING', col: 18, row: 1, color: '#93C5FD' },
  { text: '🎨 DESIGN', col: 31, row: 1, color: '#F9A8D4' },
  { text: '💻 DEVELOPMENT', col: 5, row: 11, color: '#6EE7B7' },
  { text: '🖥 SERVER', col: 18, row: 11, color: '#67E8F9' },
  { text: '📚 RESEARCH', col: 31, row: 11, color: '#FCD34D' },
  { text: '📢 MKT HQ', col: 3, row: 21, color: '#E879F9' },
  { text: '✍️ STUDIO', col: 17, row: 21, color: '#FCD34D' },
  { text: '📈 GROWTH', col: 31, row: 21, color: '#22D3EE' },
];

// ─── Pixel Office Status Mapping ──────────────────────────────

function mapAgentStatusToActive(status: string): boolean {
  const s = status?.toLowerCase() ?? 'idle';
  return !['offline', 'idle', 'done'].includes(s);
}

function mapAgentStatusToTool(status: string): string | null {
  const s = status?.toLowerCase() ?? '';
  if (s.includes('thinking') || s.includes('working')) return 'Write';
  if (s.includes('review') || s.includes('reading') || s.includes('waiting_api')) return 'Read';
  return null;
}

function mapAgentStatusToBubble(status: string): 'permission' | 'waiting' | null {
  const s = status?.toLowerCase() ?? '';
  if (s.includes('waiting_approval')) return 'permission';
  if (s.includes('waiting_api')) return 'waiting';
  return null;
}

function mapAgentStatusToBehavior(status: string): BehaviorState {
  const s = status?.toLowerCase() ?? 'idle';
  if (s.includes('working') || s.includes('thinking')) return BehaviorState.WORKING;
  if (s.includes('reviewing')) return BehaviorState.MEETING;
  if (s.includes('waiting_approval')) return BehaviorState.MEETING;
  if (s.includes('waiting_api')) return BehaviorState.RESEARCH;
  if (s.includes('done')) return BehaviorState.IDLE;
  return BehaviorState.IDLE;
}

// ─── Agent ID Hashing (for pixel office engine) ───────────────

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

// ─── Sub-components ───────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || 'bg-slate-500'}`} />
      <span className="text-[10px] text-slate-500">{STATUS_LABELS[status] || status}</span>
    </span>
  );
}

// ─── Delegation Report (inline in chat) ───────────────────────

function DelegationReport({
  tasks,
  totalDurationMs,
}: {
  tasks: DelegatedTask[];
  totalDurationMs: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🔄</span>
          <span className="text-xs font-medium text-slate-300">
            Delegated to {tasks.length} agent{tasks.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            {completedCount > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] h-4 px-1.5">✓ {completedCount}</Badge>
            )}
            {failedCount > 0 && (
              <Badge className="bg-red-500/20 text-red-300 text-[9px] h-4 px-1.5">✗ {failedCount}</Badge>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">
            {totalDurationMs > 0 ? `${(totalDurationMs / 1000).toFixed(1)}s` : ''}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1">
              {tasks.map((task, i) => (
                <motion.div
                  key={`${task.agentId}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/30"
                >
                  <span className="mt-0.5">
                    {task.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      : task.status === 'failed' ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                      : <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-300">{task.agentName}</span>
                      {task.durationMs !== undefined && (
                        <span className="text-[10px] text-slate-500">{(task.durationMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{task.task}</p>
                    {task.result && expanded && (
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-3">{task.result}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Orchestrator Chat Panel (Floating) ───────────────────────

function OrchestratorChatPanel({
  messages,
  onSend,
  loading,
  configured,
  orchestrator,
  delegatingAgentCount,
}: {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  loading: boolean;
  configured: boolean;
  orchestrator: RuntimeAgent | null;
  delegatingAgentCount: number;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12122a]/95 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-3 py-2.5 border-b border-slate-700/50 shrink-0 bg-[#12122a]/80">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className="text-xl leading-none">👑</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#12122a]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold text-slate-200">Orchestrator</h2>
            <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <span>I coordinate all agents</span>
              {orchestrator && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="font-mono">{orchestrator.model.preferred.split('/').pop()}</span>
                </>
              )}
            </p>
          </div>
          {orchestrator && (
            <div className="flex items-center gap-1">
              {orchestrator.skills.filter((s) => s.enabled).map((s) => (
                <Badge key={s.skillId} className={`text-[7px] h-3.5 px-1 ${SKILL_COLORS[s.skillId] || DEFAULT_SKILL_COLOR} border`}>
                  {s.skillId}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-1">Talk to the Orchestrator</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Tell me what you need. I&apos;ll delegate to the right agents.
            </p>
            {!configured && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-xs mx-auto">
                <p className="text-[10px] text-amber-300 flex items-center gap-1 justify-center">
                  <AlertTriangle className="w-3 h-3" />
                  OPENROUTER_API_KEY not set
                </p>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-cyan-600/15 border border-cyan-500/20 text-slate-200'
                    : msg.error
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                    : 'bg-purple-500/[0.08] border border-purple-500/20 text-slate-300'
                }`}
              >
                {msg.role === 'delegation' && msg.delegatedTasks && (
                  <DelegationReport tasks={msg.delegatedTasks} totalDurationMs={msg.totalDurationMs || 0} />
                )}
                <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                {msg.role === 'assistant' && (msg.riskLevel || msg.routingConfidence !== undefined) && (
                  <div className="mt-1.5">
                    <ContractBadge
                      riskLevel={msg.riskLevel ?? 'low'}
                      routingConfidence={msg.routingConfidence ?? 1}
                      approvalRequired={msg.approvalRequired ?? false}
                      qualityStatus={msg.qualityStatus}
                      qualityScore={msg.qualityScore}
                      issues={msg.qualityIssues}
                    />
                  </div>
                )}
                {msg.role === 'assistant' && !msg.error && (
                  <div className="mt-1.5 pt-1 border-t border-slate-700/30 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500">
                    {msg.model && <span className="flex items-center gap-0.5"><Cpu className="w-2 h-2" />{msg.model.split('/').pop()}</span>}
                    {msg.usage && <span className="flex items-center gap-0.5"><Hash className="w-2 h-2" />{msg.usage.totalTokens} tok</span>}
                    {msg.durationMs !== undefined && <span className="flex items-center gap-0.5"><Clock className="w-2 h-2" />{(msg.durationMs / 1000).toFixed(1)}s</span>}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="bg-purple-500/[0.08] border border-purple-500/20 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>
                  {delegatingAgentCount > 0
                    ? `🔄 Delegating to ${delegatingAgentCount} agent${delegatingAgentCount !== 1 ? 's' : ''}...`
                    : '👑 Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-2.5 border-t border-slate-700/50 shrink-0 bg-[#12122a]/80">
        <div className="flex gap-1.5 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={configured ? 'Message the orchestrator...' : 'AI not configured'}
            disabled={loading || !configured}
            className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 text-xs resize-none min-h-[36px] max-h-[100px]"
            rows={1}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={loading || !input.trim() || !configured}
            className="bg-purple-600 hover:bg-purple-500 text-white shrink-0 h-9 w-9 p-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Agent Detail Sheet ───────────────────────────────────────

function AgentDetailSheet({
  agent,
  open,
  onOpenChange,
  isHired,
  onFire,
}: {
  agent: RuntimeAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isHired: boolean;
  onFire?: () => void;
}) {
  if (!agent) return null;
  const colors = ROLE_COLORS[agent.role] || DEFAULT_ROLE_COLORS;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#0f0f1a] border-slate-700/50 w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-slate-200">
            <span className="text-2xl">{agent.visualProfile.avatarEmoji}</span>
            <div>
              <span>{agent.name}</span>
              <Badge className={`${colors.badge} text-[9px] h-4 px-1.5 ml-2`}>
                {agent.role.replace(/_/g, ' ')}
              </Badge>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-1">Description</h4>
            <p className="text-sm text-slate-300">{agent.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <h4 className="text-[10px] text-slate-500 mb-1">Status</h4>
              <StatusDot status={agent.status} />
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <h4 className="text-[10px] text-slate-500 mb-1">Model</h4>
              <span className="text-xs text-slate-300 font-mono">{agent.model.preferred.split('/').pop()}</span>
              {agent.model.fallback && (
                <span className="text-[10px] text-slate-500 block mt-0.5">fallback: {agent.model.fallback.split('/').pop()}</span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <h4 className="text-[10px] text-slate-500 mb-2">Execution Config</h4>
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span>Temperature: {agent.execution.temperature}</span>
              <span>Max Tokens: {agent.execution.maxTokens}</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Bound Skills</h4>
            {agent.skills.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No skills configured</p>
            ) : (
              <div className="space-y-1.5">
                {agent.skills.map((s) => (
                  <div key={s.skillId} className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs ${s.enabled ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-slate-800/30 border border-slate-700/30 opacity-50'}`}>
                    <Sparkles className="w-3 h-3" />
                    <span className={s.enabled ? 'text-slate-300' : 'text-slate-500'}>{s.skillId}</span>
                    {!s.enabled && <span className="text-slate-600">(disabled)</span>}
                    {s.hasConfig && <Badge className="bg-purple-500/20 text-purple-300 text-[8px] h-3 px-1">configured</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Bound Tools</h4>
            {agent.tools.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No tools configured</p>
            ) : (
              <div className="space-y-1.5">
                {agent.tools.map((t) => (
                  <div key={t.toolId} className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs ${t.enabled ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/30 border border-slate-700/30 opacity-50'}`}>
                    <Wrench className="w-3 h-3" />
                    <span className={t.enabled ? 'text-slate-300' : 'text-slate-500'}>{t.toolId}</span>
                    {!t.enabled && <span className="text-slate-600">(disabled)</span>}
                    <Badge className={`text-[8px] h-3 px-1 ml-auto ${t.requiredPermission === 'none' ? 'bg-slate-500/20 text-slate-400' : t.requiredPermission === 'read' ? 'bg-cyan-500/20 text-cyan-300' : t.requiredPermission === 'write' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                      {t.requiredPermission}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          {agent.hooks.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-slate-400 mb-2">Hooks</h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.hooks.map((h) => (
                  <Badge key={h} className="bg-slate-700/30 text-slate-400 text-[10px] h-5 px-2">{h}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Executions: {agent.executionCount}</span>
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Type: {agent.type}</span>
            </div>
          </div>
          {isHired && onFire && (
            <Button variant="destructive" size="sm" className="w-full" onClick={onFire}>
              <Trash2 className="w-3 h-3 mr-1.5" /> Fire Agent
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Hire Agent Dialog ────────────────────────────────────────

function HireAgentDialog({
  onHire,
  hiring,
}: {
  onHire: (role: string, task: string, capabilities: string[]) => void;
  hiring: boolean;
}) {
  const [role, setRole] = useState('');
  const [task, setTask] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) => prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]);
  };

  const handleSubmit = () => {
    if (!role.trim() || !task.trim() || capabilities.length === 0) return;
    onHire(role.trim(), task.trim(), capabilities);
    setRole('');
    setTask('');
    setCapabilities([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white h-7 text-[10px] px-2">
          <UserPlus className="w-3 h-3 mr-1" /> Hire
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f0f1a] border-slate-700/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-200 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" /> Hire a Temporary Agent
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-400 text-xs">Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., code_reviewer, data_analyst" className="mt-1 bg-slate-800/50 border-slate-700/50 text-slate-200 text-sm" />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Task Description</Label>
            <Textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="Describe what this agent should do..." className="mt-1 bg-slate-800/50 border-slate-700/50 text-slate-200 text-sm resize-none" rows={3} />
          </div>
          <div>
            <Label className="text-slate-400 text-xs">Capabilities</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CAPABILITY_OPTIONS.map((cap) => (
                <button key={cap} type="button" onClick={() => toggleCapability(cap)} className={`px-2 py-1 rounded-lg text-[11px] border transition-all ${capabilities.includes(cap) ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-slate-800/30 border-slate-700/30 text-slate-500 hover:border-slate-600'}`}>
                  {cap.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild><Button variant="ghost" size="sm" className="text-slate-400">Cancel</Button></DialogClose>
          <Button size="sm" onClick={handleSubmit} disabled={!role.trim() || !task.trim() || capabilities.length === 0 || hiring} className="bg-purple-600 hover:bg-purple-500 text-white">
            {hiring ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Hiring...</> : <><UserPlus className="w-3 h-3 mr-1.5" />Hire</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function Home() {
  const { breakpoint, isMobile, isTablet, isDesktop, isMobileOrTablet } = useResponsive();

  // ─── Data state ───
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [agents, setAgents] = useState<RuntimeAgent[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [delegatingAgentCount, setDelegatingAgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hiredAgents, setHiredAgents] = useState<HiredAgent[]>([]);
  const [hiring, setHiring] = useState(false);
  const [detailAgent, setDetailAgent] = useState<RuntimeAgent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [browserOpOpen, setBrowserOpOpen] = useState(false);
  const [ecosystemOpen, setEcosystemOpen] = useState(false);

  const orchestrator = agents.find((a) => a.role === 'orchestrator') || null;
  const hiredAgentIds = new Set(hiredAgents.map((h) => h.id));

  // ─── Pixel Office State ───
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  const [officeState] = useState(() => {
    const os = new OfficeState(DEFAULT_AGENT_OS_LAYOUT);
    os.setZoneDestinations(ZONE_DESTINATIONS);
    os.setZoneLabels(ZONE_LABELS);
    return os;
  });

  // ─── Office data hooks ───
  const { state: officeData, loading: officeLoading, error: officeError, refetch: refetchOffice } = useOfficeData(workspaceId, 5000);
  const { newEvents, clearNewEvents } = useEventStream(workspaceId, 4000);

  // ─── Load assets on mount ───
  useEffect(() => {
    let mounted = true;
    loadAllAssets().then((success) => {
      if (mounted && success) {
        setAssetsLoaded(true);
        const layout = DEFAULT_AGENT_OS_LAYOUT;
        officeState.rebuildFromLayout(layout);
        officeState.setZoneDestinations(ZONE_DESTINATIONS);
        officeState.setZoneLabels(ZONE_LABELS);
      }
    });
    return () => { mounted = false; };
  }, [officeState]);

  // ─── Sync office agents from office data ───
  useEffect(() => {
    if (!officeData?.agents) return;
    const currentAgentIds = new Set(officeData.agents.map((a) => a.id));

    for (const agent of officeData.agents) {
      const numericId = hashAgentId(agent.id);
      if (!officeState.characters.has(numericId)) {
        const status = agent.runtimeState?.status ?? agent.status;
        const preferredSeatId = ROLE_SEAT_MAP[agent.role];
        officeState.addAgent(numericId, undefined, undefined, preferredSeatId);
        const ch = officeState.characters.get(numericId);
        if (ch) {
          ch.name = agent.name || agent.role;
          ch.role = agent.role;
        }
        officeState.setAgentActive(numericId, mapAgentStatusToActive(status));
        officeState.setAgentTool(numericId, mapAgentStatusToTool(status));
        const behavior = mapAgentStatusToBehavior(status);
        if (behavior !== BehaviorState.WORKING) {
          officeState.setAgentBehavior(numericId, behavior);
        }
        const bubble = mapAgentStatusToBubble(status);
        if (bubble === 'permission') officeState.showPermissionBubble(numericId);
        else if (bubble === 'waiting') officeState.showWaitingBubble(numericId);
      } else {
        const status = agent.runtimeState?.status ?? agent.status;
        const ch = officeState.characters.get(numericId);
        if (ch) {
          const isActive = mapAgentStatusToActive(status);
          if (ch.isActive !== isActive) officeState.setAgentActive(numericId, isActive);
          officeState.setAgentTool(numericId, mapAgentStatusToTool(status));
          officeState.setAgentStatus(numericId, status);
          ch.name = agent.name || agent.role;
          ch.role = agent.role;
          const bubble = mapAgentStatusToBubble(status);
          if (bubble === 'permission' && ch.bubbleType !== 'permission') officeState.showPermissionBubble(numericId);
          else if (bubble === 'waiting' && ch.bubbleType !== 'waiting') officeState.showWaitingBubble(numericId);
          else if (!bubble && ch.bubbleType && ch.bubbleType !== 'done') officeState.dismissBubble(numericId);
        }
      }
    }
    for (const [id] of officeState.characters) {
      const idStr = unhashAgentId(id);
      if (idStr && !currentAgentIds.has(idStr)) officeState.removeAgent(id);
    }
  }, [officeData?.agents, officeState]);

  // ─── Handle event-driven visual reactions ───
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
              officeState.setAgentBehavior(numericId, mapAgentStatusToBehavior(newStatus));
            }
            break;
          case 'task.assigned':
          case 'task.started':
            officeState.setAgentBehavior(numericId, BehaviorState.WORKING);
            break;
          case 'task.completed':
            officeState.showDoneBubble(numericId);
            officeState.setAgentBehavior(numericId, BehaviorState.IDLE, 5);
            break;
          case 'task.failed':
            officeState.setAgentBehavior(numericId, BehaviorState.IDLE, 5);
            break;
          case 'tool.execution_started':
            officeState.setAgentBehavior(numericId, BehaviorState.WORKING);
            officeState.setAgentTool(numericId, event.payload?.toolKey as string || 'Write');
            break;
          case 'tool.execution_succeeded':
          case 'tool.execution_failed':
            officeState.setAgentTool(numericId, null);
            break;
          case 'approval.requested':
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

  // ─── Fetch runtime data ───

  const fetchRuntimeStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/runtime/status');
      if (!res.ok) throw new Error('Failed');
      const data: RuntimeStatus = await res.json();
      setRuntimeStatus(data);
      setAgents(data.agents);
      return data;
    } catch (err) {
      console.error('Failed to fetch runtime status:', err);
      return null;
    }
  }, []);

  const fetchAIStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/status');
      if (!res.ok) throw new Error('Failed');
      const data: AIStatus = await res.json();
      setAIStatus(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
      return null;
    }
  }, []);

  const fetchHiredAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/orchestrator/hire');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setHiredAgents(data.agents || []);
    } catch (err) {
      console.error('Failed to fetch hired agents:', err);
    }
  }, []);

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch('/api/seed');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.initialized) {
        // Get workspace from status - we need the actual workspace ID
        const agentsRes = await fetch('/api/agents?limit=1');
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          if (agentsData.agents?.length > 0) {
            setWorkspaceId(agentsData.agents[0].workspaceId);
            return;
          }
        }
      }
      // Not initialized yet — auto-seed on first load
      const seedRes = await fetch('/api/seed', { method: 'POST' });
      if (seedRes.ok) {
        const seedData = await seedRes.json();
        setWorkspaceId(seedData.workspace?.id ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch workspace:', err);
    }
  }, []);

  const seedSystem = useCallback(async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceId(data.workspace?.id);
        await refreshAll();
      }
    } catch (err) {
      console.error('Failed to seed system:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRuntimeStatus(), fetchAIStatus(), fetchHiredAgents()]);
    setRefreshing(false);
  }, [fetchRuntimeStatus, fetchAIStatus, fetchHiredAgents]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchWorkspace();
      await Promise.all([fetchRuntimeStatus(), fetchAIStatus(), fetchHiredAgents()]);
      setLoading(false);
    };
    init();
  }, [fetchRuntimeStatus, fetchAIStatus, fetchHiredAgents, fetchWorkspace]);

  // Auto-refresh agent statuses every 8 seconds
  useEffect(() => {
    const interval = setInterval(fetchRuntimeStatus, 8000);
    return () => clearInterval(interval);
  }, [fetchRuntimeStatus]);

  // ─── Chat Handler ───

  const handleSendMessage = useCallback(
    async (message: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setChatLoading(true);
      setDelegatingAgentCount(0);

      try {
        const history = messages
          .filter((m) => !m.error)
          .map((m) => ({ role: m.role === 'delegation' ? 'assistant' as const : m.role, content: m.content }));

        const res = await fetch('/api/orchestrator/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history, mode: 'auto' }),
        });

        const data: OrchestratorChatResponse = await res.json();

        if (data.delegatedTasks && data.delegatedTasks.length > 0) {
          setDelegatingAgentCount(data.delegatedTasks.length);
          const delegationMsg: ChatMessage = {
            id: `delegation-${Date.now()}`,
            role: 'delegation',
            content: '',
            delegatedTasks: data.delegatedTasks,
            totalDurationMs: data.totalDurationMs,
            timestamp: Date.now(),
          };
          const orchestratorMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: data.orchestratorResponse || 'Task completed.',
            model: data.modelUsed,
            usage: data.usage,
            durationMs: data.totalDurationMs,
            timestamp: Date.now(),
            error: !res.ok,
          };
          setMessages((prev) => [...prev, delegationMsg, orchestratorMsg]);
        } else {
          const assistantMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: data.orchestratorResponse || (data as unknown as Record<string, unknown>).error as string || 'No response',
            model: data.modelUsed,
            usage: data.usage,
            durationMs: data.totalDurationMs,
            timestamp: Date.now(),
            error: !res.ok,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Failed to get response',
          timestamp: Date.now(),
          error: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setChatLoading(false);
        setDelegatingAgentCount(0);
        fetchRuntimeStatus();
      }
    },
    [messages, fetchRuntimeStatus],
  );

  // ─── Hire Handler ───

  const handleHireAgent = useCallback(
    async (role: string, task: string, capabilities: string[]) => {
      setHiring(true);
      try {
        const res = await fetch('/api/orchestrator/hire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, task, capabilities }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const systemMsg: ChatMessage = {
            id: `hire-${Date.now()}`,
            role: 'assistant',
            content: `🆕 Hired **${data.agentName}** as ${data.role}. Assigned skills: ${data.assignedSkills.join(', ') || 'none'}. Assigned tools: ${data.assignedTools.join(', ') || 'none'}. Model: ${data.model.split('/').pop()}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, systemMsg]);
          await Promise.all([fetchRuntimeStatus(), fetchHiredAgents()]);
        }
      } catch (error) {
        console.error('Failed to hire agent:', error);
      } finally {
        setHiring(false);
      }
    },
    [fetchRuntimeStatus, fetchHiredAgents],
  );

  // ─── Fire Handler ───

  const handleFireAgent = useCallback(
    async (agentId: string) => {
      try {
        const res = await fetch(`/api/orchestrator/hire/${agentId}`, { method: 'DELETE' });
        if (res.ok) {
          setDetailOpen(false);
          setDetailAgent(null);
          const fireMsg: ChatMessage = {
            id: `fire-${Date.now()}`,
            role: 'assistant',
            content: `🗑️ Agent **${agentId}** has been fired.`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, fireMsg]);
          await Promise.all([fetchRuntimeStatus(), fetchHiredAgents()]);
        }
      } catch (error) {
        console.error('Failed to fire agent:', error);
      }
    },
    [fetchRuntimeStatus, fetchHiredAgents],
  );

  // ─── Agent Click from pixel office ───

  const handlePixelAgentClick = useCallback((numericId: number) => {
    // Find the runtime agent matching this pixel agent
    const agentIdStr = unhashAgentId(numericId);
    if (agentIdStr) {
      const agent = agents.find((a) => a.id === agentIdStr);
      if (agent) {
        setDetailAgent(agent);
        setDetailOpen(true);
      }
    }
  }, [agents]);

  // ─── Stats ───
  const totalSkills = runtimeStatus?.skills.totalSkills ?? 0;
  const totalTools = runtimeStatus?.tools.totalTools ?? 0;
  const totalAgents = agents.length;
  const activeAgentCount = agents.filter(a => a.status !== 'offline').length;

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Crown className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-slate-300 mb-1">Loading Agent OS</h2>
          <p className="text-sm text-slate-500">Initializing pixel office...</p>
        </div>
      </div>
    );
  }

  // ─── No workspace — show seed prompt ───
  if (!workspaceId || agents.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">🏢</div>
          <h2 className="text-2xl font-bold text-white">Welcome to Agent OS</h2>
          <p className="text-sm text-slate-400">
            Initialize your workspace to see the Pixel Agent Office with 11 AI specialists.
          </p>
          <Button onClick={seedSystem} size="lg" className="bg-violet-600 hover:bg-violet-700">
            🚀 Initialize System
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main Render ───

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#1a1a2e]">
      {/* ─── Minimal Top Bar ─── */}
      <div className="flex items-center justify-between px-2 md:px-3 py-1.5 bg-black/60 backdrop-blur-md border-b border-white/10 z-30 flex-shrink-0">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-violet-400" />
          <h1 className="text-xs md:text-sm font-bold text-white">Agent OS</h1>
          <Badge variant="outline" className="text-[8px] md:text-[9px] h-3.5 md:h-4 px-1 md:px-1.5 border-white/20 text-slate-300">
            Pixel Office
          </Badge>
          <span className="text-[8px] md:text-[9px] text-slate-400 ml-0.5 md:ml-1">
            {activeAgentCount}/{totalAgents} active
          </span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20 text-[9px] h-4 px-1.5 hidden sm:inline-flex">
            <Crown className="w-2 h-2 mr-0.5" />{totalAgents}
          </Badge>
          <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/20 text-[9px] h-4 px-1.5 hidden sm:inline-flex">
            <Sparkles className="w-2 h-2 mr-0.5" />{totalSkills}
          </Badge>
          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20 text-[9px] h-4 px-1.5 hidden sm:inline-flex">
            <Wrench className="w-2 h-2 mr-0.5" />{totalTools}
          </Badge>
          {aiStatus && (
            <Badge className={`text-[9px] h-4 px-1.5 ${aiStatus.configured ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-0.5 ${aiStatus.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {aiStatus.configured ? 'AI' : 'No AI'}
            </Badge>
          )}
          <HireAgentDialog onHire={handleHireAgent} hiring={hiring} />
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-white" onClick={refreshAll} disabled={refreshing}>
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ─── Main Content: Pixel Office + Chat Panel ─── */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Pixel Office Canvas — Full width, always visible */}
        <div className="flex-1 min-h-0 min-w-0 relative pixel-office-container">
          <PixelOfficeCanvas
            officeState={officeState}
            onAgentClick={handlePixelAgentClick}
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

          {/* ─── Mobile/Tablet: Floating Chat Toggle FAB ─── */}
          {isMobileOrTablet && (
            <button
              onClick={() => setChatSheetOpen(true)}
              className="absolute bottom-3 right-3 z-10 w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white shadow-lg shadow-purple-900/40 flex items-center justify-center transition-colors touch-manipulation"
              aria-label="Open chat"
            >
              <MessageSquare className="w-5 h-5" />
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">
                  {messages.length > 9 ? '9+' : messages.length}
                </span>
              )}
            </button>
          )}


        </div>

        {/* ─── Desktop: Inline Chat Panel ─── */}
        {isDesktop && (
          <AnimatePresence>
            {chatPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative border-l border-slate-700/30 flex-shrink-0 overflow-hidden"
              >
                <OrchestratorChatPanel
                  messages={messages}
                  onSend={handleSendMessage}
                  loading={chatLoading}
                  configured={aiStatus?.configured ?? false}
                  orchestrator={orchestrator}
                  delegatingAgentCount={delegatingAgentCount}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ─── Mobile/Tablet: Chat Sheet (slide-up drawer) ─── */}
      {isMobileOrTablet && (
        <Sheet open={chatSheetOpen} onOpenChange={setChatSheetOpen}>
          <SheetContent
            side={isMobile ? 'bottom' : 'right'}
            className={`bg-[#12122a] border-slate-700/50 p-0 ${isMobile ? 'h-[85vh] rounded-t-xl' : 'w-[400px]'}`}
          >
            <SheetHeader className="px-3 py-2 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2 text-slate-200 text-sm">
                  <span className="text-lg">👑</span>
                  <span>Orchestrator Chat</span>
                </SheetTitle>
                <button
                  onClick={() => setChatSheetOpen(false)}
                  className="w-7 h-7 rounded-md bg-slate-800/60 text-slate-400 hover:text-white flex items-center justify-center"
                  aria-label="Close chat"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-hidden" style={{ height: isMobile ? 'calc(85vh - 52px)' : 'calc(100vh - 52px)' }}>
              <OrchestratorChatPanel
                messages={messages}
                onSend={handleSendMessage}
                loading={chatLoading}
                configured={aiStatus?.configured ?? false}
                orchestrator={orchestrator}
                delegatingAgentCount={delegatingAgentCount}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ─── Bottom Floating Bar ─── */}
      <div className="flex-shrink-0 bg-black/60 backdrop-blur-md border-t border-white/10 z-30">
        <div className="flex items-center justify-between px-2 md:px-3 py-1.5">
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Desktop: Toggle chat panel inline */}
            {isDesktop && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 text-[10px] gap-1 ${chatPanelOpen ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setChatPanelOpen(!chatPanelOpen)}
              >
                {chatPanelOpen ? <PanelLeftClose className="w-3 h-3" /> : <PanelLeftOpen className="w-3 h-3" />}
                <span>{chatPanelOpen ? 'Hide Chat' : 'Show Chat'}</span>
              </Button>
            )}
            {/* Mobile/Tablet: Toggle chat sheet */}
            {isMobileOrTablet && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1 text-purple-300 hover:text-purple-200"
                onClick={() => setChatSheetOpen(true)}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Chat{messages.length > 0 && ` (${messages.length})`}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBrowserOpOpen(true)}
              className="text-slate-400 hover:text-slate-200 gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[10px]">Browser Op</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEcosystemOpen(true)}
              className="text-emerald-400 hover:text-emerald-200 gap-1"
            >
              <Sparkle className="w-3.5 h-3.5" />
              <span className="text-[10px]">Ecosystem</span>
            </Button>
            <Separator orientation="vertical" className="h-4 bg-slate-700/50" />
            {/* Quick agent count — compact on mobile */}
            <div className="flex items-center gap-1 md:gap-1.5 text-[10px] text-slate-500">
              <span className="flex items-center gap-0.5"><Crown className="w-2.5 h-2.5 text-purple-400" />{totalAgents}</span>
              <span className="hidden sm:inline">agents</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline-flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5 text-rose-400" />{totalSkills} skills</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline-flex items-center gap-0.5"><Wrench className="w-2.5 h-2.5 text-amber-400" />{totalTools} tools</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-slate-700/30 text-slate-400 text-[8px] h-4 px-1.5 border border-slate-600/30">
              <MessageSquare className="w-2 h-2 mr-0.5" />
              {messages.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* ─── Agent Detail Sheet ─── */}
      <AgentDetailSheet
        agent={detailAgent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isHired={detailAgent ? hiredAgentIds.has(detailAgent.id) : false}
        onFire={detailAgent ? () => handleFireAgent(detailAgent.id) : undefined}
      />

      {/* ─── Browser Operator Panel ─── */}
      <BrowserOperatorPanel open={browserOpOpen} onOpenChange={setBrowserOpOpen} />

      {/* ─── Ecosystem Panel ─── */}
      <EcosystemPanel open={ecosystemOpen} onOpenChange={setEcosystemOpen} />
    </div>
  );
}
