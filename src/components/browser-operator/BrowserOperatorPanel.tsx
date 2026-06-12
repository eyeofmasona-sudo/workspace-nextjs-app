'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Globe, Monitor, AlertTriangle, Copy, RefreshCw, Play, RotateCcw,
  Camera, ChevronDown, ChevronUp, Plus, X, Loader2, Clock, FileText,
  CheckCircle2, XCircle, Ban, Hourglass,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// ─── Types ────────────────────────────────────────────────────

interface BrowserLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  step?: number;
}

interface BrowserTaskInput {
  provider: string;
  prompt: string;
  url?: string;
  mode: 'navigate' | 'extract' | 'interact' | 'automate';
  agentId?: string;
  taskId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  options?: Record<string, unknown>;
}

interface BrowserTaskOutput {
  status: 'queued' | 'running' | 'completed' | 'failed' | 'needs_human' | 'cancelled';
  provider: string;
  result?: string;
  error?: string;
  screenshots: string[];
  logs: BrowserLogEntry[];
  needsHumanReason?: string;
  finalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface BrowserTask {
  id: string;
  input: BrowserTaskInput;
  output: BrowserTaskOutput;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface TaskStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  needsHuman: number;
  cancelled: number;
  activeConcurrent: number;
}

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  active: boolean;
  currentUrl?: string;
  sessionCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────

const STATUS_BADGE_COLORS: Record<string, string> = {
  queued: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  running: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  needs_human: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Hourglass className="w-3 h-3" />,
  running: <Loader2 className="w-3 h-3 animate-spin" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  needs_human: <AlertTriangle className="w-3 h-3" />,
  cancelled: <Ban className="w-3 h-3" />,
};

function truncate(str: string | undefined, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function relativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  } catch {
    return dateStr;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
      title="Copy"
    >
      {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Task Card ────────────────────────────────────────────────

function TaskCard({
  task,
  onRetry,
  onResume,
  onScreenshot,
  onViewScreenshots,
}: {
  task: BrowserTask;
  onRetry: (id: string) => void;
  onResume: (id: string) => void;
  onScreenshot: (id: string) => void;
  onViewScreenshots: (task: BrowserTask) => void;
}) {
  const [logsOpen, setLogsOpen] = useState(false);
  const status = task.output.status;
  const badgeColor = STATUS_BADGE_COLORS[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  const statusIcon = STATUS_ICONS[status];

  return (
    <Card className="bg-slate-800/30 border-slate-700/40 rounded-lg">
      <CardContent className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-mono text-[10px] text-slate-500 shrink-0">
              {truncate(task.id, 8)}
            </span>
            <CopyButton text={task.id} />
            <Badge className={`${badgeColor} text-[9px] h-4 px-1.5 border shrink-0`}>
              {statusIcon}
              <span className="ml-0.5">{status}</span>
            </Badge>
            <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/20 text-[9px] h-4 px-1.5 border shrink-0">
              {task.input.provider}
            </Badge>
            {task.input.agentId && (
              <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/20 text-[9px] h-4 px-1.5 border shrink-0">
                {truncate(task.input.agentId, 8)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {status === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] text-red-300 hover:text-red-200 hover:bg-red-500/10"
                onClick={() => onRetry(task.id)}
                title="Retry"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
            {status === 'needs_human' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                onClick={() => onResume(task.id)}
                title="Resume"
              >
                <Play className="w-3 h-3" />
              </Button>
            )}
            {status === 'running' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] text-blue-300 hover:text-blue-200 hover:bg-blue-500/10"
                onClick={() => onScreenshot(task.id)}
                title="Screenshot"
              >
                <Camera className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Prompt</span>
          <p className="text-[11px] text-slate-300 mt-0.5">{truncate(task.input.prompt, 100)}</p>
        </div>

        {/* Mode & URL */}
        <div className="flex items-center gap-2 text-[10px]">
          <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/30 text-[8px] h-3.5 px-1 border">
            {task.input.mode}
          </Badge>
          {task.input.url && (
            <span className="text-slate-500 truncate max-w-[200px]">{task.input.url}</span>
          )}
          {task.input.priority && task.input.priority !== 'normal' && (
            <Badge className={`text-[8px] h-3.5 px-1 border ${
              task.input.priority === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : task.input.priority === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
            }`}>
              {task.input.priority}
            </Badge>
          )}
        </div>

        {/* Result */}
        {task.output.result && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Result</span>
              <CopyButton text={task.output.result} />
            </div>
            <p className="text-[10px] text-emerald-300/80 mt-0.5 whitespace-pre-wrap">{truncate(task.output.result, 200)}</p>
          </div>
        )}

        {/* Error */}
        {task.output.error && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
            <span className="text-[9px] text-red-400 uppercase tracking-wider">Error</span>
            <p className="text-[10px] text-red-300 mt-0.5">{truncate(task.output.error, 200)}</p>
          </div>
        )}

        {/* needsHumanReason */}
        {task.output.needsHumanReason && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-1 mb-0.5">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] text-amber-400 uppercase tracking-wider">Needs Human</span>
            </div>
            <p className="text-[10px] text-amber-300">{task.output.needsHumanReason}</p>
          </div>
        )}

        {/* Screenshots & Logs row */}
        <div className="flex items-center gap-2">
          {task.output.screenshots.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px] text-violet-300 hover:text-violet-200 hover:bg-violet-500/10 gap-1"
              onClick={() => onViewScreenshots(task)}
            >
              <Camera className="w-3 h-3" />
              {task.output.screenshots.length} screenshot{task.output.screenshots.length !== 1 ? 's' : ''}
            </Button>
          )}
          {task.output.logs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px] text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 gap-1"
              onClick={() => setLogsOpen(!logsOpen)}
            >
              <FileText className="w-3 h-3" />
              {task.output.logs.length} log{task.output.logs.length !== 1 ? 's' : ''}
              {logsOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </Button>
          )}
          <span className="text-[9px] text-slate-600 ml-auto flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {relativeTime(task.createdAt)}
          </span>
        </div>

        {/* Collapsible Logs */}
        {logsOpen && task.output.logs.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded bg-slate-900/50 border border-slate-700/30 p-2 space-y-1 custom-scrollbar">
            {task.output.logs.map((log, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[9px]">
                <span className={`shrink-0 font-mono ${
                  log.level === 'error' ? 'text-red-400'
                    : log.level === 'warn' ? 'text-amber-400'
                    : log.level === 'debug' ? 'text-slate-600'
                    : 'text-slate-500'
                }`}>
                  [{log.level}]
                </span>
                {log.step !== undefined && (
                  <span className="text-slate-600 shrink-0">s{log.step}</span>
                )}
                <span className="text-slate-400 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Provider Card ────────────────────────────────────────────

function ProviderCard({ provider }: { provider: ProviderInfo }) {
  return (
    <Card className="bg-slate-800/30 border-slate-700/40 rounded-lg">
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-medium text-slate-300">{provider.name}</span>
            <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/30 text-[8px] h-3.5 px-1 border">
              {provider.id}
            </Badge>
          </div>
          <Badge className={`text-[9px] h-4 px-1.5 border ${
            provider.active
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
          }`}>
            {provider.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {provider.currentUrl && (
          <p className="text-[10px] text-slate-500 truncate">
            <Globe className="w-2.5 h-2.5 inline mr-1" />
            {provider.currentUrl}
          </p>
        )}
        <p className="text-[10px] text-slate-500">
          Sessions: {provider.sessionCount}
        </p>
        {provider.description && (
          <p className="text-[9px] text-slate-600">{provider.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Screenshot Viewer ────────────────────────────────────────

function ScreenshotViewer({
  screenshots,
  onClose,
}: {
  screenshots: string[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(0);

  if (screenshots.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-8 right-0 text-slate-400 hover:text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        <img
          src={`/api/browser-operator/screenshots/${screenshots[selected]}`}
          alt={`Screenshot ${selected + 1}`}
          className="w-full rounded-lg border border-slate-700/50"
        />
        {screenshots.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {screenshots.map((ss, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`w-8 h-8 rounded border ${
                  i === selected ? 'border-violet-400 bg-violet-500/20' : 'border-slate-700 bg-slate-800/50'
                } flex items-center justify-center text-[9px] text-slate-400 hover:border-slate-500`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Task Form ────────────────────────────────────────────

function NewTaskForm({
  providers,
  onSubmit,
  submitting,
}: {
  providers: ProviderInfo[];
  onSubmit: (data: {
    provider: string;
    prompt: string;
    mode: string;
    url?: string;
    priority: string;
  }) => void;
  submitting: boolean;
}) {
  const [provider, setProvider] = useState(providers[0]?.id || 'custom');
  const [mode, setMode] = useState('navigate');
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [priority, setPriority] = useState('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit({
      provider,
      prompt: prompt.trim(),
      mode,
      url: url.trim() || undefined,
      priority,
    });
    setPrompt('');
    setUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-slate-800/20 border border-slate-700/30 rounded-lg">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-slate-400">Provider</Label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full mt-1 bg-slate-800/60 border border-slate-700/50 rounded-md px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-violet-500/50"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
            {providers.length === 0 && <option value="custom">custom</option>}
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-slate-400">Mode</Label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full mt-1 bg-slate-800/60 border border-slate-700/50 rounded-md px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="navigate">Navigate</option>
            <option value="extract">Extract</option>
            <option value="interact">Interact</option>
            <option value="automate">Automate</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-slate-400">URL (optional)</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="mt-1 bg-slate-800/60 border-slate-700/50 text-slate-300 text-[11px] h-7 placeholder:text-slate-600"
          />
        </div>
        <div>
          <Label className="text-[10px] text-slate-400">Priority</Label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full mt-1 bg-slate-800/60 border border-slate-700/50 rounded-md px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div>
        <Label className="text-[10px] text-slate-400">Prompt</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what the browser should do..."
          className="mt-1 bg-slate-800/60 border-slate-700/50 text-slate-300 text-[11px] min-h-[60px] resize-none placeholder:text-slate-600"
          rows={3}
        />
      </div>
      <Button
        type="submit"
        disabled={submitting || !prompt.trim()}
        className="w-full bg-violet-600 hover:bg-violet-500 text-white text-[11px] h-7"
      >
        {submitting ? (
          <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Submitting...</>
        ) : (
          <><Plus className="w-3 h-3 mr-1" /> Submit Task</>
        )}
      </Button>
    </form>
  );
}

// ─── Manual Takeover Section ──────────────────────────────────

function ManualTakeoverSection({
  tasks,
  onResume,
}: {
  tasks: BrowserTask[];
  onResume: (id: string) => void;
}) {
  const needsHumanTasks = tasks.filter((t) => t.output.status === 'needs_human');
  if (needsHumanTasks.length === 0) return null;

  return (
    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-medium text-amber-300">
          Manual intervention required
        </span>
        <Badge className="bg-amber-500/20 text-amber-300 text-[9px] h-4 px-1.5 border border-amber-500/30">
          {needsHumanTasks.length} task{needsHumanTasks.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      {needsHumanTasks.map((task) => (
        <div key={task.id} className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-slate-500">{truncate(task.id, 8)}</span>
            <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/20 text-[8px] h-3.5 px-1 border">
              {task.input.provider}
            </Badge>
          </div>
          {task.output.needsHumanReason && (
            <p className="text-[10px] text-amber-300">{task.output.needsHumanReason}</p>
          )}
          {/* Last screenshot thumbnail */}
          {task.output.screenshots.length > 0 && (
            <img
              src={`/api/browser-operator/screenshots/${task.output.screenshots[task.output.screenshots.length - 1]}`}
              alt="Last screenshot"
              className="w-full max-h-32 object-cover rounded border border-slate-700/50 opacity-80"
            />
          )}
          <p className="text-[9px] text-slate-500">
            Complete login/CAPTCHA/2FA manually in the opened browser, then click Resume.
          </p>
          <Button
            size="sm"
            className="h-6 text-[10px] bg-amber-600 hover:bg-amber-500 text-white gap-1"
            onClick={() => onResume(task.id)}
          >
            <Play className="w-3 h-3" /> Resume
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Main Panel Component ─────────────────────────────────────

export function BrowserOperatorPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tasks, setTasks] = useState<BrowserTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewScreenshots, setViewScreenshots] = useState<BrowserTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialFetchRef = useRef(false);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [tasksRes, providersRes] = await Promise.all([
        fetch('/api/browser-operator/tasks'),
        fetch('/api/browser-operator/providers'),
      ]);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
        setStats(tasksData.stats || null);
      }
      if (providersRes.ok) {
        const providersData = await providersRes.json();
        setProviders(providersData.providers || []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial fetch when panel opens + auto-refresh interval
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      initialFetchRef.current = false;
      return;
    }
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchData(true);
    }
    intervalRef.current = setInterval(() => fetchData(false), 5000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    setRefreshing(false);
  };

  const handleSubmitTask = async (data: {
    provider: string;
    prompt: string;
    mode: string;
    url?: string;
    priority: string;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/browser-operator/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchData();
        setNewTaskOpen(false);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to submit task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit task');
    }
    setSubmitting(false);
  };

  const handleRetry = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/browser-operator/tasks/${id}/retry`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleResume = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/browser-operator/tasks/${id}/resume`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleScreenshot = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/browser-operator/tasks/${id}/screenshot`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const needsHumanTasks = tasks.filter((t) => t.output.status === 'needs_human');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="bg-[#0f0f1a] border-slate-700/50 w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-slate-200">
              <Globe className="w-4 h-4 text-violet-400" />
              <span>Browser Operator</span>
              {stats && (
                <Badge className="bg-slate-700/30 text-slate-400 text-[9px] h-4 px-1.5 border border-slate-600/30">
                  {stats.total} task{stats.total !== 1 ? 's' : ''}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 w-6 p-0 text-slate-500 hover:text-slate-300"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {/* Error banner */}
            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-[10px] text-red-300">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-5 w-5 p-0 text-red-400 hover:text-red-300"
                  onClick={() => setError(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Manual Takeover (if any needs_human) */}
            <ManualTakeoverSection tasks={tasks} onResume={handleResume} />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-800/50 border border-slate-700/30 h-7 p-0.5">
                <TabsTrigger
                  value="tasks"
                  className="text-[10px] h-6 px-2 data-[state=active]:bg-slate-700/50 data-[state=active]:text-slate-200"
                >
                  Tasks
                  {stats && stats.total > 0 && (
                    <span className="ml-1 text-[9px] text-slate-500">({stats.total})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="providers"
                  className="text-[10px] h-6 px-2 data-[state=active]:bg-slate-700/50 data-[state=active]:text-slate-200"
                >
                  Providers
                  <span className="ml-1 text-[9px] text-slate-500">({providers.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-2 mt-2">
                {/* New Task toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-6 text-[10px] text-violet-300 hover:text-violet-200 hover:bg-violet-500/10 gap-1 border border-dashed border-slate-700/50"
                  onClick={() => setNewTaskOpen(!newTaskOpen)}
                >
                  {newTaskOpen ? (
                    <><ChevronUp className="w-3 h-3" /> Hide Form</>
                  ) : (
                    <><Plus className="w-3 h-3" /> New Task</>
                  )}
                </Button>

                {newTaskOpen && (
                  <NewTaskForm
                    providers={providers}
                    onSubmit={handleSubmitTask}
                    submitting={submitting}
                  />
                )}

                {/* Stats bar */}
                {stats && stats.total > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap px-1">
                    {[
                      { label: 'queued', count: stats.queued },
                      { label: 'running', count: stats.running },
                      { label: 'completed', count: stats.completed },
                      { label: 'failed', count: stats.failed },
                      { label: 'needs_human', count: stats.needsHuman },
                      { label: 'cancelled', count: stats.cancelled },
                    ].filter((s) => s.count > 0).map((s) => (
                      <Badge
                        key={s.label}
                        className={`${STATUS_BADGE_COLORS[s.label] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'} text-[8px] h-3.5 px-1 border`}
                      >
                        {s.label}: {s.count}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Task list */}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-[11px] text-slate-500">No browser tasks yet</p>
                    <p className="text-[9px] text-slate-600 mt-1">
                      Submit a task to start browser automation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onRetry={handleRetry}
                        onResume={handleResume}
                        onScreenshot={handleScreenshot}
                        onViewScreenshots={(t) => setViewScreenshots(t)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="providers" className="space-y-2 mt-2">
                {providers.length === 0 ? (
                  <div className="text-center py-8">
                    <Monitor className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-[11px] text-slate-500">No providers registered</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {providers.map((provider) => (
                      <ProviderCard key={provider.id} provider={provider} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Needs human count in footer */}
            {needsHumanTasks.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] text-amber-300">
                    {needsHumanTasks.length} task{needsHumanTasks.length !== 1 ? 's' : ''} need human intervention
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[9px] text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                  onClick={() => setActiveTab('tasks')}
                >
                  View
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Screenshot viewer overlay */}
      {viewScreenshots && viewScreenshots.output.screenshots.length > 0 && (
        <ScreenshotViewer
          screenshots={viewScreenshots.output.screenshots}
          onClose={() => setViewScreenshots(null)}
        />
      )}
    </>
  );
}
