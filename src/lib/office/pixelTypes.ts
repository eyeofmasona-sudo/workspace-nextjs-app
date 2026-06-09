// TILE TYPES - matching pixel-agents
export const TileType = {
  WALL: 0,
  FLOOR_1: 1, FLOOR_2: 2, FLOOR_3: 3, FLOOR_4: 4, FLOOR_5: 5,
  FLOOR_6: 6, FLOOR_7: 7, FLOOR_8: 8, FLOOR_9: 9,
  VOID: 255,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

// CHARACTER STATE - 3 states matching pixel-agents FSM
export const CharacterState = { IDLE: 'idle', WALK: 'walk', TYPE: 'type' } as const;
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState];

// DIRECTIONS
export const Direction = { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 } as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

// CORE CONSTANTS
export const TILE_SIZE = 16;
export const CHARACTER_Z_SORT_OFFSET = 0.5;
export const OUTLINE_Z_SORT_OFFSET = 0.1;

// SpriteData - THE fundamental data structure from pixel-agents
// 2D array of hex colors: '' = transparent, '#RRGGBB' = opaque, '#RRGGBBAA' = semi-transparent
export type SpriteData = string[][];

// Color value for colorization (matching pixel-agents)
export interface ColorValue {
  h: number;  // hue (0-360 for colorize, -180 to +180 for adjust)
  s: number;  // saturation
  b: number;  // brightness
  c: number;  // contrast
  colorize?: boolean;
}

// Character color palette
export interface CharPalette {
  skin: string;
  hair: string;
  shirt: string;
  shirtLight: string;
  pants: string;
  shoes: string;
  outline: string;
}

// Character instance - full state matching pixel-agents Character
export interface PixelCharacter {
  id: string;
  name: string;
  role: string;

  // FSM state
  state: CharacterState;
  dir: Direction;
  isActive: boolean;

  // Position - pixel coordinates, bottom-center anchor
  x: number;
  y: number;
  tileCol: number;
  tileRow: number;

  // Pathfinding
  path: Array<{ col: number; row: number }>;
  moveProgress: number;

  // Animation
  frame: number;
  frameTimer: number;
  seatTimer: number;        // Timer for TYPE→IDLE rest transition
  wanderTimer: number;       // Timer for IDLE→WALK wander
  wanderLimit: number;       // Max wander moves before returning to seat
  wanderCount: number;       // Current wander move count

  // Visual
  palette: CharPalette;
  paletteIndex: number;
  hueShift: number;
  seatId: string | null;
  agentStatus: string;
  currentTool: string | null;
  roleLabel: string;
  zoneKey: string;

  // Bubbles
  bubbleType: 'permission' | 'waiting' | null;
  bubbleTimer: number;
  bubbleFade: number;        // 0-1 for fade animation

  // Matrix spawn/despawn effect
  matrixEffect: 'spawn' | 'despawn' | null;
  matrixTimer: number;
  matrixEffectSeeds: number[];

  // Hover/select
  hovered: boolean;
  selected: boolean;
}

// Furniture types matching pixel-agents catalog
export const FurnitureCategory = {
  DESKS: 'desks',
  CHAIRS: 'chairs',
  ELECTRONICS: 'electronics',
  DECOR: 'decor',
  WALL: 'wall',
  MISC: 'misc',
  STORAGE: 'storage',
} as const;
export type FurnitureCategory = (typeof FurnitureCategory)[keyof typeof FurnitureCategory];

export interface FurnitureCatalogEntry {
  type: string;
  label: string;
  footprintW: number;
  footprintH: number;
  sprite: SpriteData;
  isDesk: boolean;
  category?: string;
  orientation?: string;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  canPlaceOnWalls?: boolean;
  mirrorSide?: boolean;
  groupId?: string;
  state?: 'on' | 'off';
  animationGroup?: string;
  animationFrame?: number;
}

export interface PlacedFurniture {
  uid: string;
  type: string;
  col: number;
  row: number;
  color?: ColorValue;
  mirrored?: boolean;
}

export interface FurnitureInstance {
  type: string;
  sprite: SpriteData;
  x: number;
  y: number;
  zY: number;
  w: number;
  h: number;
  mirrored?: boolean;
  isActive?: boolean;
  offsetY?: number;
}

export interface Seat {
  uid: string;
  seatCol: number;
  seatRow: number;
  facingDir: Direction;
  assigned: boolean;
  assignedAgentId: string | null;
}

export interface OfficeLayout {
  version: 1;
  cols: number;
  rows: number;
  tiles: TileType[];
  furniture: PlacedFurniture[];
  tileColors?: Array<ColorValue | null>;
}

export interface ZoneDef {
  key: string;
  label: string;
  emoji: string;
  wallColor: string;
  floorColor: string;
  floorType: TileType;
  tileColor: ColorValue;
}

// Agent status → character state mapping
export function agentStatusToCharState(status: string): CharacterState {
  switch (status) {
    case 'working': return CharacterState.TYPE;
    case 'thinking': return CharacterState.TYPE;
    case 'reviewing': return CharacterState.TYPE;
    case 'waiting_api': return CharacterState.IDLE;
    case 'waiting_approval': return CharacterState.IDLE;
    case 'done': return CharacterState.IDLE;
    case 'error': return CharacterState.IDLE;
    case 'offline': return CharacterState.IDLE;
    default: return CharacterState.IDLE;
  }
}

// Check if tool shows reading animation
export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false;
  const readingTools = ['Read', 'Grep', 'Search', 'WebSearch', 'WebFetch', 'VLM', 'ASR'];
  return readingTools.some(t => tool.toLowerCase().includes(t.toLowerCase()));
}

// Direction helpers
export function oppositeDir(d: Direction): Direction {
  switch (d) {
    case Direction.DOWN: return Direction.UP;
    case Direction.UP: return Direction.DOWN;
    case Direction.LEFT: return Direction.RIGHT;
    case Direction.RIGHT: return Direction.LEFT;
  }
}

export function orientationToFacing(orientation: string): Direction {
  switch (orientation) {
    case 'front': return Direction.DOWN;
    case 'back': return Direction.UP;
    case 'left': return Direction.LEFT;
    case 'right': return Direction.RIGHT;
    default: return Direction.DOWN;
  }
}
