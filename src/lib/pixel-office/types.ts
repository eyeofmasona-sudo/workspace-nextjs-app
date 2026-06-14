/**
 * Core types for the pixel-office engine.
 *
 * Ported 1:1 from pixel-agents/webview-ui/src/office/types.ts
 * Re-exports select constants from constants.ts for backward compatibility.
 */

// ── Re-export constants that were previously in this file ───────────
export {
  TILE_SIZE,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MAX_COLS,
  MAX_ROWS,
  MATRIX_EFFECT_DURATION_SEC as MATRIX_EFFECT_DURATION,
  WALK_SPEED_PX_PER_SEC,
  WALK_FRAME_DURATION_SEC,
  TYPE_FRAME_DURATION_SEC,
  WANDER_PAUSE_MIN_SEC,
  WANDER_PAUSE_MAX_SEC,
  WANDER_MOVES_BEFORE_REST_MIN,
  WANDER_MOVES_BEFORE_REST_MAX,
  SEAT_REST_MIN_SEC,
  SEAT_REST_MAX_SEC,
  CHARACTER_SITTING_OFFSET_PX,
  CHARACTER_Z_SORT_OFFSET,
  OUTLINE_Z_SORT_OFFSET,
  SELECTED_OUTLINE_ALPHA,
  HOVERED_OUTLINE_ALPHA,
  BUBBLE_FADE_DURATION_SEC,
  BUBBLE_SITTING_OFFSET_PX,
  BUBBLE_VERTICAL_OFFSET_PX,
  FALLBACK_FLOOR_COLOR,
  CANVAS_ERROR_TILE_COLOR,
  WALL_COLOR,
  MAX_DELTA_TIME_SEC,
  WAITING_BUBBLE_DURATION_SEC,
  DISMISS_BUBBLE_FAST_FADE_SEC,
  INACTIVE_SEAT_TIMER_MIN_SEC,
  INACTIVE_SEAT_TIMER_RANGE_SEC,
  PALETTE_COUNT,
  HUE_SHIFT_MIN_DEG,
  HUE_SHIFT_RANGE_DEG,
  AUTO_ON_FACING_DEPTH,
  AUTO_ON_SIDE_DEPTH,
  CHARACTER_HIT_HALF_WIDTH,
  CHARACTER_HIT_HEIGHT,
  FURNITURE_ANIM_INTERVAL_SEC,
  CAMERA_FOLLOW_LERP,
  CAMERA_FOLLOW_SNAP_THRESHOLD,
  PAN_MARGIN_FRACTION,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_DEFAULT_DPR_FACTOR,
  ZOOM_SCROLL_THRESHOLD,
  GRID_LINE_COLOR,
  SEAT_OWN_COLOR,
  SEAT_AVAILABLE_COLOR,
  SEAT_BUSY_COLOR,
  // Agent OS extension constants
  BEHAVIOR_BREAK_MAX_SEC,
  BEHAVIOR_BREAK_MIN_SEC,
  BEHAVIOR_IDLE_MAX_SEC,
  BEHAVIOR_IDLE_MIN_SEC,
  BEHAVIOR_MEETING_MAX_SEC,
  BEHAVIOR_MEETING_MIN_SEC,
  BEHAVIOR_RESEARCH_MAX_SEC,
  BEHAVIOR_RESEARCH_MIN_SEC,
  BEHAVIOR_WORKING_MAX_SEC,
  BEHAVIOR_WORKING_MIN_SEC,
  BEHAVIOR_EVENT_OVERRIDE_SEC,
  DONE_BUBBLE_DURATION_SEC,
  CHARACTER_SCALE_FACTOR,
  ROLE_LABEL_ROLE_FONT_SCALE,
  ROLE_LABEL_ZONE_FONT_SCALE,
  ROLE_LABEL_MIN_ROLE_FONT,
  ROLE_LABEL_MIN_ZONE_FONT,
  TYPING_SWAY_AMPLITUDE_PX,
  TYPING_SWAY_SPEED,
  WORKSTATION_GLOW_RADIUS_PX,
  WORKSTATION_GLOW_ALPHA,
  ROLE_DISPLAY,
} from './constants';

