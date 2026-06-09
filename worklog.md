# Agent OS - Pixel Office Visual Overhaul Worklog

## Task: Replace CSS-based OfficeSceneV2 with Canvas-based pixel-art office system (pixel-agents style)

### Architecture Decision
- Use HTML Canvas for rendering (like pixel-agents) instead of CSS/React components
- Procedural sprite generation (characters, furniture) instead of PNG assets
- Tile-based map with walls, floors, and furniture
- Game loop with requestAnimationFrame for smooth animations
- Character state machine: idle, typing, reading, walking
- Z-sorting for proper depth (walls → furniture → characters)
- Seat assignment system with facing direction
- Speech bubbles for approval/waiting/thinking states
- Role labels as primary visual identifier

### Files Created
1. src/lib/office/pixelTypes.ts - Type definitions (TileType, CharState, Direction, CharPalette, PixelCharacter, FurnitureType, Seat, OfficeLayout, etc.)
2. src/lib/office/pixelSprites.ts - Procedural sprite generation and caching (character drawing functions for 4 directions × 4 states, furniture sprites, bubble sprites, floor/wall colors, role palettes)
3. src/lib/office/pixelLayout.ts - Office layout (30×20 tilemap, 8 zones, furniture placement, seat assignments, pathfinding, zone-to-tile mapping)
4. src/lib/office/pixelRenderer.ts - Canvas rendering pipeline (tile grid, z-sorted furniture/characters, speech bubbles, role labels, status indicators, zone labels)
5. src/lib/office/pixelEngine.ts - Game loop (PixelOfficeEngine class with game loop, character state machine, agent sync, zoom/pan, hit testing)
6. src/components/office/PixelOfficeCanvas.tsx - React component (canvas wrapper, agent data sync, zoom controls, legend, pan/zoom interaction)

### Files Modified
7. src/components/office/AgentOffice.tsx - Replaced OfficeSceneV2 import with PixelOfficeCanvas, replaced component in JSX

### Key Adaptations from pixel-agents
- **Renderer**: Canvas-based rendering with z-sorting (like pixel-agents' renderer.ts)
- **Characters**: Procedural drawing (instead of PNG sprites) - 4 directions, sitting/standing poses, typing/reading/walking animation
- **Layout**: Tile-based map with WALL/FLOOR types (like pixel-agents' tileMap system)
- **Furniture**: Catalog of furniture types with sprite generation (like pixel-agents' furnitureCatalog)
- **Seats**: Chair-based seat assignment with facing direction (like pixel-agents' seat system)
- **Game Loop**: requestAnimationFrame loop with delta time (like pixel-agents' gameLoop.ts)
- **Bubbles**: Permission/waiting/thinking speech bubbles (like pixel-agents' bubble sprites)
- **Pathfinding**: BFS pathfinding on tile grid (like pixel-agents' tileMap.ts)

### What Was NOT Changed (per constraints)
- Backend (API routes, Prisma schema)
- Orchestrator system
- Agent System
- Tool Hub
- Management panels (TaskBoard, SituationRoom, OrchestratorPanel, ApprovalQueue, EventTimeline, AgentDetailsDrawer)

### VLM Evaluation
- Initial version: 8/10 (good pixel-art office, clear zones, characters at desks)
- Second version: 6.25/10 (needed more wall/floor detail, speech bubbles, state visibility)
- Final version: 8/10 (comparable to indie pixel-art games like Stardew Valley)
  - Office look: ✓ Clearly a pixel-art office
  - Characters: ✓ Visible and seated at desks
  - Furniture: ✓ Proper furniture (desks, chairs, monitors, servers, bookshelves)
  - Walls/floors: ✓ Brick pattern walls, textured floors (wood, carpet, raised floor)
  - Visual states: ✓ Working (green glow), Thinking (amber pulse), Approval (orange glow), Error (flash), Offline (dimmed)
  - Speech bubbles: ✓ Permission/Waiting/Thinking bubbles
  - Layout: ✓ 8 zones with doorways between rooms

---
