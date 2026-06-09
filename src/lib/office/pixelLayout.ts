// ─── Agent OS — Pixel Office Layout (1:1 pixel-agents architecture) ──
// Tile map, furniture catalog, layout construction, seat generation,
// blocked tiles, pathfinding, and zone mapping.

import type { Direction, PlacedFurniture, Seat, TileType, ZoneDef, ColorValue, OfficeLayout } from './pixelTypes';
import { Direction as Dir, TileType as TT, TILE_SIZE, orientationToFacing } from './pixelTypes';

// ── Zone definitions ────────────────────────────────────────────
export const ZONES: ZoneDef[] = [
  { key: 'command_area', label: 'Command', emoji: '👑', wallColor: '#7c3aed', floorColor: '#e8e0d4', floorType: TT.FLOOR_1, tileColor: { h: 30, s: 30, b: -10, c: -50 } },
  { key: 'meeting_room', label: 'Meeting', emoji: '🤝', wallColor: '#d97706', floorColor: '#dcc8a8', floorType: TT.FLOOR_2, tileColor: { h: 35, s: 40, b: -15, c: -60 } },
  { key: 'situation_room', label: 'Situation', emoji: '📊', wallColor: '#2563eb', floorColor: '#d0d8e4', floorType: TT.FLOOR_3, tileColor: { h: 215, s: 25, b: -10, c: -60 } },
  { key: 'development_area', label: 'Dev Floor', emoji: '💻', wallColor: '#059669', floorColor: '#d0e4d8', floorType: TT.FLOOR_4, tileColor: { h: 150, s: 25, b: -10, c: -55 } },
  { key: 'design_area', label: 'Design', emoji: '🎨', wallColor: '#db2777', floorColor: '#e4d0d8', floorType: TT.FLOOR_5, tileColor: { h: 330, s: 25, b: -10, c: -55 } },
  { key: 'server_room', label: 'Server', emoji: '🖥️', wallColor: '#0d9488', floorColor: '#c8d8d4', floorType: TT.FLOOR_6, tileColor: { h: 175, s: 20, b: -15, c: -50 } },
  { key: 'research_area', label: 'Research', emoji: '📚', wallColor: '#7c3aed', floorColor: '#d8d0e4', floorType: TT.FLOOR_7, tileColor: { h: 265, s: 25, b: -10, c: -55 } },
  { key: 'lounge_area', label: 'Lounge', emoji: '☕', wallColor: '#78716c', floorColor: '#ddd8d0', floorType: TT.FLOOR_8, tileColor: { h: 40, s: 20, b: -10, c: -40 } },
];

export function getZoneByKey(key: string): ZoneDef {
  return ZONES.find(z => z.key === key) ?? ZONES[7];
}

// ── Furniture catalog ───────────────────────────────────────────
// Maps furniture type IDs to their properties
interface CatalogEntry {
  type: string;
  label: string;
  footprintW: number;
  footprintH: number;
  isDesk: boolean;
  category: string;
  backgroundTiles: number;
  canPlaceOnSurfaces: boolean;
  canPlaceOnWalls: boolean;
  mirrorSide: boolean;
  orientation: string;
  groupId: string;
  state?: 'on' | 'off';
}

