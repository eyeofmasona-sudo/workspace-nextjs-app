// ─── Agent OS — Pixel Office Renderer (1:1 pixel-agents architecture) ──
// Full rendering pipeline: tile grid → z-sorted furniture+characters →
// speech bubbles → labels → matrix effects → zone labels.

import type { CharacterState, Direction, FurnitureInstance, PixelCharacter, TileType, SpriteData } from './pixelTypes';
import { CharacterState as CS, Direction as Dir, TILE_SIZE, CHARACTER_Z_SORT_OFFSET, OUTLINE_Z_SORT_OFFSET } from './pixelTypes';
import {
  FLOOR_COLORS, WALL_TOP_COLOR, WALL_SIDE_COLOR, WALL_COLOR,
  getCharacterSprite as getCharSpriteData, getCharacterSprites,
  getPermissionBubbleSprite, getWaitingBubbleSprite,
  getCachedSprite, getOutlineSprite, getRolePalette,
} from './pixelSprites';
import { buildWallMask } from './pixelLayout';

// ── Render the tile grid (floor + wall base) ───────────────────
export function renderTileGrid(
  ctx: CanvasRenderingContext2D,
  tileMap: TileType[][],
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const s = TILE_SIZE * zoom;
  const rows = tileMap.length;
  const cols = rows > 0 ? tileMap[0].length : 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = tileMap[r][c];
      if (tile === 255) continue; // VOID

      const x = Math.round(offsetX + c * s);
      const y = Math.round(offsetY + r * s);

      if (tile === 0) {
        // Wall with auto-tiling bitmask
        const mask = buildWallMask(c, r, tileMap);

        // Wall top face (extends above)
        ctx.fillStyle = WALL_TOP_COLOR;
        ctx.fillRect(x, y - s * 0.3, s, s * 0.3);

        // Wall face
        ctx.fillStyle = WALL_COLOR;
        ctx.fillRect(x, y, s, s);

        // Brick pattern
        ctx.fillStyle = WALL_SIDE_COLOR;
        const brickH = s / 4;
        for (let br = 0; br < 4; br++) {
          const offset = br % 2 === 0 ? 0 : s / 2;
          for (let bc = -1; bc < 3; bc++) {
            ctx.fillRect(x + offset + bc * s / 2 + 1, y + br * brickH + 1, s / 2 - 2, brickH - 2);
          }
        }

        // Top edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x, y, s, 2);

        // Wall top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, y - s * 0.3, s, s * 0.1);
      } else {
        // Floor tile
        const color = FLOOR_COLORS[tile] ?? '#808080';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, s, s);

        // Floor pattern based on type
        if (tile === 2) {
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          for (let i = 1; i < 4; i++) ctx.fillRect(x, y + i * s / 4 - 0.5, s, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.02)';
          ctx.fillRect(x + s / 3, y, 1, s);
          ctx.fillRect(x + 2 * s / 3, y, 1, s);
        } else if (tile === 6) {
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
          ctx.strokeStyle = 'rgba(0,0,0,0.08)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
        } else if (tile === 8) {
          ctx.fillStyle = 'rgba(0,0,0,0.03)';
          for (let dy = 0; dy < s; dy += 4) {
            for (let dx = 0; dx < s; dx += 4) {
              if ((Math.floor(dx / 4) + Math.floor(dy / 4)) % 2 === 0) {
                ctx.fillRect(x + dx, y + dy, 3, 3);
              }
            }
          }
        } else if (tile === 9) {
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          ctx.fillRect(x + s / 2 - 0.5, y, 1, s);
          ctx.fillRect(x, y + s / 2 - 0.5, s, 1);
        }

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
      }
    }
  }
}

