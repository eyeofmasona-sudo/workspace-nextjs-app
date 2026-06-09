// ─── Agent OS — Pixel Office Layout ─────────────────────────────
// Defines the default office tilemap, furniture placement, and seat assignments.
// The office is a 30×20 tile grid with 8 zones.

import type { Direction, FurnitureType, OfficeLayout, PlacedFurniture, Seat, TileType, ZoneDef } from './pixelTypes';
import { Direction as Dir, TileType as TT } from './pixelTypes';

// ── Zone definitions ────────────────────────────────────────────
export const ZONES: ZoneDef[] = [
  { key: 'command_area', label: 'Command', emoji: '👑', wallColor: '#7c3aed', floorColor: '#e8e0d4', floorType: TT.FLOOR_1 },
  { key: 'meeting_room', label: 'Meeting', emoji: '🤝', wallColor: '#d97706', floorColor: '#dcc8a8', floorType: TT.FLOOR_2 },
  { key: 'situation_room', label: 'Situation', emoji: '📊', wallColor: '#2563eb', floorColor: '#d0d8e4', floorType: TT.FLOOR_3 },
  { key: 'development_area', label: 'Dev Floor', emoji: '💻', wallColor: '#059669', floorColor: '#d0e4d8', floorType: TT.FLOOR_4 },
  { key: 'design_area', label: 'Design', emoji: '🎨', wallColor: '#db2777', floorColor: '#e4d0d8', floorType: TT.FLOOR_5 },
  { key: 'server_room', label: 'Server', emoji: '🖥️', wallColor: '#0d9488', floorColor: '#c8d8d4', floorType: TT.FLOOR_6 },
  { key: 'research_area', label: 'Research', emoji: '📚', wallColor: '#7c3aed', floorColor: '#d8d0e4', floorType: TT.FLOOR_7 },
  { key: 'lounge_area', label: 'Lounge', emoji: '☕', wallColor: '#78716c', floorColor: '#ddd8d0', floorType: TT.FLOOR_8 },
];

export function getZoneByKey(key: string): ZoneDef {
  return ZONES.find(z => z.key === key) ?? ZONES[7];
}

// ── Default office layout ───────────────────────────────────────
// 30 cols × 20 rows
// Layout: Top row = 4 zones, Bottom row = 4 zones
// Doorways connect adjacent zones
//
// ████████████████████████████████████████████████
// █ CMD    █ MEET   █ SIT    █ DEV             █
// █        █        █        █                 █
// █        █   D    █   D    █                 █
// ██████ █ ██████ █ ████ █ ███████████ █ ██████
// █ DSG    █ SRV    █ RES    █ LNG            █
// █        █        █        █                █
// █        █   D    █   D    █                █
// ████████████████████████████████████████████████

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

const COLS = 30;
const ROWS = 20;

function buildDefaultTiles(): TileType[] {
  const tiles: TileType[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Outer walls
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        tiles.push(W);
      }
      // Top zone divider (row 9)
      else if (r === 9) {
        // Doorways between zones
        if (c === 7 || c === 15 || c === 23) tiles.push(F9);
        else tiles.push(W);
      }
      // Vertical wall between top zones
      else if (r < 9 && (c === 7 || c === 15 || c === 23)) {
        tiles.push(W);
      }
      // Vertical wall between bottom zones
      else if (r > 9 && (c === 7 || c === 15 || c === 23)) {
        tiles.push(W);
      }
      // Top-left zone: Command area (cols 1-6, rows 1-8)
      else if (c >= 1 && c <= 6 && r >= 1 && r <= 8) {
        tiles.push(F1);
      }
      // Top-center-left zone: Meeting room (cols 8-14, rows 1-8)
      else if (c >= 8 && c <= 14 && r >= 1 && r <= 8) {
        tiles.push(F2);
      }
      // Top-center-right zone: Situation room (cols 16-22, rows 1-8)
      else if (c >= 16 && c <= 22 && r >= 1 && r <= 8) {
        tiles.push(F3);
      }
      // Top-right zone: Development area (cols 24-28, rows 1-8)
      else if (c >= 24 && c <= 28 && r >= 1 && r <= 8) {
        tiles.push(F4);
      }
      // Bottom-left zone: Design area (cols 1-6, rows 10-18)
      else if (c >= 1 && c <= 6 && r >= 10 && r <= 18) {
        tiles.push(F5);
      }
      // Bottom-center-left zone: Server room (cols 8-14, rows 10-18)
      else if (c >= 8 && c <= 14 && r >= 10 && r <= 18) {
        tiles.push(F6);
      }
      // Bottom-center-right zone: Research area (cols 16-22, rows 10-18)
      else if (c >= 16 && c <= 22 && r >= 10 && r <= 18) {
        tiles.push(F7);
      }
      // Bottom-right zone: Lounge area (cols 24-28, rows 10-18)
      else if (c >= 24 && c <= 28 && r >= 10 && r <= 18) {
        tiles.push(F8);
      }
      else {
        tiles.push(V);
      }
    }
  }

  // Add doorways in vertical walls
  // Command -> Meeting doorway (col 7, rows 4-5)
  tiles[4 * COLS + 7] = F9;
  tiles[5 * COLS + 7] = F9;
  // Meeting -> Situation doorway (col 15, rows 4-5)
  tiles[4 * COLS + 15] = F9;
  tiles[5 * COLS + 15] = F9;
  // Situation -> Dev doorway (col 23, rows 4-5)
  tiles[4 * COLS + 23] = F9;
  tiles[5 * COLS + 23] = F9;

  // Design -> Server doorway (col 7, rows 13-14)
  tiles[13 * COLS + 7] = F9;
  tiles[14 * COLS + 7] = F9;
  // Server -> Research doorway (col 15, rows 13-14)
  tiles[13 * COLS + 15] = F9;
  tiles[14 * COLS + 15] = F9;
  // Research -> Lounge doorway (col 23, rows 13-14)
  tiles[13 * COLS + 23] = F9;
  tiles[14 * COLS + 23] = F9;

  return tiles;
}

