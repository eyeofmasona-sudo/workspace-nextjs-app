'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Types ─────────────────────────────────────────────────────

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost' | 'archived';
type LeadSource = 'manual' | 'telegram' | 'email' | 'website' | 'instagram' | 'whatsapp' | 'referral';
type DealStage  = 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface FollowUp {
  id: string; date: string; note: string | null; done: boolean; doneAt: string | null;
  agentName: string | null;
}
interface ConversationMessage {
  id: string; content: string; direction: 'in' | 'out'; timestamp: string;
  agentName: string | null;
}
interface Conversation {
  id: string; platform: string;
  messages: ConversationMessage[];
}
interface Deal {
  id: string; title: string; value: number; currency: string; stage: DealStage; probability: number;
}
interface Lead {
  id: string; name: string; company: string | null; source: LeadSource; status: LeadStatus;
  phone: string | null; email: string | null; telegramHandle: string | null;
  score: number; notes: string | null; tags: string; assignedAgentId: string | null;
  lastMessageAt: string | null; nextFollowUpAt: string | null;
  createdAt: string; updatedAt: string;
  conversations?: Conversation[];
  deals?: Deal[];
  followUps?: FollowUp[];
  _count?: { conversations: number; followUps: number };
}

// ── Config ─────────────────────────────────────────────────────