// ── Z-sortable drawable ─────────────────────────────────────────
interface ZDrawable {
  zY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

// ── Render furniture item ──────────────────────────────────────
function renderFurnitureItem(
  item: FurnitureInstance,
  offsetX: number,
  offsetY: number,
  zoom: number,
): ZDrawable {
  const px = Math.round(offsetX + item.x * zoom);
  const py = Math.round(offsetY + (item.y + (item.offsetY ?? 0)) * zoom);

  return {
    zY: item.zY,
    draw: (c) => {
      c.imageSmoothingEnabled = false;
      if (!item.sprite) return;

      const spriteCanvas = getCachedSprite(item.sprite, zoom);
      if (item.mirrored) {
        c.save();
        c.translate(px + spriteCanvas.width, py);
        c.scale(-1, 1);
        c.drawImage(spriteCanvas, 0, 0);
        c.restore();
      } else {
        c.drawImage(spriteCanvas, px, py);
      }
    },
  };
}

// ── Matrix effect rendering (pixel-agents style) ───────────────
const MATRIX_HEAD_COLOR = '#44ffaa';
const MATRIX_BRIGHT_COLOR = '#22cc66';
const MATRIX_MID_COLOR = '#119933';
const MATRIX_DIM_COLOR = '#084422';
const MATRIX_TRAIL_LENGTH = 6;
const MATRIX_SPRITE_COLS = 16;

function renderMatrixEffect(
  ctx: CanvasRenderingContext2D,
  ch: PixelCharacter,
  sprite: SpriteData,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const progress = ch.matrixTimer / 0.3; // Normalize to 0-1
  const rows = sprite.length;
  const cols = Math.min(MATRIX_SPRITE_COLS, sprite[0]?.length ?? 0);
  const drawX = Math.round(offsetX + (ch.x - cols / 2) * zoom);
  const drawY = Math.round(offsetY + (ch.y - rows) * zoom);

  ctx.imageSmoothingEnabled = false;

  for (let col = 0; col < cols; col++) {
    const seed = ch.matrixEffectSeeds[col] ?? 0;
    const stagger = seed * 0.3;
    const colProgress = Math.max(0, Math.min(1, (progress - stagger) / (1 - stagger)));
    const headRow = Math.floor(colProgress * (rows + MATRIX_TRAIL_LENGTH));

    for (let row = 0; row < rows; row++) {
      const px = sprite[row]?.[col];
      if (!px) continue;

      const distFromHead = headRow - row;
      const sx = drawX + col * zoom;
      const sy = drawY + row * zoom;

      if (ch.matrixEffect === 'spawn') {
        if (distFromHead < 0) continue; // Not yet revealed

        if (distFromHead === 0) {
          // Head pixel — bright green
          ctx.fillStyle = MATRIX_HEAD_COLOR;
          ctx.fillRect(sx, sy, zoom, zoom);
        } else if (distFromHead <= MATRIX_TRAIL_LENGTH) {
          // Trail zone
          const trailRatio = distFromHead / MATRIX_TRAIL_LENGTH;
          // Flicker
          const flicker = ((row * 7 + col * 13 + Math.floor(ch.matrixTimer * 100)) % 10) > 3;
          if (flicker) {
            const trailColor = trailRatio < 0.33 ? MATRIX_BRIGHT_COLOR :
                              trailRatio < 0.66 ? MATRIX_MID_COLOR : MATRIX_DIM_COLOR;
            ctx.fillStyle = trailColor;
            ctx.fillRect(sx, sy, zoom, zoom);
          }
          // Show original pixel below trail
          ctx.globalAlpha = trailRatio;
          ctx.fillStyle = px;
          ctx.fillRect(sx, sy, zoom, zoom);
          ctx.globalAlpha = 1;
        } else {
          // Below trail — show original pixel
          ctx.fillStyle = px;
          ctx.fillRect(sx, sy, zoom, zoom);
        }
      } else if (ch.matrixEffect === 'despawn') {
        if (distFromHead < 0) {
          // Not yet consumed — show original
          ctx.fillStyle = px;
          ctx.fillRect(sx, sy, zoom, zoom);
        } else if (distFromHead === 0) {
          ctx.fillStyle = MATRIX_HEAD_COLOR;
          ctx.fillRect(sx, sy, zoom, zoom);
        } else if (distFromHead <= MATRIX_TRAIL_LENGTH) {
          const trailRatio = distFromHead / MATRIX_TRAIL_LENGTH;
          const flicker = ((row * 7 + col * 13 + Math.floor(ch.matrixTimer * 100)) % 10) > 3;
          if (flicker) {
            const trailColor = trailRatio < 0.33 ? MATRIX_BRIGHT_COLOR :
                              trailRatio < 0.66 ? MATRIX_MID_COLOR : MATRIX_DIM_COLOR;
            ctx.globalAlpha = 1 - trailRatio;
            ctx.fillStyle = trailColor;
            ctx.fillRect(sx, sy, zoom, zoom);
            ctx.globalAlpha = 1;
          }
        }
        // Beyond trail = consumed, nothing rendered
      }
    }
  }
}

// ── Render character ────────────────────────────────────────────
function renderCharacter(
  char: PixelCharacter,
  offsetX: number,
  offsetY: number,
  zoom: number,
): ZDrawable[] {
  const drawables: ZDrawable[] = [];
  const isReading = char.agentStatus === 'reviewing' || char.agentStatus === 'thinking' ||
                    (char.currentTool ? ['document.parse', 'rag.query', 'browser.search'].includes(char.currentTool) : false);

  const spriteSet = getCharacterSprites(char.palette, char.hueShift);
  const sprite = getCharSpriteData(spriteSet, char.state, char.dir, char.frame, isReading);

  const drawX = Math.round(offsetX + char.x * zoom - (sprite[0]?.length ?? 16) * zoom / 2);
  const drawY = Math.round(offsetY + char.y * zoom - sprite.length * zoom);

  const charZY = char.y + TILE_SIZE / 2 + CHARACTER_Z_SORT_OFFSET;

  // If matrix effect, render it instead of normal character
  if (char.matrixEffect) {
    drawables.push({
      zY: charZY,
      draw: (c) => {
        renderMatrixEffect(c, char, sprite, offsetX, offsetY, zoom);
      },
    });
    return drawables;
  }

  // Outline for selected/hovered characters
  if (char.selected || char.hovered) {
    const outline = getOutlineSprite(sprite);
    drawables.push({
      zY: charZY - OUTLINE_Z_SORT_OFFSET,
      draw: (c) => {
        c.imageSmoothingEnabled = false;
        const outlineCanvas = getCachedSprite(outline, zoom);
        const ox = drawX - zoom; // outline is 2px larger
        const oy = drawY - zoom;
        c.drawImage(outlineCanvas, ox, oy);
      },
    });
  }

  drawables.push({
    zY: charZY,
    draw: (c) => {
      c.imageSmoothingEnabled = false;

      // Shadow
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.beginPath();
      c.ellipse(
        Math.round(offsetX + char.x * zoom),
        Math.round(offsetY + char.y * zoom + 2),
        8 * zoom, 3 * zoom, 0, 0, Math.PI * 2
      );
      c.fill();

      // Status glow effects
      if (char.agentStatus === 'working') {
        c.save();
        c.shadowColor = '#22c55e';
        c.shadowBlur = 8 * zoom;
        c.fillStyle = 'rgba(34,197,94,0.1)';
        c.fillRect(drawX - 2 * zoom, drawY - 2 * zoom, (sprite[0]?.length ?? 16) * zoom + 4 * zoom, sprite.length * zoom + 4 * zoom);
        c.restore();
      }

      if (char.agentStatus === 'thinking') {
        const pulse = 0.3 + Math.sin(Date.now() / 500) * 0.15;
        c.save();
        c.shadowColor = '#f59e0b';
        c.shadowBlur = 6 * zoom;
        c.fillStyle = `rgba(245,158,11,${pulse})`;
        c.fillRect(drawX - 2 * zoom, drawY - 2 * zoom, (sprite[0]?.length ?? 16) * zoom + 4 * zoom, sprite.length * zoom + 4 * zoom);
        c.restore();
      }

      if (char.agentStatus === 'waiting_approval') {
        c.save();
        c.shadowColor = '#f97316';
        c.shadowBlur = 10 * zoom;
        c.fillStyle = 'rgba(249,115,22,0.15)';
        c.fillRect(drawX - 2 * zoom, drawY - 2 * zoom, (sprite[0]?.length ?? 16) * zoom + 4 * zoom, sprite.length * zoom + 4 * zoom);
        c.restore();
      }

      // Offline dimming
      if (char.agentStatus === 'offline') {
        c.globalAlpha = 0.4;
      }

      // Error flash
      if (char.agentStatus === 'error') {
        c.globalAlpha = 0.7 + Math.sin(Date.now() / 200) * 0.3;
      }

      // Draw character sprite
      const spriteCanvas = getCachedSprite(sprite, zoom);
      c.drawImage(spriteCanvas, drawX, drawY);
      c.globalAlpha = 1.0;
    },
  });

  return drawables;
}

// ── Render speech bubble ────────────────────────────────────────
function renderBubble(
  ctx: CanvasRenderingContext2D,
  char: PixelCharacter,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  if (!char.bubbleType) return;

  let sprite: SpriteData;
  switch (char.bubbleType) {
    case 'permission': sprite = getPermissionBubbleSprite(); break;
    case 'waiting': sprite = getWaitingBubbleSprite(); break;
    default: return;
  }

  const bubbleX = Math.round(offsetX + char.x * zoom - (sprite[0]?.length ?? 11) * zoom / 2);
  const bubbleY = Math.round(offsetY + (char.y - 30) * zoom);

  ctx.imageSmoothingEnabled = false;

  // Fade for waiting bubble near expiry
  if (char.bubbleType === 'waiting' && char.bubbleTimer < 0.5) {
    ctx.globalAlpha = Math.max(0, char.bubbleTimer / 0.5);
  }
  // Fade for dismissed bubbles
  if (char.bubbleFade < 1 && char.bubbleTimer < 1) {
    ctx.globalAlpha = Math.max(0, char.bubbleTimer);
  }

  const bubbleCanvas = getCachedSprite(sprite, zoom);
  ctx.drawImage(bubbleCanvas, bubbleX, bubbleY);
  ctx.globalAlpha = 1.0;
}

// ── Render role labels ─────────────────────────────────────────
function renderLabel(
  ctx: CanvasRenderingContext2D,
  char: PixelCharacter,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const labelX = offsetX + char.x * zoom;
  const labelY = offsetY + (char.y - 30) * zoom;

  // Role label
  ctx.font = `bold ${Math.round(11 * zoom)}px 'Geist Sans', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  const roleText = char.roleLabel;
  const roleMetrics = ctx.measureText(roleText);
  const roleW = roleMetrics.width + 10 * zoom;
  const roleH = 14 * zoom;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  roundRect(ctx, labelX - roleW / 2, labelY - roleH - 2 * zoom, roleW, roleH, 3 * zoom);
  ctx.fill();

  ctx.strokeStyle = char.palette.shirt + '60';
  ctx.lineWidth = 1;
  roundRect(ctx, labelX - roleW / 2, labelY - roleH - 2 * zoom, roleW, roleH, 3 * zoom);
  ctx.stroke();

  ctx.fillStyle = char.palette.shirt;
  ctx.fillText(roleText, labelX, labelY - 3 * zoom);

  // Name label
  ctx.font = `${Math.round(7 * zoom)}px 'Geist Sans', system-ui, sans-serif`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(char.name, labelX, labelY + 6 * zoom);

  // Status indicator
  const statusColor = getStatusColor(char.agentStatus);
  const statusLabel = getStatusLabel(char.agentStatus);
  if (statusColor && char.agentStatus !== 'idle' && char.agentStatus !== 'offline') {
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(labelX + roleW / 2 - 2 * zoom, labelY - roleH + 3 * zoom, 2.5 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `bold ${Math.round(6 * zoom)}px 'Geist Sans', system-ui, sans-serif`;
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'center';
    const statusX = offsetX + char.x * zoom;
    const statusY = offsetY + (char.y + 4) * zoom;
    ctx.fillText(statusLabel, statusX, statusY);
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'working': return '⚡ Working';
    case 'thinking': return '🤔 Thinking';
    case 'waiting_api': return '📡 Waiting';
    case 'reviewing': return '🔍 Reviewing';
    case 'waiting_approval': return '⚠️ Approval';
    case 'error': return '❌ Error';
    case 'done': return '✅ Done';
    default: return '';
  }
}

function getStatusColor(status: string): string | null {
  switch (status) {
    case 'working': return '#22c55e';
    case 'thinking': return '#f59e0b';
    case 'waiting_api': return '#3b82f6';
    case 'reviewing': return '#8b5cf6';
    case 'waiting_approval': return '#f97316';
    case 'error': return '#ef4444';
    case 'done': return '#10b981';
    default: return null;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Render zone labels ──────────────────────────────────────────
export function renderZoneLabels(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const s = TILE_SIZE * zoom;
  const zones = [
    { label: '👑 Command', col: 1, row: 1 },
    { label: '🤝 Meeting', col: 8, row: 1 },
    { label: '📊 Situation', col: 16, row: 1 },
    { label: '💻 Dev Floor', col: 24, row: 1 },
    { label: '🎨 Design', col: 1, row: 10 },
    { label: '🖥️ Server', col: 8, row: 10 },
    { label: '📚 Research', col: 16, row: 10 },
    { label: '☕ Lounge', col: 24, row: 10 },
  ];

  ctx.font = `bold ${Math.round(8 * zoom)}px 'Geist Sans', system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (const zone of zones) {
    const x = offsetX + zone.col * s + 2 * zoom;
    const y = offsetY + zone.row * s + 2 * zoom;

    const metrics = ctx.measureText(zone.label);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    roundRect(ctx, x - 2 * zoom, y - 1 * zoom, metrics.width + 4 * zoom, 10 * zoom, 2 * zoom);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.fillText(zone.label, x, y);
  }
}

// ── Main render frame ───────────────────────────────────────────
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  tileMap: TileType[][],
  furnitureInstances: FurnitureInstance[],
  characters: PixelCharacter[],
  zoom: number,
  panX: number,
  panY: number,
  layoutCols: number,
  layoutRows: number,
  _animTimer: number,
  _furnitureAnimTimer: number,
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Background
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const mapW = layoutCols * TILE_SIZE * zoom;
  const mapH = layoutRows * TILE_SIZE * zoom;
  const offsetX = Math.floor((canvasWidth - mapW) / 2) + Math.round(panX);
  const offsetY = Math.floor((canvasHeight - mapH) / 2) + Math.round(panY);

