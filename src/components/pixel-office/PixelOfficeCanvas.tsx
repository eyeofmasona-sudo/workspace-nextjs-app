// ─── Agent OS — PixelOfficeCanvas ────────────────────────────────
// Canvas renderer adapted from pixel-agents (MIT license).
// Renders a pixel-art office with furniture, characters, and speech bubbles.

'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  CAMERA_FOLLOW_LERP,
  CAMERA_FOLLOW_SNAP_THRESHOLD,
  PAN_MARGIN_FRACTION,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_SCROLL_THRESHOLD,
  ZOOM_DEFAULT_DPR_FACTOR,
  TILE_SIZE,
} from '@/lib/pixel-office/types';
import { startGameLoop } from '@/lib/pixel-office/engine/gameLoop';
import type { OfficeState } from '@/lib/pixel-office/engine/officeState';
import { renderFrame } from '@/lib/pixel-office/engine/renderer';

interface PixelOfficeCanvasProps {
  officeState: OfficeState;
  onAgentClick: (agentId: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
}

export function PixelOfficeCanvas({
  officeState,
  onAgentClick,
  zoom,
  onZoomChange,
  panRef,
}: PixelOfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const zoomAccumulatorRef = useRef(0);
  // Use ref to bypass immutability lint for mutable game engine
  const stateRef = useRef(officeState);
  useEffect(() => { stateRef.current = officeState; }, [officeState]);

  const clampPan = useCallback(
    (px: number, py: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: px, y: py };
      const layout = stateRef.current.getLayout();
      const mapW = layout.cols * TILE_SIZE * zoom;
      const mapH = layout.rows * TILE_SIZE * zoom;
      const marginX = canvas.width * PAN_MARGIN_FRACTION;
      const marginY = canvas.height * PAN_MARGIN_FRACTION;
      const maxPanX = mapW / 2 + canvas.width / 2 - marginX;
      const maxPanY = mapH / 2 + canvas.height / 2 - marginY;
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, px)),
        y: Math.max(-maxPanY, Math.min(maxPanY, py)),
      };
    },
    [zoom],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();

    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) observer.observe(containerRef.current);

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        stateRef.current.update(dt);
      },
      render: (ctx) => {
        const w = canvas.width;
        const h = canvas.height;
        const st = stateRef.current;

        // Camera follow
        if (st.cameraFollowId !== null) {
          const followCh = st.characters.get(st.cameraFollowId);
          if (followCh) {
            const layout = st.getLayout();
            const mapW = layout.cols * TILE_SIZE * zoom;
            const mapH = layout.rows * TILE_SIZE * zoom;
            const targetX = mapW / 2 - followCh.x * zoom;
            const targetY = mapH / 2 - followCh.y * zoom;
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

        const { offsetX, offsetY } = renderFrame(
          ctx,
          w,
          h,
          st.tileMap,
          st.furniture,
          st.getCharacters(),
          zoom,
          panRef.current.x,
          panRef.current.y,
          st.selectedAgentId,
          st.hoveredAgentId,
          st.getLayout().tileColors,
          st.getLayout().cols,
          st.getLayout().rows,
          st.zoneLabels,
        );
        offsetRef.current = { x: offsetX, y: offsetY };
      },
    });

    return () => {
      stop();
      observer.disconnect();
    };
  }, [resizeCanvas, zoom, panRef]);

  // Convert screen coords to world coords
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;
      const deviceX = cssX * dpr;
      const deviceY = cssY * dpr;
      const worldX = (deviceX - offsetRef.current.x) / zoom;
      const worldY = (deviceY - offsetRef.current.y) / zoom;
      return { worldX, worldY, deviceX, deviceY };
    },
    [zoom],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const st = stateRef.current;
      if (isPanningRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const dx = (e.clientX - panStartRef.current.mouseX) * dpr;
        const dy = (e.clientY - panStartRef.current.mouseY) * dpr;
        panRef.current = clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
        return;
      }

      const pos = screenToWorld(e.clientX, e.clientY);
      if (!pos) return;
      const hitId = st.getCharacterAt(pos.worldX, pos.worldY);

      const col = Math.floor(pos.worldX / TILE_SIZE);
      const row = Math.floor(pos.worldY / TILE_SIZE);
      const layout = st.getLayout();
      if (col >= 0 && col < layout.cols && row >= 0 && row < layout.rows) {
        st.hoveredTile = { col, row };
      } else {
        st.hoveredTile = null;
      }

      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = hitId !== null ? 'pointer' : 'default';
      st.hoveredAgentId = hitId;
    },
    [screenToWorld, clampPan, panRef],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        stateRef.current.cameraFollowId = null;
        isPanningRef.current = true;
        panStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'grabbing';
        return;
      }
    },
    [panRef],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        isPanningRef.current = false;
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'default';
        return;
      }
    },
    [],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const st = stateRef.current;
      const pos = screenToWorld(e.clientX, e.clientY);
      if (!pos) return;

      const hitId = st.getCharacterAt(pos.worldX, pos.worldY);
      if (hitId !== null) {
        st.dismissBubble(hitId);
        if (st.selectedAgentId === hitId) {
          st.selectedAgentId = null;
          st.cameraFollowId = null;
        } else {
          st.selectedAgentId = hitId;
          st.cameraFollowId = hitId;
        }
        onAgentClick(hitId);
        return;
      }

      st.selectedAgentId = null;
      st.cameraFollowId = null;
    },
    [onAgentClick, screenToWorld],
  );

  const handleMouseLeave = useCallback(() => {
    const st = stateRef.current;
    isPanningRef.current = false;
    st.hoveredAgentId = null;
    st.hoveredTile = null;
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAccumulatorRef.current += e.deltaY;
        if (Math.abs(zoomAccumulatorRef.current) >= ZOOM_SCROLL_THRESHOLD) {
          const delta = zoomAccumulatorRef.current < 0 ? 1 : -1;
          zoomAccumulatorRef.current = 0;
          const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta));
          if (newZoom !== zoom) onZoomChange(newZoom);
        }
      } else {
        const dpr = window.devicePixelRatio || 1;
        stateRef.current.cameraFollowId = null;
        panRef.current = clampPan(
          panRef.current.x - e.deltaX * dpr,
          panRef.current.y - e.deltaY * dpr,
        );
      }
    },
    [zoom, onZoomChange, panRef, clampPan],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleAuxClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  }, []);

  const defaultZoom = useCallback((): number => {
    const dpr = window.devicePixelRatio || 1;
    return Math.max(ZOOM_MIN, Math.round(ZOOM_DEFAULT_DPR_FACTOR * dpr));
  }, []);

  useEffect(() => {
    onZoomChange(defaultZoom());
  }, [defaultZoom, onZoomChange]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#1a1a2e]">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onMouseLeave={handleMouseLeave}
        className="block"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