function buildDefaultFurniture(): PlacedFurniture[] {
  let uid = 0;
  const f = (type: FurnitureType, col: number, row: number): PlacedFurniture => ({
    uid: `f-${uid++}`,
    type,
    col,
    row,
  });

  return [
    // ─── Command Area ───
    f('desk_front', 2, 4),        // Desk for orchestrator
    f('chair_front', 3, 6),        // Chair
    f('pc_front_on', 3, 3),        // PC monitor
    f('command_screen', 1, 1),     // Large command screen
    f('plant', 5, 1),              // Plant

    // ─── Meeting Room ───
    f('meeting_table', 10, 3),     // Meeting table
    f('chair_front', 11, 2),       // Chair north
    f('chair_front', 13, 2),       // Chair north
    f('chair_back', 11, 7),        // Chair south
    f('chair_back', 13, 7),        // Chair south
    f('plant', 8, 1),              // Plant
    f('whiteboard', 12, 1),        // Whiteboard

    // ─── Situation Room ───
    f('desk_front', 17, 4),        // Desk 1
    f('chair_front', 18, 6),       // Chair 1
    f('pc_front_on', 18, 3),       // PC 1
    f('desk_front', 20, 4),        // Desk 2
    f('chair_front', 21, 6),       // Chair 2
    f('pc_front_on', 21, 3),       // PC 2
    f('whiteboard', 19, 1),        // Whiteboard

    // ─── Development Area ───
    f('desk_front', 25, 3),        // Desk 1
    f('chair_front', 26, 5),       // Chair 1
    f('pc_front_on', 26, 2),       // PC 1
    f('desk_front', 25, 6),        // Desk 2
    f('chair_front', 26, 8),       // Chair 2
    f('pc_front_on', 26, 5),       // PC 2

    // ─── Design Area ───
    f('desk_front', 2, 13),        // Desk
    f('chair_front', 3, 15),       // Chair
    f('pc_front_on', 3, 12),       // PC
    f('whiteboard', 4, 10),        // Whiteboard
    f('plant', 5, 10),             // Plant

    // ─── Server Room ───
    f('server_rack', 9, 10),       // Server rack 1
    f('server_rack', 11, 10),      // Server rack 2
    f('desk_front', 11, 14),       // Desk
    f('chair_front', 12, 16),      // Chair
    f('pc_front_on', 12, 13),      // PC
    f('desk_front', 9, 14),        // Desk 2 for standing eng
    f('chair_front', 10, 16),      // Chair 2

    // ─── Research Area ───
    f('bookshelf', 17, 10),        // Bookshelf
    f('desk_front', 19, 13),       // Desk
    f('chair_front', 20, 15),      // Chair
    f('pc_front_on', 20, 12),      // PC
    f('plant', 21, 10),            // Plant

    // ─── Lounge Area ───
    f('sofa_front', 25, 13),       // Sofa
    f('chair_front', 26, 16),      // Chair for lounge agent
    f('coffee_machine', 27, 10),   // Coffee machine
    f('plant', 24, 10),            // Plant
  ];
}

