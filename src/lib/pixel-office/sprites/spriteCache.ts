/**
 * Sprite caching for the pixel-office engine.
 *
 * Provides per-zoom-level HTMLCanvasElement caching and 1px outline
 * sprite generation, matching pixel-agents spriteCache.ts 1:1.
 *
 * Ported from pixel-agents/webview-ui/src/office/sprites/spriteCache.ts
 */

import type { SpriteData } from '../types';

// ── Zoom-level sprite cache ──────────────────────────────────
// Maps zoom level → WeakMap<SpriteData, HTMLCanvasElement>
const zoomCaches = new Map<number, WeakMap<SpriteData, HTMLCanvasElement>>();

// ── Outline sprite cache ─────────────────────────────────────
const outlineCache = new WeakMap<SpriteData, SpriteData>();

/**
 * Generate a 1px white outline SpriteData (2px larger in each dimension).
 *
 * For each opaque pixel in the source sprite, mark its 4 cardinal
 * neighbours as white. Then clear pixels that overlap with original
 * opaque pixels so the outline only shows outside the sprite edge.
 */
export function getOutlineSprite(sprite: SpriteData): SpriteData {
  const cached = outlineCache.get(sprite);
  if (cached) return cached;

  const rows = sprite.length;
  const cols = sprite[0].length;
  // Expanded grid: +2 in each dimension for 1px border
  const outline: string[][] = [];
  for (let r = 0; r < rows + 2; r++) {
    outline.push(new Array<string>(cols + 2).fill(''));
  }

  // For each opaque pixel, mark its 4 cardinal neighbors as white
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sprite[r][c] === '') continue;
      const er = r + 1;
      const ec = c + 1;
      if (outline[er - 1][ec] === '') outline[er - 1][ec] = '#FFFFFF';
      if (outline[er + 1][ec] === '') outline[er + 1][ec] = '#FFFFFF';
      if (outline[er][ec - 1] === '') outline[er][ec - 1] = '#FFFFFF';
      if (outline[er][ec + 1] === '') outline[er][ec + 1] = '#FFFFFF';
    }
  }

  // Clear pixels that overlap with original opaque pixels
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sprite[r][c] !== '') {
        outline[r + 1][c + 1] = '';
      }
    }
  }

  outlineCache.set(sprite, outline);
  return outline;
}

/**
 * Get a cached HTMLCanvasElement for the given sprite at the given zoom level.
 *
 * Creates a pixel-perfect canvas (no anti-aliasing) where each sprite pixel
 * is rendered as a `zoom × zoom` square. Results are cached per zoom level
 * using a WeakMap keyed on the SpriteData reference.
 */
export function getCachedSprite(sprite: SpriteData, zoom: number): HTMLCanvasElement {
  let cache = zoomCaches.get(zoom);
  if (!cache) {
    cache = new WeakMap();
    zoomCaches.set(zoom, cache);
  }

  const cached = cache.get(sprite);
  if (cached) return cached;

  const rows = sprite.length;
  const cols = sprite[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * zoom;
  canvas.height = rows * zoom;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = sprite[r][c];
      if (color === '') continue;
      ctx.fillStyle = color;
      ctx.fillRect(c * zoom, r * zoom, zoom, zoom);
    }
  }

  cache.set(sprite, canvas);
  return canvas;
}
