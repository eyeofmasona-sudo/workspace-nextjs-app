/**
 * Character FSM, creation, and sprite selection for the pixel-office engine.
 *
 * Ported 1:1 from pixel-agents/webview-ui/src/office/engine/characters.ts
 * Three-state FSM: TYPE → IDLE → WALK → TYPE
 * Agent OS extensions: behavior state machine, zone destinations, name/role.
 */

import {
  SEAT_REST_MAX_SEC,
  SEAT_REST_MIN_SEC,
  TYPE_FRAME_DURATION_SEC,
  WALK_FRAME_DURATION_SEC,
  WALK_SPEED_PX_PER_SEC,
  WANDER_MOVES_BEFORE_REST_MAX,
  WANDER_MOVES_BEFORE_REST_MIN,
  WANDER_PAUSE_MAX_SEC,
  WANDER_PAUSE_MIN_SEC,
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
  DONE_BUBBLE_DURATION_SEC,
} from '../constants';
import { findPath } from '../layout/tileMap';
import type { CharacterSprites } from '../sprites/spriteData';
import { isReadingToolName } from '../toolUtils';
import type {
  Character,
  Seat,
  SpriteData,
  TileType as TileTypeVal,
  ZoneDestination,
} from '../types';
import {
  BehaviorState,
  CharacterState,
  Direction,
  TILE_SIZE,
} from '../types';

// ── Tool animation helpers ────────────────────────────────────────

/** Whether a tool should show the reading animation (vs typing). Taxonomy comes
 *  from the active HookProvider via the `providerCapabilities` message. */
export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false;
  return isReadingToolName(tool);
}

// ── Geometry helpers ──────────────────────────────────────────────

/** Pixel center of a tile */
export function tileCenter(col: number, row: number): {
  x: number;
  y: number;
} {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

/** Direction from one tile to an adjacent tile */
function directionBetween(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): Direction {
  const dc = toCol - fromCol;
  const dr = toRow - fromRow;
  if (dc > 0) return Direction.RIGHT;
  if (dc < 0) return Direction.LEFT;
  if (dr > 0) return Direction.DOWN;
  return Direction.UP;
}

// ── Character creation ────────────────────────────────────────────

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
  name = '',
  role = '',
): Character {
  const col = seat ? seat.seatCol : 1;
  const row = seat ? seat.seatRow : 1;
  const center = tileCenter(col, row);
  return {
    id,
    state: CharacterState.TYPE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    wanderTimer: 0,
    wanderCount: 0,
    wanderLimit: randomInt(
      WANDER_MOVES_BEFORE_REST_MIN,
      WANDER_MOVES_BEFORE_REST_MAX,
    ),
    isActive: true,
    seatId,
    bubbleType: null,
    bubbleTimer: 0,
    seatTimer: 0,
    isSubagent: false,
    parentAgentId: null,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
    inputTokens: 0,
    outputTokens: 0,
    // Agent OS extensions
    name,
    role,
    agentStatus: 'idle',
    behaviorState: BehaviorState.WORKING,
    behaviorTimer: randomRange(
      BEHAVIOR_WORKING_MIN_SEC,
      BEHAVIOR_WORKING_MAX_SEC,
    ),
    targetTile: null,
    eventOverride: false,
  };
}

// ── Behavior state machine ────────────────────────────────────────

// Pick next behavior state based on weighted probabilities
// Working 70%, Meeting 10%, Break 5%, Research 10%, Idle 5%
function pickNextBehavior(): BehaviorState {
  const roll = Math.random() * 100;
  if (roll < 70) return BehaviorState.WORKING;
  if (roll < 80) return BehaviorState.MEETING;
  if (roll < 85) return BehaviorState.BREAK;
  if (roll < 95) return BehaviorState.RESEARCH;
  return BehaviorState.IDLE;
}

function getBehaviorDuration(state: BehaviorState): number {
  switch (state) {
    case BehaviorState.WORKING:
      return randomRange(BEHAVIOR_WORKING_MIN_SEC, BEHAVIOR_WORKING_MAX_SEC);
    case BehaviorState.MEETING:
      return randomRange(BEHAVIOR_MEETING_MIN_SEC, BEHAVIOR_MEETING_MAX_SEC);
    case BehaviorState.BREAK:
      return randomRange(BEHAVIOR_BREAK_MIN_SEC, BEHAVIOR_BREAK_MAX_SEC);
    case BehaviorState.RESEARCH:
      return randomRange(BEHAVIOR_RESEARCH_MIN_SEC, BEHAVIOR_RESEARCH_MAX_SEC);
    case BehaviorState.IDLE:
      return randomRange(BEHAVIOR_IDLE_MIN_SEC, BEHAVIOR_IDLE_MAX_SEC);
    default:
      return 30;
  }
}

