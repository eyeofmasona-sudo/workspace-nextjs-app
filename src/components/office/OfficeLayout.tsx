// ─── Agent OS — OfficeLayout ─────────────────────────────────
// Wrapper component that provides the Office Canvas to the AgentOffice.
// Delegates to OfficeCanvas for the 2.5D visualization.
// This file is kept for backward compatibility.

'use client';

import { OfficeCanvas } from './OfficeCanvas';
import type { OfficeAgent, OfficeTask } from '@/hooks/useOfficeData';
import type { AgentAnimationState, ZoneAnimationState } from '@/hooks/useOfficeAnimations';

interface OfficeLayoutProps {
  agents: OfficeAgent[];
  tasks: OfficeTask[];
  onAgentClick?: (agentId: string) => void;
  agentAnimations?: Record<string, AgentAnimationState>;
  zoneAnimations?: Record<string, ZoneAnimationState>;
}

export function OfficeLayout({ agents, tasks, onAgentClick, agentAnimations, zoneAnimations }: OfficeLayoutProps) {
  return (
    <OfficeCanvas
      agents={agents}
      tasks={tasks}
      onAgentClick={onAgentClick}
      agentAnimations={agentAnimations}
      zoneAnimations={zoneAnimations}
    />
  );
}
