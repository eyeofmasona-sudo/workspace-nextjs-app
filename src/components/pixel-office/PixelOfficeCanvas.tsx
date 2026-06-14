// ─── Agent OS — PixelOfficeCanvas (Auto-Fit) ─────────────────────
// Renders a pixel-art office that automatically fits the viewport.
// Uses an offscreen canvas at native resolution (zoom=1) for perfect
// pixel-art quality, then scales to fit the container with crisp
// nearest-neighbor interpolation.

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { TILE_SIZE } from '@/lib/pixel-office/types';
import { startGameLoop } from '@/lib/pixel-office/engine/gameLoop';
import type { OfficeState } from '@/lib/pixel-office/engine/officeState';
import { renderFrame } from '@/lib/pixel-office/engine/renderer';

interface PixelOfficeCanvasProps {
  officeState: OfficeState;
  onAgentClick: (agentId: number) => void;
  zoom?: number;
  onZoomChange?: React.Dispatch<React.SetStateAction<number>>;
  panRef?: React.RefObject<unknown>;
}

/** Padding fraction around the office in the viewport */
const VIEWPORT_PADDING = 0.02;

export function PixelOfficeCanvas({
  officeState,
  onAgentClick,
}: PixelOfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(officeState);
  // Cached scale/offset for coordinate conversion
  const transformRef = useRef({ scale: 1, dx: 0, dy: 0, nativeW: 0, nativeH: 0 });

  useEffect(() => { stateRef.current = officeState; }, [officeState]);

  /** Recalculate the transform that maps native office coords → viewport */
  const computeTransform = useCallback(() => {
    const canvas = canvasRef.current;
    const layout = stateRef.current.getLayout();
    if (!canvas || !layout) return;

    const nativeW = layout.cols * TILE_SIZE;
    const nativeH = layout.rows * TILE_SIZE;
    const pad = VIEWPORT_PADDING;
    const availW = canvas.width * (1 - 2 * pad);
    const availH = canvas.height * (1 - 2 * pad);

    const scale = Math.min(availW / nativeW, availH / nativeH);
    const dx = (canvas.width - nativeW * scale) / 2;
    const dy = (canvas.height - nativeH * scale) / 2;

    transformRef.current = { scale, dx, dy, nativeW, nativeH };
  }, []);

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
    computeTransform();
  }, [computeTransform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create offscreen canvas for native rendering
    const layout = stateRef.current.getLayout();
    const nativeW = layout.cols * TILE_SIZE;
    const nativeH = layout.rows * TILE_SIZE;
    const offscreen = document.createElement('canvas');
    offscreen.width = nativeW;
    offscreen.height = nativeH;
    offscreenRef.current = offscreen;

    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
      // Rebuild offscreen if layout size changed
      const curLayout = stateRef.current.getLayout();
      const newW = curLayout.cols * TILE_SIZE;
      const newH = curLayout.rows * TILE_SIZE;
      if (offscreen.width !== newW || offscreen.height !== newH) {
        offscreen.width = newW;
        offscreen.height = newH;
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        stateRef.current.update(dt);
      },
      render: (ctx) => {
        const w = canvas.width;
        const h = canvas.height;
        const st = stateRef.current;
        const curLayout = st.getLayout();

        // Ensure offscreen size matches layout
        const nw = curLayout.cols * TILE_SIZE;
        const nh = curLayout.rows * TILE_SIZE;
        if (offscreen.width !== nw || offscreen.height !== nh) {
          offscreen.width = nw;
          offscreen.height = nh;
        }

        // ── Step 1: Render office to offscreen at native resolution ──
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.clearRect(0, 0, nw, nh);
          try {
            renderFrame(
              offCtx,
              nw,
              nh,
              st.tileMap,
              st.furniture,
              st.getCharacters(),
              1, // zoom = 1 (native)
              0, // panX = 0
              0, // panY = 0
              st.selectedAgentId,
              st.hoveredAgentId,
              curLayout.tileColors,
              curLayout.cols,
              curLayout.rows,
              st.zoneLabels,
            );
          } catch (err) {
            console.error('[PixelOfficeCanvas] offscreen renderFrame error:', err);
          }
        }

        // ── Step 2: Scale offscreen to fit viewport ──
        // Recompute transform in case of resize
        computeTransform();
        const { scale, dx, dy } = transformRef.current;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;
        // Also set for browsers that use the prefixed version
        try { (ctx as any).mozImageSmoothingEnabled = false; } catch {}
        try { (ctx as any).webkitImageSmoothingEnabled = false; } catch {}
        try { (ctx as any).msImageSmoothingEnabled = false; } catch {}

        ctx.drawImage(offscreen, dx, dy, nw * scale, nh * scale);
      },
    });

    return () => {
      stop();
      observer.disconnect();
    };
  }, [resizeCanvas, computeTransform]);

  // ── Convert screen (CSS) coords → native office coords ──
  const screenToNative = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;
      const deviceX = cssX * dpr;
      const deviceY = cssY * dpr;
      const { scale, dx, dy } = transformRef.current;
      const nativeX = (deviceX - dx) / scale;
      const nativeY = (deviceY - dy) / scale;
      return { nativeX, nativeY };
    },
    [],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const st = stateRef.current;
      const pos = screenToNative(e.clientX, e.clientY);
      if (!pos) return;

      const hitId = st.getCharacterAt(pos.nativeX, pos.nativeY);
      if (hitId !== null) {
        st.dismissBubble(hitId);
        if (st.selectedAgentId === hitId) {
          st.selectedAgentId = null;
        } else {
          st.selectedAgentId = hitId;
        }
        onAgentClick(hitId);
        return;
      }
      st.selectedAgentId = null;
    },
    [onAgentClick, screenToNative],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const st = stateRef.current;
      const pos = screenToNative(e.clientX, e.clientY);
      if (!pos) return;

      const hitId = st.getCharacterAt(pos.nativeX, pos.nativeY);

      const col = Math.floor(pos.nativeX / TILE_SIZE);
      const row = Math.floor(pos.nativeY / TILE_SIZE);
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
    [screenToNative],
  );

  const handleMouseLeave = useCallback(() => {
    const st = stateRef.current;
    st.hoveredAgentId = null;
    st.hoveredTile = null;
  }, []);

  // ── Touch handling (tap to select agent) ──
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const st = stateRef.current;
        const pos = screenToNative(touch.clientX, touch.clientY);
        if (!pos) return;

        const hitId = st.getCharacterAt(pos.nativeX, pos.nativeY);
        if (hitId !== null) {
          e.preventDefault();
          st.dismissBubble(hitId);
          if (st.selectedAgentId === hitId) {
            st.selectedAgentId = null;
          } else {
            st.selectedAgentId = hitId;
          }
          onAgentClick(hitId);
        } else {
          st.selectedAgentId = null;
        }
      }
    },
    [onAgentClick, screenToNative],
  );

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#1a1a2e]">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        className="block touch-none"
        style={{
          imageRendering: 'pixelated',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          msInterpolationMode: 'nearest-neighbor',
        } as React.CSSProperties & { msInterpolationMode?: string }}
      />
    </div>
  );
}
