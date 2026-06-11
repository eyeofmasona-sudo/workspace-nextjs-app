// ─── Agent OS — Pixel Office Canvas (1:1 pixel-agents architecture) ──
// React component wrapping the canvas-based pixel-art office.
// Full DPR handling, camera follow, mouse interaction, zoom/pan.
// Uses the pixel-office engine (OfficeState + renderer + gameLoop).

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { OfficeState } from '@/lib/pixel-office/engine/officeState';
import type { SyncAgentInput } from '@/lib/pixel-office/engine/officeState';
import { startGameLoop } from '@/lib/pixel-office/engine/gameLoop';
import { renderFrame } from '@/lib/pixel-office/engine/renderer';
import { defaultZoom } from '@/lib/pixel-office/toolUtils';
import { ZOOM_MIN, ZOOM_MAX, PAN_MARGIN_FRACTION, CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_SNAP_THRESHOLD, TILE_SIZE } from '@/lib/pixel-office/constants';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';

interface PixelOfficeCanvasProps {
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
}

export function PixelOfficeCanvas({ agents, tasks, onAgentClick }: PixelOfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const officeStateRef = useRef<OfficeState | null>(null);
  const [zoom, setZoom] = useState(() => defaultZoom());
  const zoomRef = useRef(zoom);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const lastSyncRef = useRef('');
  const offsetRef = useRef({ x: 0, y: 0 });

  // Keep zoomRef in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Initialize office state + game loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const officeState = new OfficeState();
    officeStateRef.current = officeState;

    const canvas = canvasRef.current;

    // Resize canvas backing store to device pixels
    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);

    // Start the game loop
    const stop = startGameLoop(canvas, {
      update: (dt) => {
        officeState.update(dt);

        // Camera follow
        if (officeState.cameraFollowId !== null) {
          const followCh = officeState.characters.get(officeState.cameraFollowId);
          if (followCh) {
            const layout = officeState.getLayout();
            const currentZoom = zoomRef.current;
            const mapW = layout.cols * TILE_SIZE * currentZoom;
            const mapH = layout.rows * TILE_SIZE * currentZoom;
            const targetX = mapW / 2 - followCh.x * currentZoom;
            const targetY = mapH / 2 - followCh.y * currentZoom;
            const dx = targetX - panRef.current.x;
            const dy = targetY - panRef.current.y;
            if (Math.abs(dx) < CAMERA_FOLLOW_SNAP_THRESHOLD && Math.abs(dy) < CAMERA_FOLLOW_SNAP_THRESHOLD) {
              panRef.current = { x: targetX, y: targetY };
            } else {
              panRef.current = {
                x: panRef.current.x + dx * CAMERA_FOLLOW_LERP,
                y: panRef.current.y + dy * CAMERA_FOLLOW_LERP,
              };
            }
          }
        }
      },
      render: (ctx) => {
        const w = canvas.width;
        const h = canvas.height;
        const currentZoom = zoomRef.current;

        const layout = officeState.getLayout();
        const characters = officeState.getCharacters();

        const { offsetX, offsetY } = renderFrame(
          ctx,
          w,
          h,
          officeState.tileMap,
          officeState.furniture,
          characters,
          currentZoom,
          panRef.current.x,
          panRef.current.y,
          officeState.selectedAgentId,
          officeState.hoveredAgentId,
          layout.tileColors,
          layout.cols,
          layout.rows,
          officeState.zoneLabels,
        );
        offsetRef.current = { x: offsetX, y: offsetY };
      },
    });

    return () => {
      stop();
      observer.disconnect();
    };
  }, []);

  // Sync agents to office state
  useEffect(() => {
    const officeState = officeStateRef.current;
    if (!officeState) return;

    const syncKey = agents.map(a => `${a.id}:${a.runtimeState?.status ?? a.status}:${a.runtimeState?.currentActivity ?? ''}`).join('|');
    if (syncKey === lastSyncRef.current) return;
    lastSyncRef.current = syncKey;

    const syncInput: SyncAgentInput[] = agents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      runtimeState: a.runtimeState ? {
        status: a.runtimeState.status,
        currentActivity: a.runtimeState.currentActivity,
      } : null,
      profile: a.profile ? {
        displayName: a.profile.displayName,
      } : null,
    }));

    officeState.syncAgents(syncInput);
  }, [agents]);

  // Clamp pan
  const clampPan = useCallback((px: number, py: number) => {
    const canvas = canvasRef.current;
    const officeState = officeStateRef.current;
    if (!canvas || !officeState) return { x: px, y: py };
    const layout = officeState.getLayout();
    const currentZoom = zoomRef.current;
    const mapW = layout.cols * TILE_SIZE * currentZoom;
    const mapH = layout.rows * TILE_SIZE * currentZoom;
    const marginX = canvas.width * PAN_MARGIN_FRACTION;
    const marginY = canvas.height * PAN_MARGIN_FRACTION;
    const maxPanX = mapW / 2 + canvas.width / 2 - marginX;
    const maxPanY = mapH / 2 + canvas.height / 2 - marginY;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py)),
    };
  }, []);

  // Screen to world coordinates
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    const deviceX = cssX * dpr;
    const deviceY = cssY * dpr;
    const currentZoom = zoomRef.current;
    const worldX = (deviceX - offsetRef.current.x) / currentZoom;
    const worldY = (deviceY - offsetRef.current.y) / currentZoom;
    return { worldX, worldY, deviceX, deviceY };
  }, []);

  // Wheel: zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY < 0 ? 1 : -1;
        setZoom(prev => {
          const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev + delta));
          zoomRef.current = newZoom;
          return newZoom;
        });
      } else {
        const dpr = window.devicePixelRatio || 1;
        const officeState = officeStateRef.current;
        if (officeState) {
          officeState.cameraFollowId = null;
        }
        panRef.current = clampPan(
          panRef.current.x - e.deltaX * dpr,
          panRef.current.y - e.deltaY * dpr,
        );
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [clampPan]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanningRef.current = true;
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dpr = window.devicePixelRatio || 1;
      const dx = (e.clientX - panStartRef.current.mouseX) * dpr;
      const dy = (e.clientY - panStartRef.current.mouseY) * dpr;
      const officeState = officeStateRef.current;
      if (officeState) officeState.cameraFollowId = null;
      panRef.current = clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
      return;
    }

    // Hover detection
    const pos = screenToWorld(e.clientX, e.clientY);
    const officeState = officeStateRef.current;
    if (pos && officeState) {
      const hitId = officeState.getCharacterAt(pos.worldX, pos.worldY);
      officeState.hoveredAgentId = hitId;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = hitId !== null ? 'pointer' : 'default';
      }
    }
  }, [clampPan, screenToWorld]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) return;
    const pos = screenToWorld(e.clientX, e.clientY);
    const officeState = officeStateRef.current;
    if (!pos || !officeState || !onAgentClick) return;

    const hitId = officeState.getCharacterAt(pos.worldX, pos.worldY);
    if (hitId !== null) {
      // Dismiss bubble on click
      officeState.dismissBubble(hitId);

      // Toggle selection
      if (officeState.selectedAgentId === hitId) {
        officeState.selectedAgentId = null;
        officeState.cameraFollowId = null;
      } else {
        officeState.selectedAgentId = hitId;
        officeState.cameraFollowId = hitId;
      }

      // Get external agent ID and notify parent
      const extId = officeState.getExternalAgentId(hitId);
      if (extId) {
        onAgentClick(extId);
      }
    } else {
      // Clicked empty space — deselect
      officeState.selectedAgentId = null;
      officeState.cameraFollowId = null;
    }
  }, [onAgentClick, screenToWorld]);

  const handleMouseLeave = useCallback(() => {
    isPanningRef.current = false;
    const officeState = officeStateRef.current;
    if (officeState) {
      officeState.hoveredAgentId = null;
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#1a1a2e]">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'pixelated' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)' }}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-[#2a2a4a]/90 backdrop-blur-sm rounded-md px-2 py-1 shadow-lg border border-[#3a3a5a]">
        <button
          className="w-6 h-6 flex items-center justify-center text-xs text-gray-300 hover:text-white transition-colors"
          onClick={() => {
            const nz = Math.max(ZOOM_MIN, zoom - 1);
            setZoom(nz);
            zoomRef.current = nz;
          }}
        >
          −
        </button>
        <span className="text-[10px] text-gray-400 font-mono w-8 text-center">{zoom}x</span>
        <button
          className="w-6 h-6 flex items-center justify-center text-xs text-gray-300 hover:text-white transition-colors"
          onClick={() => {
            const nz = Math.min(ZOOM_MAX, zoom + 1);
            setZoom(nz);
            zoomRef.current = nz;
          }}
        >
          +
        </button>
      </div>

      {/* Agent count */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[9px] text-gray-400 bg-[#2a2a4a]/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-lg border border-[#3a3a5a]">
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Working</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Thinking</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Approval</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Idle</div>
        <span className="ml-1">🏢 {agents.length} agents</span>
      </div>

      {/* Help hint */}
      <div className="absolute top-2 right-2 text-[8px] text-gray-500 bg-[#2a2a4a]/70 px-2 py-0.5 rounded">
        Scroll to zoom · Shift+drag to pan · Click agent for details
      </div>
    </div>
  );
}
