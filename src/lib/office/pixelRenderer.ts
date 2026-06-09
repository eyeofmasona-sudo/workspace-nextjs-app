// ─── Agent OS — Pixel Office Canvas Renderer ────────────────────
// Renders the pixel-art office to a canvas using the tilemap,
// furniture instances, and character data.

import type { CharState, Direction, FurnitureInstance, PixelCharacter, TileType } from './pixelTypes';
import { CharState as CS, Direction as Dir, TILE_SIZE } from './pixelTypes';
import { FLOOR_COLORS, WALL_TOP_COLOR, WALL_SIDE_COLOR, WALL_COLOR,
  getCharacterSprite, getRolePalette,
  getDeskFrontSprite, getDeskSideSprite, getChairFrontSprite,
  getPCFrontOnSprite, getPCFrontOffSprite, getPCSideSprite,
  getMeetingTableSprite, getServerRackSprite, getBookshelfSprite,
  getWhiteboardSprite, getSofaFrontSprite, getCoffeeMachineSprite,
  getPlantSprite, getCommandScreenSprite,
  getPermissionBubbleSprite, getWaitingBubbleSprite, getThinkingBubbleSprite,
} from './pixelSprites';

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
      if (tile === 255) continue; // VOID — skip

      const x = offsetX + c * s;
      const y = offsetY + r * s;

      if (tile === 0) {
        // Wall — draw with 3D effect
        // Wall top face (lighter)
        ctx.fillStyle = WALL_TOP_COLOR;
        ctx.fillRect(x, y - s * 0.3, s, s * 0.3);
        // Wall face
        ctx.fillStyle = WALL_COLOR;
        ctx.fillRect(x, y, s, s);
        // Brick pattern on wall
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
      } else {
        // Floor tile
        const color = FLOOR_COLORS[tile] ?? '#808080';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, s, s);

        // Floor pattern based on type
        if (tile === 2) {
          // Wood floor — horizontal planks
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          for (let i = 1; i < 4; i++) {
            ctx.fillRect(x, y + i * s / 4 - 0.5, s, 1);
          }
          // Wood grain
          ctx.fillStyle = 'rgba(0,0,0,0.02)';
          ctx.fillRect(x + s / 3, y, 1, s);
          ctx.fillRect(x + 2 * s / 3, y, 1, s);
        } else if (tile === 6) {
          // Server room — raised floor with grid
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
          ctx.strokeStyle = 'rgba(0,0,0,0.08)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
        } else if (tile === 8) {
          // Lounge — carpet texture
          ctx.fillStyle = 'rgba(0,0,0,0.03)';
          for (let dy = 0; dy < s; dy += 4) {
            for (let dx = 0; dx < s; dx += 4) {
              if ((Math.floor(dx / 4) + Math.floor(dy / 4)) % 2 === 0) {
                ctx.fillRect(x + dx, y + dy, 3, 3);
              }
            }
          }
        } else if (tile === 9) {
          // Corridor — tile pattern
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          ctx.fillRect(x + s / 2 - 0.5, y, 1, s);
          ctx.fillRect(x, y + s / 2 - 0.5, s, 1);
        }

        // Subtle grid lines between floor tiles
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

