# Task 3: Create pixel-office engine core files

## Summary
Created the 5 core pixel-office engine files as a 1:1 recreation of the pixel-agents visual system.

## Files Created/Updated

### 1. `/home/z/my-project/src/lib/pixel-office/types.ts`
- Full 1:1 port of pixel-agents `office/types.ts`
- All enums: TileType, CharacterState, Direction, EditTool
- All interfaces: SpriteData, ColorValue, Seat, FurnitureInstance, ToolActivity, FurnitureCatalogEntry, PlacedFurniture, OfficeLayout, Character
- Character interface includes all pixel-agents fields (isSubagent, parentAgentId, matrixEffect, matrixEffectTimer, matrixEffectSeeds, folderName, teamName, agentName, isTeamLead, leadAgentId, teamUsesTmux, inputTokens, outputTokens) plus Agent OS extensions (name, role, agentStatus, behaviorState, behaviorTimer, targetTile, eventOverride)
- Agent OS extensions: BehaviorState, ZoneDestination, ZoneLabel
- Backward-compatible re-exports of all constants from constants.ts

### 2. `/home/z/my-project/src/lib/pixel-office/constants.ts`
- Full 1:1 port of pixel-agents `constants.ts`
- 80+ constants organized by category: Grid & Layout, Character Animation, Matrix Effect, Rendering, Overlay Colors, Camera, Zoom, Editor, Sound, Furniture Animation, Version Notice, Game Logic, Agent Teams
- Agent OS extension constants: Behavior timing, Character scale, Role labels, Typing animation, Workstation glow, ROLE_DISPLAY mapping

### 3. `/home/z/my-project/src/lib/pixel-office/colorize.ts`
- Full 1:1 port of pixel-agents `office/colorize.ts`
- Two modes: Colorize (Photoshop-style, grayscale→HSL) and Adjust (HSL shift for furniture)
- Functions: getColorizedSprite, clearColorizeCache, adjustSprite
- Internal helpers: colorizeSprite, extractAlpha, appendAlpha, hslToHex, rgbToHsl, clamp255

### 4. `/home/z/my-project/src/lib/pixel-office/floorTiles.ts`
- Full 1:1 port of pixel-agents `office/floorTiles.ts`
- Functions: setFloorSprites, hasFloorSprites, getFloorPatternCount, getColorizedFloorSprite
- Imports constants from constants.ts (not types.ts)
- WALL_COLOR re-export from constants for backward compatibility

### 5. `/home/z/my-project/src/lib/pixel-office/wallTiles.ts`
- Full 1:1 port of pixel-agents `office/wallTiles.ts`
- Functions: setWallSprites, hasWallSprites, getWallSetCount, getWallSetPreviewSprite, getWallInstances, wallColorToHex
- 4-bit bitmask auto-tiling (N=1, E=2, S=4, W=8)
- **Bug fix**: wallColorToHex had `b1 = c` (contrast variable) instead of `b1 = ch` (chroma variable) - this caused incorrect wall colors when contrast was non-zero

## Key Decisions
- Pixel-agents-specific Character fields made optional to avoid breaking existing createCharacter() code
- Added 'done' to bubbleType union to match existing Agent OS bubble system
- types.ts re-exports all constants from constants.ts for backward compatibility (existing files import from types.ts)
- ColorValue interface kept in types.ts (not separate) since we don't have components/ui/types.ts like pixel-agents

## Verification
- ESLint: passes
- TypeScript: no errors in pixel-office files
- Dev server: running without errors
