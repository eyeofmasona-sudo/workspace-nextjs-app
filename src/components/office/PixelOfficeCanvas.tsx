// ─── Agent OS — Pixel Office Canvas Component ───────────────────
// React component wrapping the canvas-based pixel-art office.
// Connects to useOfficeData and manages the PixelOfficeEngine.

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
  const engineRef = useRef<PixelOfficeEngine | null>(null);
  const [zoom, setZoom] = useState(3);
  const lastSyncRef = useRef<string>('');

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

    // Only sync if data actually changed
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

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
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

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const agentId = engine.getCharacterAtPixel(x, y);
    if (agentId) {
      onAgentClick(agentId);
    }
  }, [onAgentClick]);

  // Pan via drag
  const [isPanning, setIsPanning] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    const engine = engineRef.current;
    if (engine) {
      engine.panX += dx;
      engine.panY += dy;
    }
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-200">
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