const FURNITURE_CATALOG: Record<string, CatalogEntry> = {
  desk_front: { type: 'desk_front', label: 'Desk (Front)', footprintW: 3, footprintH: 2, isDesk: true, category: 'desks', backgroundTiles: 1, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'desk' },
  desk_side: { type: 'desk_side', label: 'Desk (Side)', footprintW: 1, footprintH: 4, isDesk: true, category: 'desks', backgroundTiles: 1, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'side', groupId: 'desk' },
  chair_front: { type: 'chair_front', label: 'Chair (Front)', footprintW: 1, footprintH: 2, isDesk: false, category: 'chairs', backgroundTiles: 1, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'chair' },
  chair_back: { type: 'chair_back', label: 'Chair (Back)', footprintW: 1, footprintH: 2, isDesk: false, category: 'chairs', backgroundTiles: 1, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'back', groupId: 'chair' },
  chair_side: { type: 'chair_side', label: 'Chair (Side)', footprintW: 1, footprintH: 2, isDesk: false, category: 'chairs', backgroundTiles: 1, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: true, orientation: 'side', groupId: 'chair' },
  pc_front_on: { type: 'pc_front_on', label: 'PC (On)', footprintW: 1, footprintH: 1, isDesk: false, category: 'electronics', backgroundTiles: 0, canPlaceOnSurfaces: true, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'pc', state: 'on' },
  pc_front_off: { type: 'pc_front_off', label: 'PC (Off)', footprintW: 1, footprintH: 1, isDesk: false, category: 'electronics', backgroundTiles: 0, canPlaceOnSurfaces: true, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'pc', state: 'off' },
  pc_side: { type: 'pc_side', label: 'PC (Side)', footprintW: 1, footprintH: 1, isDesk: false, category: 'electronics', backgroundTiles: 0, canPlaceOnSurfaces: true, canPlaceOnWalls: false, mirrorSide: true, orientation: 'side', groupId: 'pc' },
  meeting_table: { type: 'meeting_table', label: 'Meeting Table', footprintW: 4, footprintH: 2, isDesk: false, category: 'desks', backgroundTiles: 0, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'meeting_table' },
  server_rack: { type: 'server_rack', label: 'Server Rack', footprintW: 2, footprintH: 2, isDesk: false, category: 'electronics', backgroundTiles: 0, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'server_rack' },
  bookshelf: { type: 'bookshelf', label: 'Bookshelf', footprintW: 2, footprintH: 1, isDesk: false, category: 'wall', backgroundTiles: 0, canPlaceOnSurfaces: false, canPlaceOnWalls: true, mirrorSide: false, orientation: 'front', groupId: 'bookshelf' },
  whiteboard: { type: 'whiteboard', label: 'Whiteboard', footprintW: 3, footprintH: 1, isDesk: false, category: 'wall', backgroundTiles: 0, canPlaceOnSurfaces: false, canPlaceOnWalls: true, mirrorSide: false, orientation: 'front', groupId: 'whiteboard' },
  sofa_front: { type: 'sofa_front', label: 'Sofa (Front)', footprintW: 2, footprintH: 1, isDesk: false, category: 'chairs', backgroundTiles: 0, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'sofa' },
  coffee_machine: { type: 'coffee_machine', label: 'Coffee Machine', footprintW: 1, footprintH: 1, isDesk: false, category: 'misc', backgroundTiles: 0, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'coffee_machine' },
  plant: { type: 'plant', label: 'Plant', footprintW: 1, footprintH: 2, isDesk: false, category: 'decor', backgroundTiles: 1, canPlaceOnSurfaces: false, canPlaceOnWalls: false, mirrorSide: false, orientation: 'front', groupId: 'plant' },
  command_screen: { type: 'command_screen', label: 'Command Screen', footprintW: 6, footprintH: 3, isDesk: false, category: 'electronics', backgroundTiles: 0, canPlaceOnSurfaces: false, canPlaceOnWalls: true, mirrorSide: false, orientation: 'front', groupId: 'command_screen' },
};

export function getCatalogEntry(type: string): CatalogEntry | undefined {
  return FURNITURE_CATALOG[type];
}

// ── Default office layout ───────────────────────────────────────
// 30 cols × 20 rows
const COLS = 30;
const ROWS = 20;

const W = TT.WALL;
const F1 = TT.FLOOR_1;
const F2 = TT.FLOOR_2;
const F3 = TT.FLOOR_3;
const F4 = TT.FLOOR_4;
const F5 = TT.FLOOR_5;
const F6 = TT.FLOOR_6;
const F7 = TT.FLOOR_7;
const F8 = TT.FLOOR_8;
const F9 = TT.FLOOR_9;
const V = TT.VOID;

