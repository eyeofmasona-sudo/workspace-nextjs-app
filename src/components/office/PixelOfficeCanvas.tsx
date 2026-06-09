// ─── Agent OS — Pixel Office Canvas Component (1:1 pixel-agents architecture) ──
// React component wrapping the canvas-based pixel-art office.
// Proper DPR handling, camera follow, full mouse interaction.

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { PixelOfficeEngine } from '@/lib/office/pixelEngine';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';

interface PixelOfficeCanvasProps {
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
}

export function PixelOfficeCanvas({ agents, tasks, onAgentClick }: PixelOfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PixelOfficeEngine | null>(null);
  const [zoom, setZoom] = useState(3);
  const lastSyncRef = useRef<string>('');
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PixelOfficeEngine();
    engine.attachCanvas(canvasRef.current);
    engine.start();
    engineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  // Sync agents to engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const syncKey = agents.map(a => `${a.id}:${a.runtimeState?.status ?? a.status}:${a.runtimeState?.locationZone ?? a.locationZone}`).join('|');
    if (syncKey === lastSyncRef.current) return;
    lastSyncRef.current = syncKey;

    engine.syncAgents(agents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      locationZone: a.locationZone,
      runtimeState: a.runtimeState ? {
        status: a.runtimeState.status,
        locationZone: a.runtimeState.locationZone,
      } : null,
      profile: a.profile ? {
        displayName: a.profile.displayName,
      } : null,
    })));
  }, [agents]);

  // Resize canvas with DPR support
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Zoom via scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const engine = engineRef.current;
    if (!engine) return;

    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(1, Math.min(6, zoom + delta));
    if (newZoom !== zoom) {
      setZoom(newZoom);
      engine.setZoom(newZoom);
    }
  }, [zoom]);

  // Click handler — hit test characters
  const handleClick = useCallback((e: React.MouseEvent) => {
    const engine = engineRef.current;
    if (!engine || !onAgentClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    const agentId = engine.getCharacterAtPixel(x, y);
    if (agentId) {
      onAgentClick(agentId);
    }
  }, [onAgentClick]);

  // Mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanningRef.current = true;
      const engine = engineRef.current;
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: engine?.panX ?? 0,
        panY: engine?.panY ?? 0,
      };
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;

    const dx = e.clientX - panStartRef.current.mouseX;
    const dy = e.clientY - panStartRef.current.mouseY;
    const dpr = window.devicePixelRatio || 1;
    engine.panX = panStartRef.current.panX + dx * dpr;
    engine.panY = panStartRef.current.panY + dy * dpr;

    // Break camera follow on manual pan
    engine.cameraFollowId = null;
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-200">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ imageRendering: 'pixelated' }}
        onWheel={handleWheel}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
        <button
          className="w-6 h-6 flex items-center justify-center text-xs text-gray-600 hover:text-gray-900"
          onClick={() => { const nz = Math.max(1, zoom - 1); setZoom(nz); engineRef.current?.setZoom(nz); }}
        >
          −
        </button>
        <span className="text-[10px] text-gray-500 font-mono w-8 text-center">{zoom}x</span>
        <button
          className="w-6 h-6 flex items-center justify-center text-xs text-gray-600 hover:text-gray-900"
          onClick={() => { const nz = Math.min(6, zoom + 1); setZoom(nz); engineRef.current?.setZoom(nz); }}
        >
          +
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[8px] text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Working</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Thinking</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Approval</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Error</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Idle</div>
        <span className="ml-1">🏢 {agents.length} agents</span>
      </div>

      {/* Help hint */}
      <div className="absolute top-2 right-2 text-[8px] text-gray-400 bg-white/60 px-2 py-0.5 rounded">
        Scroll to zoom · Shift+drag to pan · Click agent for details
      </div>
    </div>
  );
}
