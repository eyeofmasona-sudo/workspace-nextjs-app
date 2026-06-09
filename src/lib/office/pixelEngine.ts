// ─── Agent OS — Pixel Office Engine ─────────────────────────────
// Game loop, character state machine, and office state management.

import type { CharState, Direction, FurnitureInstance, OfficeLayout, PixelCharacter, PlacedFurniture, Seat, TileType } from './pixelTypes';
import { CharState as CS, Direction as Dir, TILE_SIZE, agentStatusToCharState } from './pixelTypes';
import { getRolePalette } from './pixelSprites';
import {
  createDefaultLayout, layoutToTileMap, buildSeats, getBlockedTiles,
  getWalkableTiles, findPath, getZoneForTile, isWalkable,
} from './pixelLayout';
import { renderFrame } from './pixelRenderer';

// ── Animation timing constants ──────────────────────────────────
const TYPE_FRAME_DURATION = 0.3;    // seconds per typing frame
const WALK_FRAME_DURATION = 0.15;   // seconds per walk frame
const WALK_SPEED = 48;              // pixels per second
const BUBBLE_FADE_DURATION = 0.5;

// ── Office State ────────────────────────────────────────────────
export class PixelOfficeEngine {
  layout: OfficeLayout;
  tileMap: TileType[][];
  seats: Map<string, Seat>;
  blockedTiles: Set<string>;
  furnitureInstances: FurnitureInstance[];
  walkableTiles: Array<{ col: number; row: number }>;
  characters: Map<string, PixelCharacter> = new Map();
  animTimer = 0;

  // Canvas
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId = 0;
  private lastTime = 0;
  private _zoom = 3;
  panX = 0;
  panY = 0;

