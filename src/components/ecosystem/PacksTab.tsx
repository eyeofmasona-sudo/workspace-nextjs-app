'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, RefreshCw, Download, Package, Sparkles, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ──────────────────────────────────────────────────

interface SkillPack {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string | null;
  color: string | null;
  version: string;
  status: string;
  installCount: number;
  items: { id: string; skillId: string; required: boolean }[];
}

interface ToolPack {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string | null;
  color: string | null;
  version: string;
  status: string;
  installCount: number;
  items: { id: string; toolId: string; required: boolean }[];
}

interface Agent {
  id: string;
  name: string;
  role: string;
  visualProfile: string | null;
}

// ─── Component ──────────────────────────────────────────────

export function PacksTab() {
  const [skillPacks, setSkillPacks] = useState<SkillPack[]>([]);
  const [toolPacks, setToolPacks] = useState<ToolPack[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installAgent, setInstallAgent] = useState<string>('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [spRes, tpRes, agentsRes] = await Promise.all([
        fetch('/api/skill-packs'),
        fetch('/api/tool-packs'),
        fetch('/api/agents'),
      ]);

      if (!spRes.ok || !tpRes.ok) throw new Error('Failed to fetch packs');

      const spData = await spRes.json();
      const tpData = await tpRes.json();
      const agentsData = agentsRes.ok ? await agentsRes.json() : { agents: [] };

      setSkillPacks(spData.packs ?? []);
      setToolPacks(tpData.packs ?? []);
      setAgents(agentsData.agents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSeed = async (type: 'skill' | 'tool') => {
    try {
      setSeeding(true);
      const endpoint = type === 'skill' ? '/api/skill-packs' : '/api/tool-packs';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      if (!res.ok) throw new Error('Seed failed');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const handleInstallPack = async (packKey: string, type: 'skill' | 'tool') => {
    if (!installAgent) return;
    try {
      setInstalling(packKey);
      const endpoint = type === 'skill'
        ? `/api/skill-packs/${packKey}/install`
        : `/api/tool-packs/${packKey}/install`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: installAgent }),
      });
      if (!res.ok) throw new Error('Install failed');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  const renderPackCard = (
    pack: SkillPack | ToolPack,
    type: 'skill' | 'tool'
  ) => {
    const count = pack.items?.length ?? 0;
    const accentColor = pack.color ?? (type === 'skill' ? '#8b5cf6' : '#06b6d4');
    return (
      <div
        key={pack.id}
        className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-3 transition-colors hover:border-slate-600/50"
      >
        <div className="flex items-start gap-2">
          <div
            className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <span className="text-sm leading-none">
              {pack.icon || (type === 'skill' ? '🎯' : '🔧')}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-slate-200">{pack.name}</span>
              {pack.status !== 'available' && (
                <Badge className="border-0 bg-amber-500/20 px-1.5 py-0 text-[9px] text-amber-300">
                  {pack.status}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{pack.description}</p>
            <div className="mt-1.5 flex items-center gap-3 text-[9px] text-slate-500">
              <span>
                {type === 'skill' ? (
                  <Sparkles className="mr-0.5 inline size-2.5" />
                ) : (
                  <Wrench className="mr-0.5 inline size-2.5" />
                )}
                {count} {type === 'skill' ? 'skills' : 'tools'}
              </span>
              <span>
                <Download className="mr-0.5 inline size-2.5" />
                {pack.installCount} installs
              </span>
              <span>v{pack.version}</span>
            </div>
          </div>
        </div>
        {/* Install bar */}
        <div className="mt-2 flex items-end gap-2 border-t border-slate-700/30 pt-2">
          <Select value={installAgent} onValueChange={setInstallAgent}>
            <SelectTrigger className="h-7 w-[140px] border-slate-700/50 bg-slate-800/40 text-[10px] text-slate-300">
              <SelectValue placeholder="Select agent..." />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-[#0f0f1a]">
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-xs text-slate-300">
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => handleInstallPack(pack.key, type)}
            disabled={!installAgent || installing === pack.key}
            className="h-7 bg-emerald-600/80 px-3 text-[10px] text-white hover:bg-emerald-600"
          >
            {installing === pack.key ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Download className="mr-1 size-3" />
            )}
            Install Pack
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading packs...</span>
      </div>
    );
  }

  if (error && skillPacks.length === 0 && toolPacks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-700 text-slate-300">
          <RefreshCw className="mr-1 size-3" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Skill Packs */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Package className="size-3.5" /> Skill Packs
            <span className="text-slate-500">({skillPacks.length})</span>
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSeed('skill')}
            disabled={seeding}
            className="h-6 border-slate-700/50 px-2 text-[9px] text-slate-400"
          >
            {seeding ? <Loader2 className="mr-1 size-2.5 animate-spin" /> : <Sparkles className="mr-1 size-2.5" />}
            Seed
          </Button>
        </div>
        {skillPacks.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-slate-500">No skill packs available</p>
        ) : (
          <div className="max-h-[35vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {skillPacks.map((pack) => renderPackCard(pack, 'skill'))}
          </div>
        )}
      </div>

      {/* Tool Packs */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Package className="size-3.5" /> Tool Packs
            <span className="text-slate-500">({toolPacks.length})</span>
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSeed('tool')}
            disabled={seeding}
            className="h-6 border-slate-700/50 px-2 text-[9px] text-slate-400"
          >
            {seeding ? <Loader2 className="mr-1 size-2.5 animate-spin" /> : <Sparkles className="mr-1 size-2.5" />}
            Seed
          </Button>
        </div>
        {toolPacks.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-slate-500">No tool packs available</p>
        ) : (
          <div className="max-h-[35vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {toolPacks.map((pack) => renderPackCard(pack, 'tool'))}
          </div>
        )}
      </div>

      {error && (skillPacks.length > 0 || toolPacks.length > 0) && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