function buildDefaultTiles(): TileType[] {
  const tiles: TileType[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        tiles.push(W);
      } else if (r === 9) {
        if (c === 7 || c === 15 || c === 23) tiles.push(F9);
        else tiles.push(W);
      } else if (r < 9 && (c === 7 || c === 15 || c === 23)) {
        tiles.push(W);
      } else if (r > 9 && (c === 7 || c === 15 || c === 23)) {
        tiles.push(W);
      } else if (c >= 1 && c <= 6 && r >= 1 && r <= 8) {
        tiles.push(F1);
      } else if (c >= 8 && c <= 14 && r >= 1 && r <= 8) {
        tiles.push(F2);
      } else if (c >= 16 && c <= 22 && r >= 1 && r <= 8) {
        tiles.push(F3);
      } else if (c >= 24 && c <= 28 && r >= 1 && r <= 8) {
        tiles.push(F4);
      } else if (c >= 1 && c <= 6 && r >= 10 && r <= 18) {
        tiles.push(F5);
      } else if (c >= 8 && c <= 14 && r >= 10 && r <= 18) {
        tiles.push(F6);
      } else if (c >= 16 && c <= 22 && r >= 10 && r <= 18) {
        tiles.push(F7);
      } else if (c >= 24 && c <= 28 && r >= 10 && r <= 18) {
        tiles.push(F8);
      } else {
        tiles.push(V);
      }
    }
  }

  // Doorways in vertical walls
  tiles[4 * COLS + 7] = F9;  tiles[5 * COLS + 7] = F9;
  tiles[4 * COLS + 15] = F9; tiles[5 * COLS + 15] = F9;
  tiles[4 * COLS + 23] = F9; tiles[5 * COLS + 23] = F9;
  tiles[13 * COLS + 7] = F9; tiles[14 * COLS + 7] = F9;
  tiles[13 * COLS + 15] = F9; tiles[14 * COLS + 15] = F9;
  tiles[13 * COLS + 23] = F9; tiles[14 * COLS + 23] = F9;

  return tiles;
}

function buildDefaultFurniture(): PlacedFurniture[] {
  let uid = 0;
  const f = (type: string, col: number, row: number): PlacedFurniture => ({
    uid: `f-${uid++}`,
    type,
    col,
    row,
  });

  return [
    // ─── Command Area ───
    f('desk_front', 2, 4),
    f('chair_front', 3, 6),
    f('pc_front_on', 3, 3),
    f('command_screen', 1, 1),
    f('plant', 5, 1),

    // ─── Meeting Room ───
    f('meeting_table', 10, 3),
    f('chair_front', 11, 2),
    f('chair_front', 13, 2),
    f('chair_back', 11, 7),
    f('chair_back', 13, 7),
    f('plant', 8, 1),
    f('whiteboard', 12, 1),

    // ─── Situation Room ───
    f('desk_front', 17, 4),
    f('chair_front', 18, 6),
    f('pc_front_on', 18, 3),
    f('desk_front', 20, 4),
    f('chair_front', 21, 6),
    f('pc_front_on', 21, 3),
    f('whiteboard', 19, 1),

    // ─── Development Area ───
    f('desk_front', 25, 3),
    f('chair_front', 26, 5),
    f('pc_front_on', 26, 2),
    f('desk_front', 25, 6),
    f('chair_front', 26, 8),
    f('pc_front_on', 26, 5),

    // ─── Design Area ───
    f('desk_front', 2, 13),
    f('chair_front', 3, 15),
    f('pc_front_on', 3, 12),
    f('whiteboard', 4, 10),
    f('plant', 5, 10),

    // ─── Server Room ───
    f('server_rack', 9, 10),
    f('server_rack', 11, 10),
    f('desk_front', 11, 14),
    f('chair_front', 12, 16),
    f('pc_front_on', 12, 13),
    f('desk_front', 9, 14),
    f('chair_front', 10, 16),

    // ─── Research Area ───
    f('bookshelf', 17, 10),
    f('desk_front', 19, 13),
    f('chair_front', 20, 15),
    f('pc_front_on', 20, 12),
    f('plant', 21, 10),

    // ─── Lounge Area ───
    f('sofa_front', 25, 13),
    f('chair_front', 26, 16),
    f('coffee_machine', 27, 10),
    f('plant', 24, 10),
  ];
}

