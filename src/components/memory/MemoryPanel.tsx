'use client';

// ─── MemoryPanel ──────────────────────────────────────────────
// Knowledge Base / Shared Memory panel for the SplitWorkspacePanel.
// Shows all memory items with filtering, search, and delete.

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Types ─────────────────────────────────────────────────────

interface MemoryItem {
  id: string;
  workspaceId: string | null;
  projectId: string | null;
  agentId: string | null;
  type: string;
  title: string;
  content: string;
  tags: string[];
  importance: string;
  confidence: number;
  visibility: string;
  conflictIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Config ────────────────────────────────────────────────────

const IMPORTANCE_CONFIG: Record<string, { dot: string; label: string; text: string }> = {
  critical: { dot: 'bg-red-500',    label: 'Critical', text: 'text-red-700' },
  high:     { dot: 'bg-orange-400', label: 'High',     text: 'text-orange-700' },
  medium:   { dot: 'bg-amber-400',  label: 'Medium',   text: 'text-amber-700' },
  low:      { dot: 'bg-slate-400',  label: 'Low',      text: 'text-slate-500' },
};

const TYPE_ICONS: Record<string, string> = {
  decision: '⚖️', architecture: '🏗️', bug: '🐛', brand_rule: '🛡️',
  task_result: '✅', fact: '📋', risk: '⚠️', lead_note: '🎯',
  workflow_note: '📝', file_reference: '📁', user_preference: '👤',
  context: '📖', lesson: '💡', error: '❌', conversation_summary: '💬',
};

const ALL_TYPES = Object.keys(TYPE_ICONS);

// ── Memory item card ──────────────────────────────────────────

function MemoryCard({ item, onDelete, onExpand }: {
  item: MemoryItem;
  onDelete: (id: string) => void;
  onExpand: (item: MemoryItem) => void;
}) {
  const imp = IMPORTANCE_CONFIG[item.importance] ?? IMPORTANCE_CONFIG.medium;

  return (
    <div className={`border rounded p-2 text-xs space-y-1 ${item.conflictIds.length > 0 ? 'border-yellow-300 bg-yellow-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span>{TYPE_ICONS[item.type] ?? '📌'}</span>
          <button
            onClick={() => onExpand(item)}
            className="font-medium text-slate-800 hover:text-blue-600 truncate text-left"
          >
            {item.title || `[${item.type}]`}
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`flex items-center gap-0.5 text-[9px] ${imp.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />
            {imp.label}
          </span>
          <span className="text-[9px] text-slate-400">{Math.round(item.confidence * 100)}%</span>
          <button
            onClick={() => onDelete(item.id)}
            className="text-[10px] text-red-400 hover:text-red-600 ml-1"
            title="Forget this memory"
          >
            ×
          </button>
        </div>
      </div>

      <p className="text-slate-600 line-clamp-2 leading-relaxed">
        {item.content.slice(0, 150)}{item.content.length > 150 ? '…' : ''}
      </p>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 5).map(tag => (
            <span key={tag} className="px-1 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px]">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[9px] text-slate-400">
        <span>{new Date(item.createdAt).toLocaleString()}</span>
        {item.agentId && <span>· {item.agentId}</span>}
        {item.conflictIds.length > 0 && (
          <span className="text-yellow-600">⚠ {item.conflictIds.length} conflict{item.conflictIds.length > 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────

function MemoryDetail({ item, onClose, onDelete }: {
  item: MemoryItem;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="absolute inset-0 bg-white z-10 p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-700">
          {TYPE_ICONS[item.type] ?? '📌'} {item.title || item.type}
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <pre className="text-[10px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
          {item.content}
        </pre>
      </ScrollArea>
      <div className="mt-2 pt-2 border-t space-y-1">
        <div className="flex flex-wrap gap-1">
          {item.tags.map(t => <span key={t} className="text-[9px] bg-slate-100 px-1 rounded">#{t}</span>)}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-400">
            {item.type} · {item.importance} · {item.visibility} · {Math.round(item.confidence * 100)}% confidence
          </span>
          <button
            onClick={() => { onDelete(item.id); onClose(); }}
            className="text-[10px] text-red-500 hover:text-red-700"
          >
            🗑 Forget
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────

export function MemoryPanel({ workspaceId }: { workspaceId?: string | null }) {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterImportance, setFilterImportance] = useState('');
  const [expandedItem, setExpandedItem] = useState<MemoryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workspaceId) params.set('workspaceId', workspaceId);
      if (query) params.set('q', query);
      if (filterType) params.set('types', filterType);
      if (filterImportance) params.set('importance', filterImportance);
      params.set('limit', '50');

      const res = await fetch(`/api/memory/items?${params}`);
      if (res.ok) {
        const data = await res.json() as { items: MemoryItem[] };
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, query, filterType, filterImportance]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/memory/items/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const conflicts = items.filter(i => i.conflictIds.length > 0);

  return (
    <div className="h-full flex flex-col relative">
      {/* Detail overlay */}
      {expandedItem && (
        <MemoryDetail
          item={expandedItem}
          onClose={() => setExpandedItem(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-slate-50 shrink-0 flex-wrap">
        <span className="text-[10px] font-semibold text-slate-600">🧠 Knowledge Base</span>
        <span className="text-[10px] text-slate-400">{items.length} items</span>
        {conflicts.length > 0 && (
          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded">
            ⚠ {conflicts.length} conflicts
          </span>
        )}

        <div className="flex-1 min-w-0" />

        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="h-6 text-[10px] w-28 bg-white border-slate-200 px-2"
        />

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="h-6 text-[10px] border border-slate-200 rounded px-1 bg-white"
        >
          <option value="">All types</option>
          {ALL_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
          ))}
        </select>

        <select
          value={filterImportance}
          onChange={e => setFilterImportance(e.target.value)}
          className="h-6 text-[10px] border border-slate-200 rounded px-1 bg-white"
        >
          <option value="">All importance</option>
          {['critical', 'high', 'medium', 'low'].map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>

        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px]"
          onClick={load}
          disabled={loading}
        >
          {loading ? '…' : '↺'}
        </Button>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1.5">
          {items.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🧠</p>
              <p className="text-xs text-slate-400">No memories yet</p>
              <p className="text-[10px] text-slate-300 mt-1">
                Agents automatically save decisions, facts, and brand rules here
              </p>
            </div>
          )}
          {items.map(item => (
            <MemoryCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onExpand={setExpandedItem}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
