// ─── Agent OS — Workstation ──────────────────────────────────
// Role-specific desk/workstation for the 2.5D Office.
// Each role has a unique desk with appropriate items.

'use client';

import { motion } from 'framer-motion';
import {
  Monitor, Server, Palette, BookOpen, Shield, Rocket,
  Code, Crown, Coffee, FileText,
} from 'lucide-react';

export interface WorkstationProps {
  role: string;
  occupied?: boolean;
  isActive?: boolean;
  compact?: boolean;
}

const ROLE_WORKSTATION: Record<string, {
  deskColor: string;
  deskAccent: string;
  monitorLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  items: string[];
}> = {
  orchestrator: {
    deskColor: '#8B5CF6',
    deskAccent: '#7C3AED',
    monitorLabel: 'CMD',
    Icon: Crown,
    items: ['📊', '📋'],
  },
  analyst: {
    deskColor: '#3B82F6',
    deskAccent: '#2563EB',
    monitorLabel: 'ANA',
    Icon: Monitor,
    items: ['📈', '🔍'],
  },
  architect: {
    deskColor: '#F59E0B',
    deskAccent: '#D97706',
    monitorLabel: 'ARC',
    Icon: FileText,
    items: ['📐', '🏗️'],
  },
  designer: {
    deskColor: '#EC4899',
    deskAccent: '#DB2777',
    monitorLabel: 'DSG',
    Icon: Palette,
    items: ['🎨', '✏️'],
  },
  frontend_engineer: {
    deskColor: '#10B981',
    deskAccent: '#059669',
    monitorLabel: 'FE',
    Icon: Code,
    items: ['💻', '🔧'],
  },
  backend_engineer: {
    deskColor: '#6366F1',
    deskAccent: '#4F46E5',
    monitorLabel: 'BE',
    Icon: Code,
    items: ['⚙️', '🔌'],
  },
  data_engineer: {
    deskColor: '#14B8A6',
    deskAccent: '#0D9488',
    monitorLabel: 'DB',
    Icon: Server,
    items: ['🗃️', '📊'],
  },
  qa_engineer: {
    deskColor: '#F43F5E',
    deskAccent: '#E11D48',
    monitorLabel: 'QA',
    Icon: Shield,
    items: ['🛡️', '🧪'],
  },
  devops_engineer: {
    deskColor: '#F97316',
    deskAccent: '#EA580C',
    monitorLabel: 'OPS',
    Icon: Rocket,
    items: ['🚀', '☁️'],
  },
  researcher: {
    deskColor: '#8B5CF6',
    deskAccent: '#7C3AED',
    monitorLabel: 'R&D',
    Icon: BookOpen,
    items: ['📚', '🔬'],
  },
};

const DEFAULT_WORKSTATION = {
  deskColor: '#6B7280',
  deskAccent: '#4B5563',
  monitorLabel: 'WS',
  Icon: Monitor,
  items: ['📁'],
};