/** Build seat assignments from furniture layout — matching pixel-agents seat generation */
export function buildSeats(furniture: PlacedFurniture[]): Map<string, Seat> {
  const seats = new Map<string, Seat>();
  const deskTiles = new Set<string>();

  // Collect desk footprint tiles
  for (const item of furniture) {
    const entry = FURNITURE_CATALOG[item.type];
    if (entry?.isDesk) {
      for (let dr = 0; dr < entry.footprintH; dr++) {
        for (let dc = 0; dc < entry.footprintW; dc++) {
          deskTiles.add(`${item.col + dc},${item.row + dr}`);
        }
      }
    }
  }

  for (const item of furniture) {
    const entry = FURNITURE_CATALOG[item.type];
    if (!entry || entry.category !== 'chairs') continue;

    // Each non-background footprint tile becomes a seat
    for (let dr = entry.backgroundTiles; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const seatCol = item.col + dc;
        const seatRow = item.row + dr;
        const uid = entry.footprintH - entry.backgroundTiles > 1 || entry.footprintW > 1
          ? `${item.uid}:${dr - entry.backgroundTiles}`
          : item.uid;

        // Determine facing direction
        let facingDir: Direction;
        if (entry.orientation === 'front' || entry.orientation === 'side') {
          facingDir = orientationToFacing(entry.orientation === 'side' ? (item.mirrored ? 'left' : 'right') : 'front');
        } else if (entry.orientation === 'back') {
          facingDir = Dir.UP;
        } else {
          // Check for adjacent desk
          facingDir = Dir.DOWN; // default
          const dirs = [
            { dc: 0, dr: -1, dir: Dir.UP },
            { dc: 0, dr: 1, dir: Dir.DOWN },
            { dc: -1, dr: 0, dir: Dir.LEFT },
            { dc: 1, dr: 0, dir: Dir.RIGHT },
          ];
          for (const d of dirs) {
            if (deskTiles.has(`${seatCol + d.dc},${seatRow + d.dr}`)) {
              facingDir = d.dir;
              break;
            }
          }
        }

        seats.set(uid, {
          uid,
          seatCol,
          seatRow,
          facingDir,
          assigned: false,
          assignedAgentId: null,
        });
      }
    }
  }

  return seats;
}

/** Create the default office layout */
export function createDefaultLayout(): OfficeLayout {
  return {
    version: 1,
    cols: COLS,
    rows: ROWS,
    tiles: buildDefaultTiles(),
    furniture: buildDefaultFurniture(),
  };
}

/** Convert flat tile array to 2D grid */
export function layoutToTileMap(layout: OfficeLayout): TileType[][] {
  const map: TileType[][] = [];
  for (let r = 0; r < layout.rows; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < layout.cols; c++) {
      row.push(layout.tiles[r * layout.cols + c]);
    }
    map.push(row);
  }
  return map;
}

// ── Walkability & pathfinding ──────────────────────────────────

/** Check if a tile is walkable */
export function isWalkable(col: number, row: number, tileMap: TileType[][], blockedTiles: Set<string>): boolean {
  if (row < 0 || row >= tileMap.length || col < 0 || col >= (tileMap[0]?.length ?? 0)) return false;
  const t = tileMap[row][col];
  if (t === TT.WALL || t === TT.VOID) return false;
  if (blockedTiles.has(`${col},${row}`)) return false;
  return true;
}

/** Get walkable tile positions */
export function getWalkableTiles(tileMap: TileType[][], blockedTiles: Set<string>): Array<{ col: number; row: number }> {
  const tiles: Array<{ col: number; row: number }> = [];
  for (let r = 0; r < tileMap.length; r++) {
    for (let c = 0; c < tileMap[r].length; c++) {
      if (isWalkable(c, r, tileMap, blockedTiles)) tiles.push({ col: c, row: r });
    }
  }
  return tiles;
}

/** Get furniture blocked tiles — respects backgroundTiles (characters walk through chair backs) */
export function getBlockedTiles(furniture: PlacedFurniture[]): Set<string> {
  const tiles = new Set<string>();
  for (const item of furniture) {
    const entry = FURNITURE_CATALOG[item.type];
    if (!entry) continue;

    for (let dr = entry.backgroundTiles; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        tiles.add(`${item.col + dc},${item.row + dr}`);
      }
    }
  }
  return tiles;
}