function getTargetForBehavior(
  ch: Character,
  zoneDestinations: Record<string, ZoneDestination[]>,
): ZoneDestination | null {
  const dests = zoneDestinations[ch.behaviorState];
  if (!dests || dests.length === 0) return null;
  return dests[Math.floor(Math.random() * dests.length)];
}

function startWalkingToTarget(
  ch: Character,
  target: ZoneDestination,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  _seats: Map<string, Seat>,
): void {
  const path = findPath(
    ch.tileCol,
    ch.tileRow,
    target.col,
    target.row,
    tileMap,
    blockedTiles,
  );
  if (path.length > 0) {
    ch.path = path;
    ch.moveProgress = 0;
    ch.state = CharacterState.WALK;
    ch.frame = 0;
    ch.frameTimer = 0;
  } else {
    // Can't find path, stay at seat
    ch.behaviorState = BehaviorState.WORKING;
    ch.targetTile = null;
  }
}

function startWalkingToSeat(
  ch: Character,
  seat: Seat,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
): void {
  const path = findPath(
    ch.tileCol,
    ch.tileRow,
    seat.seatCol,
    seat.seatRow,
    tileMap,
    blockedTiles,
  );
  if (path.length > 0) {
    ch.path = path;
    ch.moveProgress = 0;
    ch.state = CharacterState.WALK;
    ch.frame = 0;
    ch.frameTimer = 0;
    ch.targetTile = null;
  } else {
    ch.state = CharacterState.TYPE;
    ch.dir = seat.facingDir;
    ch.frame = 0;
    ch.frameTimer = 0;
  }
}

// ── Character update (FSM) ────────────────────────────────────────

