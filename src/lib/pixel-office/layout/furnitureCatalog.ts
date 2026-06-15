/**
 * Furniture catalog system for the pixel-office engine.
 *
 * Provides a dynamic catalog built from loaded assets (when available),
 * plus a hardcoded fallback catalog with built-in furniture entries.
 * Supports rotation groups, state groups (on/off), animation groups,
 * and mirrorSide variants.
 *
 * Ported from pixel-agents/webview-ui/src/office/layout/furnitureCatalog.ts
 */

import type { FurnitureCatalogEntry, SpriteData } from '../types';
import { loggers } from '@/lib/logger';

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

export interface LoadedAssetData {
  catalog: Array<{
    id: string;
    label: string;
    category: string;
    width: number;
    height: number;
    footprintW: number;
    footprintH: number;
    isDesk: boolean;
    groupId?: string;
    orientation?: string; // 'front' | 'back' | 'left' | 'right' | 'side'
    state?: string; // 'on' | 'off'
    canPlaceOnSurfaces?: boolean;
    backgroundTiles?: number;
    canPlaceOnWalls?: boolean;
    mirrorSide?: boolean;
    rotationScheme?: string;
    animationGroup?: string;
    frame?: number;
  }>;
  sprites: Record<string, SpriteData>;
}

export type FurnitureCategory =
  | 'desks'
  | 'chairs'
  | 'storage'
  | 'decor'
  | 'electronics'
  | 'wall'
  | 'misc';

/** @internal */
export interface CatalogEntryWithCategory extends FurnitureCatalogEntry {
  category: FurnitureCategory;
}

// ════════════════════════════════════════════════════════════════
// Category definitions
// ════════════════════════════════════════════════════════════════

export const FURNITURE_CATEGORIES: Array<{ id: FurnitureCategory; label: string }> = [
  { id: 'desks', label: 'Desks' },
  { id: 'chairs', label: 'Chairs' },
  { id: 'storage', label: 'Storage' },
  { id: 'electronics', label: 'Tech' },
  { id: 'decor', label: 'Decor' },
  { id: 'wall', label: 'Wall' },
  { id: 'misc', label: 'Misc' },
];

// ════════════════════════════════════════════════════════════════
// Rotation / state / animation groups
// ════════════════════════════════════════════════════════════════

interface RotationGroup {
  /** Ordered list of orientations available for this group */
  orientations: string[];
  /** Maps orientation → asset ID (for the default/off state) */
  members: Record<string, string>;
}

// Maps any member asset ID → its rotation group
const rotationGroups = new Map<string, RotationGroup>();

// Maps asset ID → its on/off counterpart (symmetric for toggle)
const stateGroups = new Map<string, string>();
// Directional maps for getOnStateType / getOffStateType
const offToOn = new Map<string, string>(); // off asset → on asset
const onToOff = new Map<string, string>(); // on asset → off asset

// Maps animation group ID → ordered list of asset IDs by frame index
const animationGroups = new Map<string, string[]>();

// Internal catalog (includes all variants for getCatalogEntry lookups)
let internalCatalog: CatalogEntryWithCategory[] | null = null;

// Dynamic catalog built from loaded assets (when available)
// Only includes "front" variants for grouped items (shown in editor palette)
let dynamicCatalog: CatalogEntryWithCategory[] | null = null;
let dynamicCategories: FurnitureCategory[] | null = null;

// ════════════════════════════════════════════════════════════════
// Hardcoded fallback furniture sprites
// ════════════════════════════════════════════════════════════════
// Used when no dynamic assets are loaded from PNG files.

const _ = ''; // transparent

// ── DESK_FRONT: 3 tiles wide, 2 tiles tall (48×32 px) ─────────
// Top rows are background (tabletop visible above footprint), bottom rows are solid (legs block walking)
const DESK_FRONT_SPRITE: SpriteData = [
  // Row 0-7: Table top surface (background — visible but walkable)
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,'#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914',_,_,_],
  [_,_,_,_,'#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828',_,_,_],
  [_,_,_,_,'#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914',_,_,_],
  // Row 6-7: Table edge
  [_,_,_,_,'#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010',_,_,_],
  // Row 8-15: Legs and front panel (solid — blocks walking)
  [_,_,_,_,'#6B5010',_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,'#6B5010',_,_,_],
  [_,_,_,_,'#6B5010',_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,'#6B5010',_,_,_],
  [_,_,_,_,'#6B5010',_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,'#6B5010',_,_,_],
  [_,_,_,_,'#6B5010',_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,'#6B5010',_,_,_],
  [_,_,_,_,'#6B5010',_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,'#6B5010',_,_,_],
  [_,_,_,_,'#6B5010','#6B5010',_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,'#6B5010','#6B5010',_,_,_],
  [_,_,_,_,'#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010','#6B5010',_,_,_],
  [_,_,_,_,'#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010','#5A4010',_,_,_],
];

