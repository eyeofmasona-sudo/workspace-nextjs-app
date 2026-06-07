// ─── Agent OS — AgentCharacter ───────────────────────────────
// A unique agent character in the Office UI.
// Displays avatar, name, role, status with CSS-based animations.
// Runtime-first: uses agent.runtimeState?.status ?? agent.status

'use client';

import { motion } from 'framer-motion';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import { getStatusVisual } from '@/lib/office/statusMapping';
import { AgentStatusBadge } from './AgentStatusBadge';
import type { OfficeAgent } from '@/hooks/useOfficeData';

interface AgentCharacterProps {
  agent: OfficeAgent;
  onClick?: () => void;
  compact?: boolean;
}

// Runtime-first helper
function getRuntimeStatus(agent: OfficeAgent): string {
  return agent.runtimeState?.status ?? agent.status;
}

export function AgentCharacter({ agent, onClick, compact = false }: AgentCharacterProps) {
  // Runtime-first: prefer runtimeState.status over agent.status
  const runtimeStatus = getRuntimeStatus(agent);
  const visual = getAgentVisual(agent.role);
  const statusVisual = getStatusVisual(runtimeStatus);
  const displayName = agent.profile?.displayName ?? agent.name;

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/60 cursor-pointer transition-colors"
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={`${displayName} — ${statusVisual.label}`}
      >
        <div className={`w-7 h-7 rounded-full ${visual.bgColor} flex items-center justify-center text-white text-xs font-bold ring-2 ${statusVisual.borderColor}`}>
          {visual.emoji}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{displayName}</p>
        </div>
        <AgentStatusBadge status={runtimeStatus} size="sm" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`
        relative flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer
        bg-white/70 backdrop-blur-sm border ${statusVisual.borderColor}
        hover:bg-white/90 transition-all shadow-sm
        ${runtimeStatus === 'offline' ? 'opacity-50' : ''}
      `}
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      {/* Status indicator ring */}
      <div className="relative">
        <motion.div
          className={`w-12 h-12 rounded-full ${visual.bgColor} flex items-center justify-center text-2xl shadow-md ring-2 ${statusVisual.borderColor}`}
          animate={
            statusVisual.isActive
              ? { boxShadow: [`0 0 0 0 ${visual.color}40`, `0 0 0 8px ${visual.color}00`] }
              : {}
          }
          transition={
            statusVisual.isActive
              ? { duration: 1.5, repeat: Infinity, ease: 'easeOut' }
              : {}
          }
        >
          {visual.emoji}
        </motion.div>

        {/* Status dot — runtime-first */}
        <div className="absolute -bottom-0.5 -right-0.5">
          <AgentStatusBadge status={runtimeStatus} size="sm" />
        </div>
      </div>

      {/* Name */}
      <p className="text-[11px] font-semibold text-center leading-tight max-w-[80px] truncate">
        {displayName}
      </p>

      {/* Activity */}
      {agent.runtimeState?.currentActivity && (
        <p className="text-[9px] text-muted-foreground text-center truncate max-w-[80px]">
          {agent.runtimeState.currentActivity}
        </p>
      )}
    </motion.div>
  );
}
