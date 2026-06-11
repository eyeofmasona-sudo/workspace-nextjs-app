/**
 * Layout serialization and conversion for the pixel-office engine.
 *
 * Provides:
 * - layoutToTileMap: flat tiles → 2D grid
 * - layoutToFurnitureInstances: placed furniture → renderable instances
 * - getBlockedTiles / getPlacementBlockedTiles: blocked tile computation
 * - layoutToSeats: chair furniture → seat map
 * - getSeatTiles: seat tile positions
 * - createDefaultLayout: default office layout with furniture
 * - serializeLayout / deserializeLayout: JSON I/O with migration
 * - Migration helpers for legacy layouts
 *
 * Ported from pixel-agents/webview-ui/src/office/layout/layoutSerializer.ts
 */

import type { ColorValue } from '../types';
import { getColorizedSprite } from '../colorize';
import type {
  FurnitureInstance,
  OfficeLayout,
  PlacedFurniture,
  Seat,
  TileType as TileTypeVal,
} from '../types';
import { DEFAULT_COLS, DEFAULT_ROWS, Direction, TILE_SIZE, TileType } from '../types';
import { getCatalogEntry, getOrientationInGroup } from './furnitureCatalog';

// ════════════════════════════════════════════════════════════════
// Layout → Tile Map
// ════════════════════════════════════════════════════════════════

/** Convert flat tile array from layout into 2D grid */
export function layoutToTileMap(layout: OfficeLayout): TileTypeVal[][] {
  const map: TileTypeVal[][] = [];
  for (let r = 0; r < layout.rows; r++) {
    const row: TileTypeVal[] = [];
    for (let c = 0; c < layout.cols; c++) {
      row.push(layout.tiles[r * layout.cols + c]);
    }
    map.push(row);
  }
  return map;
}

// ════════════════════════════════════════════════════════════════
// Layout → Furniture Instances
// ════════════════════════════════════════════════════════════════

/** Convert placed furniture into renderable FurnitureInstance[] */
export function layoutToFurnitureInstances(furniture: PlacedFurniture[]): FurnitureInstance[] {
  // Pre-compute desk zY per tile so surface items can sort in front of desks
  const deskZByTile = new Map<string, number>();
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry || !entry.isDesk) continue;
    const deskZY = item.row * TILE_SIZE + entry.sprite.length;
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const key = `${item.col + dc},${item.row + dr}`;
        const prev = deskZByTile.get(key);
        if (prev === undefined || deskZY > prev) deskZByTile.set(key, deskZY);
      }
    }
  }

  const instances: FurnitureInstance[] = [];
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry) continue;
    const x = item.col * TILE_SIZE;
    const y = item.row * TILE_SIZE;
    const spriteH = entry.sprite.length;
    let zY = y + spriteH;

    // Chair z-sorting: ensure characters sitting on chairs render correctly
    if (entry.category === 'chairs') {
      if (entry.orientation === 'back') {
        // Back-facing chairs render IN FRONT of the seated character
        zY = (item.row + entry.footprintH) * TILE_SIZE + 1;
      } else {
        // All other chairs: cap zY to first row bottom so characters
        // at any seat tile render in front of the chair
        zY = (item.row + 1) * TILE_SIZE;
      }
    }

    // Surface items render in front of the desk they sit on
    if (entry.canPlaceOnSurfaces) {
      for (let dr = 0; dr < entry.footprintH; dr++) {
        for (let dc = 0; dc < entry.footprintW; dc++) {
          const deskZ = deskZByTile.get(`${item.col + dc},${item.row + dr}`);
          if (deskZ !== undefined && deskZ + 0.5 > zY) zY = deskZ + 0.5;
        }
      }
    }

    // Colorize sprite if this furniture has a color override
    let sprite = entry.sprite;
    if (item.color) {
      const { h, s, b: bv, c: cv } = item.color;
      sprite = getColorizedSprite(
        `furn-${item.type}-${h}-${s}-${bv}-${cv}-${item.color.colorize ? 1 : 0}`,
        entry.sprite,
        item.color,
      );
    }

    // Determine if this instance should be mirrored (side asset used in "left" orientation)
    let mirrored = false;
    if (entry.mirrorSide) {
      const orientInGroup = getOrientationInGroup(item.type);
      if (orientInGroup === 'left') {
        mirrored = true;
      }
    }

    instances.push({ sprite, x, y, zY, ...(mirrored ? { mirrored: true } : {}) });
  }
  return instances;
}

