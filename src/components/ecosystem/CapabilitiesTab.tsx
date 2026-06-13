'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, RefreshCw, Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ──────────────────────────────────────────────────

interface CapabilityScore {
  id: string;
  agentId: string;
  capabilityKey: string;
  score: number;
  trend: string;
  evidence: string | null;
  lastAssessedAt: string;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  visualProfile: string | null;
  capabilityScores: CapabilityScore[];
}

interface Gap {
  capabilityKey: string;
  averageScore: number;
  agentCount: number;
  trend: string;
  gap: 'critical' | 'moderate' | 'minor';
}

// ─── Helpers ────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score <= 30) return 'red';
  if (score <= 60) return 'amber';
  if (score <= 80) return 'emerald';
  return 'green';
}

function getScoreBgClass(score: number): string {
  if (score <= 30) return 'bg-red-500/70';
  if (score <= 60) return 'bg-amber-500/70';
  if (score <= 80) return 'bg-emerald-500/70';
  return 'bg-green-500/70';
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'improving': return <TrendingUp className="size-3 text-emerald-400" />;
    case 'declining': return <TrendingDown className="size-3 text-red-400" />;
    default: return <Minus className="size-3 text-slate-500" />;
  }
}

function parseAvatar(vp: string | null): string {
  if (!vp) return '🤖';
  try {
    const parsed = JSON.parse(vp);
    return parsed.avatarEmoji ?? '🤖';
  } catch {
    return '🤖';
  }
}

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

// ─── Component ──────────────────────────────────────────────

export function CapabilitiesTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [agentsRes, gapsRes, catsRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/capabilities/gaps'),
        fetch('/api/capabilities/scores'),
      ]);

      if (!agentsRes.ok) throw new Error('Failed to fetch agents');
      const agentsData = await agentsRes.json();

      const gapsData = gapsRes.ok ? await gapsRes.json() : { gaps: [] };
      const catsData = catsRes.ok ? await catsRes.json() : { categories: [] };

      setAgents(agentsData.agents ?? []);
      setGaps(gapsData.gaps ?? []);
      setCategories(catsData.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSeedScores = async () => {
    try {
      setSeeding(true);
      // Seed scores for each agent based on their role
      for (const agent of agents) {
        await fetch('/api/capabilities/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agent.id, role: agent.role }),
        });
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading capabilities...</span>
      </div>
    );
  }

  if (error && agents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-700 text-slate-300">
          <RefreshCw className="mr-1 size-3" /> Retry
        </Button>
      </div>
    );
  }

  // Derive capability keys from categories or from scores
  const capKeys = categories.length > 0
    ? categories
    : [...new Set(agents.flatMap((a) => a.capabilityScores?.map((s) => s.capabilityKey) ?? []))];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">
          Agent Capabilities
          <span className="ml-1.5 text-slate-500">({agents.length} agents)</span>
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedScores}
          disabled={seeding || agents.length === 0}
          className="h-7 border-slate-700/50 text-[10px] text-slate-300"
        >
          {seeding ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Sparkles className="mr-1 size-3" />}
          Seed Scores
        </Button>
      </div>

      {/* Agent capability grid */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
          <AlertTriangle className="size-5" />
          <p className="text-xs">No agents found. Seed agents first.</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {agents.map((agent) => {
            const scoresMap = new Map(
              (agent.capabilityScores ?? []).map((s) => [s.capabilityKey, s])
            );
            return (
              <div
                key={agent.id}
                className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base leading-none">{parseAvatar(agent.visualProfile)}</span>
                  <span className="text-sm font-medium text-slate-200">{agent.name}</span>
                  <Badge className="border-0 bg-slate-600/40 px-1.5 py-0 text-[9px] text-slate-300">
                    {agent.role.replace('_', ' ')}
                  </Badge>
                </div>
                {capKeys.length === 0 ? (
                  <p className="text-[10px] text-slate-500">No capability scores yet</p>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {capKeys.map((key) => {
                      const score = scoresMap.get(key);
                      const val = score?.score ?? 0;
                      const color = getScoreColor(val);
                      return (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="w-[70px] truncate text-[10px] text-slate-500">
                            {CAPABILITY_LABELS[key] ?? key}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700/50">
                            <div
                              className={`h-full rounded-full transition-all ${getScoreBgClass(val)}`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                          <span className={`w-6 text-right text-[10px] font-medium text-${color}-400`}>
                            {val}
                          </span>
                          {score && getTrendIcon(score.trend)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Capability gaps */}
      {gaps.length > 0 && (
        <div>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            System Capability Gaps
          </h3>
          <div className="space-y-1">
            {gaps.map((gap) => (
              <div
                key={gap.capabilityKey}
                className="flex items-center gap-2 rounded-md border border-slate-700/20 bg-slate-800/20 px-3 py-1.5"
              >
                <AlertTriangle
                  className={`size-3 flex-shrink-0 text-${GAP_COLORS[gap.gap]}-400`}
                />
                <span className="text-[10px] text-slate-300">
                  {CAPABILITY_LABELS[gap.capabilityKey] ?? gap.capabilityKey}
                </span>
                <span className="text-[9px] text-slate-500">
                  avg {gap.averageScore} ({gap.agentCount} agents)
                </span>
                <Badge
                  className={`bg-${GAP_COLORS[gap.gap]}-500/20 text-${GAP_COLORS[gap.gap]}-300 border-0 px-1.5 py-0 text-[9px]`}
                >
                  {gap.gap}
                </Badge>
                {getTrendIcon(gap.trend)}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && agents.length > 0 && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