  constructor() {
    this.layout = createDefaultLayout();
    this.tileMap = layoutToTileMap(this.layout);
    this.seats = buildSeats(this.layout.furniture);
    this.blockedTiles = getBlockedTiles(this.layout.furniture);
    this.furnitureInstances = this.buildFurnitureInstances();
    this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles);
  }

  // ── Canvas management ───────────────────────────────────────
  attachCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  start() {
    this.lastTime = 0;
    const frame = (time: number) => {
      const dt = this.lastTime === 0 ? 0 : Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }

  setZoom(z: number) {
    this._zoom = Math.max(1, Math.min(6, z));
  }

  getZoom(): number { return this._zoom; }

  // ── Agent management ────────────────────────────────────────
  syncAgents(agents: Array<{
    id: string; name: string; role: string; status: string;
    locationZone: string; runtimeState?: { status?: string; locationZone?: string } | null;
    profile?: { displayName?: string } | null;
  }>) {
    const activeIds = new Set(agents.map(a => a.id));

    // Remove characters not in the new data
    for (const [id] of this.characters) {
      if (!activeIds.has(id)) {
        this.characters.delete(id);
        // Free seat
        for (const [, seat] of this.seats) {
          if (seat.assignedAgentId === id) {
            seat.assigned = false;
            seat.assignedAgentId = null;
          }
        }
      }
    }

    // Add/update characters
    for (const agent of agents) {
      const status = agent.runtimeState?.status ?? agent.status;
      const zone = agent.runtimeState?.locationZone ?? agent.locationZone;
      const displayName = agent.profile?.displayName ?? agent.name;

      let ch = this.characters.get(agent.id);
      if (!ch) {
        // Create new character
        const palette = getRolePalette(agent.role);
        const seat = this.findFreeSeatForZone(zone);
        const tileCol = seat ? seat.seatCol : 2;
        const tileRow = seat ? seat.seatRow : 2;

        ch = {
          id: agent.id,
          name: displayName,
          role: agent.role,
          state: agentStatusToCharState(status),
          dir: seat ? seat.facingDir : Dir.DOWN,
          x: tileCol * TILE_SIZE + TILE_SIZE / 2,
          y: tileRow * TILE_SIZE + TILE_SIZE / 2,
          tileCol,
          tileRow,
          path: [],
          moveProgress: 0,
          frame: 0,
          frameTimer: 0,
          palette,
          seatId: seat ? seat.uid : null,
          isActive: status !== 'offline' && status !== 'idle' && status !== 'done',
          agentStatus: status,
          currentTool: null,
          bubbleType: this.getBubbleForStatus(status),
          bubbleTimer: status === 'waiting_approval' ? 999 : 0,
          zoneKey: zone,
          roleLabel: this.getRoleLabel(agent.role),
        };

        if (seat) {
          seat.assigned = true;
          seat.assignedAgentId = agent.id;
        }

        this.characters.set(agent.id, ch);
      } else {
        // Update existing character
        const oldStatus = ch.agentStatus;
        const oldZone = ch.zoneKey;
        ch.name = displayName;
        ch.agentStatus = status;
        ch.zoneKey = zone;
        ch.isActive = status !== 'offline' && status !== 'idle' && status !== 'done';
        ch.roleLabel = this.getRoleLabel(agent.role);

        // Update state based on status
        const newState = agentStatusToCharState(status);
        if (newState !== ch.state) {
          ch.state = newState;
          ch.frame = 0;
          ch.frameTimer = 0;
        }

        // Update bubble
        if (status === 'waiting_approval') {
          ch.bubbleType = 'permission';
          ch.bubbleTimer = 999;
        } else if (status === 'waiting_api') {
          ch.bubbleType = 'waiting';
          ch.bubbleTimer = 2.0;
        } else if (status === 'thinking') {
          ch.bubbleType = 'thinking';
          ch.bubbleTimer = 999;
        } else if (status !== oldStatus) {
          ch.bubbleType = null;
          ch.bubbleTimer = 0;
        }

        // Handle zone change
        if (zone !== oldZone) {
          const newSeat = this.findFreeSeatForZone(zone);
          if (newSeat) {
            // Free old seat
            if (ch.seatId) {
              const oldSeat = this.seats.get(ch.seatId);
              if (oldSeat) {
                oldSeat.assigned = false;
                oldSeat.assignedAgentId = null;
              }
            }
            ch.seatId = newSeat.uid;
            newSeat.assigned = true;
            newSeat.assignedAgentId = agent.id;
            ch.dir = newSeat.facingDir;

            // Walk to new seat
            const path = findPath(ch.tileCol, ch.tileRow, newSeat.seatCol, newSeat.seatRow, this.tileMap, this.blockedTiles);
            if (path.length > 0) {
              ch.path = path;
              ch.moveProgress = 0;
              ch.state = CS.WALKING;
            } else {
              // Already there or no path
              ch.tileCol = newSeat.seatCol;
              ch.tileRow = newSeat.seatRow;
              ch.x = newSeat.seatCol * TILE_SIZE + TILE_SIZE / 2;
              ch.y = newSeat.seatRow * TILE_SIZE + TILE_SIZE / 2;
            }
          }
        }
      }
    }

    // Update furniture active states
    this.furnitureInstances = this.buildFurnitureInstances();
  }

  private getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      orchestrator: 'Orchestrator',
      analyst: 'Research Specialist',
      architect: 'Architect',
      designer: 'Designer',
      frontend_engineer: 'Frontend Eng',
      backend_engineer: 'Backend Eng',
      data_engineer: 'Database Eng',
      qa_engineer: 'QA Engineer',
      devops_engineer: 'DevOps Eng',
      researcher: 'Researcher',
    };
    return labels[role] ?? role.replace('_', ' ');
  }

  private getBubbleForStatus(status: string): 'permission' | 'waiting' | 'thinking' | null {
    switch (status) {
      case 'waiting_approval': return 'permission';
      case 'waiting_api': return 'waiting';
      case 'thinking': return 'thinking';
      default: return null;
    }
  }

  private findFreeSeatForZone(zoneKey: string): Seat | null {
    const zoneSeats = this.getZoneSeats(zoneKey);
    // Prefer unassigned seats
    for (const seat of zoneSeats) {
      if (!seat.assigned) return seat;
    }
    // If all assigned, try to find one in another zone or return null
    for (const [, seat] of this.seats) {
      if (!seat.assigned) return seat;
    }
    return null;
  }

  private getZoneSeats(zoneKey: string): Seat[] {
    const result: Seat[] = [];
    const zoneRanges: Record<string, { minCol: number; maxCol: number; minRow: number; maxRow: number }> = {
      command_area: { minCol: 1, maxCol: 6, minRow: 1, maxRow: 8 },
      meeting_room: { minCol: 8, maxCol: 14, minRow: 1, maxRow: 8 },
      situation_room: { minCol: 16, maxCol: 22, minRow: 1, maxRow: 8 },
      development_area: { minCol: 24, maxCol: 28, minRow: 1, maxRow: 8 },
      design_area: { minCol: 1, maxCol: 6, minRow: 10, maxRow: 18 },
      server_room: { minCol: 8, maxCol: 14, minRow: 10, maxRow: 18 },
      research_area: { minCol: 16, maxCol: 22, minRow: 10, maxRow: 18 },
      lounge_area: { minCol: 24, maxCol: 28, minRow: 10, maxRow: 18 },
    };
    const range = zoneRanges[zoneKey] ?? zoneRanges.lounge_area;
    for (const [, seat] of this.seats) {
      if (seat.seatCol >= range.minCol && seat.seatCol <= range.maxCol &&
          seat.seatRow >= range.minRow && seat.seatRow <= range.maxRow) {
        result.push(seat);
      }
    }
    return result;
  }

  // ── Build furniture render instances ────────────────────────
  private buildFurnitureInstances(): FurnitureInstance[] {
    const hasActive = new Set<string>();
    for (const ch of this.characters.values()) {
      if (ch.isActive && ch.seatId) {
        const seat = this.seats.get(ch.seatId);
        if (seat) {
          // Mark desk in front of seat as active
          const dCol = seat.facingDir === Dir.RIGHT ? 1 : seat.facingDir === Dir.LEFT ? -1 : 0;
          const dRow = seat.facingDir === Dir.DOWN ? 1 : seat.facingDir === Dir.UP ? -1 : 0;
          hasActive.add(`${seat.seatCol + dCol},${seat.seatRow + dRow}`);
          hasActive.add(`${seat.seatCol + dCol * 2},${seat.seatRow + dRow * 2}`);
          hasActive.add(`${seat.seatCol},${seat.seatRow + dRow}`);
        }
      }
    }

    const instances: FurnitureInstance[] = [];
    for (const item of this.layout.furniture) {
      const px = item.col * TILE_SIZE;
      const py = item.row * TILE_SIZE;
      const isActive = hasActive.has(`${item.col},${item.row}`);

      let w = 16, h = 16;
      switch (item.type) {
        case 'desk_front': w = 48; h = 24; break;
        case 'desk_side': w = 16; h = 24; break;
        case 'meeting_table': w = 64; h = 32; break;
        case 'server_rack': w = 32; h = 48; break;
        case 'bookshelf': w = 32; h = 40; break;
        case 'whiteboard': w = 48; h = 32; break;
        case 'sofa_front': w = 64; h = 24; break;
        case 'command_screen': w = 96; h = 48; break;
        default: break;
      }

      instances.push({
        type: item.type,
        x: px,
        y: py,
        zY: py + h,
        w,
        h,
        mirrored: item.mirrored,
        isActive,
      });
    }
    return instances;
  }

  // ── Update loop ──────────────────────────────────────────────
  private update(dt: number) {
    this.animTimer += dt;

    for (const ch of this.characters.values()) {
      ch.frameTimer += dt;

      // Bubble timer
      if (ch.bubbleType === 'waiting') {
        ch.bubbleTimer -= dt;
        if (ch.bubbleTimer <= 0) {
          ch.bubbleType = null;
          ch.bubbleTimer = 0;
        }
      }

      switch (ch.state) {
        case CS.TYPING:
        case CS.READING:
          // Animate typing/reading
          if (ch.frameTimer >= TYPE_FRAME_DURATION) {
            ch.frameTimer -= TYPE_FRAME_DURATION;
            ch.frame = (ch.frame + 1) % 2;
          }
          break;

        case CS.WALKING:
          // Walk animation
          if (ch.frameTimer >= WALK_FRAME_DURATION) {
            ch.frameTimer -= WALK_FRAME_DURATION;
            ch.frame = (ch.frame + 1) % 4;
          }

          if (ch.path.length === 0) {
            // Arrived — snap to tile center and sit down
            const cx = ch.tileCol * TILE_SIZE + TILE_SIZE / 2;
            const cy = ch.tileRow * TILE_SIZE + TILE_SIZE / 2;
            ch.x = cx;
            ch.y = cy;

            // If at seat, face the right direction
            if (ch.seatId) {
              const seat = this.seats.get(ch.seatId);
              if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
                ch.dir = seat.facingDir;
              }
            }

            // Transition to appropriate state
            ch.state = agentStatusToCharState(ch.agentStatus);
            ch.frame = 0;
            ch.frameTimer = 0;
            break;
          }

          // Move toward next tile
          const next = ch.path[0];
          const dx = next.col - ch.tileCol;
          const dy = next.row - ch.tileRow;
          if (dx > 0) ch.dir = Dir.RIGHT;
          else if (dx < 0) ch.dir = Dir.LEFT;
          else if (dy > 0) ch.dir = Dir.DOWN;
          else if (dy < 0) ch.dir = Dir.UP;

          ch.moveProgress += (WALK_SPEED / TILE_SIZE) * dt;

          const fromX = ch.tileCol * TILE_SIZE + TILE_SIZE / 2;
          const fromY = ch.tileRow * TILE_SIZE + TILE_SIZE / 2;
          const toX = next.col * TILE_SIZE + TILE_SIZE / 2;
          const toY = next.row * TILE_SIZE + TILE_SIZE / 2;
          const t = Math.min(ch.moveProgress, 1);
          ch.x = fromX + (toX - fromX) * t;
          ch.y = fromY + (toY - fromY) * t;

          if (ch.moveProgress >= 1) {
            ch.tileCol = next.col;
            ch.tileRow = next.row;
            ch.x = toX;
            ch.y = toY;
            ch.path.shift();
            ch.moveProgress = 0;
          }
          break;

        case CS.IDLE:
          ch.frame = 0;
          break;
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────
  private render() {
    if (!this.canvas || !this.ctx) return;

    const chars = Array.from(this.characters.values());
    renderFrame(
      this.ctx,
      this.canvas.width,
      this.canvas.height,
      this.tileMap,
      this.furnitureInstances,
      chars,
      this._zoom,
      this.panX,
      this.panY,
      this.layout.cols,
      this.layout.rows,
    );
  }

  // ── Hit testing ─────────────────────────────────────────────
  getCharacterAtPixel(px: number, py: number): string | null {
    if (!this.canvas) return null;

    const mapW = this.layout.cols * TILE_SIZE * this._zoom;
    const mapH = this.layout.rows * TILE_SIZE * this._zoom;
    const offsetX = Math.floor((this.canvas.width - mapW) / 2) + this.panX;
    const offsetY = Math.floor((this.canvas.height - mapH) / 2) + this.panY;

    // Convert pixel to tile coordinates
    const worldX = (px - offsetX) / this._zoom;
    const worldY = (py - offsetY) / this._zoom;

    for (const ch of this.characters.values()) {
      const sittingOffset = (ch.state === CS.TYPING || ch.state === CS.READING) ? 6 : 0;
      const dx = worldX - ch.x;
      const dy = worldY - (ch.y + sittingOffset);
      if (Math.abs(dx) < 10 && dy > -28 && dy < 4) {
        return ch.id;
      }
    }
    return null;
  }
}