// ════════════════════════════════════════════════════════════════
// Blocked Tiles
// ════════════════════════════════════════════════════════════════

/** Get all tiles blocked by furniture footprints, optionally excluding a set of tiles.
 *  Skips top backgroundTiles rows so characters can walk through them. */
export function getBlockedTiles(
  furniture: PlacedFurniture[],
  excludeTiles?: Set<string>,
): Set<string> {
  const tiles = new Set<string>();
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry) continue;
    const bgRows = entry.backgroundTiles || 0;
    for (let dr = 0; dr < entry.footprintH; dr++) {
      if (dr < bgRows) continue; // skip background rows — characters can walk through
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const key = `${item.col + dc},${item.row + dr}`;
        if (excludeTiles && excludeTiles.has(key)) continue;
        tiles.add(key);
      }
    }
  }
  return tiles;
}

/** Get tiles blocked for placement purposes — skips top backgroundTiles rows per item */
export function getPlacementBlockedTiles(
  furniture: PlacedFurniture[],
  excludeUid?: string,
): Set<string> {
  const tiles = new Set<string>();
  for (const item of furniture) {
    if (item.uid === excludeUid) continue;
    const entry = getCatalogEntry(item.type);
    if (!entry) continue;
    const bgRows = entry.backgroundTiles || 0;
    for (let dr = 0; dr < entry.footprintH; dr++) {
      if (dr < bgRows) continue; // skip background rows
      for (let dc = 0; dc < entry.footprintW; dc++) {
        tiles.add(`${item.col + dc},${item.row + dr}`);
      }
    }
  }
  return tiles;
}

// ════════════════════════════════════════════════════════════════
// Seat Generation
// ════════════════════════════════════════════════════════════════

/** Map chair orientation to character facing direction */
function orientationToFacing(orientation: string): Direction {
  switch (orientation) {
    case 'front':
      return Direction.DOWN;
    case 'back':
      return Direction.UP;
    case 'left':
      return Direction.LEFT;
    case 'right':
    case 'side':
      return Direction.RIGHT;
    default:
      return Direction.DOWN;
  }
}

/** Generate seats from chair furniture.
 *  Facing priority: 1) chair orientation, 2) adjacent desk, 3) forward (DOWN). */
export function layoutToSeats(furniture: PlacedFurniture[]): Map<string, Seat> {
  const seats = new Map<string, Seat>();

  // Build set of all desk tiles
  const deskTiles = new Set<string>();
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry || !entry.isDesk) continue;
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        deskTiles.add(`${item.col + dc},${item.row + dr}`);
      }
    }
  }

  const dirs: Array<{ dc: number; dr: number; facing: Direction }> = [
    { dc: 0, dr: -1, facing: Direction.UP }, // desk is above chair → face UP
    { dc: 0, dr: 1, facing: Direction.DOWN }, // desk is below chair → face DOWN
    { dc: -1, dr: 0, facing: Direction.LEFT }, // desk is left of chair → face LEFT
    { dc: 1, dr: 0, facing: Direction.RIGHT }, // desk is right of chair → face RIGHT
  ];

  // For each chair, every footprint tile becomes a seat.
  // Multi-tile chairs (e.g. 2-tile couches) produce multiple seats.
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry || entry.category !== 'chairs') continue;

    let seatCount = 0;
    const bgRows = entry.backgroundTiles ?? 0;
    for (let dr = bgRows; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const tileCol = item.col + dc;
        const tileRow = item.row + dr;

        // Determine facing direction:
        // 1) Chair orientation takes priority
        // 2) Adjacent desk direction
        // 3) Default forward (DOWN)
        let facingDir: Direction = Direction.DOWN;
        if (entry.orientation) {
          facingDir = orientationToFacing(entry.orientation);
        } else {
          for (const d of dirs) {
            if (deskTiles.has(`${tileCol + d.dc},${tileRow + d.dr}`)) {
              facingDir = d.facing;
              break;
            }
          }
        }

        // First seat uses chair uid (backward compat), subsequent use uid:N
        const seatUid = seatCount === 0 ? item.uid : `${item.uid}:${seatCount}`;
        seats.set(seatUid, {
          uid: seatUid,
          seatCol: tileCol,
          seatRow: tileRow,
          facingDir,
          assigned: false,
        });
        seatCount++;
      }
    }
  }

  return seats;
}