/** BFS pathfinding on 4-connected grid */
export function findPath(
  startCol: number, startRow: number,
  endCol: number, endRow: number,
  tileMap: TileType[][],
  blockedTiles: Set<string>,
): Array<{ col: number; row: number }> {
  if (startCol === endCol && startRow === endRow) return [];
  if (!isWalkable(endCol, endRow, tileMap, blockedTiles)) return [];

  const key = (c: number, r: number) => `${c},${r}`;
  const visited = new Set<string>();
  visited.add(key(startCol, startRow));
  const parent = new Map<string, string>();
  const queue: Array<{ col: number; row: number }> = [{ col: startCol, row: startRow }];
  const dirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currKey = key(curr.col, curr.row);

    if (curr.col === endCol && curr.row === endRow) {
      const path: Array<{ col: number; row: number }> = [];
      let k = key(endCol, endRow);
      while (k !== key(startCol, startRow)) {
        const [c, r] = k.split(',').map(Number);
        path.unshift({ col: c, row: r });
        k = parent.get(k)!;
      }
      return path;
    }

    for (const d of dirs) {
      const nc = curr.col + d.dc;
      const nr = curr.row + d.dr;
      const nk = key(nc, nr);
      if (visited.has(nk)) continue;
      if (!isWalkable(nc, nr, tileMap, blockedTiles)) continue;
      visited.add(nk);
      parent.set(nk, currKey);
      queue.push({ col: nc, row: nr });
    }
  }

  return [];
}

// ── Zone mapping ────────────────────────────────────────────────

/** Get zone key for a tile position */
export function getZoneForTile(col: number, row: number): string {
  if (col >= 1 && col <= 6 && row >= 1 && row <= 8) return 'command_area';
  if (col >= 8 && col <= 14 && row >= 1 && row <= 8) return 'meeting_room';
  if (col >= 16 && col <= 22 && row >= 1 && row <= 8) return 'situation_room';
  if (col >= 24 && col <= 28 && row >= 1 && row <= 8) return 'development_area';
  if (col >= 1 && col <= 6 && row >= 10 && row <= 18) return 'design_area';
  if (col >= 8 && col <= 14 && row >= 10 && row <= 18) return 'server_room';
  if (col >= 16 && col <= 22 && row >= 10 && row <= 18) return 'research_area';
  if (col >= 24 && col <= 28 && row >= 10 && row <= 18) return 'lounge_area';
  return 'lounge_area';
}

function getZoneTileRange(zoneKey: string): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
  const ranges: Record<string, { minCol: number; maxCol: number; minRow: number; maxRow: number }> = {
    command_area: { minCol: 1, maxCol: 6, minRow: 1, maxRow: 8 },
    meeting_room: { minCol: 8, maxCol: 14, minRow: 1, maxRow: 8 },
    situation_room: { minCol: 16, maxCol: 22, minRow: 1, maxRow: 8 },
    development_area: { minCol: 24, maxCol: 28, minRow: 1, maxRow: 8 },
    design_area: { minCol: 1, maxCol: 6, minRow: 10, maxRow: 18 },
    server_room: { minCol: 8, maxCol: 14, minRow: 10, maxRow: 18 },
    research_area: { minCol: 16, maxCol: 22, minRow: 10, maxRow: 18 },
    lounge_area: { minCol: 24, maxCol: 28, minRow: 10, maxRow: 18 },
  };
  return ranges[zoneKey] ?? ranges.lounge_area;
}

/** Map our agent zone names to seat assignments */
export function getZoneSeats(zoneKey: string, seats: Map<string, Seat>): Seat[] {
  const range = getZoneTileRange(zoneKey);
  const result: Seat[] = [];
  for (const [, seat] of seats) {
    if (seat.seatCol >= range.minCol && seat.seatCol <= range.maxCol &&
        seat.seatRow >= range.minRow && seat.seatRow <= range.maxRow) {
      result.push(seat);
    }
  }
  return result;
}

// ── Wall auto-tiling bitmask ────────────────────────────────────
// N=1, E=2, S=4, W=8 → 16 configurations

export function buildWallMask(col: number, row: number, tileMap: TileType[][]): number {
  let mask = 0;
  if (row > 0 && tileMap[row - 1]?.[col] === TT.WALL) mask |= 1; // North
  if (col < (tileMap[0]?.length ?? 0) - 1 && tileMap[row]?.[col + 1] === TT.WALL) mask |= 2; // East
  if (row < tileMap.length - 1 && tileMap[row + 1]?.[col] === TT.WALL) mask |= 4; // South
  if (col > 0 && tileMap[row]?.[col - 1] === TT.WALL) mask |= 8; // West
  return mask;
}