const STATUS_CFG: Record<LeadStatus, { label: string; icon: string; color: string; border: string; bg: string }> = {
  new:       { label: 'New',       icon: '🆕', color: 'text-blue-700',    border: 'border-blue-200',    bg: 'bg-blue-50' },
  contacted: { label: 'Contacted', icon: '📞', color: 'text-amber-700',   border: 'border-amber-200',   bg: 'bg-amber-50' },
  qualified: { label: 'Qualified', icon: '✅', color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' },
  proposal:  { label: 'Proposal',  icon: '📄', color: 'text-purple-700',  border: 'border-purple-200',  bg: 'bg-purple-50' },
  won:       { label: 'Won',       icon: '🏆', color: 'text-yellow-700',  border: 'border-yellow-300',  bg: 'bg-yellow-50' },
  lost:      { label: 'Lost',      icon: '❌', color: 'text-red-600',     border: 'border-red-200',     bg: 'bg-red-50' },
  archived:  { label: 'Archived',  icon: '📦', color: 'text-slate-500',   border: 'border-slate-200',   bg: 'bg-slate-50' },
};

const SOURCE_ICONS: Record<LeadSource, string> = {
  manual: '✍️', telegram: '✈️', email: '📧', website: '🌐',
  instagram: '📸', whatsapp: '💬', referral: '🤝',
};

const BOARD_COLS: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const ALL_STATUSES = Object.keys(STATUS_CFG) as LeadStatus[];

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function relTime(dt: string | null): string {
  if (!dt) return '—';
  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function scoreColor(s: number) {
  if (s >= 70) return 'text-emerald-600 bg-emerald-50';
  if (s >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-red-500 bg-red-50';
}

// ── Lead card ─────────────────────────────────────────────────

function LeadCard({ lead, onOpen, onStatusChange }: {
  lead: Lead; onOpen: () => void; onStatusChange: (id: string, status: LeadStatus) => void;
}) {
  const sc = STATUS_CFG[lead.status];
  const tags = parseTags(lead.tags);
  const nextFu = lead.followUps?.find(f => !f.done);
  const fuDue = nextFu && new Date(nextFu.date) < new Date();

  return (
    <div onClick={onOpen}
      className={`rounded-lg border p-2.5 bg-white space-y-1.5 cursor-pointer hover:shadow-sm transition-shadow ${sc.border}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 truncate">{lead.name}</p>
          {lead.company && <p className="text-[9px] text-slate-400 truncate">{lead.company}</p>}
        </div>
        {lead.score > 0 && (
          <span className={`text-[9px] font-mono px-1 rounded ${scoreColor(lead.score)}`}>{lead.score}</span>
        )}
      </div>

      <div className="flex items-center gap-1 text-[9px] text-slate-400">
        <span>{SOURCE_ICONS[lead.source]}</span>
        <span>{lead.source}</span>
        {lead.phone && <span>· 📞</span>}
        {lead.email && <span>· 📧</span>}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {tags.slice(0, 3).map(t => (
            <span key={t} className="text-[9px] bg-slate-100 px-1 rounded text-slate-500">{t}</span>
          ))}
        </div>
      )}

      {fuDue && (
        <p className="text-[9px] text-red-600 font-medium">⏰ Follow-up overdue</p>
      )}
      {nextFu && !fuDue && (
        <p className="text-[9px] text-blue-600">
          📅 Follow-up: {new Date(nextFu.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </p>
      )}

      {lead.lastMessageAt && (
        <p className="text-[9px] text-slate-300">Last msg: {relTime(lead.lastMessageAt)}</p>
      )}

      {/* Quick status change */}
      <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
        {BOARD_COLS.filter(s => s !== lead.status).slice(0, 2).map(s => (
          <button key={s} onClick={() => onStatusChange(lead.id, s)}
            className={`text-[8px] px-1.5 py-0.5 rounded border ${STATUS_CFG[s].border} ${STATUS_CFG[s].color} ${STATUS_CFG[s].bg}`}>
            → {STATUS_CFG[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Lead Detail Drawer ────────────────────────────────────────

function LeadDetail({ lead, onClose, onUpdated }: {
  lead: Lead; onClose: () => void; onUpdated: () => void;
}) {
  const [fullLead, setFullLead] = useState<Lead>(lead);
  const [msgText, setMsgText] = useState('');
  const [fuDate, setFuDate] = useState('');
  const [fuNote, setFuNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [editNotes, setEditNotes] = useState(lead.notes ?? '');

  const reload = useCallback(async () => {
    const res = await fetch(`/api/crm/leads/${lead.id}`);
    if (res.ok) {
      const d = await res.json() as { lead: Lead };
      setFullLead(d.lead);
    }
  }, [lead.id]);

  useEffect(() => { reload(); }, [reload]);

  const changeStatus = async (status: LeadStatus) => {
    await fetch(`/api/crm/leads/${lead.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    reload(); onUpdated();
  };

  const sendMessage = async (direction: 'in' | 'out') => {
    if (!msgText.trim()) return;
    setSaving(true);
    await fetch(`/api/crm/leads/${lead.id}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: msgText, direction, agentName: direction === 'out' ? 'Agent' : lead.name }),
    });
    setMsgText('');
    await reload(); onUpdated();
    setSaving(false);
  };

  const addFollowUp = async () => {
    if (!fuDate) return;
    await fetch(`/api/crm/leads/${lead.id}/followups`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date(fuDate).toISOString(), note: fuNote || undefined }),
    });
    setFuDate(''); setFuNote('');
    await reload(); onUpdated();
  };

  const doneFollowUp = async (id: string) => {
    await fetch(`/api/crm/followups/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    await reload(); onUpdated();
  };

  const saveNotes = async () => {
    await fetch(`/api/crm/leads/${lead.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: editNotes }),
    });
    await reload();
  };

  const allMessages = (fullLead.conversations ?? []).flatMap(c => c.messages)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const pendingFollowUps = (fullLead.followUps ?? []).filter(f => !f.done).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const doneFollowUps   = (fullLead.followUps ?? []).filter(f => f.done);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b">
          <div>
            <p className="font-semibold text-sm text-slate-800">{fullLead.name}</p>
            {fullLead.company && <p className="text-[10px] text-slate-400">{fullLead.company}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${STATUS_CFG[fullLead.status].color} ${STATUS_CFG[fullLead.status].border} ${STATUS_CFG[fullLead.status].bg}`}>
              {STATUS_CFG[fullLead.status].icon} {STATUS_CFG[fullLead.status].label}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-5">

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {fullLead.phone && <div><span className="text-slate-400">Phone </span><span className="text-slate-700">{fullLead.phone}</span></div>}
              {fullLead.email && <div><span className="text-slate-400">Email </span><span className="text-slate-700">{fullLead.email}</span></div>}
              {fullLead.telegramHandle && <div><span className="text-slate-400">Telegram </span><span className="text-slate-700">@{fullLead.telegramHandle}</span></div>}
              <div><span className="text-slate-400">Source </span><span>{SOURCE_ICONS[fullLead.source]} {fullLead.source}</span></div>
              {fullLead.score > 0 && <div><span className="text-slate-400">Score </span><span className={`font-mono ${scoreColor(fullLead.score)} px-1 rounded`}>{fullLead.score}</span></div>}
            </div>

            {/* Status pipeline */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Pipeline</p>
              <div className="flex gap-1 flex-wrap">
                {BOARD_COLS.map(s => (
                  <button key={s} onClick={() => changeStatus(s)}
                    className={`text-[9px] px-2 py-1 rounded border transition-all ${
                      s === fullLead.status
                        ? `${STATUS_CFG[s].bg} ${STATUS_CFG[s].border} ${STATUS_CFG[s].color} font-semibold`
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}>
                    {STATUS_CFG[s].icon} {STATUS_CFG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</p>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} onBlur={saveNotes}
                className="w-full h-16 text-[10px] border border-slate-200 rounded p-2 resize-none text-slate-700"
                placeholder="Internal notes about this lead…" />
            </div>

            {/* Conversation history */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Conversation ({allMessages.length})
              </p>
              <div className="space-y-1.5 mb-2 max-h-48 overflow-y-auto">
                {allMessages.length === 0 && (
                  <p className="text-[10px] text-slate-300 italic">No messages yet</p>
                )}
                {allMessages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[10px] ${
                      m.direction === 'out'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {m.agentName && m.direction === 'out' && (
                        <p className="text-[8px] opacity-70 mb-0.5">{m.agentName}</p>
                      )}
                      <p>{m.content}</p>
                      <p className="text-[8px] opacity-60 mt-0.5">{relTime(m.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add message */}
              <div className="flex gap-1">
                <Input value={msgText} onChange={e => setMsgText(e.target.value)}
                  className="h-7 text-[10px] flex-1"
                  placeholder="Type a message…"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage('out'); } }}
                />
                <Button size="sm" className="h-7 px-2 text-[9px]" onClick={() => sendMessage('out')} disabled={saving || !msgText.trim()}>
                  Send ↑
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-[9px]" onClick={() => sendMessage('in')} disabled={saving || !msgText.trim()}>
                  ← In
                </Button>
              </div>
            </div>

            {/* Follow-ups */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Follow-ups ({pendingFollowUps.length} pending)
              </p>

              {pendingFollowUps.map(fu => {
                const overdue = new Date(fu.date) < new Date();
                return (
                  <div key={fu.id} className={`flex items-start gap-2 p-2 rounded border mb-1 ${overdue ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-medium ${overdue ? 'text-red-700' : 'text-slate-700'}`}>
                        {overdue ? '⏰ ' : '📅 '}
                        {new Date(fu.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {fu.note && <p className="text-[9px] text-slate-500 truncate">{fu.note}</p>}
                    </div>
                    <button onClick={() => doneFollowUp(fu.id)}
                      className="text-[9px] text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 shrink-0">
                      ✓ Done
                    </button>
                  </div>
                );
              })}

              {doneFollowUps.length > 0 && (
                <p className="text-[9px] text-slate-300 mt-1">{doneFollowUps.length} completed</p>
              )}

              {/* Add follow-up */}
              <div className="flex gap-1 mt-2">
                <Input type="datetime-local" value={fuDate} onChange={e => setFuDate(e.target.value)}
                  className="h-7 text-[10px] flex-1" />
                <Input value={fuNote} onChange={e => setFuNote(e.target.value)}
                  className="h-7 text-[10px] w-28" placeholder="Note…" />
                <Button size="sm" variant="outline" className="h-7 px-2 text-[9px]" onClick={addFollowUp} disabled={!fuDate}>
                  + Add
                </Button>
              </div>
            </div>

            {/* Deals */}
            {(fullLead.deals ?? []).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Deals</p>
                {fullLead.deals!.map(d => (
                  <div key={d.id} className="p-2 border border-slate-200 rounded text-[10px] flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-700">{d.title}</p>
                      <p className="text-slate-400">{d.stage} · {d.probability}%</p>
                    </div>
                    <span className="font-mono font-semibold text-slate-700">{d.currency} {d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── New Lead Modal ────────────────────────────────────────────

function NewLeadModal({ workspaceId, onClose, onCreated }: {
  workspaceId: string | null | undefined; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '', company: '', source: 'manual' as LeadSource,
    phone: '', email: '', telegramHandle: '',
    notes: '', firstMessage: '', platform: 'telegram',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch('/api/crm/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: workspaceId ?? 'default',
        name: form.name.trim(),
        company: form.company || undefined,
        source: form.source,
        phone: form.phone || undefined,
        email: form.email || undefined,
        telegramHandle: form.telegramHandle || undefined,
        notes: form.notes || undefined,
        firstMessage: form.firstMessage || undefined,
        platform: form.firstMessage ? form.platform : undefined,
      }),
    });
    setSaving(false);
    onCreated(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">New Lead</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Name *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)}
                className="mt-1 h-8 text-xs" placeholder="John Smith" />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Company</label>
              <Input value={form.company} onChange={e => set('company', e.target.value)}
                className="mt-1 h-8 text-xs" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)}
                className="mt-1 w-full h-8 text-xs border border-input rounded px-2">
                {(['manual','telegram','email','website','instagram','whatsapp','referral'] as LeadSource[]).map(s => (
                  <option key={s} value={s}>{SOURCE_ICONS[s]} {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="mt-1 h-8 text-xs" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Email</label>
              <Input value={form.email} onChange={e => set('email', e.target.value)}
                className="mt-1 h-8 text-xs" type="email" />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">First Message (optional)</label>
            <textarea value={form.firstMessage} onChange={e => set('firstMessage', e.target.value)}
              className="mt-1 w-full h-16 text-xs border border-input rounded p-2 resize-none"
              placeholder="Initial message from the lead…" />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving || !form.name.trim()} className="h-8 text-xs">
            {saving ? 'Creating…' : 'Create Lead'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main CRM Panel ────────────────────────────────────────────

export function CRMPanel({ workspaceId }: { workspaceId?: string | null }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workspaceId) params.set('workspaceId', workspaceId);
      if (filterStatus) params.set('status', filterStatus);
      if (filterSource) params.set('source', filterSource);
      params.set('limit', '200');
      const res = await fetch(`/api/crm/leads?${params}`);
      if (res.ok) {
        const d = await res.json() as { leads: Lead[] };
        setLeads(d.leads ?? []);
      }
    } finally { setLoading(false); }
  }, [workspaceId, filterStatus, filterSource]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: string, status: LeadStatus) => {
    await fetch(`/api/crm/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const grouped = BOARD_COLS.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const totalActive = leads.filter(l => !['lost','archived'].includes(l.status)).length;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-slate-50 shrink-0 flex-wrap">
        <span className="text-[10px] font-semibold text-slate-600">🎯 CRM</span>
        <span className="text-[10px] text-slate-400">{totalActive} active leads</span>
        <div className="flex-1" />

        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="h-6 text-[10px] border border-slate-200 rounded px-1 bg-white">
          <option value="">All sources</option>
          {(['telegram','email','website','instagram','whatsapp','referral','manual'] as LeadSource[]).map(s => (
            <option key={s} value={s}>{SOURCE_ICONS[s]} {s}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-6 text-[10px] border border-slate-200 rounded px-1 bg-white">
          <option value="">All statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].icon} {STATUS_CFG[s].label}</option>
          ))}
        </select>

        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={load} disabled={loading}>
          {loading ? '…' : '↺'}
        </Button>
        <Button size="sm" className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setShowNew(true)}>
          + Lead
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="flex gap-2 p-2 h-full" style={{ minWidth: `${BOARD_COLS.length * 190}px` }}>
          {BOARD_COLS.map(status => {
            const sc = STATUS_CFG[status];
            const col = filterStatus ? leads.filter(l => l.status === status) : (grouped[status] ?? []);
            return (
              <div key={status} className="flex-1 min-w-[175px] flex flex-col gap-1">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-t border ${sc.border} ${sc.bg}`}>
                  <span className="text-sm">{sc.icon}</span>
                  <span className={`text-[10px] font-semibold ${sc.color}`}>{sc.label}</span>
                  <span className={`ml-auto text-[9px] ${sc.color} opacity-70`}>{col.length}</span>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-1.5 pb-2">
                    {col.map(lead => (
                      <LeadCard key={lead.id} lead={lead}
                        onOpen={() => setSelectedLead(lead)}
                        onStatusChange={changeStatus} />
                    ))}
                    {col.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-slate-300">
                        No {sc.label.toLowerCase()} leads
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {selectedLead && (
        <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdated={load} />
      )}
      {showNew && (
        <NewLeadModal workspaceId={workspaceId} onClose={() => setShowNew(false)} onCreated={load} />
      )}
    </div>
  );
}