  // 1. Draw tile grid (floor + walls)
  renderTileGrid(ctx, tileMap, offsetX, offsetY, zoom);

  // 2. Build z-sorted drawables
  const drawables: ZDrawable[] = [];

  // Furniture
  for (const f of furnitureInstances) {
    drawables.push(renderFurnitureItem(f, offsetX, offsetY, zoom));
  }

  // Characters (may produce multiple drawables: outline + character)
  for (const ch of characters) {
    const charDrawables = renderCharacter(ch, offsetX, offsetY, zoom);
    drawables.push(...charDrawables);
  }

  // Sort by Y (lower = in front = drawn later)
  drawables.sort((a, b) => a.zY - b.zY);

  // Draw z-sorted items
  ctx.imageSmoothingEnabled = false;
  for (const d of drawables) {
    d.draw(ctx);
  }

  // 3. Draw speech bubbles (always on top)
  for (const ch of characters) {
    renderBubble(ctx, ch, offsetX, offsetY, zoom);
  }

  // 4. Draw labels (always on top)
  for (const ch of characters) {
    if (!ch.matrixEffect) {
      renderLabel(ctx, ch, offsetX, offsetY, zoom);
    }
  }

  // 5. Zone labels
  renderZoneLabels(ctx, offsetX, offsetY, zoom);
}
