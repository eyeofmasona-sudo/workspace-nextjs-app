import type { SpriteData } from './types';
import type { LoadedAssetData } from './layout/furnitureCatalog';
import { buildDynamicCatalog } from './layout/furnitureCatalog';
import { setFloorSprites } from './floorTiles';
import { setWallSprites } from './wallTiles';
import { setCharacterTemplates } from './sprites/spriteData';

function pngToSpriteData(img: HTMLImageElement): SpriteData {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;
  const sprite: SpriteData = [];
  for (let y = 0; y < img.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < img.width; x++) {
      const idx = (y * img.width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      if (a < 10) { row.push(''); continue; }
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      row.push(a < 255 ? `${hex}${a.toString(16).padStart(2, '0').toUpperCase()}` : hex);
    }
    sprite.push(row);
  }
  return sprite;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

const CHAR_FRAME_W = 16;
const CHAR_FRAME_H = 32; // Pixel-agents sprites: 16×32 per frame (2 tiles tall)
const CHAR_COLS = 7;

function extractCharacterSprites(img: HTMLImageElement): { down: SpriteData[]; up: SpriteData[]; right: SpriteData[] } {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  function extractFrame(col: number, row: number): SpriteData {
    const sprite: SpriteData = [];
    for (let y = 0; y < CHAR_FRAME_H; y++) {
      const spriteRow: string[] = [];
      for (let x = 0; x < CHAR_FRAME_W; x++) {
        const px = col * CHAR_FRAME_W + x;
        const py = row * CHAR_FRAME_H + y;
        const idx = (py * img.width + px) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (a < 10) { spriteRow.push(''); continue; }
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        spriteRow.push(a < 255 ? `${hex}${a.toString(16).padStart(2, '0').toUpperCase()}` : hex);
      }
      sprite.push(spriteRow);
    }
    return sprite;
  }

  const down: SpriteData[] = [], up: SpriteData[] = [], right: SpriteData[] = [];
  for (let c = 0; c < CHAR_COLS; c++) {
    down.push(extractFrame(c, 0));
    up.push(extractFrame(c, 1));
    right.push(extractFrame(c, 2));
  }
  return { down, up, right };
}

function extractTileSheet(img: HTMLImageElement, tileW: number, tileH?: number): SpriteData[] {
  const th = tileH ?? tileW;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;
  const colsInSheet = Math.floor(img.width / tileW);
  const rowsInSheet = Math.floor(img.height / th);
  const tiles: SpriteData[] = [];

  for (let row = 0; row < rowsInSheet; row++) {
    for (let col = 0; col < colsInSheet; col++) {
      const sprite: SpriteData = [];
      for (let y = 0; y < th; y++) {
        const spriteRow: string[] = [];
        for (let x = 0; x < tileW; x++) {
          const px = col * tileW + x;
          const py = row * th + y;
          const idx = (py * img.width + px) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a < 10) { spriteRow.push(''); continue; }
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
          spriteRow.push(a < 255 ? `${hex}${a.toString(16).padStart(2, '0').toUpperCase()}` : hex);
        }
        sprite.push(spriteRow);
      }
      tiles.push(sprite);
    }
  }
  return tiles;
}

interface ManifestAsset {
  id: string;
  file: string;
  width: number;
  height: number;
  footprintW: number;
  footprintH: number;
  orientation?: string;
  state?: string;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  mirrorSide?: boolean;
  animationGroup?: string;
  frame?: number;
}

interface ManifestGroup {
  id: string;
  name: string;
  category: string;
  type: string;
  groupType?: string;
  rotationScheme?: string;
  canPlaceOnWalls?: boolean;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  members: Array<ManifestAsset | ManifestGroup>;
}

function flattenManifest(manifest: ManifestGroup): Array<{ asset: ManifestAsset; groupId: string; categoryName: string; rotationScheme?: string; canPlaceOnWalls?: boolean; parentBackgroundTiles?: number }> {
  const results: Array<{ asset: ManifestAsset; groupId: string; categoryName: string; rotationScheme?: string; canPlaceOnWalls?: boolean; parentBackgroundTiles?: number }> = [];

  function processGroup(group: ManifestGroup, parentCategory?: string, parentRotationScheme?: string, parentCanPlaceOnWalls?: boolean, parentBackgroundTiles?: number) {
    const category = group.category || parentCategory || 'misc';
    const rotationScheme = group.rotationScheme || parentRotationScheme;
    const canPlaceOnWalls = group.canPlaceOnWalls ?? parentCanPlaceOnWalls;
    const bgTiles = group.backgroundTiles ?? parentBackgroundTiles;

    for (const member of group.members) {
      if ('file' in member) {
        results.push({ asset: member, groupId: group.id || group.name, categoryName: category, rotationScheme, canPlaceOnWalls, parentBackgroundTiles: bgTiles });
      } else {
        processGroup(member as ManifestGroup, category, rotationScheme, canPlaceOnWalls, bgTiles);
      }
    }
  }

  processGroup(manifest);
  return results;
}

