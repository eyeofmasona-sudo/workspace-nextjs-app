// ─── Agent OS — Pixel Sprite Generation & Caching ──────────────
// Procedural pixel-art sprite generation for characters, furniture, and effects.
// All sprites are generated as offscreen canvases and cached by parameters.

import type { CharPalette, SpriteData } from './pixelTypes';
import { CharState, Direction, CHAR_H, CHAR_W, TILE_SIZE, TileType } from './pixelTypes';

// ── Sprite cache ────────────────────────────────────────────────
const spriteCanvasCache = new Map<string, HTMLCanvasElement>();

function getCachedCanvas(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cached = spriteCanvasCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  spriteCanvasCache.set(key, canvas);
  return canvas;
}

// ── Pixel drawing helper ────────────────────────────────────────
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

// ════════════════════════════════════════════════════════════════
// CHARACTER SPRITES — Procedural pixel-art characters
// 16×24 pixels, drawn with palette colors
// ════════════════════════════════════════════════════════════════

function darkenColor(hex: string, factor: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = Math.round(parseInt(m[1], 16) * factor);
  const g = Math.round(parseInt(m[2], 16) * factor);
  const b = Math.round(parseInt(m[3], 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lightenColor(hex: string, factor: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = Math.min(255, Math.round(parseInt(m[1], 16) + (255 - parseInt(m[1], 16)) * factor));
  const g = Math.min(255, Math.round(parseInt(m[2], 16) + (255 - parseInt(m[2], 16)) * factor));
  const b = Math.min(255, Math.round(parseInt(m[3], 16) + (255 - parseInt(m[3], 16)) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Draw a character facing DOWN (toward viewer) in typing pose */
function drawCharDown(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, isReading: boolean, s: number) {
  const f = frame % 2;
  const armOff = f === 1 ? 1 : 0;

  // Head
  rect(ctx, 5, 1, 6, 2, p.hair, s);          // hair top
  rect(ctx, 4, 2, 8, 3, p.hair, s);           // hair
  rect(ctx, 4, 5, 8, 4, p.skin, s);           // face
  px(ctx, 5, 6, '#333', s);                     // left eye
  px(ctx, 9, 6, '#333', s);                     // right eye
  px(ctx, 6, 7, darkenColor(p.skin, 0.85), s); // nose
  rect(ctx, 4, 8, 8, 1, p.skin, s);           // chin
  rect(ctx, 5, 9, 6, 1, p.skin, s);           // neck

  // Body
  rect(ctx, 3, 10, 10, 1, p.shirt, s);        // shoulders
  rect(ctx, 3, 11, 10, 3, p.shirt, s);        // shirt
  px(ctx, 6, 12, p.shirtLight, s);             // shirt detail
  px(ctx, 8, 12, p.shirtLight, s);

  // Arms
  if (isReading) {
    // Arms up holding something
    rect(ctx, 2, 10 - armOff, 2, 4, p.skin, s);   // left arm up
    rect(ctx, 12, 10 - armOff, 2, 4, p.skin, s);  // right arm up
    rect(ctx, 5, 9 - armOff, 6, 2, '#e8e0d0', s);  // paper/book
  } else {
    // Arms down/on desk
    rect(ctx, 2, 11 + armOff, 2, 3, p.skin, s);   // left arm
    rect(ctx, 12, 11 + armOff, 2, 3, p.skin, s);  // right arm
  }

  // Lower body
  rect(ctx, 4, 14, 8, 3, p.pants, s);
  rect(ctx, 4, 17, 3, 4, p.pants, s);         // left leg
  rect(ctx, 9, 17, 3, 4, p.pants, s);         // right leg
  rect(ctx, 4, 21, 3, 2, p.shoes, s);         // left shoe
  rect(ctx, 9, 21, 3, 2, p.shoes, s);         // right shoe
}

/** Draw a character facing UP (away from viewer) */
function drawCharUp(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, isReading: boolean, s: number) {
  const f = frame % 2;
  const armOff = f === 1 ? 1 : 0;

  // Head (back of head)
  rect(ctx, 4, 2, 8, 6, p.hair, s);
  rect(ctx, 5, 1, 6, 2, p.hair, s);
  rect(ctx, 4, 7, 8, 2, p.skin, s);           // neck
  rect(ctx, 5, 8, 6, 1, p.skin, s);

  // Body
  rect(ctx, 3, 9, 10, 5, p.shirt, s);
  px(ctx, 6, 11, darkenColor(p.shirt, 0.9), s);
  px(ctx, 8, 11, darkenColor(p.shirt, 0.9), s);

  // Arms
  if (isReading) {
    rect(ctx, 2, 9 - armOff, 2, 4, p.skin, s);
    rect(ctx, 12, 9 - armOff, 2, 4, p.skin, s);
    rect(ctx, 5, 8 - armOff, 6, 2, '#e8e0d0', s);
  } else {
    rect(ctx, 2, 10 + armOff, 2, 3, p.skin, s);
    rect(ctx, 12, 10 + armOff, 2, 3, p.skin, s);
  }

  // Lower body
  rect(ctx, 4, 14, 8, 3, p.pants, s);
  rect(ctx, 4, 17, 3, 4, p.pants, s);
  rect(ctx, 9, 17, 3, 4, p.pants, s);
  rect(ctx, 4, 21, 3, 2, p.shoes, s);
  rect(ctx, 9, 21, 3, 2, p.shoes, s);
}

/** Draw a character facing RIGHT */
function drawCharRight(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, isReading: boolean, s: number) {
  const f = frame % 2;
  const armOff = f === 1 ? 1 : 0;

  // Head (side profile)
  rect(ctx, 4, 1, 6, 2, p.hair, s);
  rect(ctx, 3, 2, 7, 4, p.hair, s);
  rect(ctx, 3, 5, 7, 4, p.skin, s);
  px(ctx, 8, 6, '#333', s);                     // eye
  rect(ctx, 3, 8, 6, 1, p.skin, s);
  rect(ctx, 4, 9, 4, 1, p.skin, s);           // neck

  // Body
  rect(ctx, 3, 10, 7, 5, p.shirt, s);
  px(ctx, 5, 12, p.shirtLight, s);

  // Arms
  if (isReading) {
    rect(ctx, 9, 9 - armOff, 2, 3, p.skin, s);   // right arm forward
    rect(ctx, 5, 9 - armOff, 5, 2, '#e8e0d0', s);
  } else {
    rect(ctx, 9, 10 + armOff, 2, 3, p.skin, s);
  }
  rect(ctx, 2, 11, 2, 3, p.skin, s);           // left arm (behind)

  // Lower body
  rect(ctx, 4, 15, 5, 3, p.pants, s);
  rect(ctx, 6, 18, 3, 4, p.pants, s);
  rect(ctx, 4, 18, 3, 4, p.pants, s);
  rect(ctx, 6, 22, 3, 1, p.shoes, s);
  rect(ctx, 4, 22, 3, 1, p.shoes, s);
}

/** Draw a character facing LEFT (mirror of right) */
function drawCharLeft(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, isReading: boolean, s: number) {
  const f = frame % 2;
  const armOff = f === 1 ? 1 : 0;

  // Head (side profile, mirrored)
  rect(ctx, 6, 1, 6, 2, p.hair, s);
  rect(ctx, 6, 2, 7, 4, p.hair, s);
  rect(ctx, 6, 5, 7, 4, p.skin, s);
  px(ctx, 7, 6, '#333', s);                     // eye
  rect(ctx, 7, 8, 6, 1, p.skin, s);
  rect(ctx, 8, 9, 4, 1, p.skin, s);           // neck

  // Body
  rect(ctx, 6, 10, 7, 5, p.shirt, s);
  px(ctx, 9, 12, p.shirtLight, s);

  // Arms
  if (isReading) {
    rect(ctx, 5, 9 - armOff, 2, 3, p.skin, s);   // left arm forward
    rect(ctx, 6, 9 - armOff, 5, 2, '#e8e0d0', s);
  } else {
    rect(ctx, 5, 10 + armOff, 2, 3, p.skin, s);
  }
  rect(ctx, 12, 11, 2, 3, p.skin, s);          // right arm (behind)

  // Lower body
  rect(ctx, 7, 15, 5, 3, p.pants, s);
  rect(ctx, 7, 18, 3, 4, p.pants, s);
  rect(ctx, 10, 18, 3, 4, p.pants, s);
  rect(ctx, 7, 22, 3, 1, p.shoes, s);
  rect(ctx, 10, 22, 3, 1, p.shoes, s);
}

/** Walking frames — same as above but with leg movement */
function drawCharWalkDown(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, s: number) {
  const f = frame % 4;
  drawCharDown(ctx, p, 0, false, s);
  // Override legs with walk animation
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(4 * s, 17 * s, 8 * s, 7 * s);
  const legOff = [0, 1, 0, -1][f];
  rect(ctx, 4, 17 + legOff, 3, 4, p.pants, s);
  rect(ctx, 9, 17 - legOff, 3, 4, p.pants, s);
  rect(ctx, 4, 21 + legOff, 3, 2, p.shoes, s);
  rect(ctx, 9, 21 - legOff, 3, 2, p.shoes, s);
}

function drawCharWalkUp(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, s: number) {
  const f = frame % 4;
  drawCharUp(ctx, p, 0, false, s);
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(4 * s, 17 * s, 8 * s, 7 * s);
  const legOff = [0, 1, 0, -1][f];
  rect(ctx, 4, 17 + legOff, 3, 4, p.pants, s);
  rect(ctx, 9, 17 - legOff, 3, 4, p.pants, s);
  rect(ctx, 4, 21 + legOff, 3, 2, p.shoes, s);
  rect(ctx, 9, 21 - legOff, 3, 2, p.shoes, s);
}

function drawCharWalkRight(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, s: number) {
  const f = frame % 4;
  drawCharRight(ctx, p, 0, false, s);
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(4 * s, 18 * s, 7 * s, 5 * s);
  const legOff = [0, 1, 0, -1][f];
  rect(ctx, 4, 18 + legOff, 3, 4, p.pants, s);
  rect(ctx, 6, 18 - legOff, 3, 4, p.pants, s);
  rect(ctx, 4, 22 + legOff, 3, 1, p.shoes, s);
  rect(ctx, 6, 22 - legOff, 3, 1, p.shoes, s);
}

function drawCharWalkLeft(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, s: number) {
  const f = frame % 4;
  drawCharLeft(ctx, p, 0, false, s);
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(7 * s, 18 * s, 7 * s, 5 * s);
  const legOff = [0, 1, 0, -1][f];
  rect(ctx, 7, 18 - legOff, 3, 4, p.pants, s);
  rect(ctx, 10, 18 + legOff, 3, 4, p.pants, s);
  rect(ctx, 7, 22 - legOff, 3, 1, p.shoes, s);
  rect(ctx, 10, 22 + legOff, 3, 1, p.shoes, s);
}

/** Sitting character — shorter, no legs visible, facing monitor */
function drawCharSittingDown(ctx: CanvasRenderingContext2D, p: CharPalette, frame: number, isReading: boolean, s: number) {
  const f = frame % 2;
  const armOff = f === 1 ? 1 : 0;

  // Head
  rect(ctx, 5, 0, 6, 2, p.hair, s);
  rect(ctx, 4, 1, 8, 3, p.hair, s);
  rect(ctx, 4, 4, 8, 4, p.skin, s);
  px(ctx, 5, 5, '#333', s);
  px(ctx, 9, 5, '#333', s);
  px(ctx, 6, 6, darkenColor(p.skin, 0.85), s);
  rect(ctx, 4, 7, 8, 1, p.skin, s);
  rect(ctx, 5, 8, 6, 1, p.skin, s);

  // Body (wider, sitting)
  rect(ctx, 2, 9, 12, 5, p.shirt, s);
  px(ctx, 6, 11, p.shirtLight, s);
  px(ctx, 8, 11, p.shirtLight, s);

  // Arms on desk
  if (isReading) {
    rect(ctx, 1, 8, 2, 3, p.skin, s);
    rect(ctx, 13, 8, 2, 3, p.skin, s);
    rect(ctx, 5, 7 - armOff, 6, 2, '#e8e0d0', s);
  } else {
    // Typing — arms slightly forward
    rect(ctx, 1, 9 + armOff, 2, 3, p.skin, s);
    rect(ctx, 13, 9 + armOff, 2, 3, p.skin, s);
  }

  // Chair hint
  rect(ctx, 3, 14, 10, 2, '#64748b', s);
  rect(ctx, 3, 13, 10, 1, '#94a3b8', s);
}

/** Get character sprite canvas */
export function getCharacterSprite(
  palette: CharPalette,
  state: CharState,
  dir: Direction,
  frame: number,
  isReading: boolean,
): HTMLCanvasElement {
  const pStr = `${palette.skin}-${palette.shirt}`;
  const key = `char-${pStr}-${state}-${dir}-${frame}-${isReading}`;
  const w = CHAR_W;
  const h = state === 'idle' || state === 'typing' || state === 'reading' ? CHAR_H : CHAR_H;

  return getCachedCanvas(key, w, h, (ctx) => {
    switch (state) {
      case CharState.TYPING:
        if (dir === Direction.DOWN) drawCharSittingDown(ctx, palette, frame, isReading, 1);
        else if (dir === Direction.UP) drawCharUp(ctx, palette, frame, isReading, 1);
        else if (dir === Direction.RIGHT) drawCharRight(ctx, palette, frame, isReading, 1);
        else drawCharLeft(ctx, palette, frame, isReading, 1);
        break;
      case CharState.READING:
        if (dir === Direction.DOWN) drawCharSittingDown(ctx, palette, frame, true, 1);
        else if (dir === Direction.UP) drawCharUp(ctx, palette, frame, true, 1);
        else if (dir === Direction.RIGHT) drawCharRight(ctx, palette, frame, true, 1);
        else drawCharLeft(ctx, palette, frame, true, 1);
        break;
      case CharState.WALKING:
        if (dir === Direction.DOWN) drawCharWalkDown(ctx, palette, frame, 1);
        else if (dir === Direction.UP) drawCharWalkUp(ctx, palette, frame, 1);
        else if (dir === Direction.RIGHT) drawCharWalkRight(ctx, palette, frame, 1);
        else drawCharWalkLeft(ctx, palette, frame, 1);
        break;
      case CharState.IDLE:
      default:
        if (dir === Direction.DOWN) drawCharDown(ctx, palette, 0, false, 1);
        else if (dir === Direction.UP) drawCharUp(ctx, palette, 0, false, 1);
        else if (dir === Direction.RIGHT) drawCharRight(ctx, palette, 0, false, 1);
        else drawCharLeft(ctx, palette, 0, false, 1);
        break;
    }
  });
}

// ════════════════════════════════════════════════════════════════
// FURNITURE SPRITES
// ════════════════════════════════════════════════════════════════

/** Draw desk (front view) - 3 tiles wide, 2 tiles tall */
export function getDeskFrontSprite(color: string): HTMLCanvasElement {
  const key = `desk-front-${color}`;
  return getCachedCanvas(key, 48, 24, (ctx) => {
    // Desk surface
    rect(ctx, 0, 0, 48, 14, color, 1);
    rect(ctx, 0, 0, 48, 2, lightenColor(color, 0.25), 1);
    rect(ctx, 0, 14, 48, 3, darkenColor(color, 0.8), 1);
    // Legs
    rect(ctx, 2, 17, 3, 7, darkenColor(color, 0.6), 1);
    rect(ctx, 43, 17, 3, 7, darkenColor(color, 0.6), 1);
    // Edge highlight
    rect(ctx, 0, 0, 48, 1, lightenColor(color, 0.4), 1);
  });
}

/** Draw desk (side view) */
export function getDeskSideSprite(color: string): HTMLCanvasElement {
  const key = `desk-side-${color}`;
  return getCachedCanvas(key, 16, 24, (ctx) => {
    rect(ctx, 0, 0, 16, 14, color, 1);
    rect(ctx, 0, 0, 16, 2, lightenColor(color, 0.25), 1);
    rect(ctx, 0, 14, 16, 3, darkenColor(color, 0.8), 1);
    rect(ctx, 2, 17, 3, 7, darkenColor(color, 0.6), 1);
    rect(ctx, 11, 17, 3, 7, darkenColor(color, 0.6), 1);
    rect(ctx, 0, 0, 16, 1, lightenColor(color, 0.4), 1);
  });
}

/** Draw chair (front view) - 1 tile */
export function getChairFrontSprite(occupied: boolean): HTMLCanvasElement {
  const key = `chair-front-${occupied}`;
  return getCachedCanvas(key, 16, 16, (ctx) => {
    const c = occupied ? '#475569' : '#94a3b8';
    const cDark = occupied ? '#334155' : '#64748b';
    // Back rest
    rect(ctx, 3, 0, 10, 5, cDark, 1);
    // Seat
    rect(ctx, 2, 5, 12, 5, c, 1);
    rect(ctx, 2, 5, 12, 1, lightenColor(c, 0.2), 1);
    // Legs
    rect(ctx, 3, 10, 2, 6, cDark, 1);
    rect(ctx, 11, 10, 2, 6, cDark, 1);
  });
}

/** Draw PC monitor (front, ON) */
export function getPCFrontOnSprite(): HTMLCanvasElement {
  return getCachedCanvas('pc-front-on', 16, 16, (ctx) => {
    // Screen
    rect(ctx, 1, 0, 14, 10, '#1e293b', 1);
    rect(ctx, 2, 1, 12, 8, '#0f172a', 1);
    // Screen content
    rect(ctx, 3, 2, 5, 1, '#3b82f6', 1);
    rect(ctx, 3, 3, 3, 1, '#60a5fa', 1);
    rect(ctx, 3, 4, 6, 1, '#2563eb', 1);
    rect(ctx, 3, 5, 4, 1, '#3b82f6', 1);
    // Glow
    rect(ctx, 2, 1, 12, 8, 'rgba(59,130,246,0.15)', 1);
    // Stand
    rect(ctx, 6, 10, 4, 3, '#64748b', 1);
    rect(ctx, 5, 13, 6, 2, '#475569', 1);
  });
}

/** Draw PC monitor (front, OFF) */
export function getPCFrontOffSprite(): HTMLCanvasElement {
  return getCachedCanvas('pc-front-off', 16, 16, (ctx) => {
    rect(ctx, 1, 0, 14, 10, '#1e293b', 1);
    rect(ctx, 2, 1, 12, 8, '#0f172a', 1);
    rect(ctx, 3, 4, 2, 1, '#1e293b', 1);
    rect(ctx, 6, 10, 4, 3, '#64748b', 1);
    rect(ctx, 5, 13, 6, 2, '#475569', 1);
  });
}

/** Draw PC monitor (side view) */
export function getPCSideSprite(): HTMLCanvasElement {
  return getCachedCanvas('pc-side', 16, 16, (ctx) => {
    rect(ctx, 0, 1, 10, 9, '#1e293b', 1);
    rect(ctx, 1, 2, 8, 7, '#0f172a', 1);
    rect(ctx, 2, 4, 3, 1, '#3b82f6', 1);
    rect(ctx, 2, 5, 2, 1, '#60a5fa', 1);
    rect(ctx, 5, 10, 3, 3, '#64748b', 1);
    rect(ctx, 4, 13, 5, 2, '#475569', 1);
  });
}

/** Draw meeting table - 4 tiles wide, 2 tiles tall */
export function getMeetingTableSprite(): HTMLCanvasElement {
  return getCachedCanvas('meeting-table', 64, 32, (ctx) => {
    const wood = '#92400e';
    const woodLight = '#b45309';
    const woodDark = '#78350f';
    // Top
    rect(ctx, 0, 0, 64, 20, woodLight, 1);
    rect(ctx, 0, 0, 64, 2, lightenColor(woodLight, 0.3), 1);
    // Front
    rect(ctx, 0, 20, 64, 5, wood, 1);
    rect(ctx, 0, 25, 64, 2, woodDark, 1);
    // Legs
    rect(ctx, 4, 27, 3, 5, woodDark, 1);
    rect(ctx, 57, 27, 3, 5, woodDark, 1);
  });
}

/** Draw server rack */
export function getServerRackSprite(active: boolean): HTMLCanvasElement {
  const key = `server-rack-${active}`;
  return getCachedCanvas(key, 32, 48, (ctx) => {
    rect(ctx, 0, 0, 32, 48, '#1e293b', 1);
    rect(ctx, 0, 0, 32, 2, '#334155', 1);
    for (let i = 0; i < 5; i++) {
      const y = 4 + i * 9;
      rect(ctx, 2, y, 28, 7, '#0f172a', 1);
      px(ctx, 4, y + 2, active ? '#4ade80' : '#475569', 1);
      px(ctx, 4, y + 4, active ? '#4ade80' : '#475569', 1);
      rect(ctx, 8, y + 2, 10, 2, '#334155', 1);
      rect(ctx, 8, y + 4, 6, 2, '#292524', 1);
    }
    rect(ctx, 0, 47, 32, 1, '#0f172a', 1);
  });
}

/** Draw bookshelf */
export function getBookshelfSprite(): HTMLCanvasElement {
  return getCachedCanvas('bookshelf', 32, 40, (ctx) => {
    const wood = '#78350f';
    const woodLight = '#92400e';
    rect(ctx, 0, 0, 32, 40, wood, 1);
    rect(ctx, 0, 0, 32, 2, woodLight, 1);
    // Shelves
    rect(ctx, 1, 12, 30, 2, woodLight, 1);
    rect(ctx, 1, 24, 30, 2, woodLight, 1);
    rect(ctx, 1, 36, 30, 2, woodLight, 1);
    // Books
    const bookColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const baseY = 3 + shelf * 12;
      for (let b = 0; b < 5; b++) {
        const bw = 4 + (b % 2);
        const bh = 7 + (b * 2) % 4;
        rect(ctx, 2 + b * 6, baseY + 8 - bh, bw, bh, bookColors[b], 1);
      }
    }
  });
}

/** Draw whiteboard */
export function getWhiteboardSprite(): HTMLCanvasElement {
  return getCachedCanvas('whiteboard', 48, 32, (ctx) => {
    rect(ctx, 0, 0, 48, 32, '#f8fafc', 1);
    rect(ctx, 0, 0, 48, 2, '#94a3b8', 1);
    rect(ctx, 0, 30, 48, 2, '#94a3b8', 1);
    rect(ctx, 0, 0, 2, 32, '#94a3b8', 1);
    rect(ctx, 46, 0, 2, 32, '#94a3b8', 1);
    // Lines
    rect(ctx, 4, 6, 24, 1, '#cbd5e1', 1);
    rect(ctx, 4, 10, 30, 1, '#cbd5e1', 1);
    rect(ctx, 4, 14, 18, 1, '#cbd5e1', 1);
    rect(ctx, 4, 18, 28, 1, '#cbd5e1', 1);
    rect(ctx, 4, 22, 22, 1, '#cbd5e1', 1);
  });
}

/** Draw sofa (front) */
export function getSofaFrontSprite(): HTMLCanvasElement {
  return getCachedCanvas('sofa-front', 64, 24, (ctx) => {
    rect(ctx, 0, 0, 64, 16, '#d6d3d1', 1);
    rect(ctx, 0, 0, 64, 4, '#e7e5e4', 1);
    rect(ctx, 4, 6, 16, 8, '#f5f5f4', 1);
    rect(ctx, 24, 6, 16, 8, '#f5f5f4', 1);
    rect(ctx, 44, 6, 16, 8, '#f5f5f4', 1);
    rect(ctx, 0, 16, 64, 4, '#a8a29e', 1);
    rect(ctx, 0, 20, 4, 4, '#78716c', 1);
    rect(ctx, 60, 20, 4, 4, '#78716c', 1);
  });
}

/** Draw coffee machine */
export function getCoffeeMachineSprite(): HTMLCanvasElement {
  return getCachedCanvas('coffee-machine', 16, 24, (ctx) => {
    rect(ctx, 1, 0, 14, 4, '#4b5563', 1);
    rect(ctx, 2, 4, 12, 16, '#374151', 1);
    rect(ctx, 4, 14, 8, 3, '#1f2937', 1);
    px(ctx, 11, 7, '#22c55e', 1);
    rect(ctx, 5, 20, 6, 4, '#78350f', 1);
  });
}

/** Draw plant */
export function getPlantSprite(): HTMLCanvasElement {
  return getCachedCanvas('plant', 16, 20, (ctx) => {
    // Pot
    rect(ctx, 4, 12, 8, 2, '#d97706', 1);
    rect(ctx, 3, 14, 10, 6, '#b45309', 1);
    // Leaves
    rect(ctx, 5, 2, 6, 10, '#16a34a', 1);
    rect(ctx, 2, 4, 5, 8, '#22c55e', 1);
    rect(ctx, 9, 4, 5, 8, '#22c55e', 1);
    rect(ctx, 6, 0, 4, 4, '#16a34a', 1);
  });
}

/** Draw command screen (large) */
export function getCommandScreenSprite(active: boolean): HTMLCanvasElement {
  const key = `command-screen-${active}`;
  return getCachedCanvas(key, 96, 48, (ctx) => {
    // Frame
    rect(ctx, 0, 0, 96, 48, '#0f172a', 1);
    rect(ctx, 1, 1, 94, 46, '#1e293b', 1);
    // 6 screens
    for (let i = 0; i < 6; i++) {
      const sx = 3 + (i % 3) * 31;
      const sy = 3 + Math.floor(i / 3) * 21;
      rect(ctx, sx, sy, 28, 18, active ? '#1e3a5f' : '#1e293b', 1);
      if (active) {
        rect(ctx, sx + 3, sy + 3, 8, 1, '#8B5CF6', 1);
        rect(ctx, sx + 3, sy + 5, 5, 1, '#60a5fa', 1);
        rect(ctx, sx + 3, sy + 7, 10, 1, '#3b82f6', 1);
      }
    }
    // Crown icon
    if (active) {
      rect(ctx, 44, 0, 8, 2, '#8B5CF6', 1);
    }
  });
}

// ════════════════════════════════════════════════════════════════
// SPEECH BUBBLE SPRITES
// ════════════════════════════════════════════════════════════════

export function getPermissionBubbleSprite(): HTMLCanvasElement {
  return getCachedCanvas('bubble-permission', 11, 13, (ctx) => {
    // Border
    rect(ctx, 0, 0, 11, 10, '#555566', 1);
    // Fill
    rect(ctx, 1, 1, 9, 8, '#EEEEFF', 1);
    // ... dots
    px(ctx, 3, 4, '#CCA700', 1);
    px(ctx, 5, 4, '#CCA700', 1);
    px(ctx, 7, 4, '#CCA700', 1);
    // Tail
    rect(ctx, 4, 10, 3, 1, '#555566', 1);
    px(ctx, 5, 11, '#555566', 1);
  });
}

export function getWaitingBubbleSprite(): HTMLCanvasElement {
  return getCachedCanvas('bubble-waiting', 11, 13, (ctx) => {
    // Border
    rect(ctx, 1, 0, 9, 10, '#555566', 1);
    // Fill
    rect(ctx, 1, 1, 9, 8, '#EEEEFF', 1);
    // Checkmark
    px(ctx, 8, 2, '#44BB66', 1);
    px(ctx, 7, 3, '#44BB66', 1);
    px(ctx, 6, 4, '#44BB66', 1);
    px(ctx, 3, 5, '#44BB66', 1);
    px(ctx, 4, 5, '#44BB66', 1);
    px(ctx, 5, 4, '#44BB66', 1);
    // Tail
    rect(ctx, 4, 10, 3, 1, '#555566', 1);
    px(ctx, 5, 11, '#555566', 1);
  });
}

export function getThinkingBubbleSprite(): HTMLCanvasElement {
  return getCachedCanvas('bubble-thinking', 11, 13, (ctx) => {
    // Border
    rect(ctx, 0, 0, 11, 10, '#555566', 1);
    // Fill
    rect(ctx, 1, 1, 9, 8, '#EEEEFF', 1);
    // ? mark
    px(ctx, 4, 2, '#3b82f6', 1);
    px(ctx, 5, 2, '#3b82f6', 1);
    px(ctx, 6, 2, '#3b82f6', 1);
    px(ctx, 6, 3, '#3b82f6', 1);
    px(ctx, 5, 4, '#3b82f6', 1);
    px(ctx, 4, 5, '#3b82f6', 1);
    px(ctx, 5, 6, '#3b82f6', 1);
    px(ctx, 5, 8, '#3b82f6', 1);
    // Tail
    rect(ctx, 4, 10, 3, 1, '#555566', 1);
    px(ctx, 5, 11, '#555566', 1);
  });
}

// ════════════════════════════════════════════════════════════════
// FLOOR & WALL COLORS
// ════════════════════════════════════════════════════════════════

export const FLOOR_COLORS: Record<number, string> = {
  [TileType.WALL]: '#3A3A5C',
  [TileType.FLOOR_1]: '#e8e0d4',  // Command - warm beige
  [TileType.FLOOR_2]: '#dcc8a8',  // Meeting - light wood
  [TileType.FLOOR_3]: '#d0d8e4',  // Situation - cool blue
  [TileType.FLOOR_4]: '#d0e4d8',  // Dev - tech green
  [TileType.FLOOR_5]: '#e4d0d8',  // Design - warm pink
  [TileType.FLOOR_6]: '#c8d8d4',  // Server - dark teal
  [TileType.FLOOR_7]: '#d8d0e4',  // Research - purple
  [TileType.FLOOR_8]: '#ddd8d0',  // Lounge - warm stone
  [TileType.FLOOR_9]: '#d4d4d0',  // Corridor - neutral
  [TileType.VOID]: '#1a1a2e',
};

export const WALL_COLOR = '#3A3A5C';
export const WALL_TOP_COLOR = '#4A4A6C';
export const WALL_SIDE_COLOR = '#2A2A4C';

// ════════════════════════════════════════════════════════════════
// CHARACTER PALETTES — 10 distinct palettes for 10 agent roles
// ════════════════════════════════════════════════════════════════

export const ROLE_PALETTES: Record<string, CharPalette> = {
  orchestrator: {
    skin: '#f5c77e', hair: '#5b3a1a', shirt: '#7c3aed', shirtLight: '#8b5cf6',
    pants: '#4c1d95', shoes: '#3b0764', outline: '#1e1060',
  },
  analyst: {
    skin: '#f5c77e', hair: '#3b2f1a', shirt: '#2563eb', shirtLight: '#3b82f6',
    pants: '#1e3a5f', shoes: '#0f2557', outline: '#0a1628',
  },
  architect: {
    skin: '#e8b86d', hair: '#4a3728', shirt: '#d97706', shirtLight: '#f59e0b',
    pants: '#78350f', shoes: '#451a03', outline: '#2c1204',
  },
  designer: {
    skin: '#f5c77e', hair: '#8b2252', shirt: '#db2777', shirtLight: '#ec4899',
    pants: '#831843', shoes: '#500724', outline: '#2d0315',
  },
  frontend_engineer: {
    skin: '#f5c77e', hair: '#2d1a0e', shirt: '#059669', shirtLight: '#10b981',
    pants: '#064e3b', shoes: '#022c22', outline: '#011a14',
  },
  backend_engineer: {
    skin: '#e8b86d', hair: '#1a1a2e', shirt: '#4f46e5', shirtLight: '#6366f1',
    pants: '#312e81', shoes: '#1e1b4b', outline: '#0c0a2a',
  },
  data_engineer: {
    skin: '#d4a05a', hair: '#2d1a0e', shirt: '#0d9488', shirtLight: '#14b8a6',
    pants: '#134e4a', shoes: '#042f2e', outline: '#021c1b',
  },
  qa_engineer: {
    skin: '#f5c77e', hair: '#6b2c10', shirt: '#e11d48', shirtLight: '#f43f5e',
    pants: '#881337', shoes: '#4c0519', outline: '#2a030f',
  },
  devops_engineer: {
    skin: '#e8b86d', hair: '#3b2f1a', shirt: '#ea580c', shirtLight: '#f97316',
    pants: '#7c2d12', shoes: '#431407', outline: '#230a03',
  },
  researcher: {
    skin: '#f5c77e', hair: '#4a1942', shirt: '#7c3aed', shirtLight: '#8b5cf6',
    pants: '#4c1d95', shoes: '#2e1065', outline: '#1a0840',
  },
};

export function getRolePalette(role: string): CharPalette {
  return ROLE_PALETTES[role] ?? ROLE_PALETTES.orchestrator;
}

// Clear sprite cache (for testing or when needed)
export function clearSpriteCache() {
  spriteCanvasCache.clear();
}
