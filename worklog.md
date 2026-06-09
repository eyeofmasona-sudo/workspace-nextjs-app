---
Task ID: 1
Agent: Main
Task: Analyze pixel-agents repository and implement 1:1 pixel-agents-style visual layer for Agent OS

Work Log:
- Cloned and analyzed pixel-agents repo (https://github.com/pixel-agents-hq/pixel-agents.git)
- Analyzed all 9 subsystems: office renderer, characters, character animation, furniture catalog, layout editor, activity tracking, speech bubbles, seat assignment, persistent layout
- Analyzed current Agent OS office visual layer (PixelOfficeCanvas, pixelEngine, pixelRenderer, pixelSprites, pixelLayout, pixelTypes)
- Rewrote pixelTypes.ts: CharacterState (IDLE/WALK/TYPE FSM), Direction, SpriteData, ColorValue, PixelCharacter with full FSM state, FurnitureCatalogEntry, FurnitureInstance, Seat, OfficeLayout, ZoneDef
- Rewrote pixelSprites.ts: SpriteData-based system with colorize/adjust, getCachedSprite with zoom-level WeakMap caching, getOutlineSprite for selection highlighting, flipSpriteHorizontal, procedural character sprites (7 frames × 4 directions), furniture sprites as SpriteData, bubble sprites, palette diversity system, floor/wall colorization
- Rewrote pixelLayout.ts: Furniture catalog with backgroundTiles, buildSeats with facing direction from chair orientation + desk adjacency, getBlockedTiles respecting backgroundTiles, BFS pathfinding, wall auto-tiling bitmask (N=1,E=2,S=4,W=8), zone mapping
- Rewrote pixelEngine.ts: PixelOfficeEngine class with full 3-state FSM (TYPE→IDLE→WALK→TYPE), matrix spawn/despawn effect, auto-on furniture detection, camera follow, wander behavior, seat rest timer, bubble system with fade, DPR-aware rendering, proper z-sorting
- Rewrote pixelRenderer.ts: Full rendering pipeline (tile grid → z-sorted furniture+characters → bubbles → labels → zone labels), matrix effect rendering (column-staggered digital rain), outline rendering for selection/hover, status glow effects (green=working, amber=thinking, orange=approval, red=error), shadow rendering
- Updated PixelOfficeCanvas.tsx: DPR-aware canvas sizing, proper pan with Shift+drag, zoom via scroll, camera follow support
- All lint checks pass
- Browser verification: no console errors, canvas renders correctly (different floor colors, walls, furniture visible), zoom controls work

Stage Summary:
- Complete 1:1 pixel-agents architecture adaptation for Agent OS
- Key systems implemented: SpriteData-based sprites, two-level zoom cache with WeakMap, colorize/adjust color system, 3-state character FSM, matrix spawn/despawn effects, auto-on furniture, proper z-sorting, wall auto-tiling bitmask, seat generation from chair furniture
- All backend integration preserved: same API polling (useOfficeData 5s, useEventStream 4s), same agent status mapping, same zone assignments
