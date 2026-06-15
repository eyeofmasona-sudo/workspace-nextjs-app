'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Types ─────────────────────────────────────────────────────

type ContentStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published_manual' | 'rejected' | 'archived';
type Platform = 'instagram' | 'tiktok' | 'telegram' | 'twitter' | 'linkedin' | 'youtube' | 'whatsapp' | 'general';
type Format = 'image' | 'video' | 'text' | 'carousel' | 'reel' | 'story';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface ContentReview {
  id: string; agentName: string | null; status: string;
  score: number; riskLevel: string; notes: string | null; reviewedAt: string;
}

interface ContentItem {
  id: string; title: string; platform: Platform; format: Format;
  caption: string; script: string; hashtags: string;
  status: ContentStatus; scheduledAt: string | null; publishedAt: string | null;
  createdByAgentId: string | null; approvedByAgentId: string | null;
  riskLevel: RiskLevel; score: number; notes: string | null;
  createdAt: string; updatedAt: string;
  reviews?: ContentReview[];
}

// ── Config ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ContentStatus, { label: string; icon: string; bg: string; text: string; border: string }> = {
  draft:            { label: 'Draft',      icon: '✏️',  bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300' },
  in_review:        { label: 'In Review',  icon: '🔍',  bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-300' },
  approved:         { label: 'Approved',   icon: '✅',  bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-300' },
  scheduled:        { label: 'Scheduled',  icon: '📅',  bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-300' },
  published_manual: { label: 'Published',  icon: '🚀',  bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-300' },
  rejected:         { label: 'Rejected',   icon: '🚫',  bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-300' },
  archived:         { label: 'Archived',   icon: '📦',  bg: 'bg-gray-50',     text: 'text-gray-500',    border: 'border-gray-300' },
};

const RISK_DOT: Record<RiskLevel, string> = {
  low: 'bg-emerald-400', medium: 'bg-amber-400', high: 'bg-orange-500', critical: 'bg-red-500',
};

const PLATFORM_ICONS: Record<Platform, string> = {
  instagram: '📸', tiktok: '🎵', telegram: '✈️', twitter: '🐦',
  linkedin: '💼', youtube: '▶️', whatsapp: '💬', general: '🌐',
};

const BOARD_STATUSES: ContentStatus[] = ['draft', 'in_review', 'approved', 'scheduled', 'published_manual'];

// ── Helpers ───────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function fmt(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Content Item Card ─────────────────────────────────────────

function ContentCard({ item, onOpen, onMarkPublished, onSubmitReview }: {
  item: ContentItem;
  onOpen: (item: ContentItem) => void;
  onMarkPublished: (id: string) => void;
  onSubmitReview: (id: string) => void;
}) {
  const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
  const tags = parseTags(item.hashtags);
  const lastReview = item.reviews?.[0];

  return (
    <div className={`rounded-lg border p-2.5 bg-white space-y-1.5 cursor-pointer hover:shadow-sm transition-shadow ${sc.border}`}
      onClick={() => onOpen(item)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-1">
        <span className="text-[10px] text-slate-500">{PLATFORM_ICONS[item.platform]} {item.platform}</span>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[item.riskLevel]}`} title={`Risk: ${item.riskLevel}`} />
          {item.score > 0 && <span className="text-[9px] font-mono text-slate-400">{item.score}</span>}
        </div>
      </div>

      <p className="text-xs font-medium text-slate-800 line-clamp-2">{item.title}</p>

      {item.caption && (
        <p className="text-[10px] text-slate-500 line-clamp-2">{item.caption}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {tags.slice(0, 3).map(t => (
            <span key={t} className="text-[9px] bg-slate-100 px-1 rounded text-slate-500">#{t}</span>
          ))}
          {tags.length > 3 && <span className="text-[9px] text-slate-400">+{tags.length - 3}</span>}
        </div>
      )}

      {item.scheduledAt && (
        <p className="text-[9px] text-blue-600">📅 {fmt(item.scheduledAt)}</p>
      )}

      {lastReview && (
        <p className="text-[9px] text-slate-400">
          Reviewed by {lastReview.agentName ?? 'agent'} · {fmt(lastReview.reviewedAt)}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 pt-0.5" onClick={e => e.stopPropagation()}>
        {item.status === 'approved' || item.status === 'scheduled' ? (
          <Button size="sm" className="h-5 px-2 text-[9px] bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => onMarkPublished(item.id)}>
            🚀 Mark Published
          </Button>
        ) : null}
        {item.status === 'draft' && (
          <Button size="sm" variant="outline" className="h-5 px-2 text-[9px]"
            onClick={() => onSubmitReview(item.id)}>
            → Submit for Review
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Create/Edit Modal ─────────────────────────────────────────

function ContentModal({ item, workspaceId, onClose, onSaved }: {
  item: ContentItem | null;
  workspaceId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    title:       item?.title ?? '',
    platform:    (item?.platform ?? 'instagram') as Platform,
    format:      (item?.format ?? 'text') as Format,
    caption:     item?.caption ?? '',
    script:      item?.script ?? '',
    hashtags:    parseTags(item?.hashtags ?? '[]').join(', '),
    scheduledAt: item?.scheduledAt ? item.scheduledAt.slice(0, 16) : '',
    notes:       item?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const tags = form.hashtags.split(/[,\s]+/).filter(Boolean);
    const body = {
      ...form,
      hashtags: tags,
      workspaceId: workspaceId ?? 'default',
      scheduledAt: form.scheduledAt || undefined,
    };
    const url = isEdit ? `/api/marketing/content/${item!.id}` : '/api/marketing/content';
    const method = isEdit ? 'PATCH' : 'POST';
    try {
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">{isEdit ? 'Edit Content' : 'New Content'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Title *</label>
              <Input value={form.title} onChange={e => set('title', e.target.value)}
                className="mt-1 h-8 text-xs" placeholder="Weekly product update post" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Platform</label>
                <select value={form.platform} onChange={e => set('platform', e.target.value)}
                  className="mt-1 w-full h-8 text-xs border border-input rounded px-2">
                  {(['instagram','tiktok','telegram','twitter','linkedin','youtube','whatsapp','general'] as Platform[]).map(p => (
                    <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Format</label>
                <select value={form.format} onChange={e => set('format', e.target.value)}
                  className="mt-1 w-full h-8 text-xs border border-input rounded px-2">
                  {(['text','image','video','carousel','reel','story'] as Format[]).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Caption / Post Text</label>
              <textarea value={form.caption} onChange={e => set('caption', e.target.value)}
                className="mt-1 w-full h-28 text-xs border border-input rounded p-2 resize-none"
                placeholder="Write your post caption here…" />
            </div>

            {(form.format === 'video' || form.format === 'reel') && (
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Script</label>
                <textarea value={form.script} onChange={e => set('script', e.target.value)}
                  className="mt-1 w-full h-20 text-xs border border-input rounded p-2 resize-none"
                  placeholder="Video script / voiceover text…" />
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Hashtags (comma-separated)</label>
              <Input value={form.hashtags} onChange={e => set('hashtags', e.target.value)}
                className="mt-1 h-8 text-xs" placeholder="agentOS, automation, ai" />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Schedule Date/Time</label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)}
                className="mt-1 h-8 text-xs" />
            </div>

            {form.format !== 'text' && (
              <div className="rounded border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400">
                📎 Media upload (image/video) — coming with platform integrations
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Notes</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)}
                className="mt-1 h-8 text-xs" placeholder="Internal notes…" />
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 justify-end px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving || !form.title.trim()} className="h-8 text-xs">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────

export function ContentCalendarPanel({ workspaceId }: { workspaceId?: string | null }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [modal, setModal] = useState<ContentItem | null | 'new'>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workspaceId) params.set('workspaceId', workspaceId);
      if (filterStatus)   params.set('status', filterStatus);
      if (filterPlatform) params.set('platform', filterPlatform);
      params.set('limit', '100');
      const res = await fetch(`/api/marketing/content?${params}`);
      if (res.ok) {
        const data = await res.json() as { items: ContentItem[] };
        setItems(data.items ?? []);
      }
    } finally { setLoading(false); }
  }, [workspaceId, filterStatus, filterPlatform]);

  useEffect(() => { load(); }, [load]);

  const markPublished = async (id: string) => {
    await fetch(`/api/marketing/content/${id}/mark-published`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishedBy: 'manual' }),
    });
    load();
  };

  const submitReview = async (id: string) => {
    await fetch(`/api/marketing/content/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_review' }),
    });
    load();
  };

  // Group by status for board view
  const grouped = BOARD_STATUSES.reduce((acc, st) => {
    acc[st] = items.filter(i => i.status === st);
    return acc;
  }, {} as Record<ContentStatus, ContentItem[]>);

  const totalVisible = items.filter(i => i.status !== 'archived').length;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-slate-50 shrink-0 flex-wrap">
        <span className="text-[10px] font-semibold text-slate-600">📅 Content Calendar</span>
        <span className="text-[10px] text-slate-400">{totalVisible} items</span>
        <div className="flex-1" />

        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
          className="h-6 text-[10px] border border-slate-200 rounded px-1 bg-white">
          <option value="">All platforms</option>
          {(['instagram','tiktok','telegram','twitter','linkedin','youtube','whatsapp'] as Platform[]).map(p => (
            <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-6 text-[10px] border border-slate-200 rounded px-1 bg-white">
          <option value="">All statuses</option>
          {BOARD_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={load} disabled={loading}>
          {loading ? '…' : '↺'}
        </Button>
        <Button size="sm" className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setModal('new')}>
          + New Post
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="flex gap-2 p-2 h-full" style={{ minWidth: `${BOARD_STATUSES.length * 200}px` }}>
          {BOARD_STATUSES.map(status => {
            const sc = STATUS_CONFIG[status];
            const col = filterStatus ? items.filter(i => i.status === status) : (grouped[status] ?? []);
            return (
              <div key={status} className="flex-1 min-w-[180px] flex flex-col gap-1">
                {/* Column header */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-t border ${sc.border} ${sc.bg}`}>
                  <span className="text-sm">{sc.icon}</span>
                  <span className={`text-[10px] font-semibold ${sc.text}`}>{sc.label}</span>
                  <span className={`ml-auto text-[9px] ${sc.text} opacity-70`}>{col.length}</span>
                </div>

                {/* Column items */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-1.5 pb-2">
                    {col.map(item => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        onOpen={i => setModal(i)}
                        onMarkPublished={markPublished}
                        onSubmitReview={submitReview}
                      />
                    ))}
                    {col.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-slate-300">
                        No {sc.label.toLowerCase()} posts
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ContentModal
          item={modal === 'new' ? null : modal}
          workspaceId={workspaceId}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