/** Get the set of tiles occupied by seats (so they can be excluded from blocked tiles)
 * @internal */
export function getSeatTiles(seats: Map<string, Seat>): Set<string> {
  const tiles = new Set<string>();
  for (const seat of seats.values()) {
    tiles.add(`${seat.seatCol},${seat.seatRow}`);
  }
  return tiles;
}

// ════════════════════════════════════════════════════════════════
// Default Layout
// ════════════════════════════════════════════════════════════════

/** Default floor colors for the two rooms */
const DEFAULT_LEFT_ROOM_COLOR: ColorValue = { h: 35, s: 30, b: 15, c: 0 }; // warm beige
const DEFAULT_RIGHT_ROOM_COLOR: ColorValue = { h: 25, s: 45, b: 5, c: 10 }; // warm brown

/**
 * Create a default office layout with two rooms, pre-placed furniture,
 * and proper tile colors. Matches pixel-agents default layout structure.
 */
export function createDefaultLayout(): OfficeLayout {
  const COLS = 21;
  const ROWS = 22;
  const W = TileType.WALL;
  const F1 = TileType.FLOOR_1;
  const F2 = TileType.FLOOR_2;
  const F3 = TileType.FLOOR_3;

  const tiles: TileTypeVal[] = [];
  const tileColors: Array<ColorValue | null> = [];

  // Build tile grid: outer walls, two rooms with doorway at row 10-11, col 10
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Outer walls
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        tiles.push(W);
        tileColors.push(null);
      }
      // Center wall dividing left and right rooms (col 10)
      else if (c === 10 && !(r === 10 || r === 11)) {
        tiles.push(W);
        tileColors.push(null);
      }
      // Left room floor
      else if (c < 10) {
        tiles.push(F1);
        tileColors.push(DEFAULT_LEFT_ROOM_COLOR);
      }
      // Right room floor
      else {
        tiles.push(F2);
        tileColors.push(DEFAULT_RIGHT_ROOM_COLOR);
      }
    }
  }

  // Add carpet accents in meeting area (top-right room area)
  const carpetColor: ColorValue = { h: 280, s: 40, b: -5, c: 0 };
  const carpetTiles = [
    [14, 3], [15, 3], [16, 3], [17, 3],
    [14, 4], [15, 4], [16, 4], [17, 4],
    [14, 5], [15, 5], [16, 5], [17, 5],
  ];
  for (const [cc, cr] of carpetTiles) {
    const idx = cr * COLS + cc;
    tiles[idx] = F3;
    tileColors[idx] = carpetColor;
  }

  // Furniture placement
  const furniture: PlacedFurniture[] = [];
  let uidCounter = 0;
  const nextUid = (prefix: string) => `${prefix}-${uidCounter++}`;

  // ── Left room: 3 workstations (desk + chair + PC) ──
  // Workstation 1 (top-left area)
  furniture.push({ uid: nextUid('desk'), type: 'DESK_FRONT', col: 2, row: 3 });
  furniture.push({ uid: nextUid('chair'), type: 'WOODEN_CHAIR_FRONT', col: 3, row: 5 });
  furniture.push({ uid: nextUid('pc'), type: 'PC_FRONT_OFF', col: 3, row: 2 });

  // Workstation 2 (middle-left area)
  furniture.push({ uid: nextUid('desk'), type: 'DESK_FRONT', col: 2, row: 9 });
  furniture.push({ uid: nextUid('chair'), type: 'WOODEN_CHAIR_FRONT', col: 3, row: 11 });
  furniture.push({ uid: nextUid('pc'), type: 'PC_FRONT_OFF', col: 3, row: 8 });

  // Workstation 3 (bottom-left area)
  furniture.push({ uid: nextUid('desk'), type: 'DESK_FRONT', col: 2, row: 15 });
  furniture.push({ uid: nextUid('chair'), type: 'WOODEN_CHAIR_FRONT', col: 3, row: 17 });
  furniture.push({ uid: nextUid('pc'), type: 'PC_FRONT_OFF', col: 3, row: 14 });

  // ── Left room: extra workstation ──
  furniture.push({ uid: nextUid('desk'), type: 'DESK_FRONT', col: 6, row: 3 });
  furniture.push({ uid: nextUid('chair'), type: 'WOODEN_CHAIR_FRONT', col: 7, row: 5 });
  furniture.push({ uid: nextUid('pc'), type: 'PC_FRONT_OFF', col: 7, row: 2 });

  // ── Left room: bookshelf and plant ──
  furniture.push({ uid: nextUid('shelf'), type: 'BOOKSHELF', col: 1, row: 19 });
  furniture.push({ uid: nextUid('plant'), type: 'PLANT', col: 9, row: 1 });

  // ── Right room: 3 workstations ──
  // Workstation 4
  furniture.push({ uid: nextUid('desk'), type: 'DESK_FRONT', col: 12, row: 7 });
  furniture.push({ uid: nextUid('chair'), type: 'WOODEN_CHAIR_FRONT', col: 13, row: 9 });
  furniture.push({ uid: nextUid('pc'), type: 'PC_FRONT_OFF', col: 13, row: 6 });

  // Workstation 5
  furniture.push({ uid: nextUid('desk'), type: 'DESK_FRONT', col: 16, row: 7 });
  furniture.push({ uid: nextUid('chair'), type: 'WOODEN_CHAIR_FRONT', col: 17, row: 9 });
  furniture.push({ uid: nextUid('pc'), type: 'PC_FRONT_OFF', col: 17, row: 6 });

  // Workstation 6
  furniture.push({ uid: nextUid('desk'), type: 'DESK_FRONT', col: 12, row: 15 });
  furniture.push({ uid: nextUid('chair'), type: 'WOODEN_CHAIR_FRONT', col: 13, row: 17 });
  furniture.push({ uid: nextUid('pc'), type: 'PC_FRONT_OFF', col: 13, row: 14 });

  // ── Right room: meeting area furniture ──
  furniture.push({ uid: nextUid('whiteboard'), type: 'WHITEBOARD', col: 13, row: 1 });

  // ── Right room: extra desks ──
  furniture.push({ uid: nextUid('desk'), type: 'DESK_FRONT', col: 16, row: 15 });
  furniture.push({ uid: nextUid('chair'), type: 'WOODEN_CHAIR_FRONT', col: 17, row: 17 });
  furniture.push({ uid: nextUid('pc'), type: 'PC_FRONT_OFF', col: 17, row: 14 });

  // ── Decorations ──
  furniture.push({ uid: nextUid('plant2'), type: 'PLANT', col: 19, row: 1 });
  furniture.push({ uid: nextUid('cactus'), type: 'CACTUS', col: 9, row: 9 });
  furniture.push({ uid: nextUid('coffee'), type: 'COFFEE', col: 5, row: 2 });
  furniture.push({ uid: nextUid('bin'), type: 'BIN', col: 9, row: 19 });
  furniture.push({ uid: nextUid('bin2'), type: 'BIN', col: 19, row: 19 });
  furniture.push({ uid: nextUid('bookshelf2'), type: 'BOOKSHELF', col: 19, row: 7 });

  // Assign role-based seat UIDs for backward compatibility with ROLE_SEAT_MAP
  // Find chairs and rename them to match expected seat IDs
  const chairPrefixes = ['chair-orc', 'chair-arch', 'chair-anl', 'chair-des', 'chair-fe', 'chair-be', 'chair-qa', 'chair-devops', 'chair-data', 'chair-res'];
  const chairEntries = furniture.filter((f) => f.type === 'WOODEN_CHAIR_FRONT');
  for (let i = 0; i < Math.min(chairEntries.length, chairPrefixes.length); i++) {
    chairEntries[i].uid = chairPrefixes[i];
  }

  return {
    version: 1,
    cols: COLS,
    rows: ROWS,
    tiles,
    tileColors,
    furniture,
    layoutRevision: 1,
  };
}