// ── Tile Types ──────────────────────────────────────────────────────
export const TileType = {
  WALL: 0,
  FLOOR_1: 1,
  FLOOR_2: 2,
  FLOOR_3: 3,
  FLOOR_4: 4,
  FLOOR_5: 5,
  FLOOR_6: 6,
  FLOOR_7: 7,
  FLOOR_8: 8,
  FLOOR_9: 9,
  FLOOR_10: 10,
  VOID: 255,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

// ── Character State ─────────────────────────────────────────────────
export const CharacterState = {
  IDLE: 'idle',
  WALK: 'walk',
  TYPE: 'type',
} as const;
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState];

// ── Direction ───────────────────────────────────────────────────────
export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

// ── Sprite Data ─────────────────────────────────────────────────────
/** 2D array of hex color strings: '' = transparent, '#RRGGBB' = opaque, '#RRGGBBAA' = semi-transparent. [row][col] */
export type SpriteData = string[][];

// ── Color Value ─────────────────────────────────────────────────────
/** HSBC color value used for colorizing sprites, floor tiles, walls, and furniture. */
export interface ColorValue {
  /** Hue: 0-360 in colorize mode, -180 to +180 in adjust mode */
  h: number;
  /** Saturation: 0-100 in colorize mode, -100 to +100 in adjust mode */
  s: number;
  /** Brightness -100 to 100 */
  b: number;
  /** Contrast -100 to 100 */
  c: number;
  /** When true, use Photoshop-style Colorize (grayscale → fixed HSL). Default: adjust mode. */
  colorize?: boolean;
}

// ── Seat ────────────────────────────────────────────────────────────
export interface Seat {
  /** Chair furniture uid */
  uid: string;
  /** Tile col where agent sits */
  seatCol: number;
  /** Tile row where agent sits */
  seatRow: number;
  /** Direction character faces when sitting (toward adjacent desk) */
  facingDir: Direction;
  assigned: boolean;
}

// ── Furniture Instance ──────────────────────────────────────────────
export interface FurnitureInstance {
  sprite: SpriteData;
  /** Pixel x (top-left) */
  x: number;
  /** Pixel y (top-left) */
  y: number;
  /** Y value used for depth sorting (typically bottom edge) */
  zY: number;
  /** Render-time horizontal flip flag (for mirrored side variants) */
  mirrored?: boolean;
}

// ── Tool Activity ───────────────────────────────────────────────────
export interface ToolActivity {
  toolId: string;
  status: string;
  done: boolean;
  permissionWait?: boolean;
}

// ── Edit Tool ───────────────────────────────────────────────────────
export const EditTool = {
  TILE_PAINT: 'tile_paint',
  WALL_PAINT: 'wall_paint',
  FURNITURE_PLACE: 'furniture_place',
  FURNITURE_PICK: 'furniture_pick',
  SELECT: 'select',
  EYEDROPPER: 'eyedropper',
  ERASE: 'erase',
} as const;
export type EditTool = (typeof EditTool)[keyof typeof EditTool];

// ── Furniture Catalog Entry ─────────────────────────────────────────
export interface FurnitureCatalogEntry {
  type: string; // asset ID from furniture manifest
  label: string;
  footprintW: number;
  footprintH: number;
  sprite: SpriteData;
  isDesk: boolean;
  category?: string;
  /** Orientation from rotation group: 'front' | 'back' | 'left' | 'right' */
  orientation?: string;
  /** Whether this item can be placed on top of desk/table surfaces */
  canPlaceOnSurfaces?: boolean;
  /** Number of tile rows from the top of the footprint that are "background" (allow placement, still block walking). Default 0. */
  backgroundTiles?: number;
  /** Whether this item can be placed on wall tiles */
  canPlaceOnWalls?: boolean;
  /** Whether this is a side-oriented asset that produces a mirrored "left" variant */
  mirrorSide?: boolean;
}

// ── Placed Furniture ────────────────────────────────────────────────
export interface PlacedFurniture {
  uid: string;
  type: string; // asset ID from furniture manifest
  col: number;
  row: number;
  /** Optional color override for furniture */
  color?: ColorValue;
}

