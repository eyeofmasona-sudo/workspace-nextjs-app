'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Loader2, RefreshCw, Download, Star, Store, Filter,
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

interface MarketplaceItem {
  id: string;
  type: string; // skill_pack | tool_pack | agent_template | workflow_template
  key: string;
  name: string;
  description: string;
  author: string;
  version: string;
  icon: string | null;
  color: string | null;
  category: string | null;
  tags: string | null;
  rating: number;
  reviewCount: number;
  installCount: number;
  status: string;
  featured: boolean;
  metadata: string | null;
}

// ─── Type config ────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  skill_pack: { label: 'Skill Pack', color: 'purple', icon: '🎯' },
  tool_pack: { label: 'Tool Pack', color: 'cyan', icon: '🔧' },
  agent_template: { label: 'Agent Template', color: 'emerald', icon: '🤖' },
  workflow_template: { label: 'Workflow', color: 'amber', icon: '🔄' },
};

// ─── Component ──────────────────────────────────────────────

export function MarketplaceTab() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [installing, setInstalling] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/marketplace?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch marketplace items');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleInstall = async (itemKey: string) => {
    try {
      setInstalling(itemKey);
      const res = await fetch(`/api/marketplace/${itemKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Install failed');
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  // Featured items
  const featured = items.filter((i) => i.featured);
  const regular = items.filter((i) => !i.featured);

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
      <span className="inline-flex items-center gap-px">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className="size-2.5 fill-amber-400 text-amber-400" />
        ))}
        {half > 0 && <Star className="size-2.5 fill-amber-400/50 text-amber-400" />}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="size-2.5 text-slate-600" />
        ))}
      </span>
    );
  };

  const renderItemCard = (item: MarketplaceItem) => {
    const tc = TYPE_CONFIG[item.type] ?? { label: item.type, color: 'slate', icon: '📦' };
    return (
      <div
        key={item.id}
        className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-3 transition-colors hover:border-slate-600/50"
      >
        <div className="flex items-start gap-2">
          <div
            className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${item.color ?? '#6366f1'}20` }}
          >
            <span className="text-sm leading-none">{item.icon || tc.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-slate-200">{item.name}</span>
              {item.featured && (
                <Badge className="border-0 bg-amber-500/20 px-1.5 py-0 text-[9px] text-amber-300">
                  ⭐ Featured
                </Badge>
              )}
              <Badge
                className={`bg-${tc.color}-500/20 text-${tc.color}-300 border-0 px-1.5 py-0 text-[9px]`}
              >
                {tc.label}
              </Badge>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{item.description}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-slate-500">
              <span>by {item.author}</span>
              <span className="flex items-center gap-0.5">
                {renderStars(item.rating)}
                <span className="ml-0.5 text-slate-500">({item.reviewCount})</span>
              </span>
              <span>
                <Download className="mr-0.5 inline size-2.5" />
                {item.installCount}
              </span>
              <span>v{item.version}</span>
            </div>
          </div>
        </div>
        <div className="mt-2 flex justify-end border-t border-slate-700/30 pt-2">
          <Button
            size="sm"
            onClick={() => handleInstall(item.key)}
            disabled={installing === item.key}
            className="h-7 bg-emerald-600/80 px-3 text-[10px] text-white hover:bg-emerald-600"
          >
            {installing === item.key ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Download className="mr-1 size-3" />
            )}
            Install
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading marketplace...</span>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchItems} className="border-slate-700 text-slate-300">
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
              placeholder="Search marketplace..."
              className="h-8 border-slate-700/50 bg-slate-800/30 pl-7 text-xs text-slate-200 placeholder:text-slate-500"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[140px] border-slate-700/50 bg-slate-800/30 text-xs text-slate-300">
              <Filter className="mr-1 size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-[#0f0f1a]">
              <SelectItem value="all" className="text-xs text-slate-300">All Types</SelectItem>
              <SelectItem value="skill_pack" className="text-xs text-slate-300">Skill Packs</SelectItem>
              <SelectItem value="tool_pack" className="text-xs text-slate-300">Tool Packs</SelectItem>
              <SelectItem value="agent_template" className="text-xs text-slate-300">Agent Templates</SelectItem>
              <SelectItem value="workflow_template" className="text-xs text-slate-300">Workflows</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
          <Store className="size-5" />
          <p className="text-xs">No marketplace items found</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-240px)] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {/* Featured */}
          {featured.length > 0 && (
            <div>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                ⭐ Featured
              </h3>
              <div className="space-y-2">
                {featured.map(renderItemCard)}
              </div>
            </div>
          )}

          {/* Regular */}
          {regular.length > 0 && (
            <div>
              {featured.length > 0 && (
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  All Items
                </h3>
              )}
              <div className="space-y-2">
                {regular.map(renderItemCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {error && items.length > 0 && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
