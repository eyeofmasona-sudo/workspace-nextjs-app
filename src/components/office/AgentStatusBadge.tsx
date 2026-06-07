// ─── Agent OS — AgentStatusBadge ─────────────────────────────
// Visual status indicator for agent characters.

'use client';

import { getStatusVisual } from '@/lib/office/statusMapping';

interface AgentStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function AgentStatusBadge({ status, size = 'md', showLabel = false }: AgentStatusBadgeProps) {
  const visual = getStatusVisual(status);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const labelSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className={`${sizeClasses[size]} rounded-full ${visual.color} ${visual.animation} ring-2 ring-white`}
        title={visual.description}
      />
      {showLabel && (
        <span className={`${labelSizeClasses[size]} ${visual.textColor} font-medium`}>
          {visual.emoji} {visual.label}
        </span>
      )}
    </div>
  );
}