export async function loadAllAssets(): Promise<boolean> {
  try {
    // 1. Load character sprites
    const characterData: Array<{ down: SpriteData[]; up: SpriteData[]; right: SpriteData[] }> = [];
    for (let i = 0; i < 6; i++) {
      try {
        const img = await loadImage(`/assets/characters/char_${i}.png`);
        characterData.push(extractCharacterSprites(img));
      } catch (e) { console.warn(`Failed to load character ${i}:`, e); }
    }
    if (characterData.length > 0) setCharacterTemplates(characterData);

    // 2. Load floor tiles
    const floorSprites: SpriteData[] = [];
    for (let i = 0; i < 9; i++) {
      try {
        const img = await loadImage(`/assets/floors/floor_${i}.png`);
        floorSprites.push(pngToSpriteData(img));
      } catch { /* skip */ }
    }
    setFloorSprites(floorSprites);

    // 3. Load wall tiles — wall spritesheet is 64×128 with 4×4 grid of 16×32 pieces (16 bitmask variants)
    const wallSets: SpriteData[][] = [];
    try {
      const wallImg = await loadImage(`/assets/walls/wall_0.png`);
      wallSets.push(extractTileSheet(wallImg, 16, 32));
    } catch (e) { console.warn('Wall sprites not loaded:', e); }
    setWallSprites(wallSets);

    // 4. Load furniture
    const furnitureDirs = [
      'BIN', 'BOOKSHELF', 'CACTUS', 'CLOCK', 'COFFEE', 'COFFEE_TABLE',
      'CUSHIONED_BENCH', 'CUSHIONED_CHAIR', 'DESK', 'DOUBLE_BOOKSHELF',
      'HANGING_PLANT', 'LARGE_PAINTING', 'LARGE_PLANT', 'PC', 'PLANT',
      'PLANT_2', 'POT', 'SMALL_PAINTING', 'SMALL_PAINTING_2', 'SMALL_TABLE',
      'SOFA', 'TABLE_FRONT', 'WHITEBOARD', 'WOODEN_BENCH', 'WOODEN_CHAIR',
    ];

    const catalogEntries: LoadedAssetData['catalog'] = [];
    const spriteMap: Record<string, SpriteData> = {};

    for (const dir of furnitureDirs) {
      try {
        const resp = await fetch(`/assets/furniture/${dir}/manifest.json`);
        if (!resp.ok) continue;
        const manifest = await resp.json();

        // Handle both group and asset type manifests
        let flatAssets: Array<{ asset: ManifestAsset; groupId: string; categoryName: string; rotationScheme?: string; canPlaceOnWalls?: boolean; parentBackgroundTiles?: number }>;

        if (manifest.type === 'asset') {
          // Simple asset manifest - create a synthetic entry
          const m = manifest as { id: string; name: string; category: string; canPlaceOnWalls?: boolean; backgroundTiles?: number; width: number; height: number; footprintW: number; footprintH: number; };
          flatAssets = [{
            asset: { id: m.id, file: `${m.id}.png`, width: m.width, height: m.height, footprintW: m.footprintW, footprintH: m.footprintH },
            groupId: m.id,
            categoryName: m.category,
            canPlaceOnWalls: m.canPlaceOnWalls,
            parentBackgroundTiles: m.backgroundTiles,
          }];
        } else {
          // Group manifest with members
          flatAssets = flattenManifest(manifest as ManifestGroup);
        }

        for (const { asset, groupId, categoryName, rotationScheme, canPlaceOnWalls, parentBackgroundTiles } of flatAssets) {
          try {
            const img = await loadImage(`/assets/furniture/${dir}/${asset.file}`);
            spriteMap[asset.id] = pngToSpriteData(img);
            catalogEntries.push({
              id: asset.id,
              label: manifest.name || asset.id.replace(/_/g, ' '),
              category: categoryName,
              width: asset.width,
              height: asset.height,
              footprintW: asset.footprintW,
              footprintH: asset.footprintH,
              isDesk: categoryName === 'desks',
              groupId,
              orientation: asset.orientation,
              state: asset.state,
              canPlaceOnSurfaces: asset.canPlaceOnSurfaces,
              backgroundTiles: asset.backgroundTiles ?? parentBackgroundTiles,
              canPlaceOnWalls,
              mirrorSide: asset.mirrorSide,
              rotationScheme,
              animationGroup: asset.animationGroup,
              frame: asset.frame,
            });
          } catch (e) { console.warn(`Failed to load furniture asset ${asset.id}:`, e); }
        }
      } catch (e) { console.warn(`Failed to load furniture manifest ${dir}:`, e); }
    }

    if (catalogEntries.length > 0) {
      buildDynamicCatalog({ catalog: catalogEntries, sprites: spriteMap });
    }

    console.log(`✓ Assets loaded: ${characterData.length} chars, ${floorSprites.length} floors, ${catalogEntries.length} furniture`);
    return true;
  } catch (e) {
    console.error('Failed to load assets:', e);
    return false;
  }
}
