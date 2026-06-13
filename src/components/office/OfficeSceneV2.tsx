// ─── Agent OS — Office Scene V2 ──────────────────────────────
// A flat top-down office simulation with 3D-looking furniture and walls.
// NOT a dashboard. NOT cards. NOT a grid. A living office.
// Single unified scene: floor, walls, furniture, agents, effects.
// The 2.5D feel comes from volumetric walls and 3D-ish furniture, NOT from floor rotation.

'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import { getStatusVisual } from '@/lib/office/statusMapping';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';
import type { AgentAnimationState, ZoneAnimationState } from '@/hooks/useOfficeAnimations';

// ─── Runtime-first helpers ──────────────────────────────────────
function getRuntimeStatus(agent: OfficeAgent): string {
  return agent.runtimeState?.status ?? agent.status;
}
function getRuntimeZone(agent: OfficeAgent): string {
  return agent.runtimeState?.locationZone ?? agent.locationZone;
}

// ─── Color helpers ──────────────────────────────────────────────
function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 100, g: 100, b: 100 };
}
function lighten(hex: string, pct: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = pct / 100;
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * f))},${Math.min(255, Math.round(g + (255 - g) * f))},${Math.min(255, Math.round(b + (255 - b) * f))})`;
}
function darken(hex: string, pct: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - pct / 100;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}
function withAlpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Scene Configuration ────────────────────────────────────────
// The floor is 960×350 in scene units — fits in a 1280×800 viewport with top bar.
// Flat top-down view. The 2.5D feel comes from 3D-looking furniture and walls,
// NOT from rotating the floor plane.

const FLOOR_W = 960;
const FLOOR_H = 350;

// ─── Zone definitions (areas within the single office floor) ────
// 4 columns × 2 rows. Each zone is approximately 233×112 pixels.
interface ZoneDef {
  key: string;
  label: string;
  emoji: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floorColor: string;
  wallColor: string;
}

const ZONES: ZoneDef[] = [
  { key: 'command_area', label: 'Command', emoji: '👑',
    x: 4, y: 4, w: 233, h: 112,
    floorColor: '#f5f3ff', wallColor: '#8B5CF6' },
  { key: 'meeting_room', label: 'Meeting', emoji: '🤝',
    x: 243, y: 4, w: 233, h: 112,
    floorColor: '#fffbeb', wallColor: '#F59E0B' },
  { key: 'situation_room', label: 'Situation', emoji: '📊',
    x: 482, y: 4, w: 233, h: 112,
    floorColor: '#eff6ff', wallColor: '#3B82F6' },
  { key: 'development_area', label: 'Dev Floor', emoji: '💻',
    x: 721, y: 4, w: 235, h: 112,
    floorColor: '#ecfdf5', wallColor: '#10B981' },
  { key: 'design_area', label: 'Design', emoji: '🎨',
    x: 4, y: 122, w: 233, h: 112,
    floorColor: '#fdf2f8', wallColor: '#EC4899' },
  { key: 'server_room', label: 'Server', emoji: '🖥️',
    x: 243, y: 122, w: 233, h: 112,
    floorColor: '#f0fdfa', wallColor: '#14B8A6' },
  { key: 'research_area', label: 'Research', emoji: '📚',
    x: 482, y: 122, w: 233, h: 112,
    floorColor: '#faf5ff', wallColor: '#A855F7' },
  { key: 'lounge_area', label: 'Lounge', emoji: '☕',
    x: 721, y: 122, w: 235, h: 112,
    floorColor: '#fafaf9', wallColor: '#78716C' },
  // Marketing Department
  { key: 'marketing_area', label: 'Marketing', emoji: '📢',
    x: 4, y: 240, w: 350, h: 112,
    floorColor: '#fdf4ff', wallColor: '#D946EF' },
  { key: 'content_studio', label: 'Content', emoji: '✍️',
    x: 360, y: 240, w: 300, h: 112,
    floorColor: '#fffbeb', wallColor: '#F59E0B' },
  { key: 'growth_lab', label: 'Growth', emoji: '📈',
    x: 666, y: 240, w: 290, h: 112,
    floorColor: '#ecfeff', wallColor: '#06B6D4' },
];

// ─── Furniture placements per zone ──────────────────────────────
// type: furniture component type, x/y: position relative to zone origin
// All positions fit within 233×112 zone boundaries.
type FurnitureType = 'desk' | 'chair' | 'monitor' | 'keyboard' | 'meeting_table'
  | 'server_rack' | 'whiteboard' | 'sofa' | 'coffee_machine' | 'command_screen'
  | 'bookshelf' | 'plant';

interface FurnitureItem {
  type: FurnitureType;
  x: number;
  y: number;
  props?: Record<string, unknown>;
}

const ZONE_FURNITURE: Record<string, FurnitureItem[]> = {
  command_area: [
    { type: 'command_screen', x: 30, y: 5 },
    { type: 'desk', x: 45, y: 48, props: { wide: true, color: '#8B5CF6' } },
    { type: 'monitor', x: 80, y: 45 },
    { type: 'monitor', x: 115, y: 45 },
    { type: 'keyboard', x: 90, y: 66 },
    { type: 'chair', x: 90, y: 82 },
    { type: 'plant', x: 190, y: 10 },
  ],
  meeting_room: [
    { type: 'meeting_table', x: 30, y: 18 },
    { type: 'chair', x: 50, y: 10 },
    { type: 'chair', x: 95, y: 10 },
    { type: 'chair', x: 50, y: 86 },
    { type: 'chair', x: 95, y: 86 },
    { type: 'plant', x: 8, y: 8 },
  ],
  situation_room: [
    { type: 'desk', x: 15, y: 50, props: { color: '#3B82F6' } },
    { type: 'monitor', x: 38, y: 47 },
    { type: 'keyboard', x: 32, y: 70 },
    { type: 'chair', x: 32, y: 84 },
    { type: 'whiteboard', x: 145, y: 10 },
    { type: 'desk', x: 120, y: 50, props: { color: '#1e40af' } },
    { type: 'monitor', x: 143, y: 47 },
    { type: 'keyboard', x: 138, y: 70 },
    { type: 'chair', x: 138, y: 84 },
  ],
  development_area: [
    { type: 'desk', x: 12, y: 28, props: { color: '#10B981' } },
    { type: 'monitor', x: 35, y: 25 },
    { type: 'keyboard', x: 30, y: 48 },
    { type: 'chair', x: 30, y: 60 },
    { type: 'desk', x: 120, y: 28, props: { color: '#6366F1' } },
    { type: 'monitor', x: 143, y: 25 },
    { type: 'keyboard', x: 138, y: 48 },
    { type: 'chair', x: 138, y: 60 },
  ],
  design_area: [
    { type: 'desk', x: 20, y: 28, props: { color: '#EC4899' } },
    { type: 'monitor', x: 43, y: 25 },
    { type: 'keyboard', x: 37, y: 48 },
    { type: 'chair', x: 37, y: 60 },
    { type: 'whiteboard', x: 130, y: 10 },
    { type: 'plant', x: 195, y: 8 },
  ],
  server_room: [
    { type: 'server_rack', x: 8, y: 5 },
    { type: 'server_rack', x: 52, y: 5 },
    { type: 'desk', x: 130, y: 55, props: { color: '#14B8A6' } },
    { type: 'monitor', x: 153, y: 52 },
    { type: 'keyboard', x: 148, y: 72 },
    { type: 'chair', x: 148, y: 84 },
  ],
  research_area: [
    { type: 'bookshelf', x: 8, y: 5 },
    { type: 'desk', x: 65, y: 38, props: { color: '#A855F7' } },
    { type: 'monitor', x: 88, y: 35 },
    { type: 'keyboard', x: 82, y: 55 },
    { type: 'chair', x: 82, y: 68 },
    { type: 'plant', x: 195, y: 8 },
  ],
  lounge_area: [
    { type: 'sofa', x: 12, y: 12 },
    { type: 'coffee_machine', x: 145, y: 10 },
    { type: 'plant', x: 195, y: 6 },
  ],
  marketing_area: [
    { type: 'desk', x: 20, y: 28, props: { color: '#D946EF' } },
    { type: 'monitor', x: 43, y: 25 },
    { type: 'keyboard', x: 37, y: 48 },
    { type: 'chair', x: 37, y: 60 },
    { type: 'desk', x: 180, y: 28, props: { color: '#0EA5E9' } },
    { type: 'monitor', x: 203, y: 25 },
    { type: 'keyboard', x: 197, y: 48 },
    { type: 'chair', x: 197, y: 60 },
    { type: 'whiteboard', x: 110, y: 5 },
    { type: 'plant', x: 310, y: 8 },
  ],
  content_studio: [
    { type: 'desk', x: 20, y: 28, props: { color: '#F59E0B' } },
    { type: 'monitor', x: 43, y: 25 },
    { type: 'keyboard', x: 37, y: 48 },
    { type: 'chair', x: 37, y: 60 },
    { type: 'whiteboard', x: 140, y: 5 },
    { type: 'plant', x: 250, y: 8 },
  ],
  growth_lab: [
    { type: 'desk', x: 20, y: 28, props: { color: '#22C55E' } },
    { type: 'monitor', x: 43, y: 25 },
    { type: 'keyboard', x: 37, y: 48 },
    { type: 'chair', x: 37, y: 60 },
    { type: 'desk', x: 140, y: 28, props: { color: '#06B6D4' } },
    { type: 'monitor', x: 163, y: 25 },
    { type: 'keyboard', x: 157, y: 48 },
    { type: 'chair', x: 157, y: 60 },
    { type: 'plant', x: 250, y: 8 },
  ],
};

// ─── Agent seat positions per zone (relative to zone origin) ────
// Each agent gets an (x,y) seat position within their zone.
interface AgentSeat {
  x: number;
  y: number;
  sitting: boolean;
  facing: 'down' | 'up' | 'left' | 'right';
}

const ZONE_SEATS: Record<string, AgentSeat[]> = {
  command_area: [
    { x: 90, y: 76, sitting: true, facing: 'down' },
  ],
  meeting_room: [
    { x: 65, y: 45, sitting: true, facing: 'down' },
    { x: 110, y: 45, sitting: true, facing: 'down' },
    { x: 65, y: 80, sitting: true, facing: 'up' },
    { x: 110, y: 80, sitting: true, facing: 'up' },
  ],
  situation_room: [
    { x: 32, y: 76, sitting: true, facing: 'down' },
    { x: 138, y: 76, sitting: true, facing: 'down' },
  ],
  development_area: [
    { x: 30, y: 52, sitting: true, facing: 'down' },
    { x: 138, y: 52, sitting: true, facing: 'down' },
  ],
  design_area: [
    { x: 37, y: 52, sitting: true, facing: 'down' },
  ],
  server_room: [
    { x: 148, y: 76, sitting: true, facing: 'down' },
    { x: 40, y: 55, sitting: false, facing: 'down' },
  ],
  research_area: [
    { x: 82, y: 60, sitting: true, facing: 'down' },
  ],
  lounge_area: [
    { x: 55, y: 42, sitting: false, facing: 'down' },
  ],
  marketing_area: [
    { x: 37, y: 52, sitting: true, facing: 'down' },
    { x: 197, y: 52, sitting: true, facing: 'down' },
  ],
  content_studio: [
    { x: 37, y: 52, sitting: true, facing: 'down' },
  ],
  growth_lab: [
    { x: 37, y: 52, sitting: true, facing: 'down' },
    { x: 157, y: 52, sitting: true, facing: 'down' },
  ],
};

// ─── Props ──────────────────────────────────────────────────────
interface OfficeSceneV2Props {
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
  agentAnimations?: Record<string, AgentAnimationState>;
  zoneAnimations?: Record<string, ZoneAnimationState>;
}

// ═══════════════════════════════════════════════════════════════════
// FURNITURE RENDERERS — Each is a small CSS-only 3D-ish object
// ═══════════════════════════════════════════════════════════════════

function FurnitureDesk({ x, y, color = '#94a3b8', wide = false }: { x: number; y: number; color?: string; wide?: boolean }) {
  const w = wide ? 120 : 70;
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Shadow */}
      <div style={{ position: 'absolute', bottom: -3, left: 3, width: w, height: 10, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', filter: 'blur(2px)' }} />
      {/* Desk surface (top face) */}
      <div style={{ width: w, height: 30, background: lighten(color, 25), borderRadius: 2, border: `1px solid ${darken(color, 10)}`, position: 'relative', zIndex: 2 }} />
      {/* Desk front (front face) */}
      <div style={{ width: w, height: 8, background: darken(color, 8), borderRadius: '0 0 2px 2px', border: `1px solid ${darken(color, 20)}`, borderTop: 'none', position: 'relative', zIndex: 1 }}>
        {/* Legs */}
        <div style={{ position: 'absolute', left: 4, bottom: -4, width: 3, height: 5, background: darken(color, 30) }} />
        <div style={{ position: 'absolute', right: 4, bottom: -4, width: 3, height: 5, background: darken(color, 30) }} />
      </div>
    </div>
  );
}

function FurnitureChair({ x, y, occupied = false }: { x: number; y: number; occupied?: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Shadow */}
      <div style={{ position: 'absolute', bottom: -2, left: 1, width: 18, height: 7, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', filter: 'blur(1px)' }} />
      {/* Seat */}
      <div style={{ width: 18, height: 18, borderRadius: 4, background: occupied ? '#475569' : '#94a3b8', opacity: occupied ? 0.7 : 0.4, border: '1px solid rgba(0,0,0,0.1)', position: 'relative', zIndex: 1 }}>
        {/* Back rest */}
        <div style={{ position: 'absolute', top: -6, left: 2, right: 2, height: 6, borderRadius: '2px 2px 0 0', background: occupied ? '#334155' : '#64748b', opacity: occupied ? 0.7 : 0.4 }} />
      </div>
    </div>
  );
}

function FurnitureMonitor({ x, y, color = '#334155', isActive = false }: { x: number; y: number; color?: string; isActive?: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y, zIndex: 3 }}>
      {/* Stand */}
      <div style={{ width: 3, height: 5, background: '#94a3b8', margin: '0 auto' }} />
      {/* Screen */}
      <motion.div
        style={{ width: 30, height: 20, borderRadius: 2, background: color, border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        animate={isActive ? { boxShadow: [`0 0 4px ${withAlpha(color, 0.4)}`, `0 0 10px ${withAlpha(color, 0.2)}`, `0 0 4px ${withAlpha(color, 0.4)}`] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* Screen content lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 3 }}>
          <div style={{ width: 14, height: 1.5, borderRadius: 1, background: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)' }} />
          <div style={{ width: 10, height: 1.5, borderRadius: 1, background: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)' }} />
          <div style={{ width: 16, height: 1.5, borderRadius: 1, background: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)' }} />
        </div>
      </motion.div>
    </div>
  );
}

function FurnitureKeyboard({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y, zIndex: 2 }}>
      <div style={{ width: 22, height: 7, borderRadius: 1, background: '#e2e8f0', border: '0.5px solid #cbd5e1', opacity: 0.7 }}>
        {/* Key rows */}
        <div style={{ display: 'flex', gap: 1, padding: '1px 2px', justifyContent: 'center' }}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => <div key={i} style={{ width: 2, height: 1.5, borderRadius: 0.5, background: '#cbd5e1' }} />)}
        </div>
      </div>
    </div>
  );
}

function FurnitureMeetingTable({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', bottom: -5, left: 5, width: 120, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', filter: 'blur(2px)' }} />
      {/* Table top */}
      <div style={{ width: 130, height: 70, background: lighten('#92400e', 32), borderRadius: 8, border: '1.5px solid #b45309', position: 'relative', zIndex: 2 }}>
        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 7, color: 'rgba(120,53,15,0.3)', fontWeight: 700, letterSpacing: 2 }}>MEETING</span>
      </div>
      {/* Table front */}
      <div style={{ width: 130, height: 10, background: darken('#92400e', 5), borderRadius: '0 0 8px 8px', border: '1.5px solid #78350f', borderTop: 'none', position: 'relative', zIndex: 1 }} />
    </div>
  );
}

function FurnitureServerRack({ x, y, isActive = false }: { x: number; y: number; isActive?: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', bottom: -3, left: 2, width: 36, height: 10, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', filter: 'blur(2px)' }} />
      {/* Rack body */}
      <div style={{ width: 40, height: 65, borderRadius: 2, background: '#1e293b', border: '1px solid #0f172a', position: 'relative', zIndex: 2, overflow: 'hidden' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 12, borderBottom: '1px solid rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', padding: '0 4px', gap: 3 }}>
            <motion.div
              style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? '#4ade80' : '#475569' }}
              animate={isActive ? { opacity: [1, 0.2, 1] } : {}}
              transition={{ duration: 0.8 + i * 0.15, repeat: Infinity, delay: i * 0.1 }}
            />
            <div style={{ width: 10, height: 2.5, borderRadius: 1, background: '#334155' }} />
            <div style={{ width: 6, height: 2.5, borderRadius: 1, background: '#292524' }} />
          </div>
        ))}
      </div>
      {/* Side face */}
      <div style={{ position: 'absolute', top: 0, right: -10, width: 10, height: 65, background: '#0f172a', borderRadius: '0 2px 2px 0', transform: 'skewY(-30deg)', transformOrigin: 'top left', zIndex: 1 }} />
      {/* Top face */}
      <div style={{ position: 'absolute', top: -7, right: -10, width: 40, height: 9, background: '#334155', borderRadius: '2px 2px 0 0', transform: 'skewX(-30deg)', transformOrigin: 'bottom left', zIndex: 3 }} />
    </div>
  );
}

function FurnitureWhiteboard({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ width: 3, height: 10, background: '#64748b', margin: '0 auto', position: 'relative', zIndex: 1 }} />
      <div style={{ width: 55, height: 40, borderRadius: 2, background: '#f8fafc', border: '2px solid #94a3b8', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', padding: 4, gap: 3 }}>
        <div style={{ width: 30, height: 2, background: '#94a3b8', borderRadius: 1, opacity: 0.5 }} />
        <div style={{ width: 40, height: 2, background: '#94a3b8', borderRadius: 1, opacity: 0.4 }} />
        <div style={{ width: 25, height: 2, background: '#94a3b8', borderRadius: 1, opacity: 0.3 }} />
        <div style={{ width: 35, height: 2, background: '#94a3b8', borderRadius: 1, opacity: 0.3 }} />
      </div>
    </div>
  );
}

function FurnitureSofa({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', bottom: -4, left: 4, width: 100, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', filter: 'blur(2px)' }} />
      {/* Sofa body */}
      <div style={{ width: 110, height: 30, borderRadius: 8, background: '#d6d3d1', border: '1.5px solid #a8a29e', position: 'relative', zIndex: 2 }}>
        {/* Back cushion */}
        <div style={{ position: 'absolute', top: 0, left: 5, right: 5, height: 14, borderRadius: '5px 5px 0 0', background: '#e7e5e4', border: '1px solid #d6d3d1' }} />
        {/* Seat cushions */}
        <div style={{ display: 'flex', gap: 3, marginTop: 6, justifyContent: 'center' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 28, height: 14, borderRadius: 4, background: '#f5f5f4', border: '1px solid #e7e5e4' }} />)}
        </div>
      </div>
      {/* Front face */}
      <div style={{ width: 110, height: 8, background: '#a8a29e', borderRadius: '0 0 8px 8px', border: '1px solid #78716c', borderTop: 'none', zIndex: 1 }} />
      {/* Coffee table */}
      <div style={{ position: 'absolute', top: 44, left: 30, width: 45, height: 22, borderRadius: 3, background: lighten('#92400e', 28), border: '1px solid #b45309', zIndex: 2 }}>
        {/* Cup */}
        <div style={{ position: 'absolute', top: 5, left: 15, width: 7, height: 7, borderRadius: '50%', background: '#78350f', border: '1px solid #451a03' }} />
      </div>
    </div>
  );
}

function FurnitureCoffeeMachine({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', bottom: -2, left: 2, width: 20, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', filter: 'blur(1px)' }} />
      {/* Machine body */}
      <div style={{ width: 22, height: 30, borderRadius: 2, background: '#374151', border: '1px solid #1f2937', position: 'relative', zIndex: 2 }}>
        {/* Top */}
        <div style={{ width: 24, height: 6, borderRadius: '2px 2px 0 0', background: '#4b5563', border: '1px solid #374151', marginLeft: -1 }} />
        {/* Dispenser */}
        <div style={{ position: 'absolute', bottom: 4, left: 5, width: 12, height: 3, background: '#1f2937', borderRadius: 1 }} />
        {/* Light */}
        <motion.div
          style={{ position: 'absolute', top: 8, right: 4, width: 4, height: 4, borderRadius: '50%', background: '#22c55e' }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    </div>
  );
}

function FurnitureCommandScreen({ x, y, isActive = false }: { x: number; y: number; isActive?: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', bottom: -3, left: 5, width: 130, height: 12, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', filter: 'blur(2px)' }} />
      {/* Stand */}
      <div style={{ width: 4, height: 8, background: '#475569', margin: '0 auto' }} />
      {/* Screen array */}
      <div style={{ width: 140, height: 70, borderRadius: 4, background: '#0f172a', border: `2px solid ${isActive ? '#8B5CF6' : '#1e293b'}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, padding: 5, position: 'relative', zIndex: 2 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <motion.div
            key={i}
            style={{ borderRadius: 2, background: isActive ? '#1e3a5f' : '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            animate={isActive ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          >
            <div style={{ width: 6, height: 6, borderRadius: 1, background: isActive ? '#8B5CF6' : '#334155' }} />
          </motion.div>
        ))}
      </div>
      {/* Crown indicator */}
      <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 12, zIndex: 5 }}>👑</div>
    </div>
  );
}

