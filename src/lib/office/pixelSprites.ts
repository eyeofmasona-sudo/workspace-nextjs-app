// ─── Agent OS — Pixel Sprite System (1:1 pixel-agents architecture) ──
// SpriteData-based sprite generation, caching, colorization, and outline.
// All visuals are pure data (string[][]) — enables runtime colorization,
// outline generation, and per-pixel matrix effects.

import type { CharPalette, SpriteData, ColorValue, Direction } from './pixelTypes';
import { TILE_SIZE } from './pixelTypes';

// ════════════════════════════════════════════════════════════════
// COLOR UTILITIES
// ════════════════════════════════════════════════════════════════

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex(r: number, g: number, b: number, a?: number): string {
  const rh = Math.round(Math.max(0, Math.min(255, r))).toString(16).padStart(2, '0');
  const gh = Math.round(Math.max(0, Math.min(255, g))).toString(16).padStart(2, '0');
  const bh = Math.round(Math.max(0, Math.min(255, b))).toString(16).padStart(2, '0');
  if (a !== undefined && a < 1) {
    const ah = Math.round(a * 255).toString(16).padStart(2, '0');
    return `#${rh}${gh}${bh}${ah}`;
  }
  return `#${rh}${gh}${bh}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

function parsePixelColor(px: string): { r: number; g: number; b: number; a: number } | null {
  if (!px || px === '') return null;
  const rgb = hexToRgb(px.slice(0, 7));
  if (!rgb) return null;
  const a = px.length >= 9 ? parseInt(px.slice(7, 9), 16) / 255 : 1;
  return { r: rgb[0], g: rgb[1], b: rgb[2], a };
}

// ════════════════════════════════════════════════════════════════
// COLORIZE SYSTEM (Photoshop-style)
// ════════════════════════════════════════════════════════════════

const colorizeCache = new Map<string, SpriteData>();

export function colorizeSprite(sprite: SpriteData, color: ColorValue): SpriteData {
  const key = `c-${color.h}-${color.s}-${color.b}-${color.c}`;
  const cached = colorizeCache.get(key + sprite.length);
  if (cached) return cached;

  const result: SpriteData = [];
  for (let y = 0; y < sprite.length; y++) {
    const row: string[] = [];
    for (let x = 0; x < sprite[y].length; x++) {
      const px = sprite[y][x];
      if (!px) { row.push(''); continue; }
      const parsed = parsePixelColor(px);
      if (!parsed) { row.push(px); continue; }

      const lum = (0.299 * parsed.r + 0.587 * parsed.g + 0.114 * parsed.b) / 255;
      let lightness = lum;
      // Contrast
      lightness = 0.5 + (lightness - 0.5) * ((100 + color.c) / 100);
      // Brightness
      lightness += color.b / 200;
      lightness = Math.max(0, Math.min(1, lightness));

      const [r, g, b] = hslToRgb(color.h, color.s / 100, lightness);
      row.push(rgbToHex(r, g, b, parsed.a));
    }
    result.push(row);
  }
  colorizeCache.set(key + sprite.length, result);
  return result;
}

// ════════════════════════════════════════════════════════════════
// ADJUST SYSTEM (HSL shift for hue rotation)
// ════════════════════════════════════════════════════════════════

export function adjustSprite(sprite: SpriteData, hueShift: number, satShift = 0, briShift = 0, conShift = 0): SpriteData {
  const result: SpriteData = [];
  for (let y = 0; y < sprite.length; y++) {
    const row: string[] = [];
    for (let x = 0; x < sprite[y].length; x++) {
      const px = sprite[y][x];
      if (!px) { row.push(''); continue; }
      const parsed = parsePixelColor(px);
      if (!parsed) { row.push(px); continue; }

      const [h, s, l] = rgbToHsl(parsed.r, parsed.g, parsed.b);
      const newH = (h + hueShift + 360) % 360;
      let newS = s + satShift / 100;
      newS = Math.max(0, Math.min(1, newS));
      let newL = l;
      newL = 0.5 + (newL - 0.5) * ((100 + conShift) / 100);
      newL += briShift / 200;
      newL = Math.max(0, Math.min(1, newL));

      const [r, g, b] = hslToRgb(newH, newS, newL);
      row.push(rgbToHex(r, g, b, parsed.a));
    }
    result.push(row);
  }
  return result;
}

// ════════════════════════════════════════════════════════════════
// SPRITE CACHE — Two-level zoom caching with WeakMaps
// ════════════════════════════════════════════════════════════════

const zoomCaches = new Map<number, WeakMap<SpriteData, HTMLCanvasElement>>();
const outlineSpriteCache = new WeakMap<SpriteData, SpriteData>();

export function getCachedSprite(sprite: SpriteData, zoom: number): HTMLCanvasElement {
  let levelCache = zoomCaches.get(zoom);
  if (!levelCache) {
    levelCache = new WeakMap();
    zoomCaches.set(zoom, levelCache);
  }
  const cached = levelCache.get(sprite);
  if (cached) return cached;

  const rows = sprite.length;
  const cols = rows > 0 ? sprite[0].length : 0;
  const canvas = document.createElement('canvas');
  canvas.width = cols * zoom;
  canvas.height = rows * zoom;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = sprite[y][x];
      if (!px) continue;
      ctx.fillStyle = px;
      ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
    }
  }

  levelCache.set(sprite, canvas);
  return canvas;
}

export function getOutlineSprite(sprite: SpriteData): SpriteData {
  const cached = outlineSpriteCache.get(sprite);
  if (cached) return cached;

  const rows = sprite.length;
  const cols = rows > 0 ? sprite[0].length : 0;
  const expanded: SpriteData = Array.from({ length: rows + 2 }, () =>
    Array.from({ length: cols + 2 }, () => '')
  );

  // Mark cardinal neighbors of opaque pixels as white
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (sprite[y][x]) {
        const ey = y + 1, ex = x + 1;
        if (!expanded[ey - 1][ex]) expanded[ey - 1][ex] = '#FFFFFF';
        if (!expanded[ey + 1][ex]) expanded[ey + 1][ex] = '#FFFFFF';
        if (!expanded[ey][ex - 1]) expanded[ey][ex - 1] = '#FFFFFF';
        if (!expanded[ey][ex + 1]) expanded[ey][ex + 1] = '#FFFFFF';
      }
    }
  }

  // Clear pixels overlapping with original opaque pixels
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (sprite[y][x]) {
        expanded[y + 1][x + 1] = '';
      }
    }
  }

  outlineSpriteCache.set(sprite, expanded);
  return expanded;
}

// ════════════════════════════════════════════════════════════════
// SPRITE FLIP UTILITY
// ════════════════════════════════════════════════════════════════

export function flipSpriteHorizontal(sprite: SpriteData): SpriteData {
  return sprite.map(row => [...row].reverse());
}

// ════════════════════════════════════════════════════════════════
// PROCEDURAL SPRITE GENERATION
// Character, furniture, bubble, floor, wall sprites as SpriteData
// ════════════════════════════════════════════════════════════════

// Helper: create empty SpriteData
function emptySprite(w: number, h: number): SpriteData {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ''));
}

// Helper: draw filled rect into SpriteData
function fillRect(spr: SpriteData, x: number, y: number, w: number, h: number, color: string) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const sy = y + dy, sx = x + dx;
      if (sy >= 0 && sy < spr.length && sx >= 0 && sx < (spr[0]?.length ?? 0)) {
        spr[sy][sx] = color;
      }
    }
  }
}

// Helper: set single pixel
function setPixel(spr: SpriteData, x: number, y: number, color: string) {
  if (y >= 0 && y < spr.length && x >= 0 && x < (spr[0]?.length ?? 0)) {
    spr[y][x] = color;
  }
}

function darkenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb[0] * factor, rgb[1] * factor, rgb[2] * factor);
}

function lightenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb[0] + (255 - rgb[0]) * factor,
    rgb[1] + (255 - rgb[1]) * factor,
    rgb[2] + (255 - rgb[2]) * factor
  );
}

// ── CHARACTER SPRITES ──────────────────────────────────────────
// 16×24 pixel characters in 4 directions × multiple states

interface CharacterSpriteSet {
  walk: Record<Direction, [SpriteData, SpriteData, SpriteData, SpriteData]>;
  typing: Record<Direction, [SpriteData, SpriteData]>;
  reading: Record<Direction, [SpriteData, SpriteData]>;
}

const charSpriteCache = new Map<string, CharacterSpriteSet>();

function buildCharacterDown(p: CharPalette): SpriteData[] {
  const sprites: SpriteData[] = [];

  // Frame 0: Walk stand / idle
  const s0 = emptySprite(16, 24);
  // Hair
  fillRect(s0, 5, 0, 6, 2, p.hair);
  fillRect(s0, 4, 2, 8, 3, p.hair);
  // Face
  fillRect(s0, 4, 5, 8, 4, p.skin);
  setPixel(s0, 6, 6, '#333333');
  setPixel(s0, 9, 6, '#333333');
  setPixel(s0, 7, 7, darkenHex(p.skin, 0.85));
  fillRect(s0, 4, 8, 8, 1, p.skin);
  fillRect(s0, 5, 9, 6, 1, p.skin);
  // Body
  fillRect(s0, 3, 10, 10, 1, p.shirt);
  fillRect(s0, 3, 11, 10, 3, p.shirt);
  setPixel(s0, 6, 12, p.shirtLight);
  setPixel(s0, 8, 12, p.shirtLight);
  // Arms down
  fillRect(s0, 2, 11, 2, 3, p.skin);
  fillRect(s0, 12, 11, 2, 3, p.skin);
  // Pants
  fillRect(s0, 4, 14, 3, 4, p.pants);
  fillRect(s0, 9, 14, 3, 4, p.pants);
  fillRect(s0, 4, 18, 3, 4, p.pants);
  fillRect(s0, 9, 18, 3, 4, p.pants);
  // Shoes
  fillRect(s0, 4, 22, 3, 2, p.shoes);
  fillRect(s0, 9, 22, 3, 2, p.shoes);
  sprites.push(s0);

  // Frame 1: Walk step right leg forward
  const s1 = emptySprite(16, 24);
  fillRect(s1, 5, 0, 6, 2, p.hair);
  fillRect(s1, 4, 2, 8, 3, p.hair);
  fillRect(s1, 4, 5, 8, 4, p.skin);
  setPixel(s1, 6, 6, '#333333');
  setPixel(s1, 9, 6, '#333333');
  fillRect(s1, 4, 8, 8, 1, p.skin);
  fillRect(s1, 5, 9, 6, 1, p.skin);
  fillRect(s1, 3, 10, 10, 1, p.shirt);
  fillRect(s1, 3, 11, 10, 3, p.shirt);
  fillRect(s1, 2, 11, 2, 3, p.skin);
  fillRect(s1, 12, 11, 2, 3, p.skin);
  fillRect(s1, 4, 14, 3, 4, p.pants);
  fillRect(s1, 9, 14, 3, 4, p.pants);
  // Legs spread
  fillRect(s1, 3, 18, 3, 4, p.pants);
  fillRect(s1, 10, 18, 3, 4, p.pants);
  fillRect(s1, 3, 22, 3, 2, p.shoes);
  fillRect(s1, 10, 22, 3, 2, p.shoes);
  sprites.push(s1);

  // Frame 2: Walk step left leg forward
  const s2 = emptySprite(16, 24);
  fillRect(s2, 5, 0, 6, 2, p.hair);
  fillRect(s2, 4, 2, 8, 3, p.hair);
  fillRect(s2, 4, 5, 8, 4, p.skin);
  setPixel(s2, 6, 6, '#333333');
  setPixel(s2, 9, 6, '#333333');
  fillRect(s2, 4, 8, 8, 1, p.skin);
  fillRect(s2, 5, 9, 6, 1, p.skin);
  fillRect(s2, 3, 10, 10, 1, p.shirt);
  fillRect(s2, 3, 11, 10, 3, p.shirt);
  fillRect(s2, 2, 11, 2, 3, p.skin);
  fillRect(s2, 12, 11, 2, 3, p.skin);
  fillRect(s2, 4, 14, 3, 4, p.pants);
  fillRect(s2, 9, 14, 3, 4, p.pants);
  fillRect(s2, 5, 18, 3, 4, p.pants);
  fillRect(s2, 8, 18, 3, 4, p.pants);
  fillRect(s2, 5, 22, 3, 2, p.shoes);
  fillRect(s2, 8, 22, 3, 2, p.shoes);
  sprites.push(s2);

  // Frame 3: Typing/working — arms forward
  const s3 = emptySprite(16, 24);
  fillRect(s3, 5, 0, 6, 2, p.hair);
  fillRect(s3, 4, 2, 8, 3, p.hair);
  fillRect(s3, 4, 5, 8, 4, p.skin);
  setPixel(s3, 6, 6, '#333333');
  setPixel(s3, 9, 6, '#333333');
  fillRect(s3, 4, 8, 8, 1, p.skin);
  fillRect(s3, 5, 9, 6, 1, p.skin);
  fillRect(s3, 3, 10, 10, 5, p.shirt);
  setPixel(s3, 6, 12, p.shirtLight);
  setPixel(s3, 8, 12, p.shirtLight);
  // Arms on desk
  fillRect(s3, 1, 9, 2, 3, p.skin);
  fillRect(s3, 13, 9, 2, 3, p.skin);
  // Chair
  fillRect(s3, 3, 15, 10, 2, '#64748b');
  fillRect(s3, 3, 14, 10, 1, '#94a3b8');
  // Legs hidden by chair
  fillRect(s3, 4, 17, 3, 3, p.pants);
  fillRect(s3, 9, 17, 3, 3, p.pants);
  fillRect(s3, 4, 20, 3, 2, p.shoes);
  fillRect(s3, 9, 20, 3, 2, p.shoes);
  sprites.push(s3);

  // Frame 4: Typing alternate — arms slightly moved
  const s4 = emptySprite(16, 24);
  fillRect(s4, 5, 0, 6, 2, p.hair);
  fillRect(s4, 4, 2, 8, 3, p.hair);
  fillRect(s4, 4, 5, 8, 4, p.skin);
  setPixel(s4, 6, 6, '#333333');
  setPixel(s4, 9, 6, '#333333');
  fillRect(s4, 4, 8, 8, 1, p.skin);
  fillRect(s4, 5, 9, 6, 1, p.skin);
  fillRect(s4, 3, 10, 10, 5, p.shirt);
  setPixel(s4, 6, 12, p.shirtLight);
  setPixel(s4, 8, 12, p.shirtLight);
  fillRect(s4, 1, 10, 2, 3, p.skin);
  fillRect(s4, 13, 10, 2, 3, p.skin);
  fillRect(s4, 3, 15, 10, 2, '#64748b');
  fillRect(s4, 3, 14, 10, 1, '#94a3b8');
  fillRect(s4, 4, 17, 3, 3, p.pants);
  fillRect(s4, 9, 17, 3, 3, p.pants);
  fillRect(s4, 4, 20, 3, 2, p.shoes);
  fillRect(s4, 9, 20, 3, 2, p.shoes);
  sprites.push(s4);

  // Frame 5: Reading — holding paper
  const s5 = emptySprite(16, 24);
  fillRect(s5, 5, 0, 6, 2, p.hair);
  fillRect(s5, 4, 2, 8, 3, p.hair);
  fillRect(s5, 4, 5, 8, 4, p.skin);
  setPixel(s5, 6, 6, '#333333');
  setPixel(s5, 9, 6, '#333333');
  fillRect(s5, 4, 8, 8, 1, p.skin);
  fillRect(s5, 5, 9, 6, 1, p.skin);
  fillRect(s5, 3, 10, 10, 5, p.shirt);
  // Arms up with paper
  fillRect(s5, 1, 8, 2, 3, p.skin);
  fillRect(s5, 13, 8, 2, 3, p.skin);
  fillRect(s5, 5, 7, 6, 2, '#e8e0d0');
  fillRect(s5, 3, 15, 10, 2, '#64748b');
  fillRect(s5, 3, 14, 10, 1, '#94a3b8');
  fillRect(s5, 4, 17, 3, 3, p.pants);
  fillRect(s5, 9, 17, 3, 3, p.pants);
  fillRect(s5, 4, 20, 3, 2, p.shoes);
  fillRect(s5, 9, 20, 3, 2, p.shoes);
  sprites.push(s5);

  // Frame 6: Reading alternate
  const s6 = emptySprite(16, 24);
  fillRect(s6, 5, 0, 6, 2, p.hair);
  fillRect(s6, 4, 2, 8, 3, p.hair);
  fillRect(s6, 4, 5, 8, 4, p.skin);
  setPixel(s6, 6, 6, '#333333');
  setPixel(s6, 9, 6, '#333333');
  fillRect(s6, 4, 8, 8, 1, p.skin);
  fillRect(s6, 5, 9, 6, 1, p.skin);
  fillRect(s6, 3, 10, 10, 5, p.shirt);
  fillRect(s6, 1, 9, 2, 3, p.skin);
  fillRect(s6, 13, 9, 2, 3, p.skin);
  fillRect(s6, 5, 8, 6, 2, '#e8e0d0');
  fillRect(s6, 3, 15, 10, 2, '#64748b');
  fillRect(s6, 3, 14, 10, 1, '#94a3b8');
  fillRect(s6, 4, 17, 3, 3, p.pants);
  fillRect(s6, 9, 17, 3, 3, p.pants);
  fillRect(s6, 4, 20, 3, 2, p.shoes);
  fillRect(s6, 9, 20, 3, 2, p.shoes);
  sprites.push(s6);

  return sprites;
}

function buildCharacterUp(p: CharPalette): SpriteData[] {
  const sprites: SpriteData[] = [];

  for (let i = 0; i < 7; i++) {
    const s = emptySprite(16, 24);
    // Back of head
    fillRect(s, 4, 0, 8, 6, p.hair);
    fillRect(s, 5, 0, 6, 2, p.hair);
    fillRect(s, 4, 6, 8, 3, p.skin);
    fillRect(s, 5, 8, 6, 1, p.skin);

    if (i < 3) {
      // Walk frames
      fillRect(s, 3, 9, 10, 5, p.shirt);
      setPixel(s, 6, 11, darkenHex(p.shirt, 0.9));
      setPixel(s, 8, 11, darkenHex(p.shirt, 0.9));
      fillRect(s, 2, 10, 2, 3, p.skin);
      fillRect(s, 12, 10, 2, 3, p.skin);
      fillRect(s, 4, 14, 3, 4, p.pants);
      fillRect(s, 9, 14, 3, 4, p.pants);
      if (i === 1) {
        fillRect(s, 3, 18, 3, 4, p.pants);
        fillRect(s, 10, 18, 3, 4, p.pants);
        fillRect(s, 3, 22, 3, 2, p.shoes);
        fillRect(s, 10, 22, 3, 2, p.shoes);
      } else if (i === 2) {
        fillRect(s, 5, 18, 3, 4, p.pants);
        fillRect(s, 8, 18, 3, 4, p.pants);
        fillRect(s, 5, 22, 3, 2, p.shoes);
        fillRect(s, 8, 22, 3, 2, p.shoes);
      } else {
        fillRect(s, 4, 18, 3, 4, p.pants);
        fillRect(s, 9, 18, 3, 4, p.pants);
        fillRect(s, 4, 22, 3, 2, p.shoes);
        fillRect(s, 9, 22, 3, 2, p.shoes);
      }
    } else if (i < 5) {
      // Typing
      fillRect(s, 3, 9, 10, 5, p.shirt);
      fillRect(s, 1, 9 + (i % 2), 2, 3, p.skin);
      fillRect(s, 13, 9 + (i % 2), 2, 3, p.skin);
      fillRect(s, 3, 14, 10, 2, '#64748b');
      fillRect(s, 4, 16, 3, 3, p.pants);
      fillRect(s, 9, 16, 3, 3, p.pants);
      fillRect(s, 4, 19, 3, 2, p.shoes);
      fillRect(s, 9, 19, 3, 2, p.shoes);
    } else {
      // Reading
      fillRect(s, 3, 9, 10, 5, p.shirt);
      fillRect(s, 1, 8, 2, 3, p.skin);
      fillRect(s, 13, 8, 2, 3, p.skin);
      fillRect(s, 5, 7 + (i % 2), 6, 2, '#e8e0d0');
      fillRect(s, 3, 14, 10, 2, '#64748b');
      fillRect(s, 4, 16, 3, 3, p.pants);
      fillRect(s, 9, 16, 3, 3, p.pants);
      fillRect(s, 4, 19, 3, 2, p.shoes);
      fillRect(s, 9, 19, 3, 2, p.shoes);
    }
    sprites.push(s);
  }
  return sprites;
}

function buildCharacterRight(p: CharPalette): SpriteData[] {
  const sprites: SpriteData[] = [];

  for (let i = 0; i < 7; i++) {
    const s = emptySprite(16, 24);
    // Head side
    fillRect(s, 4, 0, 6, 2, p.hair);
    fillRect(s, 3, 2, 7, 4, p.hair);
    fillRect(s, 3, 5, 7, 4, p.skin);
    setPixel(s, 8, 6, '#333333');
    fillRect(s, 3, 8, 6, 1, p.skin);
    fillRect(s, 4, 9, 4, 1, p.skin);

    if (i < 3) {
      fillRect(s, 3, 10, 7, 5, p.shirt);
      setPixel(s, 5, 12, p.shirtLight);
      fillRect(s, 9, 10, 2, 3, p.skin);
      fillRect(s, 2, 11, 2, 3, p.skin);
      fillRect(s, 4, 15, 5, 3, p.pants);
      if (i === 1) {
        fillRect(s, 6, 18, 3, 4, p.pants);
        fillRect(s, 4, 18, 3, 4, p.pants);
        fillRect(s, 6, 22, 3, 2, p.shoes);
        fillRect(s, 4, 22, 3, 2, p.shoes);
      } else if (i === 2) {
        fillRect(s, 7, 18, 3, 4, p.pants);
        fillRect(s, 3, 18, 3, 4, p.pants);
        fillRect(s, 7, 22, 3, 2, p.shoes);
        fillRect(s, 3, 22, 3, 2, p.shoes);
      } else {
        fillRect(s, 5, 18, 3, 4, p.pants);
        fillRect(s, 5, 22, 3, 2, p.shoes);
      }
    } else if (i < 5) {
      fillRect(s, 3, 10, 7, 5, p.shirt);
      setPixel(s, 5, 12, p.shirtLight);
      fillRect(s, 9, 9 + (i % 2), 2, 3, p.skin);
      fillRect(s, 2, 11, 2, 3, p.skin);
      fillRect(s, 4, 15, 5, 2, '#64748b');
      fillRect(s, 5, 17, 3, 3, p.pants);
      fillRect(s, 5, 20, 3, 2, p.shoes);
    } else {
      fillRect(s, 3, 10, 7, 5, p.shirt);
      fillRect(s, 9, 8 + (i % 2), 2, 3, p.skin);
      fillRect(s, 5, 7 + (i % 2), 5, 2, '#e8e0d0');
      fillRect(s, 2, 11, 2, 3, p.skin);
      fillRect(s, 4, 15, 5, 2, '#64748b');
      fillRect(s, 5, 17, 3, 3, p.pants);
      fillRect(s, 5, 20, 3, 2, p.shoes);
    }
    sprites.push(s);
  }
  return sprites;
}

export function getCharacterSprites(palette: CharPalette, hueShift = 0): CharacterSpriteSet {
  const cacheKey = `${palette.skin}-${palette.shirt}:${hueShift}`;
  const cached = charSpriteCache.get(cacheKey);
  if (cached) return cached;

  const downFrames = buildCharacterDown(palette);
  const upFrames = buildCharacterUp(palette);
  const rightFrames = buildCharacterRight(palette);
  const leftFrames = rightFrames.map(s => flipSpriteHorizontal(s));

  // Apply hue shift if needed
  const allDown = hueShift !== 0 ? downFrames.map(s => adjustSprite(s, hueShift)) : downFrames;
  const allUp = hueShift !== 0 ? upFrames.map(s => adjustSprite(s, hueShift)) : upFrames;
  const allRight = hueShift !== 0 ? rightFrames.map(s => adjustSprite(s, hueShift)) : rightFrames;
  const allLeft = hueShift !== 0 ? leftFrames.map(s => adjustSprite(s, hueShift)) : leftFrames;

  const buildDir = (frames: SpriteData[]): [SpriteData, SpriteData, SpriteData, SpriteData] =>
    [frames[0], frames[1], frames[2], frames[1]]; // Walk: [stand, step1, step2, step1]
  const buildTyping = (frames: SpriteData[]): [SpriteData, SpriteData] =>
    [frames[3], frames[4]]; // Typing frames
  const buildReading = (frames: SpriteData[]): [SpriteData, SpriteData] =>
    [frames[5], frames[6]]; // Reading frames

  const result: CharacterSpriteSet = {
    walk: {
      0: buildDir(allDown),   // DOWN
      1: buildDir(allLeft),   // LEFT
      2: buildDir(allRight),  // RIGHT
      3: buildDir(allUp),     // UP
    } as Record<Direction, [SpriteData, SpriteData, SpriteData, SpriteData]>,
    typing: {
      0: buildTyping(allDown),
      1: buildTyping(allLeft),
      2: buildTyping(allRight),
      3: buildTyping(allUp),
    } as Record<Direction, [SpriteData, SpriteData]>,
    reading: {
      0: buildReading(allDown),
      1: buildReading(allLeft),
      2: buildReading(allRight),
      3: buildReading(allUp),
    } as Record<Direction, [SpriteData, SpriteData]>,
  };

  charSpriteCache.set(cacheKey, result);
  return result;
}

/** Get the correct sprite for a character's current state */
export function getCharacterSprite(
  sprites: CharacterSpriteSet,
  state: string,
  dir: Direction,
  frame: number,
  isReading: boolean,
): SpriteData {
  switch (state) {
    case 'type':
      if (isReading) return sprites.reading[dir][frame % 2];
      return sprites.typing[dir][frame % 2];
    case 'walk':
      return sprites.walk[dir][frame % 4];
    case 'idle':
    default:
      return sprites.walk[dir][1]; // Standing pose
  }
}

// ════════════════════════════════════════════════════════════════
// BUBBLE SPRITES (matching pixel-agents exactly)
// ════════════════════════════════════════════════════════════════

let _permissionBubble: SpriteData | null = null;
let _waitingBubble: SpriteData | null = null;

export function getPermissionBubbleSprite(): SpriteData {
  if (_permissionBubble) return _permissionBubble;
  const s = emptySprite(11, 13);
  // Border
  fillRect(s, 0, 0, 11, 10, '#555566');
  // Fill
  fillRect(s, 1, 1, 9, 8, '#EEEEFF');
  // ... dots
  setPixel(s, 3, 4, '#CCA700');
  setPixel(s, 5, 4, '#CCA700');
  setPixel(s, 7, 4, '#CCA700');
  // Tail
  fillRect(s, 4, 10, 3, 1, '#555566');
  setPixel(s, 5, 11, '#555566');
  _permissionBubble = s;
  return s;
}

export function getWaitingBubbleSprite(): SpriteData {
  if (_waitingBubble) return _waitingBubble;
  const s = emptySprite(11, 13);
  // Border
  fillRect(s, 1, 0, 9, 10, '#555566');
  setPixel(s, 0, 1, '#555566');
  setPixel(s, 10, 1, '#555566');
  // Fill
  fillRect(s, 2, 1, 7, 8, '#EEEEFF');
  // Checkmark
  setPixel(s, 8, 2, '#44BB66');
  setPixel(s, 7, 3, '#44BB66');
  setPixel(s, 6, 4, '#44BB66');
  setPixel(s, 5, 5, '#44BB66');
  setPixel(s, 4, 5, '#44BB66');
  setPixel(s, 3, 4, '#44BB66');
  // Tail
  fillRect(s, 4, 10, 3, 1, '#555566');
  setPixel(s, 5, 11, '#555566');
  _waitingBubble = s;
  return s;
}

// ════════════════════════════════════════════════════════════════
// FURNITURE SPRITES as SpriteData
// ════════════════════════════════════════════════════════════════

const furnitureSpriteCache = new Map<string, SpriteData>();

function getFurnitureSpriteCache(key: string, w: number, h: number, build: (s: SpriteData) => void): SpriteData {
  const cached = furnitureSpriteCache.get(key);
  if (cached) return cached;
  const s = emptySprite(w, h);
  build(s);
  furnitureSpriteCache.set(key, s);
  return s;
}

export function getDeskFrontSprite(): SpriteData {
  return getFurnitureSpriteCache('desk-front', 48, 24, (s) => {
    const wood = '#8B6C5C';
    fillRect(s, 0, 0, 48, 14, wood);
    fillRect(s, 0, 0, 48, 2, lightenHex(wood, 0.25));
    fillRect(s, 0, 14, 48, 3, darkenHex(wood, 0.8));
    fillRect(s, 2, 17, 3, 7, darkenHex(wood, 0.6));
    fillRect(s, 43, 17, 3, 7, darkenHex(wood, 0.6));
    fillRect(s, 0, 0, 48, 1, lightenHex(wood, 0.4));
  });
}

export function getChairFrontSprite(): SpriteData {
  return getFurnitureSpriteCache('chair-front', 16, 32, (s) => {
    const c = '#94a3b8';
    const cDark = '#64748b';
    // Back rest (top — background tile, characters can walk through)
    fillRect(s, 3, 0, 10, 5, cDark);
    // Seat (bottom — blocks walking)
    fillRect(s, 2, 16, 12, 5, c);
    fillRect(s, 2, 16, 12, 1, lightenHex(c, 0.2));
    // Legs
    fillRect(s, 3, 21, 2, 6, cDark);
    fillRect(s, 11, 21, 2, 6, cDark);
  });
}

export function getChairBackSprite(): SpriteData {
  return getFurnitureSpriteCache('chair-back', 16, 32, (s) => {
    const c = '#94a3b8';
    const cDark = '#64748b';
    fillRect(s, 3, 0, 10, 5, cDark);
    fillRect(s, 2, 16, 12, 5, c);
    fillRect(s, 2, 16, 12, 1, lightenHex(c, 0.2));
    fillRect(s, 3, 21, 2, 6, cDark);
    fillRect(s, 11, 21, 2, 6, cDark);
  });
}

export function getChairSideSprite(): SpriteData {
  return getFurnitureSpriteCache('chair-side', 16, 32, (s) => {
    const c = '#94a3b8';
    const cDark = '#64748b';
    fillRect(s, 4, 0, 8, 5, cDark);
    fillRect(s, 3, 16, 10, 5, c);
    fillRect(s, 3, 16, 10, 1, lightenHex(c, 0.2));
    fillRect(s, 4, 21, 2, 6, cDark);
    fillRect(s, 10, 21, 2, 6, cDark);
  });
}

export function getPCFrontOnSprite(frame: number): SpriteData {
  return getFurnitureSpriteCache(`pc-front-on-${frame}`, 16, 16, (s) => {
    fillRect(s, 1, 0, 14, 10, '#1e293b');
    fillRect(s, 2, 1, 12, 8, '#0f172a');
    // Screen content varies by frame
    const colors = ['#3b82f6', '#60a5fa', '#2563eb'];
    fillRect(s, 3, 2, 5, 1, colors[frame % 3]);
    fillRect(s, 3, 3, 3, 1, '#60a5fa');
    fillRect(s, 3, 4, 6, 1, '#2563eb');
    fillRect(s, 3, 5, 4, 1, colors[(frame + 1) % 3]);
    fillRect(s, 2, 1, 12, 8, 'rgba(59,130,246,0.15)');
    fillRect(s, 6, 10, 4, 3, '#64748b');
    fillRect(s, 5, 13, 6, 2, '#475569');
  });
}

export function getPCFrontOffSprite(): SpriteData {
  return getFurnitureSpriteCache('pc-front-off', 16, 16, (s) => {
    fillRect(s, 1, 0, 14, 10, '#1e293b');
    fillRect(s, 2, 1, 12, 8, '#0f172a');
    setPixel(s, 3, 4, '#1e293b');
    fillRect(s, 6, 10, 4, 3, '#64748b');
    fillRect(s, 5, 13, 6, 2, '#475569');
  });
}

export function getPCSideSprite(): SpriteData {
  return getFurnitureSpriteCache('pc-side', 16, 16, (s) => {
    fillRect(s, 0, 1, 10, 9, '#1e293b');
    fillRect(s, 1, 2, 8, 7, '#0f172a');
    fillRect(s, 2, 4, 3, 1, '#3b82f6');
    fillRect(s, 2, 5, 2, 1, '#60a5fa');
    fillRect(s, 5, 10, 3, 3, '#64748b');
    fillRect(s, 4, 13, 5, 2, '#475569');
  });
}

export function getMeetingTableSprite(): SpriteData {
  return getFurnitureSpriteCache('meeting-table', 64, 32, (s) => {
    const wood = '#92400e';
    const woodLight = '#b45309';
    const woodDark = '#78350f';
    fillRect(s, 0, 0, 64, 20, woodLight);
    fillRect(s, 0, 0, 64, 2, lightenHex(woodLight, 0.3));
    fillRect(s, 0, 20, 64, 5, wood);
    fillRect(s, 0, 25, 64, 2, woodDark);
    fillRect(s, 4, 27, 3, 5, woodDark);
    fillRect(s, 57, 27, 3, 5, woodDark);
  });
}

export function getServerRackSprite(active: boolean): SpriteData {
  return getFurnitureSpriteCache(`server-rack-${active}`, 32, 48, (s) => {
    fillRect(s, 0, 0, 32, 48, '#1e293b');
    fillRect(s, 0, 0, 32, 2, '#334155');
    for (let i = 0; i < 5; i++) {
      const y = 4 + i * 9;
      fillRect(s, 2, y, 28, 7, '#0f172a');
      setPixel(s, 4, y + 2, active ? '#4ade80' : '#475569');
      setPixel(s, 4, y + 4, active ? '#4ade80' : '#475569');
      fillRect(s, 8, y + 2, 10, 2, '#334155');
      fillRect(s, 8, y + 4, 6, 2, '#292524');
    }
    fillRect(s, 0, 47, 32, 1, '#0f172a');
  });
}

export function getBookshelfSprite(): SpriteData {
  return getFurnitureSpriteCache('bookshelf', 32, 40, (s) => {
    const wood = '#78350f';
    const woodLight = '#92400e';
    fillRect(s, 0, 0, 32, 40, wood);
    fillRect(s, 0, 0, 32, 2, woodLight);
    fillRect(s, 1, 12, 30, 2, woodLight);
    fillRect(s, 1, 24, 30, 2, woodLight);
    fillRect(s, 1, 36, 30, 2, woodLight);
    const bookColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const baseY = 3 + shelf * 12;
      for (let b = 0; b < 5; b++) {
        const bw = 4 + (b % 2);
        const bh = 7 + (b * 2) % 4;
        fillRect(s, 2 + b * 6, baseY + 8 - bh, bw, bh, bookColors[b]);
      }
    }
  });
}

export function getWhiteboardSprite(): SpriteData {
  return getFurnitureSpriteCache('whiteboard', 48, 32, (s) => {
    fillRect(s, 0, 0, 48, 32, '#f8fafc');
    fillRect(s, 0, 0, 48, 2, '#94a3b8');
    fillRect(s, 0, 30, 48, 2, '#94a3b8');
    fillRect(s, 0, 0, 2, 32, '#94a3b8');
    fillRect(s, 46, 0, 2, 32, '#94a3b8');
    fillRect(s, 4, 6, 24, 1, '#cbd5e1');
    fillRect(s, 4, 10, 30, 1, '#cbd5e1');
    fillRect(s, 4, 14, 18, 1, '#cbd5e1');
    fillRect(s, 4, 18, 28, 1, '#cbd5e1');
    fillRect(s, 4, 22, 22, 1, '#cbd5e1');
  });
}

export function getSofaFrontSprite(): SpriteData {
  return getFurnitureSpriteCache('sofa-front', 32, 16, (s) => {
    fillRect(s, 0, 0, 32, 10, '#d6d3d1');
    fillRect(s, 0, 0, 32, 4, '#e7e5e4');
    fillRect(s, 2, 3, 8, 6, '#f5f5f4');
    fillRect(s, 12, 3, 8, 6, '#f5f5f4');
    fillRect(s, 22, 3, 8, 6, '#f5f5f4');
    fillRect(s, 0, 10, 32, 4, '#a8a29e');
    fillRect(s, 0, 14, 4, 2, '#78716c');
    fillRect(s, 28, 14, 4, 2, '#78716c');
  });
}

export function getCoffeeMachineSprite(): SpriteData {
  return getFurnitureSpriteCache('coffee-machine', 16, 24, (s) => {
    fillRect(s, 1, 0, 14, 4, '#4b5563');
    fillRect(s, 2, 4, 12, 16, '#374151');
    fillRect(s, 4, 14, 8, 3, '#1f2937');
    setPixel(s, 11, 7, '#22c55e');
    fillRect(s, 5, 20, 6, 4, '#78350f');
  });
}

export function getPlantSprite(): SpriteData {
  return getFurnitureSpriteCache('plant', 16, 32, (s) => {
    // Top is leaves (background tile)
    fillRect(s, 5, 2, 6, 10, '#16a34a');
    fillRect(s, 2, 4, 5, 8, '#22c55e');
    fillRect(s, 9, 4, 5, 8, '#22c55e');
    fillRect(s, 6, 0, 4, 4, '#16a34a');
    // Bottom is pot (blocks walking)
    fillRect(s, 4, 16, 8, 2, '#d97706');
    fillRect(s, 3, 18, 10, 6, '#b45309');
  });
}

export function getCommandScreenSprite(active: boolean): SpriteData {
  return getFurnitureSpriteCache(`command-screen-${active}`, 96, 48, (s) => {
    fillRect(s, 0, 0, 96, 48, '#0f172a');
    fillRect(s, 1, 1, 94, 46, '#1e293b');
    for (let i = 0; i < 6; i++) {
      const sx = 3 + (i % 3) * 31;
      const sy = 3 + Math.floor(i / 3) * 21;
      fillRect(s, sx, sy, 28, 18, active ? '#1e3a5f' : '#1e293b');
      if (active) {
        fillRect(s, sx + 3, sy + 3, 8, 1, '#8B5CF6');
        fillRect(s, sx + 3, sy + 5, 5, 1, '#60a5fa');
        fillRect(s, sx + 3, sy + 7, 10, 1, '#3b82f6');
      }
    }
    if (active) {
      fillRect(s, 44, 0, 8, 2, '#8B5CF6');
    }
  });
}

// ════════════════════════════════════════════════════════════════
// FLOOR & WALL COLORS
// ════════════════════════════════════════════════════════════════

export const FLOOR_COLORS: Record<number, string> = {
  0: '#3A3A5C',     // WALL
  1: '#e8e0d4',     // Command - warm beige
  2: '#dcc8a8',     // Meeting - light wood
  3: '#d0d8e4',     // Situation - cool blue
  4: '#d0e4d8',     // Dev - tech green
  5: '#e4d0d8',     // Design - warm pink
  6: '#c8d8d4',     // Server - dark teal
  7: '#d8d0e4',     // Research - purple
  8: '#ddd8d0',     // Lounge - warm stone
  9: '#d4d4d0',     // Corridor - neutral
  255: '#1a1a2e',   // VOID
};

export const WALL_COLOR = '#3A3A5C';
export const WALL_TOP_COLOR = '#4A4A6C';
export const WALL_SIDE_COLOR = '#2A2A4C';

// Default floor sprite (16×16 solid gray)
const DEFAULT_FLOOR_SPRITE: SpriteData = Array.from({ length: TILE_SIZE }, () =>
  Array.from({ length: TILE_SIZE }, () => '#b0b0b0')
);

// Cached colorized floor sprites
const floorSpriteCache = new Map<string, SpriteData>();

export function getColorizedFloorSprite(patternIndex: number, color: ColorValue): SpriteData {
  const key = `floor-${patternIndex}-${color.h}-${color.s}-${color.b}-${color.c}`;
  const cached = floorSpriteCache.get(key);
  if (cached) return cached;

  const base = DEFAULT_FLOOR_SPRITE;
  const result = colorize ? colorizeSprite(base, { ...color, colorize: true }) : base;
  floorSpriteCache.set(key, result);
  return result;
}

// Wall auto-tiling sprite cache
const wallSpriteCache = new Map<string, { sprite: SpriteData; offsetY: number }>();

export function getColorizedWallSprite(mask: number, color: ColorValue): { sprite: SpriteData; offsetY: number } {
  const key = `wall-0-${mask}-${color.h}-${color.s}-${color.b}-${color.c}`;
  const cached = wallSpriteCache.get(key);
  if (cached) return cached;

  // Generate a wall sprite for this bitmask
  // Simple approach: 16×32 wall tile, top part extends above
  const spr = emptySprite(16, 32);
  const wallBase = hexToRgb(WALL_COLOR);
  if (wallBase) {
    const [, , lum] = rgbToHsl(wallBase[0], wallBase[1], wallBase[2]);
    let newL = lum;
    newL = 0.5 + (newL - 0.5) * ((100 + color.c) / 100);
    newL += color.b / 200;
    newL = Math.max(0, Math.min(1, newL));
    const [r, g, b] = hslToRgb(color.h, color.s / 100, newL);
    const wallHex = rgbToHex(r, g, b);
    const wallLight = lightenHex(wallHex, 0.15);
    const wallDark = darkenHex(wallHex, 0.85);

    // Top face
    fillRect(spr, 0, 0, 16, 8, wallLight);
    // Front face
    fillRect(spr, 0, 8, 16, 20, wallHex);
    // Brick pattern
    for (let br = 0; br < 4; br++) {
      const by = 8 + br * 5;
      const off = br % 2 === 0 ? 0 : 8;
      for (let bc = -1; bc < 3; bc++) {
        fillRect(spr, off + bc * 8 + 1, by + 1, 6, 3, wallDark);
      }
    }
    // Top edge highlight
    fillRect(spr, 0, 8, 16, 1, wallLight);

    // Auto-tiling: cut away sides based on mask
    if (mask & 1) fillRect(spr, 0, 0, 2, 32, ''); // North neighbor: clear top
    if (mask & 2) fillRect(spr, 14, 8, 2, 20, ''); // East neighbor
    if (mask & 4) fillRect(spr, 0, 20, 16, 12, ''); // South neighbor
    if (mask & 8) fillRect(spr, 0, 8, 2, 20, ''); // West neighbor
  }

  const result = { sprite: spr, offsetY: TILE_SIZE }; // Wall extends 1 tile above
  wallSpriteCache.set(key, result);
  return result;
}

export function wallColorToHex(color: ColorValue): string {
  const base = hexToRgb(WALL_COLOR);
  if (!base) return WALL_COLOR;
  const [, , lum] = rgbToHsl(base[0], base[1], base[2]);
  let newL = lum;
  newL = 0.5 + (newL - 0.5) * ((100 + color.c) / 100);
  newL += color.b / 200;
  newL = Math.max(0, Math.min(1, newL));
  const [r, g, b] = hslToRgb(color.h, color.s / 100, newL);
  return rgbToHex(r, g, b);
}

// ════════════════════════════════════════════════════════════════
// CHARACTER PALETTES — 10 distinct palettes for agent roles
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

// ── Palette diversity ──────────────────────────────────────────
const PALETTE_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const shuffled = [...PALETTE_ORDER].sort(() => Math.random() - 0.5);
let nextPaletteIdx = 0;

export function pickDiversePalette(): { paletteIndex: number; hueShift: number } {
  const paletteIndex = shuffled[nextPaletteIdx % shuffled.length];
  nextPaletteIdx++;
  // Beyond 6 agents, add hue shift for visual distinction
  const hueShift = nextPaletteIdx > 6 ? (45 + Math.random() * 135) : 0;
  return { paletteIndex, hueShift };
}

// Clear all caches
export function clearSpriteCache() {
  charSpriteCache.clear();
  furnitureSpriteCache.clear();
  floorSpriteCache.clear();
  wallSpriteCache.clear();
  colorizeCache.clear();
  zoomCaches.clear();
}
