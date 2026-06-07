// ─── Agent OS — Zone Visual Mapping ─────────────────────────
// Maps office zones to layout positions and visual properties.

import type { OfficeZone } from '@/lib/types/domain';

export interface ZoneVisual {
  key: OfficeZone;
  label: string;
  icon: string;      // Lucide icon name
  emoji: string;
  color: string;     // Tailwind bg class
  borderColor: string;
  description: string;
  gridArea: string;  // CSS grid area name
}

export const ZONE_VISUAL_MAP: Record<OfficeZone, ZoneVisual> = {
  command_area: {
    key: 'command_area',
    label: 'Command Center',
    icon: 'Crown',
    emoji: '👑',
    color: 'bg-violet-50',
    borderColor: 'border-violet-200',
    description: 'Strategic planning and coordination',
    gridArea: 'command',
  },
  situation_room: {
    key: 'situation_room',
    label: 'Situation Room',
    icon: 'Monitor',
    emoji: '📊',
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Monitoring and analytics dashboard',
    gridArea: 'situation',
  },
  development_area: {
    key: 'development_area',
    label: 'Development Floor',
    icon: 'Code',
    emoji: '💻',
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Code development and engineering',
    gridArea: 'development',
  },
  design_area: {
    key: 'design_area',
    label: 'Design Studio',
    icon: 'Palette',
    emoji: '🎨',
    color: 'bg-pink-50',
    borderColor: 'border-pink-200',
    description: 'UI/UX design and prototyping',
    gridArea: 'design',
  },
  research_area: {
    key: 'research_area',
    label: 'Research Lab',
    icon: 'BookOpen',
    emoji: '📚',
    color: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Research and knowledge discovery',
    gridArea: 'research',
  },
  server_room: {
    key: 'server_room',
    label: 'Server Room',
    icon: 'Server',
    emoji: '🖥️',
    color: 'bg-teal-50',
    borderColor: 'border-teal-200',
    description: 'Infrastructure and database management',
    gridArea: 'server',
  },
  meeting_room: {
    key: 'meeting_room',
    label: 'Meeting Room',
    icon: 'Users',
    emoji: '🤝',
    color: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Architecture decisions and collaboration',
    gridArea: 'meeting',
  },
  lounge_area: {
    key: 'lounge_area',
    label: 'Lounge',
    icon: 'Coffee',
    emoji: '☕',
    color: 'bg-stone-50',
    borderColor: 'border-stone-200',
    description: 'Idle and available agents',
    gridArea: 'lounge',
  },
};

export const ZONE_LIST = Object.values(ZONE_VISUAL_MAP);

export function getZoneVisual(zone: string): ZoneVisual {
  return ZONE_VISUAL_MAP[zone as OfficeZone] ?? ZONE_VISUAL_MAP.lounge_area;
}
