'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Loader2, RefreshCw, Download, ChevronDown, ChevronUp,
  Sparkles, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ──────────────────────────────────────────────────

interface Skill {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  version: string;
  status: string;
  tags: string | null;
  installCount: number;
  requiredTools: string | null;
  metadata: string | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  visualProfile: string | null;
}

// ─── Category Colors ────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  analysis: 'blue',
  creation: 'purple',
  communication: 'emerald',
  automation: 'amber',
  management: 'rose',
  technical: 'cyan',
  media: 'pink',
  specialized: 'orange',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'emerald',
  deprecated: 'red',
  beta: 'amber',
  experimental: 'purple',
};

// ─── Component ──────────────────────────────────────────────

export function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [installAgent, setInstallAgent] = useState<string>('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      const res = await fetch(`/api/skills?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch skills');
      const data = await res.json();
      setSkills(data.skills ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents ?? []);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      if (!res.ok) throw new Error('Seed failed');
      await fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const handleInstall = async (skillKey: string) => {
    if (!installAgent) return;
    try {
      setInstalling(skillKey);
      const res = await fetch(`/api/skills/${skillKey}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: installAgent }),
      });
      if (!res.ok) throw new Error('Install failed');
      await fetchSkills();
      setExpandedSkill(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  // Filter skills by search
  const filteredSkills = skills.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.key.toLowerCase().includes(q) ||
      (s.tags && s.tags.toLowerCase().includes(q))
    );
  });

  // Group by category
  const grouped = filteredSkills.reduce<Record<string, Skill[]>>((acc, s) => {
    const cat = s.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const categories = ['all', ...new Set(skills.map((s) => s.category).filter(Boolean))];

  const getCatColor = (cat: string) => CATEGORY_COLORS[cat] ?? 'slate';
  const getStatusColor = (status: string) => STATUS_COLORS[status] ?? 'slate';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading skills...</span>
      </div>
    );
  }

  if (error && skills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchSkills} className="border-slate-700 text-slate-300">
          <RefreshCw className="mr-1 size-3" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="h-8 border-slate-700/50 bg-slate-800/30 pl-7 text-xs text-slate-200 placeholder:text-slate-500"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 w-[130px] border-slate-700/50 bg-slate-800/30 text-xs text-slate-300">
              <Filter className="mr-1 size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-[#0f0f1a]">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs text-slate-300">
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeed}
          disabled={seeding}
          className="h-7 border-slate-700/50 text-[10px] text-slate-300"
        >
          {seeding ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Sparkles className="mr-1 size-3" />}
          Seed Skills
        </Button>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-slate-600/60 text-slate-100'
                : 'bg-slate-800/30 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Skills list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
          <Search className="size-5" />
          <p className="text-xs">No skills found</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-260px)] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {Object.entries(grouped).map(([category, catSkills]) => (
            <div key={category}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {category}
              </h3>
              <div className="space-y-1.5">
                {catSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-3 transition-colors hover:border-slate-600/50"
                  >
                    {/* Skill header */}
                    <button
                      className="flex w-full items-start gap-2 text-left"
                      onClick={() => setExpandedSkill(expandedSkill === skill.key ? null : skill.key)}
                    >
                      <span className="mt-0.5 text-base leading-none">{skill.icon || '🎯'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-200">{skill.name}</span>
                          <Badge
                            className={`bg-${getCatColor(skill.category)}-500/20 text-${getCatColor(skill.category)}-300 border-0 text-[9px] px-1.5 py-0`}
                          >
                            {skill.category}
                          </Badge>
                          {skill.status !== 'available' && (
                            <Badge
                              className={`bg-${getStatusColor(skill.status)}-500/20 text-${getStatusColor(skill.status)}-300 border-0 text-[9px] px-1.5 py-0`}
                            >
                              {skill.status}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{skill.description}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-[9px] text-slate-500">
                          <Download className="mr-0.5 inline size-2.5" />
                          {skill.installCount}
                        </span>
                        {expandedSkill === skill.key ? (
                          <ChevronUp className="size-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="size-3.5 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expandedSkill === skill.key && (
                      <div className="mt-3 border-t border-slate-700/30 pt-3">
                        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                          <span>Key: <span className="text-slate-300">{skill.key}</span></span>
                          <span>Version: <span className="text-slate-300">{skill.version}</span></span>
                        </div>
                        <div className="flex items-end gap-2">
                          <Select value={installAgent} onValueChange={setInstallAgent}>
                            <SelectTrigger className="h-7 w-[160px] border-slate-700/50 bg-slate-800/40 text-[10px] text-slate-300">
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
                            onClick={() => handleInstall(skill.key)}
                            disabled={!installAgent || installing === skill.key}
                            className="h-7 bg-emerald-600/80 px-3 text-[10px] text-white hover:bg-emerald-600"
                          >
                            {installing === skill.key ? (
                              <Loader2 className="mr-1 size-3 animate-spin" />
                            ) : (
                              <Download className="mr-1 size-3" />
                            )}
                            Install
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && skills.length > 0 && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