// ════════════════════════════════════════════════════════════════
// Serialization / Deserialization
// ════════════════════════════════════════════════════════════════

/** Serialize layout to JSON string
 * @internal */
export function serializeLayout(layout: OfficeLayout): string {
  return JSON.stringify(layout);
}

/** Deserialize layout from JSON string, migrating old tile types if needed
 * @internal */
export function deserializeLayout(json: string): OfficeLayout | null {
  try {
    const obj = JSON.parse(json);
    if (obj && obj.version === 1 && Array.isArray(obj.tiles) && Array.isArray(obj.furniture)) {
      return migrateLayout(obj as OfficeLayout);
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

/**
 * Ensure layout has tileColors. If missing, generate defaults based on tile types.
 * Exported for use by message handlers that receive layouts over the wire.
 */
export function migrateLayoutColors(layout: OfficeLayout): OfficeLayout {
  return migrateLayout(layout);
}

// ════════════════════════════════════════════════════════════════
// Furniture type migration
// ════════════════════════════════════════════════════════════════

/** Map old hardcoded FurnitureType values to new manifest-based IDs */
const LEGACY_TYPE_MAP: Record<string, string | null> = {
  desk: 'DESK_FRONT',
  chair: 'WOODEN_CHAIR_FRONT',
  bookshelf: 'BOOKSHELF',
  plant: 'PLANT',
  cooler: null, // no equivalent in new assets — remove
  whiteboard: 'WHITEBOARD',
  pc: 'PC_FRONT_OFF',
  lamp: null, // no equivalent in new assets — remove
};

/** Migrate old furniture type strings to new manifest IDs */
function migrateFurnitureTypes(furniture: PlacedFurniture[]): PlacedFurniture[] {
  const migrated: PlacedFurniture[] = [];
  for (const item of furniture) {
    const newType = LEGACY_TYPE_MAP[item.type];
    if (newType === undefined) {
      // Not a legacy type — keep as-is
      migrated.push(item);
    } else if (newType !== null) {
      // Migrate to new type
      migrated.push({ ...item, type: newType });
    }
    // newType === null → remove the item (no equivalent)
  }
  return migrated;
}

/**
 * Migrate old layouts that use legacy tile types (TILE_FLOOR=1, WOOD_FLOOR=2, CARPET=3, DOORWAY=4)
 * to the new pattern-based system. Also migrates old furniture type strings and old VOID value.
 */
function migrateLayout(layout: OfficeLayout): OfficeLayout {
  // Migrate furniture types
  layout = { ...layout, furniture: migrateFurnitureTypes(layout.furniture) };

  // Migrate old VOID value (was 8, now 255) — only for legacy layouts since FLOOR_8 reuses value 8
  const OLD_VOID = 8;
  if (!layout.layoutRevision && layout.tiles.includes(OLD_VOID as TileTypeVal)) {
    layout = {
      ...layout,
      tiles: layout.tiles.map((t) => (t === OLD_VOID ? (TileType.VOID as TileTypeVal) : t)),
    };
  }

  if (layout.tileColors && layout.tileColors.length === layout.tiles.length) {
    return layout; // Already migrated tile colors
  }

  // Check if any tiles use old values (1-4) — these map directly to FLOOR_1-4
  // but need color assignments
  const tileColors: Array<ColorValue | null> = [];
  for (const tile of layout.tiles) {
    switch (tile) {
      case 0: // WALL
        tileColors.push(null);
        break;
      case 1: // was TILE_FLOOR → FLOOR_1 beige
        tileColors.push(DEFAULT_LEFT_ROOM_COLOR);
        break;
      case 2: // was WOOD_FLOOR → FLOOR_2 brown
        tileColors.push(DEFAULT_RIGHT_ROOM_COLOR);
        break;
      case 3: // was CARPET → FLOOR_3 purple
        tileColors.push({ h: 280, s: 40, b: -5, c: 0 });
        break;
      case 4: // was DOORWAY → FLOOR_4 tan
        tileColors.push({ h: 35, s: 25, b: 10, c: 0 });
        break;
      default:
        // Floor tile types without colors — use neutral gray
        tileColors.push(tile > 0 && tile !== TileType.VOID ? { h: 0, s: 0, b: 0, c: 0 } : null);
    }
  }

  return { ...layout, tileColors };
}