// ── Office Layout ───────────────────────────────────────────────────
export interface OfficeLayout {
  version: 1;
  cols: number;
  rows: number;
  tiles: TileType[];
  furniture: PlacedFurniture[];
  /** Per-tile color settings, parallel to tiles array. null = wall/no color */
  tileColors?: Array<ColorValue | null>;
  /** Bumped when the bundled default layout changes; forces a reset on existing installs */
  layoutRevision?: number;
}

// ── Character ───────────────────────────────────────────────────────
export interface Character {
  id: number;
  state: CharacterState;
  dir: Direction;
  /** Pixel position */
  x: number;
  y: number;
  /** Current tile column */
  tileCol: number;
  /** Current tile row */
  tileRow: number;
  /** Remaining path steps (tile coords) */
  path: Array<{ col: number; row: number }>;
  /** 0-1 lerp between current tile and next tile */
  moveProgress: number;
  /** Current tool name for typing vs reading animation, or null */
  currentTool: string | null;
  /** Palette index (0-5) */
  palette: number;
  /** Hue shift in degrees (0 = no shift, ≥45 for repeated palettes) */
  hueShift: number;
  /** Animation frame index */
  frame: number;
  /** Time accumulator for animation */
  frameTimer: number;
  /** Timer for idle wander decisions */
  wanderTimer: number;
  /** Number of wander moves completed in current roaming cycle */
  wanderCount: number;
  /** Max wander moves before returning to seat for rest */
  wanderLimit: number;
  /** Whether the agent is actively working */
  isActive: boolean;
  /** Assigned seat uid, or null if no seat */
  seatId: string | null;
  /** Active speech bubble type, or null if none showing */
  bubbleType: 'permission' | 'waiting' | 'done' | null;
  /** Countdown timer for bubble (waiting: 2→0, permission: unused) */
  bubbleTimer: number;
  /** Timer to stay seated while inactive after seat reassignment (counts down to 0) */
  seatTimer: number;
  /** Whether this character represents a sub-agent (spawned by Task tool) */
  isSubagent?: boolean;
  /** Parent agent ID if this is a sub-agent, null otherwise */
  parentAgentId?: number | null;
  /** Active matrix spawn/despawn effect, or null */
  matrixEffect?: 'spawn' | 'despawn' | null;
  /** Timer counting up from 0 to MATRIX_EFFECT_DURATION */
  matrixEffectTimer?: number;
  /** Per-column random seeds (16 values) for staggered rain timing */
  matrixEffectSeeds?: number[];
  /** Workspace folder name (only set for multi-root workspaces) */
  folderName?: string;

  // -- Agent Teams --
  /** Team name this agent belongs to */
  teamName?: string;
  /** Role name within the team (null for lead) */
  agentName?: string;
  /** Whether this agent is the team lead */
  isTeamLead?: boolean;
  /** ID of the lead agent (set on teammates) */
  leadAgentId?: number;
  /** True when lead spawns teammates via tmux (run_in_background Agent calls) */
  teamUsesTmux?: boolean;
  /** Cumulative input tokens consumed */
  inputTokens?: number;
  /** Cumulative output tokens consumed */
  outputTokens?: number;

  // -- Agent OS Extensions --
  /** Agent display name */
  name: string;
  /** Agent role key */
  role: string;
  /** Agent OS agent status */
  agentStatus: string;
  /** Behavior state system */
  behaviorState: BehaviorState;
  behaviorTimer: number;
  /** Override destination for meetings/breaks */
  targetTile: ZoneDestination | null;
  /** True when event-driven, prevents random state changes */
  eventOverride: boolean;
}

// ── Agent OS Extensions ─────────────────────────────────────────────
// These types extend the pixel-agents core with Agent OS-specific concepts.

/** Behavior states for agents (Agent OS extension) */
export const BehaviorState = {
  WORKING: 'working',
  MEETING: 'meeting',
  BREAK: 'break',
  RESEARCH: 'research',
  IDLE: 'idle',
} as const;
export type BehaviorState = (typeof BehaviorState)[keyof typeof BehaviorState];

/** Zone destination for agent movement (Agent OS extension) */
export interface ZoneDestination {
  col: number;
  row: number;
}

/** Zone label for rendering (Agent OS extension) */
export interface ZoneLabel {
  text: string;
  col: number;
  row: number;
  color: string;
}
