'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, RefreshCw, Users, Target, Wrench, Package, Store,
  TrendingUp, AlertTriangle, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ──────────────────────────────────────────────────

interface SystemOverview {
  totalAgents: number;
  totalSkills: number;
  totalTools: number;
  totalSkillPacks: number;
  totalToolPacks: number;
  totalMarketplaceItems: number;
  totalWorkflows: number;
  totalCostLogs: number;
  totalEventLogs: number;
}

interface SkillUsageStat {
  skillId: string;
  skillKey: string;
  skillName: string;
  category: string;
  totalUsage: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgDurationMs: number | null;
}

interface ToolUsageStat {
  toolId: string;
  toolKey: string;
  toolName: string;
  category: string;
  totalUsage: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgDurationMs: number | null;
}

interface AgentEffectiveness {
  agentId: string;
  agentName: string;
  role: string;
  tasksCompleted: number;
  totalCost: number;
  costPerTask: number;
  successRate: number;
  capabilityScore: number;
  effectivenessRank: number;
}

interface CapabilityGap {
  capabilityKey: string;
  averageScore: number;
  agentCount: number;
  trend: string;
  gap: 'critical' | 'moderate' | 'minor';
}

// ─── Helpers ────────────────────────────────────────────────

const OVERVIEW_CARDS: {
  key: keyof SystemOverview;
  label: string;
  icon: typeof Users;
  color: string;
}[] = [
  { key: 'totalAgents', label: 'Agents', icon: Users, color: 'emerald' },
  { key: 'totalSkills', label: 'Skills', icon: Target, color: 'purple' },
  { key: 'totalTools', label: 'Tools', icon: Wrench, color: 'cyan' },
  { key: 'totalSkillPacks', label: 'Skill Packs', icon: Package, color: 'violet' },
  { key: 'totalToolPacks', label: 'Tool Packs', icon: Package, color: 'teal' },
  { key: 'totalMarketplaceItems', label: 'Marketplace', icon: Store, color: 'amber' },
];

const CAPABILITY_LABELS: Record<string, string> = {
  coding: 'Coding',
  research: 'Research',
  design: 'Design',
  communication: 'Communication',
  automation: 'Automation',
  management: 'Management',
  legal: 'Legal',
  analysis: 'Analysis',
  media: 'Media',
  security: 'Security',
};

const GAP_COLORS: Record<string, string> = {
  critical: 'red',
  moderate: 'amber',
  minor: 'emerald',
};

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── CSS Bar Chart ─────────────────────────────────────────