function FurnitureBookshelf({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', bottom: -2, left: 2, width: 46, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', filter: 'blur(1px)' }} />
      <div style={{ width: 50, height: 55, borderRadius: 2, background: '#78350f', border: '1px solid #451a03', position: 'relative', zIndex: 2 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ height: 17, borderBottom: '2px solid #451a03', display: 'flex', alignItems: 'flex-end', padding: '0 3px 2px', gap: 1 }}>
            {[0, 1, 2, 3, 4].map(j => (
              <div key={j} style={{ width: 4 + (j % 2), height: 7 + (j * 2) % 6, borderRadius: '1px 1px 0 0', background: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'][j], opacity: 0.7 }} />
            ))}
          </div>
        ))}
      </div>
      {/* Side face */}
      <div style={{ position: 'absolute', top: 0, right: -8, width: 8, height: 55, background: '#451a03', borderRadius: '0 2px 2px 0', transform: 'skewY(-30deg)', transformOrigin: 'top left', zIndex: 1 }} />
    </div>
  );
}

function FurniturePlant({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y, zIndex: 4 }}>
      <div style={{ position: 'absolute', bottom: -2, left: 1, width: 14, height: 5, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', filter: 'blur(1px)' }} />
      {/* Pot */}
      <div style={{ width: 14, height: 10, background: '#b45309', borderRadius: '0 0 3px 3px', margin: '0 auto', border: '1px solid #92400e' }}>
        <div style={{ width: 16, height: 3, background: '#d97706', borderRadius: 2, marginLeft: -1 }} />
      </div>
      {/* Leaves */}
      <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', width: 20, height: 16, display: 'flex', justifyContent: 'center', gap: 1 }}>
        <div style={{ width: 6, height: 14, borderRadius: '50%', background: '#22c55e', transform: 'rotate(-15deg)' }} />
        <div style={{ width: 6, height: 16, borderRadius: '50%', background: '#16a34a' }} />
        <div style={{ width: 6, height: 14, borderRadius: '50%', background: '#22c55e', transform: 'rotate(15deg)' }} />
      </div>
    </div>
  );
}

