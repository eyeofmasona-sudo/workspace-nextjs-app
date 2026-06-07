// ─── Agent OS — AgentSprite ──────────────────────────────────
// A 2.5D agent character for the Office UI.
// CSS-only mini-person with head, body, legs, shadow.
// Role-based color, status animation, event animation overlay.

'use client';

import { motion, type TargetAndTransition, type Transition } from 'framer-motion';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import { getStatusVisual } from '@/lib/office/statusMapping';
import type { AgentAnimationState } from '@/hooks/useOfficeAnimations';
import type { OfficeAgent } from '@/hooks/useOfficeData';

interface AgentSpriteProps {
  agent: OfficeAgent;
  animationState?: AgentAnimationState | null;
  onClick?: () => void;
  compact?: boolean;
}

// Status animation configs — returns framer-motion animate + transition props
function getStatusAnim(status: string): { animate?: TargetAndTransition; transition?: Transition } {
  switch (status) {
    case 'idle':
      return {
        animate: { y: [0, -1, 0] },
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'thinking':
      return {
        animate: { y: [0, -2, 0] },
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'working':
      return {
        animate: { y: [0, -1, 0], rotate: [0, 0.5, -0.5, 0] },
        transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'waiting_api':
      return {
        animate: { opacity: [1, 0.6, 1] },
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'reviewing':
      return {
        animate: { x: [0, 1, -1, 0] },
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'waiting_approval':
      return {
        animate: { scale: [1, 1.05, 1] },
        transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'error':
      return {
        animate: { x: [0, -2, 2, -2, 2, 0] },
        transition: { duration: 0.5, repeat: 3, ease: 'easeInOut' },
      };
    case 'offline':
      return {
        animate: { opacity: 0.5 },
        transition: { duration: 0.3 },
      };
    case 'done':
    default:
      return {};
  }
}

// Event animation configs
function getEventAnim(type: string): { animate?: TargetAndTransition; transition?: Transition } {
  switch (type) {
    case 'pulse':
      return {
        animate: { boxShadow: ['0 0 0 0 rgba(59,130,246,0.5)', '0 0 0 8px rgba(59,130,246,0)', '0 0 0 0 rgba(59,130,246,0)'] },
        transition: { duration: 0.8, repeat: 2 },
      };
    case 'glow':
      return {
        animate: { filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'] },
        transition: { duration: 1, repeat: 1 },
      };
    case 'shake':
      return {
        animate: { x: [0, -3, 3, -3, 3, 0] },
        transition: { duration: 0.4, repeat: 1 },
      };
    case 'bounce':
      return {
        animate: { y: [0, -8, -2, -5, 0] },
        transition: { duration: 0.6, repeat: 1 },
      };
    case 'slide':
      return {
        animate: { x: [-5, 0], opacity: [0.5, 1] },
        transition: { duration: 0.4 },
      };
    case 'fade':
      return {
        animate: { opacity: [0.3, 1] },
        transition: { duration: 0.5 },
      };
    default:
      return {};
  }
}

function StatusBubble({ status }: { status: string }) {
  const visual = getStatusVisual(status);

  if (status === 'idle' || status === 'offline' || status === 'done') return null;

  return (
    <motion.div
      className="absolute -top-2 -right-1 z-10"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      <div className={`w-4 h-4 rounded-full ${visual.color} flex items-center justify-center shadow-md ring-2 ring-white`}>
        <span className="text-[8px] leading-none">{visual.emoji}</span>
      </div>
    </motion.div>
  );
}

function ThoughtBubble() {
  return (
    <motion.div
      className="absolute -top-5 left-1/2 -translate-x-1/2 z-10"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.1, 1], opacity: [0, 1, 1] }}
      transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 2 }}
    >
      <div className="flex items-end gap-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-sm" />
        <div className="w-2 h-2 rounded-full bg-white/80 shadow-sm" />
        <div className="w-5 h-4 rounded-full bg-white/90 shadow-sm flex items-center justify-center">
          <span className="text-[7px]">💭</span>
        </div>
      </div>
    </motion.div>
  );
}

function WarningBadge() {
  return (
    <motion.div
      className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <div className="bg-amber-400 text-amber-900 text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md ring-1 ring-amber-300">
        ⚠️ WAITING
      </div>
    </motion.div>
  );
}

function ErrorBadge() {
  return (
    <motion.div
      className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
      animate={{ x: [0, -1, 1, -1, 0] }}
      transition={{ duration: 0.3, repeat: 3 }}
    >
      <div className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md ring-1 ring-red-400">
        ❌ ERROR
      </div>
    </motion.div>
  );
}

function DoneBadge() {
  return (
    <motion.div
      className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      transition={{ duration: 0.4 }}
    >
      <div className="bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md ring-1 ring-green-400">
        ✅ DONE
      </div>
    </motion.div>
  );
}

function WifiPulse() {
  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
      <div className="relative w-4 h-4 flex items-center justify-center">
        <span className="text-[10px]">📡</span>
        <motion.div
          className="absolute inset-0 rounded-full border border-sky-400"
          animate={{ scale: [0.5, 1.5], opacity: [1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
    </div>
  );
}

function NotificationPopup({ notification }: { notification: string }) {
  return (
    <motion.div
      className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap"
      initial={{ y: 5, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -5, opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-gray-900 text-white text-[8px] px-2 py-1 rounded-md shadow-lg">
        {notification}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-900" />
      </div>
    </motion.div>
  );
}

export function AgentSprite({ agent, animationState, onClick, compact = false }: AgentSpriteProps) {
  const visual = getAgentVisual(agent.role);
  const statusVisual = getStatusVisual(agent.status);
  const displayName = agent.profile?.displayName ?? agent.name;

  // Get animation configs
  const statusAnim = getStatusAnim(agent.status);
  const eventAnim = animationState?.animation ? getEventAnim(animationState.animation) : null;
  // Event animation takes priority over status animation
  const activeAnim = eventAnim ?? statusAnim;

  if (compact) {
    return (
      <motion.div
        className="relative flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-white/50 cursor-pointer transition-colors"
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={`${displayName} — ${statusVisual.label}`}
      >
        {/* Mini character */}
        <div className="relative">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
            style={{ backgroundColor: visual.color }}
          >
            {visual.initials}
          </div>
          {/* Status dot */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${statusVisual.color} ring-1 ring-white ${statusVisual.isActive ? 'animate-pulse' : ''}`}
          />
        </div>
        <span className="text-[10px] font-medium truncate max-w-[60px]">{displayName}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative flex flex-col items-center cursor-pointer select-none"
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -3 }}
      whileTap={{ scale: 0.95 }}
      animate={activeAnim.animate}
      transition={activeAnim.transition}
    >
      {/* Event notification popup */}
      {animationState?.notification && (
        <NotificationPopup notification={animationState.notification} />
      )}

      {/* Status-specific badges */}
      {agent.status === 'thinking' && <ThoughtBubble />}
      {agent.status === 'waiting_approval' && <WarningBadge />}
      {agent.status === 'error' && <ErrorBadge />}
      {agent.status === 'done' && <DoneBadge />}
      {agent.status === 'waiting_api' && <WifiPulse />}

      {/* Character body */}
      <div className="relative">
        {/* Shadow on floor */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 rounded-[50%] opacity-15"
          style={{ backgroundColor: '#1e293b' }}
        />

        {/* Head */}
        <div className="relative z-[2] flex justify-center">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-md border-2 border-white/30"
            style={{ backgroundColor: visual.color }}
          >
            {visual.emoji}
          </div>
          {/* Status indicator */}
          <StatusBubble status={agent.status} />
        </div>

        {/* Body */}
        <div className="relative z-[1] -mt-1 flex justify-center">
          <div
            className="w-8 h-9 rounded-b-lg flex items-center justify-center shadow-sm"
            style={{
              backgroundColor: visual.color,
              clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
            }}
          >
            <span className="text-[7px] text-white/80 font-bold mt-1">{visual.initials}</span>
          </div>
        </div>

        {/* Legs */}
        <div className="relative z-[1] -mt-0.5 flex justify-center gap-[3px]">
          <div
            className="w-[6px] h-[5px] rounded-b-sm"
            style={{ backgroundColor: visual.color, filter: 'brightness(0.75)' }}
          />
          <div
            className="w-[6px] h-[5px] rounded-b-sm"
            style={{ backgroundColor: visual.color, filter: 'brightness(0.75)' }}
          />
        </div>
      </div>

      {/* Name label */}
      <div className="mt-1 text-center">
        <p className="text-[9px] font-semibold leading-tight max-w-[56px] truncate text-gray-700">
          {displayName}
        </p>
        {agent.runtimeState?.currentActivity && (
          <p className="text-[7px] text-muted-foreground leading-tight max-w-[64px] truncate">
            {agent.runtimeState.currentActivity}
          </p>
        )}
      </div>

      {/* Highlight ring for event animations */}
      {animationState?.highlight && (
        <motion.div
          className="absolute inset-0 rounded-full ring-2 ring-blue-400/60"
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 0.6, repeat: 2 }}
        />
      )}
    </motion.div>
  );
}