// ── Render furniture ────────────────────────────────────────────
function renderFurnitureItem(
  ctx: CanvasRenderingContext2D,
  item: FurnitureInstance,
  offsetX: number,
  offsetY: number,
  zoom: number,
): ZDrawable {
  const px = offsetX + item.x * zoom;
  const py = offsetY + item.y * zoom;
  const s = zoom;

  return {
    zY: item.zY,
    draw: (c) => {
      let sprite: HTMLCanvasElement | null = null;

      switch (item.type) {
        case 'desk_front': sprite = getDeskFrontSprite('#8B5CF6'); break;
        case 'desk_side': sprite = getDeskSideSprite('#8B5CF6'); break;
        case 'chair_front': sprite = getChairFrontSprite(item.isActive ?? false); break;
        case 'chair_back': sprite = getChairFrontSprite(item.isActive ?? false); break;
        case 'chair_side': sprite = getChairFrontSprite(item.isActive ?? false); break;
        case 'pc_front_on': sprite = getPCFrontOnSprite(); break;
        case 'pc_front_off': sprite = getPCFrontOffSprite(); break;
        case 'pc_side': sprite = getPCSideSprite(); break;
        case 'meeting_table': sprite = getMeetingTableSprite(); break;
        case 'server_rack': sprite = getServerRackSprite(item.isActive ?? false); break;
        case 'bookshelf': sprite = getBookshelfSprite(); break;
        case 'whiteboard': sprite = getWhiteboardSprite(); break;
        case 'sofa_front': sprite = getSofaFrontSprite(); break;
        case 'coffee_machine': sprite = getCoffeeMachineSprite(); break;
        case 'plant': sprite = getPlantSprite(); break;
        case 'command_screen': sprite = getCommandScreenSprite(item.isActive ?? false); break;
      }

      if (sprite) {
        c.imageSmoothingEnabled = false;
        if (item.mirrored) {
          c.save();
          c.translate(px + sprite.width * s, py);
          c.scale(-1, 1);
          c.drawImage(sprite, 0, 0, sprite.width * s, sprite.height * s);
          c.restore();
        } else {
          c.drawImage(sprite, px, py, sprite.width * s, sprite.height * s);
        }
      }
    },
  };
}