// ─── Render furniture by type ───────────────────────────────────
function renderFurnitureItem(item: FurnitureItem, zoneAgents: OfficeAgent[]) {
  const hasWorking = zoneAgents.some(a => getRuntimeStatus(a) === 'working');
  const key = `${item.type}-${item.x}-${item.y}`;
  const p = item.props ?? {};

  switch (item.type) {
    case 'desk': return <FurnitureDesk key={key} x={item.x} y={item.y} color={p.color as string} wide={p.wide as boolean} />;
    case 'chair': return <FurnitureChair key={key} x={item.x} y={item.y} occupied={zoneAgents.length > 0} />;
    case 'monitor': return <FurnitureMonitor key={key} x={item.x} y={item.y} color={p.color as string} isActive={hasWorking} />;
    case 'keyboard': return <FurnitureKeyboard key={key} x={item.x} y={item.y} />;
    case 'meeting_table': return <FurnitureMeetingTable key={key} x={item.x} y={item.y} />;
    case 'server_rack': return <FurnitureServerRack key={key} x={item.x} y={item.y} isActive={hasWorking} />;
    case 'whiteboard': return <FurnitureWhiteboard key={key} x={item.x} y={item.y} />;
    case 'sofa': return <FurnitureSofa key={key} x={item.x} y={item.y} />;
    case 'coffee_machine': return <FurnitureCoffeeMachine key={key} x={item.x} y={item.y} />;
    case 'command_screen': return <FurnitureCommandScreen key={key} x={item.x} y={item.y} isActive={hasWorking} />;
    case 'bookshelf': return <FurnitureBookshelf key={key} x={item.x} y={item.y} />;
    case 'plant': return <FurniturePlant key={key} x={item.x} y={item.y} />;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// AGENT CHARACTER V2 — Mini-employee with head, body, arms, legs, shadow
// ═══════════════════════════════════════════════════════════════════

function AgentCharacterV2({
  agent,
  x,
  y,
  sitting,
  facing = 'down',
  animationState,
  onClick,
  task,
}: {
  agent: OfficeAgent;
  x: number;
  y: number;
  sitting: boolean;
  facing?: 'down' | 'up' | 'left' | 'right';
  animationState?: AgentAnimationState | null;
  onClick?: () => void;
  task?: OfficeTask | null;
}) {
  const status = getRuntimeStatus(agent);
  const visual = getAgentVisual(agent.role);
  const statusVisual = getStatusVisual(status);
  const displayName = agent.profile?.displayName ?? agent.name;

  const bodyColor = visual.color;
  const headColor = lighten(bodyColor, 18);
  const legColor = darken(bodyColor, 28);
  const skinColor = '#fbbf24';

  // Animation based on status
  const statusAnim = (() => {
    switch (status) {
      case 'thinking': return { y: [0, -2, 0] };
      case 'working': return { y: [0, -1, 0] };
      case 'waiting_api': return { opacity: [1, 0.6, 1] };
      case 'reviewing': return { x: [0, 1, -1, 0] };
      case 'waiting_approval': return { scale: [1, 1.05, 1] };
      case 'error': return { x: [0, -2, 2, 0] };
      case 'offline': return {};
      default: return {};
    }
  })();

  const animTransition = (() => {
    switch (status) {
      case 'thinking': return { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const };
      case 'working': return { duration: 0.6, repeat: Infinity, ease: 'easeInOut' as const };
      case 'waiting_api': return { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const };
      case 'reviewing': return { duration: 2, repeat: Infinity, ease: 'easeInOut' as const };
      case 'waiting_approval': return { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const };
      case 'error': return { duration: 0.5, repeat: 3, ease: 'easeInOut' as const };
      default: return {};
    }
  })();

  const isOffline = status === 'offline';
  const isIdle = status === 'idle' || status === 'done';

  // No counter-rotation needed — flat top-down view
  const labelCounterRotate = '';

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{ left: x, top: y, zIndex: 20 }}
      onClick={onClick}
      animate={statusAnim}
      transition={animTransition as any}
      whileHover={{ scale: 1.15 }}
    >
      {/* ─── Shadow on floor ─── */}
      <div style={{
        position: 'absolute', bottom: sitting ? -4 : -3, left: '50%', transform: 'translateX(-50%)',
        width: sitting ? 36 : 28, height: sitting ? 10 : 9, borderRadius: '50%',
        background: 'rgba(0,0,0,0.12)', filter: 'blur(2px)',
      }} />

      {/* ─── Standing character ─── */}
      {!sitting && (
        <>
          {/* Legs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: -1 }}>
            <div style={{ width: 10, height: 14, background: legColor, borderRadius: '0 0 3px 3px' }} />
            <div style={{ width: 10, height: 14, background: legColor, borderRadius: '0 0 3px 3px' }} />
          </div>
          {/* Body */}
          <div style={{
            width: 32, height: 28, background: bodyColor,
            borderRadius: '4px 4px 5px 5px',
            margin: '0 auto', position: 'relative',
            boxShadow: `0 2px 5px rgba(0,0,0,0.25)`,
            opacity: isOffline ? 0.35 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 800 }}>{visual.initials}</span>
            {/* Arms */}
            <div style={{ position: 'absolute', left: -7, top: 4, width: 7, height: 16, background: bodyColor, borderRadius: '3px 0 0 3px', opacity: 0.85 }} />
            <div style={{ position: 'absolute', right: -7, top: 4, width: 7, height: 16, background: bodyColor, borderRadius: '0 3px 3px 0', opacity: 0.85 }} />
          </div>
          {/* Head */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%', background: skinColor,
            border: `3px solid ${lighten(bodyColor, 10)}`,
            margin: '-3px auto 0', position: 'relative',
            boxShadow: `0 2px 6px rgba(0,0,0,0.25)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13 }}>{visual.emoji}</span>
          </div>
        </>
      )}

      {/* ─── Sitting character ─── */}
      {sitting && (
        <>
          {/* Head */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%', background: skinColor,
            border: `3px solid ${lighten(bodyColor, 10)}`,
            margin: '0 auto', position: 'relative', zIndex: 3,
            boxShadow: `0 2px 6px rgba(0,0,0,0.25)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13 }}>{visual.emoji}</span>
          </div>
          {/* Body (wider, sitting) */}
          <div style={{
            width: 34, height: 20, background: bodyColor,
            borderRadius: '0 0 5px 5px',
            margin: '-2px auto 0', position: 'relative', zIndex: 2,
            boxShadow: `0 2px 4px rgba(0,0,0,0.2)`,
            opacity: isOffline ? 0.35 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: 800, marginTop: 2 }}>{visual.initials}</span>
            {/* Arms on desk */}
            <div style={{ position: 'absolute', left: -8, top: 2, width: 8, height: 12, background: bodyColor, borderRadius: '3px 0 0 3px', opacity: 0.75 }} />
            <div style={{ position: 'absolute', right: -8, top: 2, width: 8, height: 12, background: bodyColor, borderRadius: '0 3px 3px 0', opacity: 0.75 }} />
          </div>
        </>
      )}

      {/* ─── Status indicator bubble ─── */}
      {!isIdle && !isOffline && (
        <div style={{
          position: 'absolute', top: sitting ? -16 : -12, right: sitting ? -18 : -18, zIndex: 10,
          width: 18, height: 18, borderRadius: '50%',
          background: statusVisual.emoji === '⚠️' ? '#f97316' : statusVisual.emoji === '❌' ? '#ef4444' : '#22c55e',
          border: '2.5px solid white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        }}>
          <span style={{ fontSize: 9 }}>{statusVisual.emoji}</span>
        </div>
      )}

      {/* ─── Name label ─── */}
      <div style={{
        position: 'absolute', top: sitting ? -30 : -28, left: '50%',
        transform: `translateX(-50%) ${labelCounterRotate}`,
        whiteSpace: 'nowrap', zIndex: 30,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 800, color: '#1e293b',
          background: 'rgba(255,255,255,0.95)',
          padding: '3px 8px', borderRadius: 5,
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          border: `1.5px solid ${withAlpha(bodyColor, 0.25)}`,
        }}>
          {displayName}
        </span>
      </div>

      {/* ─── Task indicator ─── */}
      {task && status === 'working' && (
        <div style={{
          position: 'absolute', top: sitting ? -36 : -34, left: '50%',
          transform: `translateX(-50%) ${labelCounterRotate}`,
          whiteSpace: 'nowrap', zIndex: 31,
        }}>
          <span style={{
            fontSize: 7, fontWeight: 600, color: '#fff',
            background: bodyColor,
            padding: '1px 5px', borderRadius: 3,
          }}>
            📋 {task.title.length > 18 ? task.title.slice(0, 16) + '…' : task.title}
          </span>
        </div>
      )}

      {/* ─── Waiting approval indicator ─── */}
      {status === 'waiting_approval' && (
        <div style={{
          position: 'absolute', top: sitting ? -48 : -46, left: '50%',
          transform: `translateX(-50%) ${labelCounterRotate}`,
          whiteSpace: 'nowrap', zIndex: 32,
        }}>
          <span style={{
            fontSize: 7, fontWeight: 700, color: '#fff',
            background: '#f97316',
            padding: '1px 5px', borderRadius: 3,
          }}>
            ⚠ Waiting Approval
          </span>
        </div>
      )}

      {/* ─── Event notification ─── */}
      {animationState?.notification && (
        <div style={{
          position: 'absolute', top: sitting ? -60 : -58, left: '50%',
          transform: `translateX(-50%) ${labelCounterRotate}`,
          whiteSpace: 'nowrap', zIndex: 33,
        }}>
          <span style={{
            fontSize: 7, color: '#fff', fontWeight: 600,
            background: '#1e293b', padding: '1px 5px', borderRadius: 3,
          }}>
            {animationState.notification}
          </span>
        </div>
      )}

      {/* ─── Event highlight ring ─── */}
      {animationState?.highlight && (
        <motion.div
          style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.5)', zIndex: 5 }}
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.6, repeat: 2 }}
        />
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ZONE WALL RENDERER — Volumetric walls that create room feeling
// wallHeight=20, wallThick=7 per spec
// ═══════════════════════════════════════════════════════════════════

function ZoneWalls({ zone }: { zone: ZoneDef }) {
  const wallHeight = 20;
  const wallThick = 7;
  const wallColor = lighten(zone.wallColor, 40);
  const wallDark = darken(zone.wallColor, 10);
  const wallDarker = darken(zone.wallColor, 25);

  return (
    <>
      {/* Back wall (top) */}
      <div style={{
        position: 'absolute', top: -wallHeight, left: -wallThick,
        width: zone.w + wallThick * 2, height: wallHeight,
        background: `linear-gradient(180deg, ${wallDark} 0%, ${wallColor} 100%)`,
        border: `1px solid ${wallDarker}`,
        borderRadius: '2px 2px 0 0', zIndex: 0,
      }} />
      {/* Left wall */}
      <div style={{
        position: 'absolute', top: -wallHeight, left: -wallThick,
        width: wallThick, height: zone.h + wallHeight,
        background: `linear-gradient(90deg, ${wallDarker} 0%, ${wallDark} 100%)`,
        border: `1px solid ${wallDarker}`, zIndex: 0,
      }} />
      {/* Right wall (partial — to show depth) */}
      <div style={{
        position: 'absolute', top: -wallHeight, right: -wallThick,
        width: wallThick, height: zone.h + wallHeight,
        background: `linear-gradient(270deg, ${darken(zone.wallColor, 20)} 0%, ${wallDark} 100%)`,
        border: `1px solid ${wallDarker}`, zIndex: 0,
      }} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOOL EXECUTION GLOW EFFECT
// ═══════════════════════════════════════════════════════════════════

function ToolExecutionGlow({ zone, agents }: { zone: ZoneDef; agents: OfficeAgent[] }) {
  const hasRunning = agents.some(a => {
    const s = getRuntimeStatus(a);
    return s === 'working' || s === 'waiting_api';
  });
  if (!hasRunning) return null;

  return (
    <motion.div
      style={{
        position: 'absolute', inset: 4, borderRadius: 4,
        border: `2px solid ${withAlpha(zone.wallColor, 0.4)}`,
        boxShadow: `0 0 12px ${withAlpha(zone.wallColor, 0.15)}, inset 0 0 12px ${withAlpha(zone.wallColor, 0.08)}`,
        zIndex: 15, pointerEvents: 'none',
      }}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// ERROR ZONE EFFECT
// ═══════════════════════════════════════════════════════════════════

function ErrorZoneEffect({ zone, agents }: { zone: ZoneDef; agents: OfficeAgent[] }) {
  const hasError = agents.some(a => getRuntimeStatus(a) === 'error');
  if (!hasError) return null;

  return (
    <motion.div
      style={{
        position: 'absolute', inset: 4, borderRadius: 4,
        border: '2px solid rgba(239,68,68,0.5)',
        boxShadow: '0 0 16px rgba(239,68,68,0.2), inset 0 0 16px rgba(239,68,68,0.08)',
        zIndex: 15, pointerEvents: 'none',
      }}
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// APPROVAL ZONE EFFECT
// ═══════════════════════════════════════════════════════════════════

function ApprovalZoneEffect({ zone, agents }: { zone: ZoneDef; agents: OfficeAgent[] }) {
  const hasApproval = agents.some(a => getRuntimeStatus(a) === 'waiting_approval');
  if (!hasApproval) return null;

  return (
    <motion.div
      style={{
        position: 'absolute', inset: 4, borderRadius: 4,
        border: '2px solid rgba(249,115,22,0.5)',
        boxShadow: '0 0 14px rgba(249,115,22,0.15), inset 0 0 14px rgba(249,115,22,0.06)',
        zIndex: 15, pointerEvents: 'none',
      }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN OFFICE SCENE V2 COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function OfficeSceneV2({
  agents,
  tasks,
  onAgentClick,
  agentAnimations = {},
  zoneAnimations = {},
}: OfficeSceneV2Props) {
  // Group agents by runtime zone (runtime-first)
  const agentsByZone = useMemo(() => {
    const map: Record<string, OfficeAgent[]> = {};
    for (const agent of agents) {
      const zone = getRuntimeZone(agent) ?? 'lounge_area';
      if (!map[zone]) map[zone] = [];
      map[zone].push(agent);
    }
    return map;
  }, [agents]);

  // Build task lookup by assignedAgentId
  const taskByAgent = useMemo(() => {
    const map: Record<string, OfficeTask> = {};
    for (const task of tasks) {
      if (task.assignedAgentId) {
        map[task.assignedAgentId] = task;
      }
    }
    return map;
  }, [tasks]);

  // Labels are readable without counter-rotation (flat top-down view)
  const labelStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
  };

  return (
    <div className="w-full h-full relative" style={{ background: 'linear-gradient(180deg, #dfe6ee 0%, #e8ecf2 30%, #dde3ea 100%)' }}>
      {/* ─── Office scene viewport — flat top-down view with 3D elements ─── */}
      <div
        className="w-full h-full overflow-auto flex justify-center items-start py-2"
      >
        <div
          className="relative flex-shrink-0 my-2"
          style={{
            width: FLOOR_W,
            height: FLOOR_H,
          }}
        >
          {/* ─── Main Office Floor ─── */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(148,163,184,0.06) 49px, rgba(148,163,184,0.06) 50px),
                repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(148,163,184,0.06) 49px, rgba(148,163,184,0.06) 50px),
                linear-gradient(180deg, #dde3ea 0%, #e8ecf1 50%, #e2e8f0 100%)
              `,
              boxShadow: `
                0 0 0 3px rgba(148,163,184,0.25),
                12px 12px 0 rgba(0,0,0,0.04),
                24px 24px 0 rgba(0,0,0,0.02),
                0 20px 60px rgba(0,0,0,0.15)
              `,
              borderRadius: 4,
            }}
          />

          {/* ─── Zone Areas with Walls ─── */}
          {ZONES.map((zone) => {
            const zoneAgents = agentsByZone[zone.key] ?? [];
            const isHighlighted = !!zoneAnimations[zone.key];
            const furnitureItems = ZONE_FURNITURE[zone.key] ?? [];
            const seats = ZONE_SEATS[zone.key] ?? [];

            return (
              <div key={zone.key}>
                {/* Zone floor area */}
                <div
                  className="absolute"
                  style={{
                    left: zone.x, top: zone.y,
                    width: zone.w, height: zone.h,
                    background: zone.floorColor,
                    borderRadius: 3,
                    zIndex: 1,
                    position: 'relative',
                  }}
                >
                  {/* Walls */}
                  <ZoneWalls zone={zone} />

                  {/* Zone label */}
                  <div
                    className="absolute"
                    style={{ top: 8, left: 8, zIndex: 25, ...labelStyle }}
                  >
                    <span style={{
                      fontSize: 8, fontWeight: 700, color: darken(zone.wallColor, 15),
                      background: 'rgba(255,255,255,0.85)',
                      padding: '2px 6px', borderRadius: 3,
                      border: `1px solid ${withAlpha(zone.wallColor, 0.2)}`,
                    }}>
                      {zone.emoji} {zone.label}
                    </span>
                    {zoneAgents.length > 0 && (
                      <span style={{ marginLeft: 4, fontSize: 7, color: '#64748b' }}>
                        {zoneAgents.filter(a => getRuntimeStatus(a) !== 'offline').length}/{zoneAgents.length}
                      </span>
                    )}
                  </div>

                  {/* Zone highlight pulse */}
                  {isHighlighted && (
                    <motion.div
                      className="absolute inset-0 rounded"
                      style={{ background: withAlpha(zone.wallColor, 0.08), zIndex: 14, pointerEvents: 'none' }}
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 1, repeat: 3 }}
                    />
                  )}

                  {/* Tool execution glow */}
                  <ToolExecutionGlow zone={zone} agents={zoneAgents} />

                  {/* Error zone effect */}
                  <ErrorZoneEffect zone={zone} agents={zoneAgents} />

                  {/* Approval zone effect */}
                  <ApprovalZoneEffect zone={zone} agents={zoneAgents} />

                  {/* ─── Furniture ─── */}
                  <div className="absolute inset-0" style={{ zIndex: 5 }}>
                    {furnitureItems.map(item => renderFurnitureItem(item, zoneAgents))}
                  </div>

                  {/* ─── Agent Characters ─── */}
                  {zoneAgents.map((agent, i) => {
                    const seat = seats[i] ?? { x: 20 + i * 30, y: 60, sitting: false, facing: 'down' as const };

                    return (
                      <motion.div
                        key={agent.id}
                        className="absolute"
                        style={{ left: seat.x, top: seat.y, zIndex: 20 }}
                        initial={{ opacity: 0.3 }}
                        animate={{ x: 0, y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                      >
                        <AgentCharacterV2
                          agent={agent}
                          x={0}
                          y={0}
                          sitting={seat.sitting}
                          facing={seat.facing}
                          animationState={agentAnimations[agent.id] ?? null}
                          onClick={() => onAgentClick?.(agent.id)}
                          task={taskByAgent[agent.id] ?? null}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ─── Floor label ─── */}
          <div className="absolute bottom-2 right-3" style={labelStyle}>
            <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 500 }}>
              🏢 Floor 1 — {agents.length} agents · {tasks.length} tasks
            </span>
          </div>
        </div>{/* end floor container */}
      </div>{/* end viewport */}

      {/* ─── Legend (fixed in viewport) ─── */}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[9px] text-gray-400 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm z-50">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /> Working</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Thinking</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /> Approval</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> Error</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-300" /> Idle</div>
      </div>
    </div>
  );
}
