// ─── Agent OS — Isometric Furniture ───────────────────────────
// CSS-only isometric furniture blocks for the 2.5D office.
// Each piece has top face (light), front face (dark), side face (medium).
// Positioned with absolute coordinates on the isometric floor.

'use client';

import { motion } from 'framer-motion';

// ─── Shared helpers ────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 100, g: 100, b: 100 };
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

// ─── Isometric 3D Block ────────────────────────────────────────
// A generic isometric block with top/front/right faces.
interface IsoBlockProps {
  width: number;
  depth: number;  // "into the screen" dimension (top face height)
  height: number; // vertical height (front face height)
  color: string;
  x: number;
  y: number;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  label?: string;
}

export function IsoBlock({ width, depth, height, color, x, y, className = '', onClick, active, label }: IsoBlockProps) {
  const topColor = lighten(color, 25);
  const frontColor = darken(color, 15);
  const rightColor = darken(color, 30);

  return (
    <div
      className={`absolute ${className}`}
      style={{ left: x, top: y, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Top face */}
      <div
        style={{
          width,
          height: depth,
          background: topColor,
          borderRadius: '2px 2px 0 0',
          border: `1px solid ${darken(color, 5)}`,
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {label && (
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 0.5 }}>
            {label}
          </span>
        )}
      </div>
      {/* Front face */}
      <div
        style={{
          width,
          height,
          background: frontColor,
          borderRadius: '0 0 2px 2px',
          border: `1px solid ${darken(color, 20)}`,
          borderTop: 'none',
          position: 'relative',
          zIndex: 2,
        }}
      />
      {/* Right side face (CSS trick: a skewed element) */}
      <div
        style={{
          position: 'absolute',
          top: depth,
          right: -depth * 0.4,
          width: depth * 0.4,
          height,
          background: rightColor,
          borderRadius: '0 2px 2px 0',
          transform: 'skewY(-45deg)',
          transformOrigin: 'top left',
          zIndex: 1,
        }}
      />
      {/* Right top edge (connects top face to right face) */}
      <div
        style={{
          position: 'absolute',
          top: depth * 0.6,
          right: -depth * 0.4,
          width: depth * 0.4,
          height: depth * 0.4,
          background: lighten(color, 10),
          transform: 'skewX(-45deg)',
          transformOrigin: 'top left',
          borderRadius: '0 2px 0 0',
          zIndex: 4,
        }}
      />
      {/* Active glow */}
      {active && (
        <motion.div
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: 4,
            border: `2px solid ${lighten(color, 40)}`,
            zIndex: 10,
            pointerEvents: 'none',
          }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ─── Developer Desk ─────────────────────────────────────────────
// A desk with monitor and keyboard.
interface DeskProps {
  x: number;
  y: number;
  color?: string;
  isActive?: boolean;
  occupied?: boolean;
  monitorLabel?: string;
  onClick?: () => void;
}

export function IsoDesk({
  x, y, color = '#64748b', isActive = false, occupied = false, monitorLabel, onClick
}: DeskProps) {
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Floor shadow */}
      <div style={{
        position: 'absolute',
        bottom: -4, left: 2,
        width: 52, height: 12,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.1)',
        filter: 'blur(2px)',
      }} />

      {/* Desk surface */}
      <div style={{
        width: 56, height: 28,
        background: lighten(color, 20),
        borderRadius: 2,
        border: `1px solid ${darken(color, 5)}`,
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Keyboard */}
        <div style={{
          position: 'absolute',
          bottom: 4, left: '50%', transform: 'translateX(-50%)',
          width: 18, height: 5,
          borderRadius: 1,
          background: '#e2e8f0',
          opacity: 0.7,
        }} />
        {/* Coffee cup if occupied */}
        {occupied && (
          <div style={{
            position: 'absolute', top: 3, right: 4,
            width: 5, height: 5, borderRadius: '50%',
            background: '#92400e',
            border: '1px solid #78350f',
          }} />
        )}
      </div>

      {/* Desk front panel */}
      <div style={{
        width: 56, height: 8,
        background: darken(color, 10),
        borderRadius: '0 0 2px 2px',
        border: `1px solid ${darken(color, 20)}`,
        borderTop: 'none',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Desk legs */}
        <div style={{ position: 'absolute', left: 4, bottom: -4, width: 2, height: 4, background: darken(color, 25) }} />
        <div style={{ position: 'absolute', right: 4, bottom: -4, width: 2, height: 4, background: darken(color, 25) }} />
      </div>

      {/* Monitor */}
      <div style={{
        position: 'absolute',
        top: -18, left: '50%', transform: 'translateX(-50%)',
        zIndex: 3,
      }}>
        {/* Monitor stand */}
        <div style={{
          width: 2, height: 4,
          background: '#94a3b8',
          margin: '0 auto',
        }} />
        {/* Monitor screen */}
        <motion.div
          style={{
            width: 26, height: 16,
            borderRadius: '2px 2px 0 0',
            background: color,
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          animate={isActive ? { boxShadow: [`0 0 4px ${color}60`, `0 0 8px ${color}30`, `0 0 4px ${color}60`] } : {}}
          transition={isActive ? { duration: 2, repeat: Infinity } : {}}
        >
          {monitorLabel && (
            <span style={{ fontSize: 5, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
              {monitorLabel}
            </span>
          )}
        </motion.div>
      </div>

      {/* Chair (behind desk) */}
      <div style={{
        position: 'absolute',
        top: 26, left: '50%', transform: 'translateX(-50%)',
        width: 14, height: 14,
        borderRadius: '50%',
        background: occupied ? '#475569' : '#94a3b8',
        opacity: occupied ? 0.5 : 0.25,
        border: '1px solid rgba(0,0,0,0.1)',
      }} />
    </div>
  );
}

// ─── Command Board ──────────────────────────────────────────────
// A wall-mounted command board / dashboard.
export function IsoCommandBoard({ x, y, isActive = false }: { x: number; y: number; isActive?: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Board shadow */}
      <div style={{
        position: 'absolute', bottom: -3, left: 3,
        width: 64, height: 10, borderRadius: '50%',
        background: 'rgba(0,0,0,0.08)', filter: 'blur(2px)',
      }} />
      {/* Board stand */}
      <div style={{
        width: 3, height: 8,
        background: '#64748b',
        margin: '0 auto',
        position: 'relative', zIndex: 1,
      }} />
      {/* Board body */}
      <motion.div
        style={{
          width: 68, height: 38,
          borderRadius: 3,
          background: '#1e293b',
          border: `2px solid ${isActive ? '#8B5CF6' : '#334155'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          position: 'relative',
          zIndex: 2,
        }}
        animate={isActive ? { borderColor: ['#8B5CF6', '#a78bfa', '#8B5CF6'] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span style={{ fontSize: 10 }}>👑</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{ width: 4, height: 4, borderRadius: '50%', background: '#8B5CF6' }}
              animate={isActive ? { opacity: [1, 0.3, 1] } : { opacity: 0.4 }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Meeting Table ──────────────────────────────────────────────
// A large oval meeting table with chairs.
export function IsoMeetingTable({ x, y }: { x: number; y: number }) {
  const chairPositions = [
    { dx: 6, dy: 6 },
    { dx: 56, dy: 6 },
    { dx: 6, dy: 30 },
    { dx: 56, dy: 30 },
    { dx: 30, dy: -4 },
    { dx: 30, dy: 40 },
  ];

  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Table shadow */}
      <div style={{
        position: 'absolute', bottom: -6, left: 6,
        width: 66, height: 20, borderRadius: '50%',
        background: 'rgba(0,0,0,0.08)', filter: 'blur(3px)',
      }} />
      {/* Table top */}
      <div style={{
        width: 78, height: 40,
        background: lighten('#92400e', 30),
        borderRadius: 6,
        border: '1px solid #b45309',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 7, color: 'rgba(120,53,15,0.4)', fontWeight: 700 }}>MEETING</span>
      </div>
      {/* Table front */}
      <div style={{
        width: 78, height: 8,
        background: darken('#92400e', 5),
        borderRadius: '0 0 6px 6px',
        border: '1px solid #78350f',
        borderTop: 'none',
        position: 'relative',
        zIndex: 1,
      }} />
      {/* Chairs */}
      {chairPositions.map((pos, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: pos.dx, top: pos.dy,
          width: 10, height: 10,
          borderRadius: '50%',
          background: 'rgba(148,163,184,0.3)',
          border: '1px solid rgba(148,163,184,0.2)',
          zIndex: 0,
        }} />
      ))}
    </div>
  );
}

// ─── Server Rack ────────────────────────────────────────────────
// A tall server rack with blinking lights.
export function IsoServerRack({ x, y, isActive = false }: { x: number; y: number; isActive?: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Shadow */}
      <div style={{
        position: 'absolute', bottom: -4, left: 3,
        width: 28, height: 10, borderRadius: '50%',
        background: 'rgba(0,0,0,0.1)', filter: 'blur(2px)',
      }} />
      {/* Rack body */}
      <div style={{
        width: 32, height: 50,
        borderRadius: 2,
        background: '#334155',
        border: '1px solid #1e293b',
        position: 'relative',
        zIndex: 2,
        overflow: 'hidden',
      }}>
        {/* Server units */}
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            height: 11,
            borderBottom: '1px solid rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 3px',
            gap: 2,
          }}>
            <motion.div
              style={{
                width: 3, height: 3, borderRadius: '50%',
                background: isActive ? '#4ade80' : '#475569',
              }}
              animate={isActive ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ duration: 0.8 + i * 0.2, repeat: Infinity, delay: i * 0.15 }}
            />
            <div style={{ width: 8, height: 2, borderRadius: 1, background: '#475569' }} />
            <div style={{ width: 5, height: 2, borderRadius: 1, background: '#374151' }} />
          </div>
        ))}
      </div>
      {/* Side face */}
      <div style={{
        position: 'absolute',
        top: 0, right: -8,
        width: 8, height: 50,
        background: '#1e293b',
        borderRadius: '0 2px 2px 0',
        transform: 'skewY(-30deg)',
        transformOrigin: 'top left',
        zIndex: 1,
      }} />
      {/* Top face */}
      <div style={{
        position: 'absolute',
        top: -6, right: -8,
        width: 32, height: 8,
        background: '#475569',
        borderRadius: '2px 2px 0 0',
        transform: 'skewX(-30deg)',
        transformOrigin: 'bottom left',
        zIndex: 3,
      }} />
    </div>
  );
}

// ─── Bookshelf ──────────────────────────────────────────────────
export function IsoBookshelf({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Shadow */}
      <div style={{
        position: 'absolute', bottom: -3, left: 2,
        width: 36, height: 8, borderRadius: '50%',
        background: 'rgba(0,0,0,0.08)', filter: 'blur(2px)',
      }} />
      {/* Shelf body */}
      <div style={{
        width: 40, height: 44,
        borderRadius: 2,
        background: '#78350f',
        border: '1px solid #451a03',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Shelves */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            height: 13,
            borderBottom: '2px solid #451a03',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0 3px 2px',
            gap: 1,
          }}>
            {/* Books */}
            {[0, 1, 2, 3, 4].map(j => (
              <div key={j} style={{
                width: 3 + (j % 2),
                height: 6 + (j * 2) % 5,
                borderRadius: '1px 1px 0 0',
                background: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'][j],
                opacity: 0.7,
              }} />
            ))}
          </div>
        ))}
      </div>
      {/* Side face */}
      <div style={{
        position: 'absolute',
        top: 0, right: -6,
        width: 6, height: 44,
        background: '#451a03',
        borderRadius: '0 2px 2px 0',
        transform: 'skewY(-30deg)',
        transformOrigin: 'top left',
        zIndex: 1,
      }} />
    </div>
  );
}

// ─── Sofa / Lounge ──────────────────────────────────────────────
export function IsoSofa({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Shadow */}
      <div style={{
        position: 'absolute', bottom: -4, left: 4,
        width: 58, height: 12, borderRadius: '50%',
        background: 'rgba(0,0,0,0.08)', filter: 'blur(2px)',
      }} />
      {/* Sofa body */}
      <div style={{
        width: 66, height: 22,
        borderRadius: 6,
        background: '#d6d3d1',
        border: '1px solid #a8a29e',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Back cushion */}
        <div style={{
          position: 'absolute', top: 0, left: 4, right: 4,
          height: 10,
          borderRadius: '4px 4px 0 0',
          background: '#e7e5e4',
          border: '1px solid #d6d3d1',
        }} />
        {/* Seat cushions */}
        <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
          <div style={{ width: 18, height: 10, borderRadius: 3, background: '#f5f5f4', border: '1px solid #e7e5e4' }} />
          <div style={{ width: 18, height: 10, borderRadius: 3, background: '#f5f5f4', border: '1px solid #e7e5e4' }} />
          <div style={{ width: 18, height: 10, borderRadius: 3, background: '#f5f5f4', border: '1px solid #e7e5e4' }} />
        </div>
        <span style={{ position: 'absolute', fontSize: 9, opacity: 0.4 }}>☕</span>
      </div>
      {/* Sofa front */}
      <div style={{
        width: 66, height: 6,
        background: '#a8a29e',
        borderRadius: '0 0 6px 6px',
        border: '1px solid #78716c',
        borderTop: 'none',
        position: 'relative',
        zIndex: 1,
      }} />
      {/* Coffee table */}
      <div style={{
        position: 'absolute',
        top: 28, left: 18,
        width: 28, height: 14,
        borderRadius: 3,
        background: lighten('#92400e', 25),
        border: '1px solid #b45309',
        zIndex: 2,
      }} />
    </div>
  );
}

// ─── Situation Monitor Wall ─────────────────────────────────────
export function IsoMonitorWall({ x, y, isActive = false }: { x: number; y: number; isActive?: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Shadow */}
      <div style={{
        position: 'absolute', bottom: -3, left: 3,
        width: 70, height: 10, borderRadius: '50%',
        background: 'rgba(0,0,0,0.08)', filter: 'blur(2px)',
      }} />
      {/* Stand */}
      <div style={{
        width: 3, height: 6,
        background: '#64748b',
        margin: '0 auto',
      }} />
      {/* Monitor array */}
      <div style={{
        width: 74, height: 42,
        borderRadius: 3,
        background: '#0f172a',
        border: '1px solid #1e293b',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 2,
        padding: 3,
        position: 'relative',
        zIndex: 2,
      }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <motion.div
            key={i}
            style={{
              borderRadius: 1,
              background: isActive ? '#1e40af' : '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            animate={isActive ? { opacity: [0.6, 1, 0.6] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          >
            <div style={{ width: 4, height: 4, borderRadius: 1, background: isActive ? '#3b82f6' : '#334155' }} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
