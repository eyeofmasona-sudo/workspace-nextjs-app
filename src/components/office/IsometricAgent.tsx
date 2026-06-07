// ─── Agent OS — Isometric Agent ────────────────────────────────
// A mini-employee character for the 2.5D isometric office.
// CSS-only: head, body, legs, shadow.
// Runtime-first status. Scaled up for isometric visibility.
// Counter-rotated name label for readability.

'use client';

import { motion } from 'framer-motion';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import { getStatusVisual } from '@/lib/office/statusMapping';
import type { OfficeAgent } from '@/hooks/useOfficeData';
import type { AgentAnimationState } from '@/hooks/useOfficeAnimations';

interface IsometricAgentProps {
  agent: OfficeAgent;
  x: number;
  y: number;
  sitting?: boolean;
  animationState?: AgentAnimationState | null;
  onClick?: () => void;
}

// Runtime-first helper
function getRuntimeStatus(agent: OfficeAgent): string {
  return agent.runtimeState?.status ?? agent.status;
}

// Status animation for the character
function getStatusAnimation(status: string) {
  switch (status) {
    case 'thinking':
      return { y: [0, -3, 0], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'working':
      return { y: [0, -2, 0], rotate: [0, 1, -1, 0], transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'waiting_api':
      return { opacity: [1, 0.5, 1], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'reviewing':
      return { x: [0, 2, -2, 0], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'waiting_approval':
      return { scale: [1, 1.08, 1], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'error':
      return { x: [0, -3, 3, 0], transition: { duration: 0.5, repeat: 3, ease: 'easeInOut' as const } };
    case 'offline':
      return { opacity: 0.35, transition: { duration: 0.3 } };
    case 'done':
    default:
      return {};
  }
}

export function IsometricAgent({ agent, x, y, sitting = false, animationState, onClick }: IsometricAgentProps) {
  const runtimeStatus = getRuntimeStatus(agent);
  const visual = getAgentVisual(agent.role);
  const statusVisual = getStatusVisual(runtimeStatus);
  const displayName = agent.profile?.displayName ?? agent.name;
  const anim = getStatusAnimation(runtimeStatus);

  const bodyColor = visual.color;
  const headColor = lighten(bodyColor, 15);
  const legColor = darken(bodyColor, 25);

  // Counter-rotation for labels (undoes scene transform for readability)
  const labelCounterRotate = 'rotateZ(45deg) rotateX(-60deg)';

  // ─── Sitting agent ────────────────────────────────────────────
  if (sitting) {
    return (
      <motion.div
        className="absolute cursor-pointer"
        style={{ left: x, top: y, zIndex: 20 }}
        onClick={onClick}
        animate={anim}
        whileHover={{ scale: 1.15 }}
      >
        {/* Shadow on floor */}
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 28, height: 10, borderRadius: '50%',
          background: 'rgba(0,0,0,0.12)', filter: 'blur(1px)',
        }} />

        {/* Head */}
        <div style={{
          position: 'relative', zIndex: 3,
          width: 20, height: 20, borderRadius: '50%',
          background: headColor,
          border: '2px solid rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
          boxShadow: `0 2px 4px rgba(0,0,0,0.25)`,
        }}>
          <span style={{ fontSize: 10 }}>{visual.emoji}</span>
        </div>

        {/* Body (sitting - wider) */}
        <div style={{
          position: 'relative', zIndex: 2,
          width: 24, height: 14,
          background: bodyColor,
          borderRadius: '0 0 5px 5px',
          clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)',
          margin: '-1px auto 0',
          boxShadow: `0 1px 3px rgba(0,0,0,0.2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.8)', fontWeight: 700, marginTop: 2 }}>
            {visual.initials}
          </span>
        </div>

        {/* Status bubble */}
        {runtimeStatus !== 'idle' && runtimeStatus !== 'offline' && runtimeStatus !== 'done' && (
          <div style={{
            position: 'absolute', top: -10, right: -10, zIndex: 10,
            width: 14, height: 14, borderRadius: '50%',
            background: statusVisual.color.replace('bg-', ''),
            border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}>
            <span style={{ fontSize: 7 }}>{statusVisual.emoji}</span>
          </div>
        )}

        {/* Name label (counter-rotated for readability) */}
        <div style={{
          position: 'absolute',
          top: -18, left: '50%',
          transform: `translateX(-50%) ${labelCounterRotate}`,
          whiteSpace: 'nowrap',
          zIndex: 30,
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#1e293b',
            background: 'rgba(255,255,255,0.9)',
            padding: '2px 6px',
            borderRadius: 4,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            border: `1px solid ${bodyColor}30`,
          }}>
            {displayName}
          </span>
        </div>

        {/* Event notification */}
        {animationState?.notification && (
          <div style={{
            position: 'absolute', top: -30, left: '50%',
            transform: `translateX(-50%) ${labelCounterRotate}`,
            whiteSpace: 'nowrap', zIndex: 31,
          }}>
            <span style={{
              fontSize: 9, color: '#fff', fontWeight: 600,
              background: '#1e293b',
              padding: '2px 6px',
              borderRadius: 3,
            }}>
              {animationState.notification}
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Standing agent ────────────────────────────────────────────
  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{ left: x, top: y, zIndex: 20 }}
      onClick={onClick}
      animate={anim}
      whileHover={{ scale: 1.15, y: -3 }}
    >
      {/* Shadow on floor */}
      <div style={{
        position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
        width: 24, height: 9, borderRadius: '50%',
        background: 'rgba(0,0,0,0.12)', filter: 'blur(1px)',
      }} />

      {/* Legs */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'center', gap: 3,
        marginBottom: -1,
      }}>
        <div style={{ width: 7, height: 10, background: legColor, borderRadius: '0 0 2px 2px' }} />
        <div style={{ width: 7, height: 10, background: legColor, borderRadius: '0 0 2px 2px' }} />
      </div>

      {/* Body */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: 22, height: 20,
        background: bodyColor,
        borderRadius: '0 0 5px 5px',
        clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
        margin: '0 auto',
        boxShadow: `0 2px 4px rgba(0,0,0,0.2)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: 700, marginTop: 4 }}>
          {visual.initials}
        </span>
      </div>

      {/* Head */}
      <div style={{
        position: 'relative', zIndex: 3,
        width: 20, height: 20, borderRadius: '50%',
        background: headColor,
        border: '2px solid rgba(255,255,255,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '-2px auto 0',
        boxShadow: `0 2px 6px rgba(0,0,0,0.25)`,
      }}>
        <span style={{ fontSize: 10 }}>{visual.emoji}</span>
      </div>

      {/* Status bubble */}
      {runtimeStatus !== 'idle' && runtimeStatus !== 'offline' && runtimeStatus !== 'done' && (
        <div style={{
          position: 'absolute', top: -6, right: -12, zIndex: 10,
          width: 14, height: 14, borderRadius: '50%',
          background: statusVisual.color.replace('bg-', ''),
          border: '2px solid white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}>
          <span style={{ fontSize: 7 }}>{statusVisual.emoji}</span>
        </div>
      )}

      {/* Name label (counter-rotated) */}
      <div style={{
        position: 'absolute',
        top: 28, left: '50%',
        transform: `translateX(-50%) ${labelCounterRotate}`,
        whiteSpace: 'nowrap',
        zIndex: 30,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#1e293b',
          background: 'rgba(255,255,255,0.9)',
          padding: '2px 6px',
          borderRadius: 4,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          border: `1px solid ${bodyColor}30`,
        }}>
          {displayName}
        </span>
      </div>

      {/* Event highlight ring */}
      {animationState?.highlight && (
        <motion.div
          style={{
            position: 'absolute', inset: -6,
            borderRadius: '50%',
            border: '2px solid rgba(59,130,246,0.5)',
            zIndex: 5,
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 0.6, repeat: 2 }}
        />
      )}
    </motion.div>
  );
}

// ─── Color helpers (local) ──────────────────────────────────────
function lighten(hex: string, pct: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16), g = parseInt(result[2], 16), b = parseInt(result[3], 16);
  const f = pct / 100;
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * f))},${Math.min(255, Math.round(g + (255 - g) * f))},${Math.min(255, Math.round(b + (255 - b) * f))})`;
}

function darken(hex: string, pct: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16), g = parseInt(result[2], 16), b = parseInt(result[3], 16);
  const f = 1 - pct / 100;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}