export function updateCharacter(
  ch: Character,
  dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  zoneDestinations: Record<string, ZoneDestination[]>,
): void {
  ch.frameTimer += dt;

  // ─── Behavior state machine ───
  if (ch.isActive) {
    ch.behaviorTimer -= dt;
    if (ch.behaviorTimer <= 0 && !ch.eventOverride) {
      const newState = pickNextBehavior();
      ch.behaviorState = newState;
      ch.behaviorTimer = getBehaviorDuration(newState);
      ch.targetTile = getTargetForBehavior(ch, zoneDestinations);
    }
    // Decay event override
    if (ch.eventOverride && ch.behaviorTimer <= 0) {
      ch.eventOverride = false;
      const newState = pickNextBehavior();
      ch.behaviorState = newState;
      ch.behaviorTimer = getBehaviorDuration(newState);
      ch.targetTile = getTargetForBehavior(ch, zoneDestinations);
    }
  } else {
    // Inactive agents just sit idle at their seat
    ch.behaviorState = BehaviorState.IDLE;
    ch.targetTile = null;
  }

  // Handle "done" bubble timer
  if (ch.bubbleType === 'done') {
    ch.bubbleTimer -= dt;
    if (ch.bubbleTimer <= 0) {
      ch.bubbleType = null;
      ch.bubbleTimer = 0;
    }
  }

  switch (ch.state) {
    case CharacterState.TYPE: {
      // Frame cycling
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 2;
      }

      // If behavior says we should be somewhere else, start walking
      if (
        ch.isActive &&
        ch.behaviorState !== BehaviorState.WORKING &&
        ch.behaviorState !== BehaviorState.IDLE &&
        ch.targetTile
      ) {
        startWalkingToTarget(
          ch,
          ch.targetTile,
          tileMap,
          blockedTiles,
          seats,
        );
        break;
      }

      // If working but not at own seat, go back to seat
      if (
        ch.isActive &&
        (ch.behaviorState === BehaviorState.WORKING ||
          ch.behaviorState === BehaviorState.IDLE) &&
        ch.seatId
      ) {
        const seat = seats.get(ch.seatId);
        if (
          seat &&
          (ch.tileCol !== seat.seatCol || ch.tileRow !== seat.seatRow)
        ) {
          startWalkingToSeat(ch, seat, tileMap, blockedTiles);
        }
      }

      // If no longer active, stand up and start wandering (after seatTimer expires)
      if (!ch.isActive) {
        if (ch.seatTimer > 0) {
          ch.seatTimer -= dt;
          break;
        }
        ch.seatTimer = 0; // clear sentinel
        ch.state = CharacterState.IDLE;
        ch.frame = 0;
        ch.frameTimer = 0;
        ch.wanderTimer = randomRange(
          WANDER_PAUSE_MIN_SEC,
          WANDER_PAUSE_MAX_SEC,
        );
        ch.wanderCount = 0;
        ch.wanderLimit = randomInt(
          WANDER_MOVES_BEFORE_REST_MIN,
          WANDER_MOVES_BEFORE_REST_MAX,
        );
      }
      break;
    }

    case CharacterState.IDLE: {
      // No idle animation — static pose
      ch.frame = 0;
      if (ch.seatTimer < 0) ch.seatTimer = 0; // clear turn-end sentinel

      // If active and behavior says to work, go back to seat
      if (ch.isActive) {
        if (
          ch.behaviorState === BehaviorState.WORKING ||
          ch.behaviorState === BehaviorState.IDLE
        ) {
          if (!ch.seatId) {
            ch.state = CharacterState.TYPE;
            ch.frame = 0;
            ch.frameTimer = 0;
            break;
          }
          const seat = seats.get(ch.seatId);
          if (seat) {
            if (
              ch.tileCol !== seat.seatCol ||
              ch.tileRow !== seat.seatRow
            ) {
              startWalkingToSeat(ch, seat, tileMap, blockedTiles);
              break;
            }
            // At own seat - start typing if working
            if (ch.behaviorState === BehaviorState.WORKING) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
              ch.frame = 0;
              ch.frameTimer = 0;
            }
            break;
          }
        }
        // Going to meeting/break/research - walk to target
        if (ch.targetTile) {
          startWalkingToTarget(
            ch,
            ch.targetTile,
            tileMap,
            blockedTiles,
            seats,
          );
          break;
        }
      }

      // Inactive wandering (for visual life)
      ch.wanderTimer -= dt;
      if (ch.wanderTimer <= 0) {
        // Check if we've wandered enough — return to seat for a rest
        if (ch.wanderCount >= ch.wanderLimit && ch.seatId) {
          const seat = seats.get(ch.seatId);
          if (seat) {
            const path = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (path.length > 0) {
              ch.path = path;
              ch.moveProgress = 0;
              ch.state = CharacterState.WALK;
              ch.frame = 0;
              ch.frameTimer = 0;
              break;
            }
          }
        }
        // Short local wander (nearby tiles)
        if (walkableTiles.length > 0) {
          const nearby = walkableTiles.filter(
            (t) =>
              Math.abs(t.col - ch.tileCol) <= 3 &&
              Math.abs(t.row - ch.tileRow) <= 3,
          );
          const candidates = nearby.length > 0 ? nearby : walkableTiles;
          const target =
            candidates[Math.floor(Math.random() * candidates.length)];
          const path = findPath(
            ch.tileCol,
            ch.tileRow,
            target.col,
            target.row,
            tileMap,
            blockedTiles,
          );
          if (path.length > 0) {
            ch.path = path;
            ch.moveProgress = 0;
            ch.state = CharacterState.WALK;
            ch.frame = 0;
            ch.frameTimer = 0;
            ch.wanderCount++;
          }
        }
        ch.wanderTimer = randomRange(
          WANDER_PAUSE_MIN_SEC,
          WANDER_PAUSE_MAX_SEC,
        );
      }
      break;
    }

    case CharacterState.WALK: {
      // Walk animation
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 4;
      }

      if (ch.path.length === 0) {
        // Path complete — snap to tile center and transition
        const center = tileCenter(ch.tileCol, ch.tileRow);
        ch.x = center.x;
        ch.y = center.y;

        // Arrived at destination - determine what to do
        if (ch.isActive) {
          // Check if we're at our own seat
          const atOwnSeat =
            ch.seatId &&
            (() => {
              const seat = seats.get(ch.seatId);
              return (
                seat &&
                ch.tileCol === seat.seatCol &&
                ch.tileRow === seat.seatRow
              );
            })();

          if (
            atOwnSeat &&
            (ch.behaviorState === BehaviorState.WORKING ||
              ch.behaviorState === BehaviorState.IDLE)
          ) {
            const seat = seats.get(ch.seatId!)!;
            if (ch.behaviorState === BehaviorState.WORKING) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
            } else {
              ch.state = CharacterState.IDLE;
              ch.dir = seat.facingDir;
            }
          } else if (
            ch.behaviorState === BehaviorState.MEETING ||
            ch.behaviorState === BehaviorState.BREAK ||
            ch.behaviorState === BehaviorState.RESEARCH
          ) {
            // Arrived at meeting/lounge/research spot - stand idle
            ch.state = CharacterState.IDLE;
            ch.dir = Direction.DOWN;
          } else {
            // Go back to own seat
            if (ch.seatId) {
              const seat = seats.get(ch.seatId);
              if (
                seat &&
                (ch.tileCol !== seat.seatCol ||
                  ch.tileRow !== seat.seatRow)
              ) {
                startWalkingToSeat(ch, seat, tileMap, blockedTiles);
                break;
              }
            }
            ch.state = CharacterState.IDLE;
          }
        } else {
          // Inactive: return to seat or idle
          if (ch.seatId) {
            const seat = seats.get(ch.seatId);
            if (
              seat &&
              ch.tileCol === seat.seatCol &&
              ch.tileRow === seat.seatRow
            ) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
              // seatTimer < 0 is a sentinel from setAgentActive(false) meaning
              // "turn just ended" — skip the long rest so idle transition is immediate
              if (ch.seatTimer < 0) {
                ch.seatTimer = 0;
              } else {
                ch.seatTimer = randomRange(
                  SEAT_REST_MIN_SEC,
                  SEAT_REST_MAX_SEC,
                );
              }
              ch.wanderCount = 0;
              ch.wanderLimit = randomInt(
                WANDER_MOVES_BEFORE_REST_MIN,
                WANDER_MOVES_BEFORE_REST_MAX,
              );
              ch.frame = 0;
              ch.frameTimer = 0;
              break;
            }
          }
          ch.state = CharacterState.IDLE;
          ch.wanderTimer = randomRange(
            WANDER_PAUSE_MIN_SEC,
            WANDER_PAUSE_MAX_SEC,
          );
        }
        ch.frame = 0;
        ch.frameTimer = 0;
        break;
      }

      // Move toward next tile in path
      const nextTile = ch.path[0];
      ch.dir = directionBetween(
        ch.tileCol,
        ch.tileRow,
        nextTile.col,
        nextTile.row,
      );

      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow);
      const toCenter = tileCenter(nextTile.col, nextTile.row);
      const t = Math.min(ch.moveProgress, 1);
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t;
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t;

      if (ch.moveProgress >= 1) {
        // Arrived at next tile
        ch.tileCol = nextTile.col;
        ch.tileRow = nextTile.row;
        ch.x = toCenter.x;
        ch.y = toCenter.y;
        ch.path.shift();
        ch.moveProgress = 0;
      }

      // If active with target, make sure we're still heading there
      if (ch.isActive && ch.targetTile && ch.path.length > 0) {
        const lastStep = ch.path[ch.path.length - 1];
        if (
          lastStep.col !== ch.targetTile.col ||
          lastStep.row !== ch.targetTile.row
        ) {
          const newPath = findPath(
            ch.tileCol,
            ch.tileRow,
            ch.targetTile.col,
            ch.targetTile.row,
            tileMap,
            blockedTiles,
          );
          if (newPath.length > 0) {
            ch.path = newPath;
            ch.moveProgress = 0;
          }
        }
      }
      // If active and should go back to seat, redirect
      if (
        ch.isActive &&
        (ch.behaviorState === BehaviorState.WORKING ||
          ch.behaviorState === BehaviorState.IDLE) &&
        ch.seatId
      ) {
        const seat = seats.get(ch.seatId);
        if (seat) {
          const lastStep = ch.path[ch.path.length - 1];
          if (
            !lastStep ||
            lastStep.col !== seat.seatCol ||
            lastStep.row !== seat.seatRow
          ) {
            const newPath = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (newPath.length > 0) {
              ch.path = newPath;
              ch.moveProgress = 0;
              ch.targetTile = null;
            }
          }
        }
      }
      break;
    }
  }
}

// ── Sprite selection ──────────────────────────────────────────────

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(
  ch: Character,
  sprites: CharacterSprites,
): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      if (isReadingTool(ch.currentTool)) {
        return sprites.reading[ch.dir][ch.frame % 2];
      }
      return sprites.typing[ch.dir][ch.frame % 2];
    case CharacterState.WALK:
      return sprites.walk[ch.dir][ch.frame % 4];
    case CharacterState.IDLE:
      return sprites.walk[ch.dir][1];
    default:
      return sprites.walk[ch.dir][1];
  }
}

// ── Utility functions ─────────────────────────────────────────────

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
