# Task 4-5: Sprite System and Layout System

## Task
Create the sprite system and layout system files for the Agent OS pixel-office engine at /home/z/my-project. This is a 1:1 recreation of the pixel-agents visual system.

## Files Created/Updated

### 1. `/home/z/my-project/src/lib/pixel-office/sprites/spriteCache.ts`
- Moved from root-level spriteCache.ts to sprites/ directory
- 1:1 port of pixel-agents spriteCache with zoomCaches Map, getOutlineSprite, getCachedSprite

### 2. `/home/z/my-project/src/lib/pixel-office/sprites/spriteData.ts`
- Replaced empty placeholder sprites with full hardcoded pixel art character sprites for 6 palettes
- Ported BUBBLE_PERMISSION_SPRITE and BUBBLE_WAITING_SPRITE from pixel-agents JSON
- Added BUBBLE_DONE_SPRITE
- 6 palette color schemes with CharPalette (hair, skin, eye, clothing, pants, shoe, outline)
- 16x24 pixel art templates: walk (3 unique + 1 repeat per direction), typing (2 frames), reading (2 frames with book)
- Template resolution system with palette keys → hex colors
- Left sprites via flipSpriteHorizontal from right

### 3. `/home/z/my-project/src/lib/pixel-office/layout/tileMap.ts`
- Moved from root-level tileMap.ts to layout/ directory
- 1:1 port: isWalkable, getWalkableTiles, findPath (BFS)

### 4. `/home/z/my-project/src/lib/pixel-office/layout/furnitureCatalog.ts`
- Full dynamic catalog system from pixel-agents
- Hardcoded fallback catalog with 11 pixel art furniture sprites (DESK_FRONT, WOODEN_CHAIR_FRONT, WOODEN_CHAIR_SIDE, PC_FRONT_OFF, PC_FRONT_ON, BOOKSHELF, PLANT, WHITEBOARD, COFFEE, CACTUS, BIN)
- getHardcodedCatalog(), getCatalogByCategory, getActiveCategories, getToggledType
- All rotation/state/animation group helpers

### 5. `/home/z/my-project/src/lib/pixel-office/layout/layoutSerializer.ts`
- Full migration system: LEGACY_TYPE_MAP, migrateFurnitureTypes, migrateLayout, migrateLayoutColors
- getPlacementBlockedTiles, getSeatTiles, serializeLayout, deserializeLayout
- Richer createDefaultLayout (21x22 two-room office with 6 workstations, decorations, carpet)

### Import Updates
- renderer.ts: spriteCache → sprites/spriteCache
- officeState.ts: tileMap → layout/tileMap
- characters.ts: tileMap → layout/tileMap
- Root spriteCache.ts and tileMap.ts converted to re-export stubs

## Lint Status
All lint checks pass.
