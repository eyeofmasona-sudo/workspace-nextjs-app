// ─── Agent OS — Pixel Office Type Definitions ──────────────────
// Types for the canvas-based pixel-art office renderer.
// Adapted from pixel-agents architecture for Agent OS.

// ── Tile types ──────────────────────────────────────────────────
export const TileType = {
  WALL: 0,
  FLOOR_1: 1,  // Command area - warm beige
  FLOOR_2: 2,  // Meeting room - light wood
  FLOOR_3: 3,  // Situation room - cool blue
  FLOOR_4: 4,  // Dev floor - tech green
  FLOOR_5: 5,  // Design area - warm pink
  FLOOR_6: 6,  // Server room - dark teal
  FLOOR_7: 7,  // Research area - purple
  FLOOR_8: 8,  // Lounge area - warm stone
  FLOOR_9: 9,  // Corridor - neutral gray
  VOID: 255,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

// ── Character states ────────────────────────────────────────────
export const CharState = {
  IDLE: 'idle',
  TYPING: 'typing',
  READING: 'reading',
  WALKING: 'walking',
} as const;
export type CharState = (typeof CharState)[keyof typeof CharState];

// ── Directions ──────────────────────────────────────────────────
export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

// ── Core constants ──────────────────────────────────────────────
export const TILE_SIZE = 16;
export const CHAR_W = 16;
export const CHAR_H = 24;

// ── Character color palette ─────────────────────────────────────
export interface CharPalette {
  skin: string;
  hair: string;
  shirt: string;
  shirtLight: string;
  pants: string;
  shoes: string;
  outline: string;
}

// ── Character instance ──────────────────────────────────────────
export interface PixelCharacter {
  id: string;
  name: string;
  role: string;
  state: CharState;
  dir: Direction;
  /** Pixel position (center-bottom anchor) */
  x: number;
  y: number;
  /** Current tile column */
  tileCol: number;
  tileRow: number;
  /** Path for walking */
  path: Array<{ col: number; row: number }>;
  moveProgress: number;
  /** Animation frame index */
  frame: number;
  frameTimer: number;
  /** Color palette */
  palette: CharPalette;
  /** Assigned seat uid */
  seatId: string | null;
  /** Whether agent is active (working) */
  isActive: boolean;
  /** Agent status from runtime */
  agentStatus: string;
  /** Current tool for typing vs reading */
  currentTool: string | null;
  /** Bubble type */
  bubbleType: 'permission' | 'waiting' | 'thinking' | null;
  bubbleTimer: number;
  /** Room/zone key */
  zoneKey: string;
  /** Role label (profession) */
  roleLabel: string;
}

// ── Furniture types ─────────────────────────────────────────────
export const FurnitureType = {
  DESK_FRONT: 'desk_front',
  DESK_SIDE: 'desk_side',
  CHAIR_FRONT: 'chair_front',
  CHAIR_BACK: 'chair_back',
  CHAIR_SIDE: 'chair_side',
  PC_FRONT_ON: 'pc_front_on',
  PC_FRONT_OFF: 'pc_front_off',
  PC_SIDE: 'pc_side',
  MEETING_TABLE: 'meeting_table',
  SERVER_RACK: 'server_rack',
  BOOKSHELF: 'bookshelf',
  WHITEBOARD: 'whiteboard',
  SOFA_FRONT: 'sofa_front',
  SOFA_SIDE: 'sofa_side',
  SOFA_BACK: 'sofa_back',
  COFFEE_MACHINE: 'coffee_machine',
  PLANT: 'plant',
  CACTUS: 'cactus',
  CLOCK: 'clock',
  PAINTING: 'painting',
  COMMAND_SCREEN: 'command_screen',
} as const;
export type FurnitureType = (typeof FurnitureType)[keyof typeof FurnitureType];

// ── Placed furniture item ───────────────────────────────────────
export interface PlacedFurniture {
  uid: string;
  type: FurnitureType;
  col: number;
  row: number;
  mirrored?: boolean;
}

// ── Furniture render instance (after layout processing) ─────────
export interface FurnitureInstance {
  type: FurnitureType;
  x: number;   // pixel x
  y: number;   // pixel y
  zY: number;  // depth sort value
  w: number;
  h: number;
  mirrored?: boolean;
  isActive?: boolean;
}

// ── Seat definition ─────────────────────────────────────────────
export interface Seat {
  uid: string;
  seatCol: number;
  seatRow: number;
  facingDir: Direction;
  assigned: boolean;
  assignedAgentId: string | null;
}

// ── Office layout ───────────────────────────────────────────────
export interface OfficeLayout {
  cols: number;
  rows: number;
  tiles: TileType[];
  furniture: PlacedFurniture[];
}

// ── Zone definition ─────────────────────────────────────────────
export interface ZoneDef {
  key: string;
  label: string;
  emoji: string;
  wallColor: string;
  floorColor: string;
  floorType: TileType;
}

// ── Sprite data type (2D array of hex colors) ──────────────────
export type SpriteData = string[][];

// ── Agent status to character state mapping ─────────────────────
export function agentStatusToCharState(status: string): CharState {
  switch (status) {
    case 'working': return CharState.TYPING;
    case 'thinking': return CharState.READING;
    case 'reviewing': return CharState.READING;
    case 'waiting_api': return CharState.IDLE;
    case 'waiting_approval': return CharState.IDLE;
    case 'done': return CharState.IDLE;
    case 'error': return CharState.IDLE;
    case 'offline': return CharState.IDLE;
    default: return CharState.IDLE;
  }
}