export function Workstation({ role, occupied = false, isActive = false, compact = false }: WorkstationProps) {
  const config = ROLE_WORKSTATION[role] ?? DEFAULT_WORKSTATION;
  const { deskColor, deskAccent, monitorLabel, Icon, items } = config;

  if (compact) {
    return (
      <div className="relative w-12 h-8 flex-shrink-0">
        {/* Mini desk */}
        <div
          className="absolute bottom-0 w-full h-3 rounded-sm opacity-80"
          style={{ backgroundColor: deskAccent }}
        />
        {/* Mini monitor */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-5 h-4 rounded-t-sm flex items-center justify-center"
          style={{ backgroundColor: deskColor }}
        >
          <Icon className="w-2 h-2 text-white/80" />
        </div>
        {/* Active indicator */}
        {isActive && (
          <motion.div
            className="absolute -top-0.5 right-0 w-1.5 h-1.5 rounded-full bg-green-400"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: '90px', height: '55px' }}>
      {/* Desk shadow on floor */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[85px] h-3 rounded-[50%] opacity-10"
        style={{ backgroundColor: '#1e293b' }}
      />

      {/* Desk surface */}
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[80px] h-[28px] rounded-sm shadow-md"
        style={{
          backgroundColor: deskAccent,
          borderTop: `2px solid ${deskColor}`,
        }}
      >
        {/* Desk items */}
        <div className="absolute bottom-1 right-1 flex gap-0.5">
          {items.map((item, i) => (
            <span key={i} className="text-[7px]">{item}</span>
          ))}
        </div>

        {/* Keyboard */}
        <div
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[24px] h-[6px] rounded-[1px] opacity-60"
          style={{ backgroundColor: '#e2e8f0' }}
        />
      </div>

      {/* Monitor */}
      <div className="absolute bottom-[29px] left-1/2 -translate-x-1/2">
        {/* Monitor stand */}
        <div
          className="w-[3px] h-[4px] mx-auto"
          style={{ backgroundColor: '#94a3b8' }}
        />
        {/* Monitor screen */}
        <motion.div
          className="w-[32px] h-[20px] rounded-t-sm flex flex-col items-center justify-center shadow-sm border border-gray-600/30"
          style={{ backgroundColor: deskColor }}
          animate={isActive ? { boxShadow: [`0 0 0 0 ${deskColor}40`, `0 0 0 3px ${deskColor}00`, `0 0 0 0 ${deskColor}40`] } : {}}
          transition={isActive ? { duration: 2, repeat: Infinity } : {}}
        >
          <Icon className="w-3 h-3 text-white/70" />
          <span className="text-[5px] text-white/60 font-bold mt-0.5">{monitorLabel}</span>
        </motion.div>
      </div>

      {/* Chair (behind desk) */}
      <div
        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-[14px] h-[14px] rounded-full opacity-20"
        style={{ backgroundColor: '#475569' }}
      />

      {/* Occupied indicator */}
      {occupied && (
        <motion.div
          className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-green-400"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

export function ServerRack({ isActive = false }: { isActive?: boolean }) {
  return (
    <div className="relative" style={{ width: '40px', height: '55px' }}>
      {/* Shadow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[36px] h-2 rounded-[50%] opacity-10 bg-slate-900" />

      {/* Rack body */}
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[32px] h-[48px] rounded-sm bg-slate-700 shadow-md border border-slate-600 overflow-hidden"
      >
        {/* Server units */}
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[10px] border-b border-slate-600/50 flex items-center px-1 gap-0.5">
            <motion.div
              className={`w-1 h-1 rounded-full ${isActive ? 'bg-green-400' : 'bg-slate-500'}`}
              animate={isActive ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ duration: 0.8 + i * 0.2, repeat: Infinity, delay: i * 0.15 }}
            />
            <div className="w-3 h-0.5 bg-slate-500 rounded-full" />
            <div className="w-1.5 h-0.5 bg-slate-600 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MeetingTable() {
  return (
    <div className="relative" style={{ width: '80px', height: '40px' }}>
      {/* Shadow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[76px] h-2 rounded-[50%] opacity-10 bg-slate-900" />
      {/* Table */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[70px] h-[30px] rounded-lg bg-amber-700/80 shadow-md border border-amber-600/30 flex items-center justify-center">
        <span className="text-[8px] text-amber-200/60">MEETING</span>
      </div>
      {/* Chairs around table */}
      {[
        { top: '-2px', left: '10px' },
        { top: '-2px', right: '10px' },
        { bottom: '-2px', left: '10px' },
        { bottom: '-2px', right: '10px' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute w-[8px] h-[8px] rounded-full bg-slate-400/30"
          style={pos as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function CommandBoard({ isActive = false }: { isActive?: boolean }) {
  return (
    <div className="relative" style={{ width: '70px', height: '45px' }}>
      {/* Shadow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[66px] h-2 rounded-[50%] opacity-10 bg-slate-900" />
      {/* Board */}
      <motion.div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[60px] h-[35px] rounded-sm bg-slate-800 shadow-md border border-slate-700 flex flex-col items-center justify-center gap-0.5"
        animate={isActive ? { borderColor: '#8B5CF6' } : {}}
      >
        <Crown className="w-3 h-3 text-violet-400/70" />
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-violet-400"
              animate={isActive ? { opacity: [1, 0.3, 1] } : { opacity: 0.4 }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function LoungeArea() {
  return (
    <div className="relative" style={{ width: '70px', height: '35px' }}>
      {/* Couch */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[60px] h-[20px] rounded-lg bg-stone-300 shadow-sm border border-stone-400/30 flex items-center justify-center">
        <Coffee className="w-3 h-3 text-stone-500/60" />
      </div>
      {/* Table */}
      <div className="absolute bottom-4 right-1 w-[16px] h-[10px] rounded-sm bg-stone-200 shadow-sm" />
    </div>
  );
}