// ── WOODEN_CHAIR_FRONT: 1×1 (16×16 px) ──────────────────────
const WOODEN_CHAIR_FRONT_SPRITE: SpriteData = [
  [_,_,_,_,_,'#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,'#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914',_,_,_,_],
  [_,_,_,_,'#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828','#A07828',_,_,_,_],
  [_,_,_,_,'#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914',_,_,_,_],
  [_,_,_,_,'#8B6914',_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,'#8B6914',_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_],
  [_,_,_,_,'#6B5010',_,_,_,_,'#6B5010',_,_,_,_,_],
  [_,_,_,_,'#6B5010',_,_,_,_,'#6B5010',_,_,_,_,_],
  [_,_,_,_,'#5A4010',_,_,_,_,'#5A4010',_,_,_,_,_],
  [_,_,_,_,'#5A4010',_,_,_,_,'#5A4010',_,_,_,_,_],
];

// ── WOODEN_CHAIR_SIDE: 1×1 (16×16 px) ───────────────────────
const WOODEN_CHAIR_SIDE_SPRITE: SpriteData = [
  [_,_,_,_,_,_,_,'#8B6914','#8B6914','#8B6914','#8B6914',_,_,_,_,_],
  [_,_,_,_,_,_,_,'#8B6914',_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,_,_,'#8B6914',_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,_,_,'#8B6914',_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,_,_,'#8B6914',_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#8B6914','#8B6914','#8B6914','#8B6914','#8B6914',_,_,_,_,_,_],
  [_,_,_,_,_,'#A07828','#A07828','#A07828','#A07828','#A07828',_,_,_,_,_,_],
  [_,_,_,_,_,'#8B6914','#8B6914','#8B6914','#8B6914','#8B6914',_,_,_,_,_,_],
  [_,_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#8B6914',_,_,_,_,'#8B6914',_,_,_,_,_],
  [_,_,_,_,_,'#6B5010',_,_,_,_,'#6B5010',_,_,_,_,_],
  [_,_,_,_,_,'#6B5010',_,_,_,_,'#6B5010',_,_,_,_,_],
  [_,_,_,_,_,'#5A4010',_,_,_,_,'#5A4010',_,_,_,_,_],
  [_,_,_,_,_,'#5A4010',_,_,_,_,'#5A4010',_,_,_,_,_],
];

// ── PC_FRONT_OFF: 1×2 (16×32 px) — monitor off ──────────────
const PC_FRONT_OFF_SPRITE: SpriteData = [
  [_,_,_,_,_,_,'#404040','#404040','#404040','#404040','#404040',_,_,_,_,_],
  [_,_,_,_,'#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050',_,_,_,_],
  [_,_,_,'#505050','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#333333','#333333','#2A2A2A','#2A2A2A','#2A2A2A','#2A2A2A','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#333333','#333333','#2A2A2A','#2A2A2A','#2A2A2A','#2A2A2A','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#333333','#333333','#2A2A2A','#2A2A2A','#2A2A2A','#2A2A2A','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#333333','#333333','#2A2A2A','#2A2A2A','#2A2A2A','#2A2A2A','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#333333','#505050',_,_,_],
  [_,_,_,'#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050',_,_,_],
  [_,_,_,_,'#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050',_,_,_,_],
  [_,_,_,_,_,_,_,'#505050','#505050','#505050','#505050',_,_,_,_,_],
  [_,_,_,_,_,_,_,'#404040','#404040','#404040','#404040',_,_,_,_,_],
  // Stand/base
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
];

// ── PC_FRONT_ON: 1×2 (16×32 px) — monitor on (glowing) ──────
const PC_FRONT_ON_SPRITE: SpriteData = [
  [_,_,_,_,_,_,'#404040','#404040','#404040','#404040','#404040',_,_,_,_,_],
  [_,_,_,_,'#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050',_,_,_,_],
  [_,_,_,'#505050','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#505050',_,_,_],
  [_,_,_,'#505050','#2244AA','#2244AA','#2244AA','#2244AA','#2244AA','#2244AA','#2244AA','#2244AA','#2244AA','#505050',_,_,_],
  [_,_,_,'#505050','#2244AA','#2244AA','#3366CC','#3366CC','#3366CC','#3366CC','#2244AA','#2244AA','#2244AA','#505050',_,_,_],
  [_,_,_,'#505050','#2244AA','#2244AA','#3366CC','#44AAEE','#44AAEE','#44AAEE','#3366CC','#2244AA','#2244AA','#505050',_,_,_],
  [_,_,_,'#505050','#2244AA','#2244AA','#3366CC','#44AAEE','#66CCFF','#66CCFF','#44AAEE','#3366CC','#2244AA','#505050',_,_,_],
  [_,_,_,'#505050','#2244AA','#2244AA','#3366CC','#44AAEE','#66CCFF','#66CCFF','#44AAEE','#3366CC','#2244AA','#505050',_,_,_],
  [_,_,_,'#505050','#2244AA','#2244AA','#3366CC','#44AAEE','#44AAEE','#44AAEE','#3366CC','#2244AA','#2244AA','#505050',_,_,_],
  [_,_,_,'#505050','#2244AA','#2244AA','#2244AA','#3366CC','#3366CC','#3366CC','#3366CC','#2244AA','#2244AA','#505050',_,_,_],
  [_,_,_,'#505050','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#1A3A5C','#505050',_,_,_],
  [_,_,_,'#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050',_,_,_],
  [_,_,_,_,'#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050','#505050',_,_,_,_],
  [_,_,_,_,_,_,_,'#505050','#505050','#505050','#505050',_,_,_,_,_],
  [_,_,_,_,_,_,_,'#404040','#404040','#404040','#404040',_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
];

// ── BOOKSHELF: 1×2 (16×32 px) ───────────────────────────────
const BOOKSHELF_SPRITE: SpriteData = [
  [_,_,'#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A',_,_],
  [_,'#6B3A1A','#CC3333','#CC3333','#3366CC','#3366CC','#33AA33','#33AA33','#CC8833','#CC8833','#AA33AA','#AA33AA','#3366CC','#3366CC','#6B3A1A',_],
  [_,'#6B3A1A','#CC3333','#CC3333','#3366CC','#3366CC','#33AA33','#33AA33','#CC8833','#CC8833','#AA33AA','#AA33AA','#3366CC','#3366CC','#6B3A1A',_],
  [_,'#6B3A1A','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#6B3A1A',_],
  [_,'#6B3A1A','#DDAA33','#DDAA33','#6644CC','#6644CC','#44BB66','#44BB66','#DD7733','#DD7733','#CC44CC','#CC44CC','#6644CC','#6644CC','#6B3A1A',_],
  [_,'#6B3A1A','#DDAA33','#DDAA33','#6644CC','#6644CC','#44BB66','#44BB66','#DD7733','#DD7733','#CC44CC','#CC44CC','#6644CC','#6644CC','#6B3A1A',_],
  [_,'#6B3A1A','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#6B3A1A',_],
  [_,'#6B3A1A','#336699','#336699','#CC4444','#CC4444','#339933','#339933','#BB7722','#BB7722','#993399','#993399','#CC4444','#CC4444','#6B3A1A',_],
  [_,'#6B3A1A','#336699','#336699','#CC4444','#CC4444','#339933','#339933','#BB7722','#BB7722','#993399','#993399','#CC4444','#CC4444','#6B3A1A',_],
  [_,'#6B3A1A','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#6B3A1A',_],
  [_,'#6B3A1A','#2288AA','#2288AA','#BB3333','#BB3333','#228844','#228844','#AA6611','#AA6611','#882288','#882288','#BB3333','#BB3333','#6B3A1A',_],
  [_,'#6B3A1A','#2288AA','#2288AA','#BB3333','#BB3333','#228844','#228844','#AA6611','#AA6611','#882288','#882288','#BB3333','#BB3333','#6B3A1A',_],
  [_,'#6B3A1A','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#8B6914','#6B3A1A',_],
  [_,'#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A',_],
  [_,_,'#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A',_,_],
  [_,_,_,_,'#6B3A1A','#6B3A1A',_,_,_,_,'#6B3A1A','#6B3A1A',_,_,_,_],
  [_,_,_,_,'#6B3A1A','#6B3A1A',_,_,_,_,'#6B3A1A','#6B3A1A',_,_,_,_],
  [_,_,_,_,'#5A2A10','#5A2A10',_,_,_,_,'#5A2A10','#5A2A10',_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
];

// ── PLANT: 1×1 (16×16 px) ───────────────────────────────────
const PLANT_SPRITE: SpriteData = [
  [_,_,_,_,_,_,'#2D8A2D','#2D8A2D',_,_,_,_,_,_,_,_],
  [_,_,_,_,_,'#33AA33','#2D8A2D','#2D8A2D','#33AA33',_,_,_,_,_,_,_],
  [_,_,_,_,'#33AA33','#2D8A2D','#2D8A2D','#2D8A2D','#2D8A2D','#33AA33',_,_,_,_,_,_],
  [_,_,_,_,'#33AA33','#2D8A2D','#228822','#2D8A2D','#2D8A2D','#33AA33',_,_,_,_,_,_],
  [_,_,_,'#33AA33','#2D8A2D','#228822','#228822','#228822','#2D8A2D','#33AA33',_,_,_,_,_],
  [_,_,_,'#33AA33','#2D8A2D','#228822','#228822','#228822','#2D8A2D','#33AA33',_,_,_,_,_],
  [_,_,_,_,'#33AA33','#2D8A2D','#2D8A2D','#2D8A2D','#33AA33',_,_,_,_,_,_,_],
  [_,_,_,_,_,'#33AA33','#2D8A2D','#33AA33',_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,'#8B5A2B',_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,'#8B5A2B','#8B5A2B','#8B5A2B',_,_,_,_,_,_,_],
  [_,_,_,_,_,'#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B',_,_,_,_,_,_],
  [_,_,_,_,'#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B',_,_,_,_,_],
  [_,_,_,_,'#704820','#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B','#704820',_,_,_,_,_],
  [_,_,_,_,'#704820','#704820','#704820','#704820','#704820','#704820',_,_,_,_,_],
  [_,_,_,_,_,'#5A3A18','#5A3A18','#5A3A18','#5A3A18','#5A3A18',_,_,_,_,_,_],
  [_,_,_,_,_,_,'#5A3A18','#5A3A18','#5A3A18',_,_,_,_,_,_,_],
];

// ── WHITEBOARD: 2×1 (32×16 px) ──────────────────────────────
const WHITEBOARD_SPRITE: SpriteData = [
  [_,_,'#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888',_,_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#DDDDDD','#DDDDDD','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#DDDDDD','#DDDDDD','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#DDDDDD','#DDDDDD','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#DDDDDD','#DDDDDD','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#DDDDDD','#DDDDDD','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#DDDDDD','#DDDDDD','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#DDDDDD','#DDDDDD','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#DDDDDD','#DDDDDD','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_,'#888888','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE','#888888',_],
  [_, '#888888','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#CCCCCC','#888888',_],
  [_,_,'#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888',_,_],
  [_,_,_,_,'#888888','#888888',_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,'#888888','#888888',_,_],
];

// ── COFFEE: 1×1 (16×16 px) ──────────────────────────────────
const COFFEE_SPRITE: SpriteData = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,'#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF',_,_,_,_,_,_],
  [_,_,_,_,'#FFFFFF','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#FFFFFF',_,_,_,_,_],
  [_,_,_,_,'#FFFFFF','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#FFFFFF','#EEEEEE',_,_,_,_],
  [_,_,_,_,'#FFFFFF','#6B3A1A','#6B3A1A','#6B3A1A','#6B3A1A','#FFFFFF','#EEEEEE',_,_,_,_],
  [_,_,_,_,'#EEEEEE','#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF','#EEEEEE','#EEEEEE',_,_,_,_],
  [_,_,_,_,_,'#EEEEEE','#EEEEEE','#EEEEEE','#EEEEEE',_,_,_,_,_,_,_],
  [_,_,_,_,_,_,'#DDDDDD','#DDDDDD',_,_,_,_,_,_,_,_],
];

// ── CACTUS: 1×1 (16×16 px) ──────────────────────────────────
const CACTUS_SPRITE: SpriteData = [
  [_,_,_,_,_,_,_,_,'#33AA33',_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,'#33AA33','#228822','#33AA33',_,_,_,_,_,_],
  [_,_,_,_,_,_,_,'#228822','#228822','#228822',_,_,_,_,_,_],
  [_,_,_,_,'#33AA33',_,'#33AA33','#228822','#228822','#228822',_,_,_,_,_,_],
  [_,_,_,_,'#33AA33','#33AA33','#33AA33','#228822','#228822','#228822',_,_,_,_,_,_],
  [_,_,_,_,'#228822','#33AA33','#228822','#228822','#228822','#228822',_,_,_,_,_,_],
  [_,_,_,_,_,'#33AA33','#228822','#228822','#228822','#228822',_,_,_,_,_,_],
  [_,_,_,_,_,_,'#228822','#228822','#228822','#228822',_,_,_,_,_,_],
  [_,_,_,_,_,_,'#228822','#228822','#228822','#228822',_,_,_,_,_,_],
  [_,_,_,_,_,_,'#228822','#228822','#228822',_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,'#8B5A2B','#8B5A2B',_,_,_,_,_,_,_],
  [_,_,_,_,_,_,'#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B',_,_,_,_,_,_],
  [_,_,_,_,_,'#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B',_,_,_,_,_],
  [_,_,_,_,'#704820','#8B5A2B','#8B5A2B','#8B5A2B','#8B5A2B','#704820',_,_,_,_,_],
  [_,_,_,_,'#704820','#704820','#704820','#704820','#704820','#704820',_,_,_,_,_],
  [_,_,_,_,_,'#5A3A18','#5A3A18','#5A3A18','#5A3A18','#5A3A18',_,_,_,_,_],
];

// ── BIN: 1×1 (16×16 px) ─────────────────────────────────────
const BIN_SPRITE: SpriteData = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,'#888888','#888888','#888888','#888888','#888888','#888888','#888888','#888888',_,_,_,_],
  [_,_,_,_,'#888888','#666666','#666666','#666666','#666666','#666666','#666666','#888888',_,_,_,_],
  [_,_,_,_,'#888888','#666666','#666666','#666666','#666666','#666666','#666666','#888888',_,_,_,_],
  [_,_,_,_,'#888888','#666666','#666666','#666666','#666666','#666666','#666666','#888888',_,_,_,_],
  [_,_,_,_,'#888888','#666666','#666666','#666666','#666666','#666666','#666666','#888888',_,_,_,_],
  [_,_,_,_,'#888888','#666666','#666666','#666666','#666666','#666666','#666666','#888888',_,_,_,_],
  [_,_,_,_,'#777777','#777777','#777777','#777777','#777777','#777777','#777777','#777777',_,_,_,_],
  [_,_,_,_,_,'#777777','#777777','#777777','#777777','#777777','#777777',_,_,_,_,_],
];

// ════════════════════════════════════════════════════════════════
// Hardcoded fallback catalog
// ════════════════════════════════════════════════════════════════

function buildHardcodedCatalog(): CatalogEntryWithCategory[] {
  return [
    {
      type: 'DESK_FRONT',
      label: 'Desk',
      footprintW: 3,
      footprintH: 2,
      sprite: DESK_FRONT_SPRITE,
      isDesk: true,
      category: 'desks',
      backgroundTiles: 1,
    },
    {
      type: 'WOODEN_CHAIR_FRONT',
      label: 'Chair',
      footprintW: 1,
      footprintH: 1,
      sprite: WOODEN_CHAIR_FRONT_SPRITE,
      isDesk: false,
      category: 'chairs',
      orientation: 'front',
    },
    {
      type: 'WOODEN_CHAIR_SIDE',
      label: 'Chair (Side)',
      footprintW: 1,
      footprintH: 1,
      sprite: WOODEN_CHAIR_SIDE_SPRITE,
      isDesk: false,
      category: 'chairs',
      orientation: 'side',
      mirrorSide: true,
    },
    {
      type: 'PC_FRONT_OFF',
      label: 'PC (Off)',
      footprintW: 1,
      footprintH: 1,
      sprite: PC_FRONT_OFF_SPRITE,
      isDesk: false,
      category: 'electronics',
      canPlaceOnSurfaces: true,
      orientation: 'front',
    },
    {
      type: 'PC_FRONT_ON',
      label: 'PC (On)',
      footprintW: 1,
      footprintH: 1,
      sprite: PC_FRONT_ON_SPRITE,
      isDesk: false,
      category: 'electronics',
      canPlaceOnSurfaces: true,
      orientation: 'front',
    },
    {
      type: 'BOOKSHELF',
      label: 'Bookshelf',
      footprintW: 1,
      footprintH: 2,
      sprite: BOOKSHELF_SPRITE,
      isDesk: false,
      category: 'storage',
    },
    {
      type: 'PLANT',
      label: 'Plant',
      footprintW: 1,
      footprintH: 1,
      sprite: PLANT_SPRITE,
      isDesk: false,
      category: 'decor',
      canPlaceOnSurfaces: true,
    },
    {
      type: 'WHITEBOARD',
      label: 'Whiteboard',
      footprintW: 2,
      footprintH: 1,
      sprite: WHITEBOARD_SPRITE,
      isDesk: false,
      category: 'wall',
      canPlaceOnWalls: true,
    },
    {
      type: 'COFFEE',
      label: 'Coffee',
      footprintW: 1,
      footprintH: 1,
      sprite: COFFEE_SPRITE,
      isDesk: false,
      category: 'decor',
      canPlaceOnSurfaces: true,
    },
    {
      type: 'CACTUS',
      label: 'Cactus',
      footprintW: 1,
      footprintH: 1,
      sprite: CACTUS_SPRITE,
      isDesk: false,
      category: 'decor',
      canPlaceOnSurfaces: true,
    },
    {
      type: 'BIN',
      label: 'Bin',
      footprintW: 1,
      footprintH: 1,
      sprite: BIN_SPRITE,
      isDesk: false,
      category: 'misc',
    },
  ];
}

/** Get the built-in hardcoded catalog entries. Used when no dynamic assets are loaded. */
export function getHardcodedCatalog(): CatalogEntryWithCategory[] {
  return buildHardcodedCatalog();
}

// ════════════════════════════════════════════════════════════════
// Dynamic catalog builder
// ════════════════════════════════════════════════════════════════

/**
 * Build catalog from loaded assets. Returns true if successful.
 * Once built, all getCatalog* functions use the dynamic catalog.
 * Uses ONLY custom assets (excludes hardcoded furniture when assets are loaded).
 */
export function buildDynamicCatalog(assets: LoadedAssetData): boolean {
  if (!assets?.catalog || !assets?.sprites) return false;

  // Build all entries (including non-front variants)
  const allEntries = assets.catalog
    .map((asset) => {
      const sprite = assets.sprites[asset.id];
      if (!sprite) {
        loggers.pixel.warn(`No sprite data for asset ${asset.id}`);
        return null;
      }
      return {
        type: asset.id,
        label: asset.label,
        footprintW: asset.footprintW,
        footprintH: asset.footprintH,
        sprite,
        isDesk: asset.isDesk,
        category: asset.category as FurnitureCategory,
        ...(asset.orientation ? { orientation: asset.orientation } : {}),
        ...(asset.canPlaceOnSurfaces ? { canPlaceOnSurfaces: true } : {}),
        ...(asset.backgroundTiles ? { backgroundTiles: asset.backgroundTiles } : {}),
        ...(asset.canPlaceOnWalls ? { canPlaceOnWalls: true } : {}),
        ...(asset.mirrorSide ? { mirrorSide: true } : {}),
      };
    })
    .filter((e): e is CatalogEntryWithCategory => e !== null);

  // Create virtual ":left" entries for mirrorSide assets.
  for (const asset of assets.catalog) {
    if (asset.mirrorSide && asset.orientation === 'side') {
      const sideEntry = allEntries.find((e) => e.type === asset.id);
      if (sideEntry) {
        allEntries.push({
          ...sideEntry,
          type: `${asset.id}:left`,
          orientation: 'left',
          mirrorSide: true,
        });
      }
    }
  }

  if (allEntries.length === 0) return false;

  // Build rotation groups from groupId + orientation metadata
  rotationGroups.clear();
  stateGroups.clear();
  offToOn.clear();
  onToOff.clear();
  animationGroups.clear();

  // Phase 1: Collect orientations per group (only "off" or stateless variants for rotation)
  const groupMap = new Map<string, Map<string, string>>(); // groupId → (orientation → assetId)
  for (const asset of assets.catalog) {
    if (asset.groupId && asset.orientation) {
      // For rotation groups, only use the "off" or stateless variant
      if (asset.state && asset.state !== 'off') continue;
      let orientMap = groupMap.get(asset.groupId);
      if (!orientMap) {
        orientMap = new Map();
        groupMap.set(asset.groupId, orientMap);
      }

      if (asset.orientation === 'side') {
        orientMap.set('right', asset.id);
        if (asset.mirrorSide) {
          orientMap.set('left', `${asset.id}:left`);
        }
      } else {
        orientMap.set(asset.orientation, asset.id);
      }
    }
  }

  // Check rotationScheme from assets
  const rotationSchemes = new Map<string, string>(); // groupId → rotationScheme
  for (const asset of assets.catalog) {
    if (asset.groupId && asset.rotationScheme) {
      rotationSchemes.set(asset.groupId, asset.rotationScheme);
    }
  }

  // Phase 2: Register rotation groups with 2+ orientations
  const nonFrontIds = new Set<string>();
  const orientationOrder = ['front', 'right', 'back', 'left'];
  for (const [groupId, orientMap] of groupMap) {
    if (orientMap.size < 2) continue;
    const scheme = rotationSchemes.get(groupId);

    // For 2-way scheme, only use front and right (side)
    let allowedOrients = orientationOrder;
    if (scheme === '2-way') {
      allowedOrients = ['front', 'right'];
    }

    // Build ordered list of available orientations
    const orderedOrients = allowedOrients.filter((o) => orientMap.has(o));
    if (orderedOrients.length < 2) continue;
    const members: Record<string, string> = {};
    for (const o of orderedOrients) {
      members[o] = orientMap.get(o)!;
    }
    const rg: RotationGroup = { orientations: orderedOrients, members };
    // Register each unique asset ID in the rotation group
    const registeredIds = new Set<string>();
    for (const id of Object.values(members)) {
      if (!registeredIds.has(id)) {
        rotationGroups.set(id, rg);
        registeredIds.add(id);
      }
    }
    // Track non-front IDs to exclude from visible catalog
    for (const [orient, id] of Object.entries(members)) {
      if (orient !== 'front') nonFrontIds.add(id);
    }
  }

  // Phase 3: Build state groups (on ↔ off pairs within same groupId + orientation)
  const stateMap = new Map<string, Map<string, string>>(); // "groupId|orientation" → (state → assetId)
  for (const asset of assets.catalog) {
    if (asset.groupId && asset.state) {
      const key = `${asset.groupId}|${asset.orientation || ''}`;
      let sm = stateMap.get(key);
      if (!sm) {
        sm = new Map();
        stateMap.set(key, sm);
      }
      // For animation groups, use the first frame as the "on" representative
      if (asset.animationGroup && asset.frame !== undefined && asset.frame > 0) continue;
      sm.set(asset.state, asset.id);
    }
  }
  for (const sm of stateMap.values()) {
    const onId = sm.get('on');
    const offId = sm.get('off');
    if (onId && offId) {
      stateGroups.set(onId, offId);
      stateGroups.set(offId, onId);
      offToOn.set(offId, onId);
      onToOff.set(onId, offId);
    }
  }

  // Also register rotation groups for "on" state variants
  for (const asset of assets.catalog) {
    if (asset.groupId && asset.orientation && asset.state === 'on') {
      if (asset.animationGroup && asset.frame !== undefined && asset.frame > 0) continue;
      const offCounterpart = stateGroups.get(asset.id);
      if (offCounterpart) {
        const offGroup = rotationGroups.get(offCounterpart);
        if (offGroup) {
          const onMembers: Record<string, string> = {};
          for (const orient of offGroup.orientations) {
            const offId = offGroup.members[orient];
            const onId = stateGroups.get(offId);
            onMembers[orient] = onId ?? offId;
          }
          const onGroup: RotationGroup = {
            orientations: offGroup.orientations,
            members: onMembers,
          };
          for (const id of Object.values(onMembers)) {
            if (!rotationGroups.has(id)) {
              rotationGroups.set(id, onGroup);
            }
          }
        }
      }
    }
  }

  // Phase 4: Build animation groups
  const animGroupCollector = new Map<string, Array<{ id: string; frame: number }>>();
  for (const asset of assets.catalog) {
    if (asset.animationGroup && asset.frame !== undefined) {
      let frames = animGroupCollector.get(asset.animationGroup);
      if (!frames) {
        frames = [];
        animGroupCollector.set(asset.animationGroup, frames);
      }
      frames.push({ id: asset.id, frame: asset.frame });
    }
  }
  for (const [groupId, frames] of animGroupCollector) {
    frames.sort((a, b) => a.frame - b.frame);
    animationGroups.set(
      groupId,
      frames.map((f) => f.id),
    );
  }

  // Track "on" variant IDs and animation frame IDs (non-first) to exclude from visible catalog
  const onStateIds = new Set<string>();
  for (const asset of assets.catalog) {
    if (asset.state === 'on') onStateIds.add(asset.id);
  }

  // Store full internal catalog (all variants — for getCatalogEntry lookups)
  internalCatalog = allEntries;

  // Visible catalog: exclude non-front variants and "on" state variants
  const visibleEntries = allEntries.filter(
    (e) => !nonFrontIds.has(e.type) && !onStateIds.has(e.type),
  );

  // Strip orientation/state suffix from labels for grouped variants
  for (const entry of visibleEntries) {
    if (rotationGroups.has(entry.type) || stateGroups.has(entry.type)) {
      entry.label = entry.label
        .replace(/ - Front - Off$/, '')
        .replace(/ - Front$/, '')
        .replace(/ - Off$/, '');
    }
  }

  dynamicCatalog = visibleEntries;
  dynamicCategories = Array.from(new Set(visibleEntries.map((e) => e.category)))
    .filter((c): c is FurnitureCategory => !!c)
    .sort();

  const rotGroupCount = new Set(Array.from(rotationGroups.values())).size;
  const animGroupCount = animationGroups.size;
  loggers.pixel.info(
    `✓ Built dynamic catalog with ${allEntries.length} assets (${visibleEntries.length} visible, ${rotGroupCount} rotation groups, ${stateGroups.size / 2} state pairs, ${animGroupCount} animation groups)`,
  );
  return true;
}

// ════════════════════════════════════════════════════════════════
// Catalog query functions
// ════════════════════════════════════════════════════════════════

/** Get a catalog entry by type. Checks dynamic catalog first, then hardcoded fallback. */
export function getCatalogEntry(type: string): CatalogEntryWithCategory | undefined {
  // Check internal catalog (includes all variants, e.g., non-front rotations)
  if (internalCatalog) {
    return internalCatalog.find((e) => e.type === type);
  }
  // Check dynamic catalog
  if (dynamicCatalog) {
    const entry = dynamicCatalog.find((e) => e.type === type);
    if (entry) return entry;
  }
  // Fall back to hardcoded catalog
  return getHardcodedCatalog().find((e) => e.type === type);
}

/** Get catalog entries by category */
export function getCatalogByCategory(category: FurnitureCategory): CatalogEntryWithCategory[] {
  const catalog = dynamicCatalog ?? getHardcodedCatalog();
  return catalog.filter((e) => e.category === category);
}

/** Get active categories with labels */
export function getActiveCategories(): Array<{ id: FurnitureCategory; label: string }> {
  const catalog = dynamicCatalog ?? getHardcodedCatalog();
  const categories = dynamicCategories ?? Array.from(new Set(catalog.map((e) => e.category))).filter(Boolean).sort() as FurnitureCategory[];
  return FURNITURE_CATEGORIES.filter((c) => categories.includes(c.id));
}

// ════════════════════════════════════════════════════════════════
// Rotation helpers
// ════════════════════════════════════════════════════════════════

/** Returns the next asset ID in the rotation group (cw or ccw), or null if not rotatable. */
export function getRotatedType(currentType: string, direction: 'cw' | 'ccw'): string | null {
  const group = rotationGroups.get(currentType);
  if (!group) return null;
  const order = group.orientations.map((o) => group.members[o]);
  const idx = order.indexOf(currentType);
  if (idx === -1) return null;
  const step = direction === 'cw' ? 1 : -1;
  const nextIdx = (idx + step + order.length) % order.length;
  return order[nextIdx];
}

/** Returns the toggled state variant (on↔off), or null if no state variant exists. */
export function getToggledType(currentType: string): string | null {
  // Check dynamic state groups
  const dynamic = stateGroups.get(currentType) ?? null;
  if (dynamic) return dynamic;
  // Check hardcoded PC on/off toggle
  if (currentType === 'PC_FRONT_OFF') return 'PC_FRONT_ON';
  if (currentType === 'PC_FRONT_ON') return 'PC_FRONT_OFF';
  return null;
}

/** Returns the "on" variant if this type has one, otherwise returns the type unchanged. */
export function getOnStateType(currentType: string): string {
  // Check dynamic off→on map
  const dynamic = offToOn.get(currentType);
  if (dynamic) return dynamic;
  // Check hardcoded PC toggle
  if (currentType === 'PC_FRONT_OFF') return 'PC_FRONT_ON';
  return currentType;
}

/** Returns true if the given furniture type is part of a rotation group. */
export function isRotatable(type: string): boolean {
  return rotationGroups.has(type);
}

/** Get ordered animation frame asset IDs for a given type, or null if not animated. */
export function getAnimationFrames(type: string): string[] | null {
  // Find the animation group this type belongs to
  for (const [, frames] of animationGroups) {
    if (frames.includes(type)) return frames;
  }
  return null;
}

/**
 * Get the orientation of a type within its rotation group, or undefined if not in a group.
 * Used by the renderer to determine if a "left" orientation should be mirrored.
 */
export function getOrientationInGroup(type: string): string | undefined {
  const group = rotationGroups.get(type);
  if (!group) return undefined;
  for (const [orient, id] of Object.entries(group.members)) {
    if (id === type) return orient;
  }
  return undefined;
}
