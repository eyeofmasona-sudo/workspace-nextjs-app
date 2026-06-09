// ─── Agent OS — Pixel Office Engine (1:1 pixel-agents architecture) ──
// OfficeState class with full FSM, matrix spawn/despawn effect,
// auto-on furniture, camera follow, and agent sync.

import type { CharPalette, CharacterState, Direction, FurnitureInstance, OfficeLayout, PixelCharacter, Seat, TileType, SpriteData } from './pixelTypes';
import { CharacterState as CS, Direction as Dir, TILE_SIZE, agentStatusToCharState, isReadingTool } from './pixelTypes';
import { getRolePalette, getCharacterSprites, getCharacterSprite as getCharSprite, pickDiversePalette,
  getDeskFrontSprite, getChairFrontSprite, getChairBackSprite, getChairSideSprite,
  getPCFrontOnSprite, getPCFrontOffSprite, getPCSideSprite,
  getMeetingTableSprite, getServerRackSprite, getBookshelfSprite,
  getWhiteboardSprite, getSofaFrontSprite, getCoffeeMachineSprite,
  getPlantSprite, getCommandScreenSprite,
} from './pixelSprites';
import {
  createDefaultLayout, layoutToTileMap, buildSeats, getBlockedTiles,
  getWalkableTiles, findPath, getZoneForTile, isWalkable, getCatalogEntry, getZoneSeats,
} from './pixelLayout';
import { renderFrame } from './pixelRenderer';

// ── Animation timing constants ──────────────────────────────────
const TYPE_FRAME_DURATION = 0.3;
const WALK_FRAME_DURATION = 0.15;
const WALK_SPEED = 48;
const BUBBLE_FADE_DURATION = 0.5;
const MATRIX_EFFECT_DURATION = 0.3;
const MATRIX_TRAIL_LENGTH = 6;
const MAX_DELTA_TIME = 0.1;
const SEAT_REST_MIN = 120; // seconds
const SEAT_REST_MAX = 240;
const WANDER_DELAY_MIN = 5;
const WANDER_DELAY_MAX = 15;
const WANDER_LIMIT = 3;