/** Build seat assignments from furniture layout */
export function buildSeats(furniture: PlacedFurniture[]): Map<string, Seat> {
  const seats = new Map<string, Seat>();
  let seatIdx = 0;

  // Desk positions determine where seats go
  // For each desk, the seat is in front of it (facing the desk)
  for (const item of furniture) {
    if (item.type === 'chair_front') {
      seats.set(item.uid, {
        uid: item.uid,
        seatCol: item.col,
        seatRow: item.row,
        facingDir: Dir.UP,  // Facing the desk (monitor is above)
        assigned: false,
        assignedAgentId: null,
      });
      seatIdx++;
    } else if (item.type === 'chair_back') {
      seats.set(item.uid, {
        uid: item.uid,
        seatCol: item.col,
        seatRow: item.row,
        facingDir: Dir.DOWN,
        assigned: false,
        assignedAgentId: null,
      });
      seatIdx++;
    } else if (item.type === 'chair_side') {
      seats.set(item.uid, {
        uid: item.uid,
        seatCol: item.col,
        seatRow: item.row,
        facingDir: Dir.LEFT,
        assigned: false,
        assignedAgentId: null,
      });
      seatIdx++;
    }
  }

  return seats;
}

/** Create the default office layout */
export function createDefaultLayout(): OfficeLayout {
  return {
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

/** Get furniture blocked tiles */
export function getBlockedTiles(furniture: PlacedFurniture[]): Set<string> {
  const tiles = new Set<string>();
  // Block desk tiles and server rack tiles
  for (const item of furniture) {
    if (item.type === 'desk_front' || item.type === 'desk_side') {
      tiles.add(`${item.col},${item.row}`);
      tiles.add(`${item.col + 1},${item.row}`);
      tiles.add(`${item.col + 2},${item.row}`);
    } else if (item.type === 'meeting_table') {
      for (let dc = 0; dc < 4; dc++) {
        for (let dr = 0; dr < 2; dr++) {
          tiles.add(`${item.col + dc},${item.row + dr}`);
        }
      }
    } else if (item.type === 'server_rack') {
      tiles.add(`${item.col},${item.row}`);
      tiles.add(`${item.col + 1},${item.row}`);
      tiles.add(`${item.col},${item.row + 1}`);
      tiles.add(`${item.col + 1},${item.row + 1}`);
    } else if (item.type === 'bookshelf') {
      tiles.add(`${item.col},${item.row}`);
      tiles.add(`${item.col + 1},${item.row}`);
    } else if (item.type === 'whiteboard') {
      tiles.add(`${item.col},${item.row}`);
      tiles.add(`${item.col + 1},${item.row}`);
      tiles.add(`${item.col + 2},${item.row}`);
    } else if (item.type === 'sofa_front') {
      for (let dc = 0; dc < 4; dc++) tiles.add(`${item.col + dc},${item.row}`);
    } else if (item.type === 'command_screen') {
      for (let dc = 0; dc < 6; dc++) for (let dr = 0; dr < 3; dr++) tiles.add(`${item.col + dc},${item.row + dr}`);
    } else if (item.type === 'pc_front_on' || item.type === 'pc_front_off' || item.type === 'pc_side') {
      tiles.add(`${item.col},${item.row}`);
    } else if (item.type === 'coffee_machine') {
      tiles.add(`${item.col},${item.row}`);
    } else if (item.type === 'plant') {
      tiles.add(`${item.col},${item.row}`);
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

/** Map our agent zone names to seat assignments */
export function getZoneSeats(zoneKey: string, seats: Map<string, Seat>): Seat[] {
  const zoneTiles = getZoneTileRange(zoneKey);
  const result: Seat[] = [];
  for (const [, seat] of seats) {
    if (seat.seatCol >= zoneTiles.minCol && seat.seatCol <= zoneTiles.maxCol &&
        seat.seatRow >= zoneTiles.minRow && seat.seatRow <= zoneTiles.maxRow) {
      result.push(seat);
    }
  }
  return result;
}

function getZoneTileRange(zoneKey: string): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
  switch (zoneKey) {
    case 'command_area': return { minCol: 1, maxCol: 6, minRow: 1, maxRow: 8 };
    case 'meeting_room': return { minCol: 8, maxCol: 14, minRow: 1, maxRow: 8 };
    case 'situation_room': return { minCol: 16, maxCol: 22, minRow: 1, maxRow: 8 };
    case 'development_area': return { minCol: 24, maxCol: 28, minRow: 1, maxRow: 8 };
    case 'design_area': return { minCol: 1, maxCol: 6, minRow: 10, maxRow: 18 };
    case 'server_room': return { minCol: 8, maxCol: 14, minRow: 10, maxRow: 18 };
    case 'research_area': return { minCol: 16, maxCol: 22, minRow: 10, maxRow: 18 };
    case 'lounge_area': return { minCol: 24, maxCol: 28, minRow: 10, maxRow: 18 };
    default: return { minCol: 24, maxCol: 28, minRow: 10, maxRow: 18 };
  }
}