function HorizontalBarChart({
  data,
  maxVal,
  colorClass,
}: {
  data: { name: string; value: number; sub?: string }[];
  maxVal: number;
  colorClass: string;
}) {
  if (data.length === 0) {
    return <p className="py-3 text-center text-[10px] text-slate-500">No data yet</p>;
  }
  return (
    <div className="space-y-1.5">
      {data.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-[100px] truncate text-[10px] text-slate-400">{item.name}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-sm bg-slate-700/40">
            <div
              className={`h-full rounded-sm ${colorClass}`}
              style={{ width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%`, minWidth: item.value > 0 ? '4px' : '0' }}
            />
          </div>
          <span className="w-8 text-right text-[10px] font-medium text-slate-300">{item.value}</span>
          {item.sub !== undefined && (
            <span className="w-12 text-right text-[9px] text-slate-500">{item.sub}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

export function AnalyticsTab() {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [skillStats, setSkillStats] = useState<SkillUsageStat[]>([]);
  const [toolStats, setToolStats] = useState<ToolUsageStat[]>([]);
  const [gaps, setGaps] = useState<CapabilityGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [ovRes, skRes, tlRes, gapsRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/analytics/skills'),
        fetch('/api/analytics/tools'),
        fetch('/api/capabilities/gaps'),
      ]);

      if (!ovRes.ok) throw new Error('Failed to fetch analytics');

      const ovData = await ovRes.json();
      const skData = skRes.ok ? await skRes.json() : { usageStats: [] };
      const tlData = tlRes.ok ? await tlRes.json() : { usageStats: [] };
      const gapsData = gapsRes.ok ? await gapsRes.json() : { gaps: [] };

      setOverview(ovData.overview ?? null);
      setSkillStats(skData.usageStats ?? []);
      setToolStats(tlData.usageStats ?? []);
      setGaps(gapsData.gaps ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading analytics...</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-700 text-slate-300">
          <RefreshCw className="mr-1 size-3" /> Retry
        </Button>
      </div>
    );
  }

  const maxSkillUsage = Math.max(0, ...skillStats.map((s) => s.totalUsage));
  const maxToolUsage = Math.max(0, ...toolStats.map((t) => t.totalUsage));

  return (
    <div className="flex flex-col gap-4">
      {/* System Overview Cards */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <BarChart3 className="size-3" /> System Overview
        </h3>
        {overview ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {OVERVIEW_CARDS.map(({ key, label, icon: Icon, color }) => (
              <div
                key={key}
                className={`rounded-lg border border-slate-700/30 bg-${color}-500/5 p-2.5 text-center`}
              >
                <Icon className={`mx-auto size-4 text-${color}-400`} />
                <p className="mt-1 text-lg font-bold text-slate-200">{overview[key]}</p>
                <p className="text-[9px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-500">No overview data available</p>
        )}
      </div>

      {/* Charts area */}
      <div className="max-h-[calc(100vh-340px)] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
        {/* Top Skills */}
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Target className="size-3" /> Top Skills by Usage
          </h3>
          <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3">
            <HorizontalBarChart
              data={skillStats.map((s) => ({
                name: s.skillName,
                value: s.totalUsage,
                sub: `${Math.round(s.successRate * 100)}%`,
              }))}
              maxVal={maxSkillUsage}
              colorClass="bg-purple-500/70"
            />
          </div>
        </div>

        {/* Top Tools */}
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Wrench className="size-3" /> Top Tools by Usage
          </h3>
          <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3">
            <HorizontalBarChart
              data={toolStats.map((t) => ({
                name: t.toolName,
                value: t.totalUsage,
                sub: `${Math.round(t.successRate * 100)}%`,
              }))}
              maxVal={maxToolUsage}
              colorClass="bg-cyan-500/70"
            />
          </div>
        </div>

        {/* Skill Details Table */}
        {skillStats.length > 0 && (
          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Skill Usage Details
            </h3>
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3">
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_50px_50px_50px_60px] gap-1 text-[9px] font-medium text-slate-500">
                  <span>Skill</span>
                  <span className="text-right">Usage</span>
                  <span className="text-right">Success</span>
                  <span className="text-right">Fail</span>
                  <span className="text-right">Avg Time</span>
                </div>
                {skillStats.slice(0, 10).map((s) => (
                  <div key={s.skillId} className="grid grid-cols-[1fr_50px_50px_50px_60px] gap-1 text-[10px]">
                    <span className="truncate text-slate-300">{s.skillName}</span>
                    <span className="text-right text-slate-400">{s.totalUsage}</span>
                    <span className="text-right text-emerald-400">{s.successCount}</span>
                    <span className="text-right text-red-400">{s.failCount}</span>
                    <span className="text-right text-slate-500">{formatDuration(s.avgDurationMs)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tool Details Table */}
        {toolStats.length > 0 && (
          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Tool Usage Details
            </h3>
            <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3">
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_50px_50px_50px_60px] gap-1 text-[9px] font-medium text-slate-500">
                  <span>Tool</span>
                  <span className="text-right">Usage</span>
                  <span className="text-right">Success</span>
                  <span className="text-right">Fail</span>
                  <span className="text-right">Avg Time</span>
                </div>
                {toolStats.slice(0, 10).map((t) => (
                  <div key={t.toolId} className="grid grid-cols-[1fr_50px_50px_50px_60px] gap-1 text-[10px]">
                    <span className="truncate text-slate-300">{t.toolName}</span>
                    <span className="text-right text-slate-400">{t.totalUsage}</span>
                    <span className="text-right text-emerald-400">{t.successCount}</span>
                    <span className="text-right text-red-400">{t.failCount}</span>
                    <span className="text-right text-slate-500">{formatDuration(t.avgDurationMs)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Capability Gaps Summary */}
        {gaps.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <AlertTriangle className="size-3" /> Capability Gaps
            </h3>
            <div className="space-y-1">
              {gaps.map((gap) => (
                <div
                  key={gap.capabilityKey}
                  className="flex items-center gap-2 rounded-md border border-slate-700/20 bg-slate-800/20 px-3 py-1.5"
                >
                  <AlertTriangle className={`size-3 flex-shrink-0 text-${GAP_COLORS[gap.gap]}-400`} />
                  <span className="text-[10px] text-slate-300">
                    {CAPABILITY_LABELS[gap.capabilityKey] ?? gap.capabilityKey}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    avg {gap.averageScore}
                  </span>
                  <Badge
                    className={`bg-${GAP_COLORS[gap.gap]}-500/20 text-${GAP_COLORS[gap.gap]}-300 border-0 px-1.5 py-0 text-[9px]`}
                  >
                    {gap.gap}
                  </Badge>
                  {gap.trend === 'improving' && <TrendingUp className="size-3 text-emerald-400" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && overview && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