// ── Sprite lookup for furniture ────────────────────────────────
function getFurnitureSpriteData(type: string, isActive: boolean, animFrame: number): SpriteData | null {
  switch (type) {
    case 'desk_front': return getDeskFrontSprite();
    case 'chair_front': return getChairFrontSprite();
    case 'chair_back': return getChairBackSprite();
    case 'chair_side': return getChairSideSprite();
    case 'pc_front_on': return getPCFrontOnSprite(animFrame);
    case 'pc_front_off': return getPCFrontOffSprite();
    case 'pc_side': return getPCSideSprite();
    case 'meeting_table': return getMeetingTableSprite();
    case 'server_rack': return getServerRackSprite(isActive);
    case 'bookshelf': return getBookshelfSprite();
    case 'whiteboard': return getWhiteboardSprite();
    case 'sofa_front': return getSofaFrontSprite();
    case 'coffee_machine': return getCoffeeMachineSprite();
    case 'plant': return getPlantSprite();
    case 'command_screen': return getCommandScreenSprite(isActive);
    default: return null;
  }
}

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
  furnitureAnimTimer = 0;

  // Camera
  cameraFollowId: string | null = null;
  cameraX = 0;
  cameraY = 0;
  selectedAgentId: string | null = null;
  hoveredAgentId: string | null = null;

  // Canvas
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId = 0;
  private lastTime = 0;
  private _zoom = 3;
  panX = 0;
  panY = 0;

  // Character sprite sets cache
  private charSpriteSets = new Map<string, ReturnType<typeof getCharacterSprites>>();

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
      const dt = this.lastTime === 0 ? 0 : Math.min((time - this.lastTime) / 1000, MAX_DELTA_TIME);
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

  getLayout(): OfficeLayout { return this.layout; }

  // ── Character sprite sets ──────────────────────────────────
  private getCharSpriteSet(palette: CharPalette, hueShift: number) {
    const key = `${palette.skin}-${palette.shirt}:${hueShift}`;
    let set = this.charSpriteSets.get(key);
    if (!set) {
      set = getCharacterSprites(palette, hueShift);
      this.charSpriteSets.set(key, set);
    }
    return set;
  }

  // ── Agent management ────────────────────────────────────────
  syncAgents(agents: Array<{
    id: string; name: string; role: string; status: string;
    locationZone: string; runtimeState?: { status?: string; locationZone?: string } | null;
    profile?: { displayName?: string } | null;
  }>) {
    const activeIds = new Set(agents.map(a => a.id));

    // Remove characters not in the new data — start despawn
    for (const [id] of this.characters) {
      if (!activeIds.has(id)) {
        const ch = this.characters.get(id)!;
        if (!ch.matrixEffect) {
          ch.matrixEffect = 'despawn';
          ch.matrixTimer = 0;
          ch.matrixEffectSeeds = Array.from({ length: 16 }, () => Math.random());
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
        // Create new character — spawn with matrix effect
        const palette = getRolePalette(agent.role);
        const { paletteIndex, hueShift } = pickDiversePalette();
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
          y: tileRow * TILE_SIZE + TILE_SIZE,
          tileCol,
          tileRow,
          path: [],
          moveProgress: 0,
          frame: 0,
          frameTimer: 0,
          seatTimer: 0,
          wanderTimer: WANDER_DELAY_MIN + Math.random() * (WANDER_DELAY_MAX - WANDER_DELAY_MIN),
          wanderLimit: WANDER_LIMIT,
          wanderCount: 0,
          palette,
          paletteIndex,
          hueShift,
          seatId: seat ? seat.uid : null,
          isActive: status !== 'offline' && status !== 'idle' && status !== 'done',
          agentStatus: status,
          currentTool: null,
          roleLabel: this.getRoleLabel(agent.role),
          zoneKey: zone,
          bubbleType: this.getBubbleForStatus(status),
          bubbleTimer: status === 'waiting_approval' ? 999 : 0,
          bubbleFade: 0,
          matrixEffect: 'spawn',
          matrixTimer: 0,
          matrixEffectSeeds: Array.from({ length: 16 }, () => Math.random()),
          hovered: false,
          selected: false,
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
        const wasActive = ch.isActive;
        ch.isActive = status !== 'offline' && status !== 'idle' && status !== 'done';
        ch.roleLabel = this.getRoleLabel(agent.role);

        // If became active, start TYPE state
        if (ch.isActive && !wasActive) {
          if (ch.seatId) {
            const seat = this.seats.get(ch.seatId);
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CS.TYPE;
              ch.dir = seat.facingDir;
              ch.frame = 0;
              ch.frameTimer = 0;
            }
          }
        }

        // If became inactive, start rest timer
        if (!ch.isActive && wasActive && ch.state === CS.TYPE) {
          ch.seatTimer = SEAT_REST_MIN + Math.random() * (SEAT_REST_MAX - SEAT_REST_MIN);
        }

        // Update state based on status
        if (ch.state !== CS.WALK) {
          const newState = agentStatusToCharState(status);
          if (newState !== ch.state) {
            ch.state = newState;
            ch.frame = 0;
            ch.frameTimer = 0;
          }
        }

        // Update bubble
        if (status === 'waiting_approval') {
          ch.bubbleType = 'permission';
          ch.bubbleTimer = 999;
          ch.bubbleFade = 1;
        } else if (status === 'waiting_api') {
          ch.bubbleType = 'waiting';
          ch.bubbleTimer = 2.0;
          ch.bubbleFade = 1;
        } else if (status !== oldStatus) {
          if (ch.bubbleType) {
            ch.bubbleFade = 0;
            ch.bubbleTimer = BUBBLE_FADE_DURATION;
          } else {
            ch.bubbleType = null;
            ch.bubbleTimer = 0;
          }
        }

        // Handle zone change
        if (zone !== oldZone) {
          const newSeat = this.findFreeSeatForZone(zone);
          if (newSeat) {
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

            const path = findPath(ch.tileCol, ch.tileRow, newSeat.seatCol, newSeat.seatRow, this.tileMap, this.blockedTiles);
            if (path.length > 0) {
              ch.path = path;
              ch.moveProgress = 0;
              ch.state = CS.WALK;
            } else {
              ch.tileCol = newSeat.seatCol;
              ch.tileRow = newSeat.seatRow;
              ch.x = newSeat.seatCol * TILE_SIZE + TILE_SIZE / 2;
              ch.y = newSeat.seatRow * TILE_SIZE + TILE_SIZE;
              ch.dir = newSeat.facingDir;
              ch.state = agentStatusToCharState(status);
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

  private getBubbleForStatus(status: string): 'permission' | 'waiting' | null {
    switch (status) {
      case 'waiting_approval': return 'permission';
      case 'waiting_api': return 'waiting';
      default: return null;
    }
  }

  private findFreeSeatForZone(zoneKey: string): Seat | null {
    const zoneSeats = getZoneSeats(zoneKey, this.seats);
    for (const seat of zoneSeats) {
      if (!seat.assigned) return seat;
    }
    for (const [, seat] of this.seats) {
      if (!seat.assigned) return seat;
    }
    return null;
  }

  // ── Build furniture render instances ────────────────────────
  private buildFurnitureInstances(): FurnitureInstance[] {
    // Track which tiles have active agents facing them (for auto-on)
    const activeFacingTiles = new Set<string>();
    for (const ch of this.characters.values()) {
      if (ch.isActive && ch.seatId) {
        const seat = this.seats.get(ch.seatId);
        if (seat) {
          const facingDx = seat.facingDir === Dir.RIGHT ? 1 : seat.facingDir === Dir.LEFT ? -1 : 0;
          const facingDy = seat.facingDir === Dir.DOWN ? 1 : seat.facingDir === Dir.UP ? -1 : 0;
          // Check up to 3 tiles in facing direction
          for (let depth = 0; depth < 3; depth++) {
            activeFacingTiles.add(`${seat.seatCol + facingDx * (depth + 1)},${seat.seatRow + facingDy * (depth + 1)}`);
          }
          // Check 1 tile to the sides
          const sideDx = facingDy !== 0 ? 1 : 0;
          const sideDy = facingDx !== 0 ? 1 : 0;
          for (let depth = 0; depth < 2; depth++) {
            activeFacingTiles.add(`${seat.seatCol + facingDx * depth + sideDx},${seat.seatRow + facingDy * depth + sideDy}`);
            activeFacingTiles.add(`${seat.seatCol + facingDx * depth - sideDx},${seat.seatRow + facingDy * depth - sideDy}`);
          }
        }
      }
    }

    const instances: FurnitureInstance[] = [];
    for (const item of this.layout.furniture) {
      const entry = getCatalogEntry(item.type);
      if (!entry) continue;

      const px = item.col * TILE_SIZE;
      const py = item.row * TILE_SIZE;
      const isActive = activeFacingTiles.has(`${item.col},${item.row}`);
      const animFrame = Math.floor(this.furnitureAnimTimer / 0.5) % 3;

      const sprite = getFurnitureSpriteData(item.type, isActive, animFrame);
      if (!sprite) continue;

      // Sprite height for z-sorting
      const spriteH = sprite.length;
      const spriteW = sprite[0]?.length ?? 0;

      // Z-sort value: bottom edge of sprite
      let zY = (item.row + entry.footprintH) * TILE_SIZE;

      // Desk zY pre-computation for surface items
      if (entry.isDesk) {
        zY = item.row * TILE_SIZE + spriteH;
      }

      // Chair z-sorting: back-facing chairs render in front of seated character
      if (entry.category === 'chairs') {
        if (entry.orientation === 'back') {
          zY = (item.row + entry.footprintH) * TILE_SIZE + 1;
        } else {
          zY = (item.row + 1) * TILE_SIZE;
        }
      }

      // Surface items get boosted zY
      if (entry.canPlaceOnSurfaces) {
        // Check if this overlaps a desk
        for (const other of this.layout.furniture) {
          const otherEntry = getCatalogEntry(other.type);
          if (otherEntry?.isDesk) {
            if (item.col >= other.col && item.col < other.col + otherEntry.footprintW &&
                item.row >= other.row && item.row < other.row + otherEntry.footprintH) {
              zY = other.row * TILE_SIZE + 0.5;
              break;
            }
          }
        }
      }

      instances.push({
        type: item.type,
        sprite,
        x: px,
        y: py,
        zY,
        w: spriteW,
        h: spriteH,
        mirrored: item.mirrored,
        isActive,
        offsetY: entry.backgroundTiles > 0 ? -entry.backgroundTiles * TILE_SIZE : 0,
      });
    }
    return instances;
  }

  // ── Update loop ──────────────────────────────────────────────
  private update(dt: number) {
    this.animTimer += dt;
    this.furnitureAnimTimer += dt;

    const charsToRemove: string[] = [];

    for (const ch of this.characters.values()) {
      ch.frameTimer += dt;

      // Matrix effect update
      if (ch.matrixEffect) {
        ch.matrixTimer += dt;
        if (ch.matrixTimer >= MATRIX_EFFECT_DURATION) {
          if (ch.matrixEffect === 'despawn') {
            charsToRemove.push(ch.id);
            // Free seat
            if (ch.seatId) {
              const seat = this.seats.get(ch.seatId);
              if (seat) {
                seat.assigned = false;
                seat.assignedAgentId = null;
              }
            }
          }
          ch.matrixEffect = null;
          ch.matrixTimer = 0;
        }
        continue; // Skip normal updates during matrix effect
      }

      // Bubble fade
      if (ch.bubbleType && ch.bubbleTimer > 0 && ch.bubbleTimer < 999) {
        ch.bubbleTimer -= dt;
        if (ch.bubbleTimer <= 0) {
          ch.bubbleType = null;
          ch.bubbleTimer = 0;
          ch.bubbleFade = 0;
        }
      }

      switch (ch.state) {
        case CS.TYPE: {
          if (ch.frameTimer >= TYPE_FRAME_DURATION) {
            ch.frameTimer -= TYPE_FRAME_DURATION;
            ch.frame = (ch.frame + 1) % 2;
          }
          // If inactive, count down seat timer
          if (!ch.isActive) {
            ch.seatTimer -= dt;
            if (ch.seatTimer <= 0) {
              ch.state = CS.IDLE;
              ch.frame = 0;
              ch.frameTimer = 0;
              ch.wanderTimer = WANDER_DELAY_MIN + Math.random() * (WANDER_DELAY_MAX - WANDER_DELAY_MIN);
              ch.wanderCount = 0;
            }
          }
          break;
        }

        case CS.IDLE: {
          ch.frame = 0;
          // If became active, go to seat
          if (ch.isActive && ch.seatId) {
            const seat = this.seats.get(ch.seatId);
            if (seat && (ch.tileCol !== seat.seatCol || ch.tileRow !== seat.seatRow)) {
              const path = findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, this.tileMap, this.blockedTiles);
              if (path.length > 0) {
                ch.path = path;
                ch.moveProgress = 0;
                ch.state = CS.WALK;
                break;
              }
            }
            ch.state = CS.TYPE;
            ch.frame = 0;
            ch.frameTimer = 0;
            if (seat) ch.dir = seat.facingDir;
            break;
          }

          // Wander timer
          ch.wanderTimer -= dt;
          if (ch.wanderTimer <= 0 && ch.wanderCount < ch.wanderLimit) {
            // Pick random walkable tile
            const target = this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)];
            if (target) {
              const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, this.tileMap, this.blockedTiles);
              if (path.length > 0) {
                ch.path = path;
                ch.moveProgress = 0;
                ch.state = CS.WALK;
                ch.wanderCount++;
                break;
              }
            }
            ch.wanderTimer = WANDER_DELAY_MIN;
          }

          // If exceeded wander limit, return to seat
          if (ch.wanderCount >= ch.wanderLimit && ch.seatId) {
            const seat = this.seats.get(ch.seatId);
            if (seat && (ch.tileCol !== seat.seatCol || ch.tileRow !== seat.seatRow)) {
              const path = findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, this.tileMap, this.blockedTiles);
              if (path.length > 0) {
                ch.path = path;
                ch.moveProgress = 0;
                ch.state = CS.WALK;
                ch.wanderCount = 0;
              }
            } else {
              ch.wanderCount = 0;
              ch.wanderTimer = SEAT_REST_MIN + Math.random() * 60;
            }
          }
          break;
        }

        case CS.WALK: {
          if (ch.frameTimer >= WALK_FRAME_DURATION) {
            ch.frameTimer -= WALK_FRAME_DURATION;
            ch.frame = (ch.frame + 1) % 4;
          }

          if (ch.path.length === 0) {
            // Arrived
            ch.x = ch.tileCol * TILE_SIZE + TILE_SIZE / 2;
            ch.y = ch.tileRow * TILE_SIZE + TILE_SIZE;

            if (ch.seatId) {
              const seat = this.seats.get(ch.seatId);
              if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
                ch.dir = seat.facingDir;
              }
            }

            if (ch.isActive) {
              ch.state = CS.TYPE;
            } else {
              ch.state = CS.IDLE;
              ch.wanderTimer = WANDER_DELAY_MIN + Math.random() * (WANDER_DELAY_MAX - WANDER_DELAY_MIN);
            }
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
          const fromY = ch.tileRow * TILE_SIZE + TILE_SIZE;
          const toX = next.col * TILE_SIZE + TILE_SIZE / 2;
          const toY = next.row * TILE_SIZE + TILE_SIZE;
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
        }
      }
    }

    // Remove despawned characters
    for (const id of charsToRemove) {
      this.characters.delete(id);
    }

    // Update furniture active states periodically
    this.furnitureInstances = this.buildFurnitureInstances();
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
      this.animTimer,
      this.furnitureAnimTimer,
    );
  }

  // ── Hit testing ─────────────────────────────────────────────
  getCharacterAtPixel(px: number, py: number): string | null {
    if (!this.canvas) return null;

    const mapW = this.layout.cols * TILE_SIZE * this._zoom;
    const mapH = this.layout.rows * TILE_SIZE * this._zoom;
    const offsetX = Math.floor((this.canvas.width - mapW) / 2) + this.panX;
    const offsetY = Math.floor((this.canvas.height - mapH) / 2) + this.panY;

    const worldX = (px - offsetX) / this._zoom;
    const worldY = (py - offsetY) / this._zoom;

    for (const ch of this.characters.values()) {
      if (ch.matrixEffect === 'despawn') continue;
      const dx = worldX - ch.x;
      const dy = worldY - ch.y;
      if (Math.abs(dx) < 10 && dy > -28 && dy < 4) {
        return ch.id;
      }
    }
    return null;
  }

  // ── Camera follow ───────────────────────────────────────────
  updateCameraFollow() {
    if (!this.cameraFollowId || !this.canvas) return;
    const ch = this.characters.get(this.cameraFollowId);
    if (!ch) return;

    const targetX = -ch.x * this._zoom + this.canvas.width / 2;
    const targetY = -ch.y * this._zoom + this.canvas.height / 2;
    this.panX += (targetX - this.panX) * 0.1;
    this.panY += (targetY - this.panY) * 0.1;
  }
}