// ── Render character ────────────────────────────────────────────
function renderCharacter(
  ctx: CanvasRenderingContext2D,
  char: PixelCharacter,
  offsetX: number,
  offsetY: number,
  zoom: number,
): ZDrawable {
  const isReading = char.agentStatus === 'reviewing' || char.agentStatus === 'thinking';
  const sprite = getCharacterSprite(char.palette, char.state, char.dir, char.frame, isReading);

  // Sitting offset — when typing/reading, character appears seated
  const sittingOffset = (char.state === CS.TYPING || char.state === CS.READING) ? 6 : 0;

  const drawX = Math.round(offsetX + char.x * zoom - (sprite.width * zoom) / 2);
  const drawY = Math.round(offsetY + (char.y + sittingOffset) * zoom - sprite.height * zoom);

  const charZY = char.y + TILE_SIZE / 2 + 0.5; // +0.5 to render in front of same-row furniture

  return {
    zY: charZY,
    draw: (c) => {
      c.imageSmoothingEnabled = false;

      // Shadow
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.beginPath();
      c.ellipse(
        offsetX + char.x * zoom,
        offsetY + (char.y + sittingOffset) * zoom + 2,
        8 * zoom, 3 * zoom, 0, 0, Math.PI * 2
      );
      c.fill();

      // Working glow effect — green glow around character
      if (char.agentStatus === 'working') {
        c.save();
        c.shadowColor = '#22c55e';
        c.shadowBlur = 8 * zoom;
        c.shadowOffsetX = 0;
        c.shadowOffsetY = 0;
        c.fillStyle = 'rgba(34,197,94,0.1)';
        c.fillRect(drawX - 2 * zoom, drawY - 2 * zoom, sprite.width * zoom + 4 * zoom, sprite.height * zoom + 4 * zoom);
        c.restore();
      }

      // Thinking pulse effect — amber pulse
      if (char.agentStatus === 'thinking') {
        const pulse = 0.3 + Math.sin(Date.now() / 500) * 0.15;
        c.save();
        c.shadowColor = '#f59e0b';
        c.shadowBlur = 6 * zoom;
        c.fillStyle = `rgba(245,158,11,${pulse})`;
        c.fillRect(drawX - 2 * zoom, drawY - 2 * zoom, sprite.width * zoom + 4 * zoom, sprite.height * zoom + 4 * zoom);
        c.restore();
      }

      // Waiting approval — orange glow
      if (char.agentStatus === 'waiting_approval') {
        c.save();
        c.shadowColor = '#f97316';
        c.shadowBlur = 10 * zoom;
        c.fillStyle = 'rgba(249,115,22,0.15)';
        c.fillRect(drawX - 2 * zoom, drawY - 2 * zoom, sprite.width * zoom + 4 * zoom, sprite.height * zoom + 4 * zoom);
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

      c.drawImage(sprite, drawX, drawY, sprite.width * zoom, sprite.height * zoom);

      c.globalAlpha = 1.0;
    },
  };
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

  let sprite: HTMLCanvasElement;
  switch (char.bubbleType) {
    case 'permission': sprite = getPermissionBubbleSprite(); break;
    case 'waiting': sprite = getWaitingBubbleSprite(); break;
    case 'thinking': sprite = getThinkingBubbleSprite(); break;
    default: return;
  }

  const sittingOffset = (char.state === CS.TYPING || char.state === CS.READING) ? 6 : 0;
  const bubbleX = Math.round(offsetX + char.x * zoom - (sprite.width * zoom) / 2);
  const bubbleY = Math.round(offsetY + (char.y + sittingOffset - 26) * zoom);

  ctx.imageSmoothingEnabled = false;

  // Fade for waiting bubble near expiry
  if (char.bubbleType === 'waiting' && char.bubbleTimer < 0.5) {
    ctx.globalAlpha = char.bubbleTimer / 0.5;
  }

  ctx.drawImage(sprite, bubbleX, bubbleY, sprite.width * zoom, sprite.height * zoom);
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
  const sittingOffset = (char.state === CS.TYPING || char.state === CS.READING) ? 6 : 0;
  const labelX = offsetX + char.x * zoom;
  const labelY = offsetY + (char.y + sittingOffset - 30) * zoom;

  // Role label (primary — large, bold)
  ctx.font = `bold ${Math.round(11 * zoom)}px 'Geist Sans', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Background pill for role
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

  // Name label (secondary — smaller, below role)
  ctx.font = `${Math.round(7 * zoom)}px 'Geist Sans', system-ui, sans-serif`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(char.name, labelX, labelY + 6 * zoom);

  // Status indicator — colored dot + text
  const statusColor = getStatusColor(char.agentStatus);
  const statusLabel = getStatusLabel(char.agentStatus);
  if (statusColor && char.agentStatus !== 'idle' && char.agentStatus !== 'offline') {
    // Colored dot
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(labelX + roleW / 2 - 2 * zoom, labelY - roleH + 3 * zoom, 2.5 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Status text below character
    ctx.font = `bold ${Math.round(6 * zoom)}px 'Geist Sans', system-ui, sans-serif`;
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'center';
    const statusX = offsetX + char.x * zoom;
    const statusY = offsetY + (char.y + sittingOffset + 4) * zoom;
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
  tileMap: TileType[][],
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const s = TILE_SIZE * zoom;
  const zones = [
    { key: 'command_area', label: '👑 Command', col: 1, row: 1 },
    { key: 'meeting_room', label: '🤝 Meeting', col: 8, row: 1 },
    { key: 'situation_room', label: '📊 Situation', col: 16, row: 1 },
    { key: 'development_area', label: '💻 Dev Floor', col: 24, row: 1 },
    { key: 'design_area', label: '🎨 Design', col: 1, row: 10 },
    { key: 'server_room', label: '🖥️ Server', col: 8, row: 10 },
    { key: 'research_area', label: '📚 Research', col: 16, row: 10 },
    { key: 'lounge_area', label: '☕ Lounge', col: 24, row: 10 },
  ];

  ctx.font = `bold ${Math.round(8 * zoom)}px 'Geist Sans', system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (const zone of zones) {
    const x = offsetX + zone.col * s + 2 * zoom;
    const y = offsetY + zone.row * s + 2 * zoom;

    // Background
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
    drawables.push(renderFurnitureItem(ctx, f, offsetX, offsetY, zoom));
  }

  // Characters
  for (const ch of characters) {
    drawables.push(renderCharacter(ctx, ch, offsetX, offsetY, zoom));
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
    renderLabel(ctx, ch, offsetX, offsetY, zoom);
  }

  // 5. Zone labels
  renderZoneLabels(ctx, tileMap, offsetX, offsetY, zoom);
}
