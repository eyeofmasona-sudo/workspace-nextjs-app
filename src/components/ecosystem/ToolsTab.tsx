'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Loader2, RefreshCw, Download, ChevronDown, ChevronUp,
  Wrench, Filter, Shield, ShieldAlert, ShieldCheck,
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

interface Tool {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string | null;
  enabled: boolean;
  riskLevel: string;
  requiresApproval: boolean;
  configSchema: string | null;
  workspaceId: string | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  visualProfile: string | null;
}

// ─── Category & Risk Colors ────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  model_provider: 'purple',
  filesystem: 'amber',
  terminal: 'red',
  git: 'orange',
  browser: 'cyan',
  database: 'blue',
  document: 'emerald',
  ocr: 'pink',
  translation: 'teal',
  rag: 'indigo',
  deployment: 'green',
  notification: 'yellow',
  media: 'rose',
  cost: 'slate',
  internal: 'zinc',
};

const RISK_COLORS: Record<string, string> = {
  low: 'emerald',
  medium: 'amber',
  high: 'orange',
  critical: 'red',
};

const RISK_ICONS: Record<string, typeof Shield> = {
  low: ShieldCheck,
  medium: Shield,
  high: ShieldAlert,
  critical: ShieldAlert,
};

// ─── Component ──────────────────────────────────────────────

export function ToolsTab() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [installAgent, setInstallAgent] = useState<string>('');
  const [installing, setInstalling] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      const res = await fetch(`/api/tools?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tools');
      const data = await res.json();
      setTools(data.tools ?? []);
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
    fetchTools();
  }, [fetchTools]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleInstall = async (toolId: string) => {
    if (!installAgent) return;
    try {
      setInstalling(toolId);
      const res = await fetch(`/api/installation/tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: installAgent, toolId }),
      });
      if (!res.ok) throw new Error('Install failed');
      await fetchTools();
      setExpandedTool(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  // Filter tools by search
  const filteredTools = tools.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.key.toLowerCase().includes(q)
    );
  });

  // Group by category
  const grouped = filteredTools.reduce<Record<string, Tool[]>>((acc, t) => {
    const cat = t.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const categories = ['all', ...new Set(tools.map((t) => t.category).filter(Boolean))];

  const getCatColor = (cat: string) => CATEGORY_COLORS[cat] ?? 'slate';
  const getRiskColor = (risk: string) => RISK_COLORS[risk] ?? 'slate';
  const RiskIcon = (risk: string) => RISK_ICONS[risk] ?? Shield;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading tools...</span>
      </div>
    );
  }

  if (error && tools.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchTools} className="border-slate-700 text-slate-300">
          <RefreshCw className="mr-1 size-3" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools..."
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
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tools list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
          <Wrench className="size-5" />
          <p className="text-xs">No tools found</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-260px)] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {Object.entries(grouped).map(([category, catTools]) => (
            <div key={category}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {category.replace('_', ' ')}
              </h3>
              <div className="space-y-1.5">
                {catTools.map((tool) => {
                  const RIcon = RiskIcon(tool.riskLevel);
                  return (
                    <div
                      key={tool.id}
                      className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-3 transition-colors hover:border-slate-600/50"
                    >
                      {/* Tool header */}
                      <button
                        className="flex w-full items-start gap-2 text-left"
                        onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
                      >
                        <Wrench className="mt-0.5 size-4 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-slate-200">{tool.name}</span>
                            <Badge
                              className={`bg-${getCatColor(tool.category)}-500/20 text-${getCatColor(tool.category)}-300 border-0 text-[9px] px-1.5 py-0`}
                            >
                              {tool.category.replace('_', ' ')}
                            </Badge>
                            <Badge
                              className={`bg-${getRiskColor(tool.riskLevel)}-500/20 text-${getRiskColor(tool.riskLevel)}-300 border-0 text-[9px] px-1.5 py-0`}
                            >
                              <RIcon className="mr-0.5 size-2.5" />
                              {tool.riskLevel}
                            </Badge>
                            {tool.requiresApproval && (
                              <Badge className="border-0 bg-amber-500/20 px-1.5 py-0 text-[9px] text-amber-300">
                                needs approval
                              </Badge>
                            )}
                            {!tool.enabled && (
                              <Badge className="border-0 bg-red-500/20 px-1.5 py-0 text-[9px] text-red-300">
                                disabled
                              </Badge>
                            )}
                          </div>
                          {tool.description && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{tool.description}</p>
                          )}
                        </div>
                        {expandedTool === tool.id ? (
                          <ChevronUp className="size-3.5 flex-shrink-0 text-slate-500" />
                        ) : (
                          <ChevronDown className="size-3.5 flex-shrink-0 text-slate-500" />
                        )}
                      </button>

                      {/* Expanded detail */}
                      {expandedTool === tool.id && (
                        <div className="mt-3 border-t border-slate-700/30 pt-3">
                          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                            <span>Key: <span className="text-slate-300">{tool.key}</span></span>
                            <span>Scope: <span className="text-slate-300">{tool.workspaceId ? 'Workspace' : 'Global'}</span></span>
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
                              onClick={() => handleInstall(tool.id)}
                              disabled={!installAgent || installing === tool.id}
                              className="h-7 bg-emerald-600/80 px-3 text-[10px] text-white hover:bg-emerald-600"
                            >
                              {installing === tool.id ? (
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && tools.length > 0 && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
