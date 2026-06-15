'use client';

// ─── PreviewPanel ────────────────────────────────────────────
// Live preview of a local project via iframe + child process.
// Polls /api/preview/status every 2s while running/starting.

import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PreviewState, PreviewLogEntry } from '@/lib/preview/types';

const POLL_INTERVAL_MS = 2000;
const DEFAULT_PATH = './preview';
const DEFAULT_PORT = 3100;

type ViewMode = 'preview' | 'logs' | 'errors';

// ── Status badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: PreviewState['status'] }) {
  const cfg: Record<string, { dot: string; text: string; label: string }> = {
    idle:        { dot: 'bg-slate-400', text: 'text-slate-500', label: 'Idle' },
    starting:    { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-600', label: 'Starting…' },
    running:     { dot: 'bg-emerald-400', text: 'text-emerald-600', label: 'Running' },
    stopping:    { dot: 'bg-orange-400 animate-pulse', text: 'text-orange-600', label: 'Stopping…' },
    stopped:     { dot: 'bg-slate-400', text: 'text-slate-500', label: 'Stopped' },
    error:       { dot: 'bg-red-500', text: 'text-red-600', label: 'Error' },
    port_in_use: { dot: 'bg-red-400', text: 'text-red-600', label: 'Port busy' },
  };
  const c = cfg[status] ?? cfg.idle;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Log line ──────────────────────────────────────────────────

function LogLine({ entry }: { entry: PreviewLogEntry }) {
  const time = new Date(entry.ts).toLocaleTimeString([], { hour12: false });
  const isErr = entry.stream === 'stderr';
  return (
    <div className={`flex gap-2 font-mono text-[10px] leading-4 ${isErr ? 'text-red-400' : 'text-slate-300'}`}>
      <span className="text-slate-600 shrink-0 w-[52px]">{time}</span>
      <span className="break-all">{entry.line}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function PreviewPanel() {
  const [state, setState] = useState<PreviewState | null>(null);
  const [logs, setLogs] = useState<PreviewLogEntry[]>([]);
  const [view, setView] = useState<ViewMode>('preview');
  const [projectPath, setProjectPath] = useState(DEFAULT_PATH);
  const [port, setPort] = useState(DEFAULT_PORT);
  const [loading, setLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ── Polling ────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/preview/status');
      if (res.ok) {
        const data = await res.json() as { ok: boolean; state: PreviewState };
        setState(data.state);
      }
    } catch {}
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/preview/logs?lastN=300');
      if (res.ok) {
        const data = await res.json() as { logs: PreviewLogEntry[] };
        setLogs(data.logs);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, [fetchStatus, fetchLogs]);

  // Poll while active
  useEffect(() => {
    const active = state?.status === 'running' || state?.status === 'starting' || state?.status === 'stopping';
    if (!active) return;
    const timer = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [state?.status, fetchStatus, fetchLogs]);

  // Auto-scroll logs
  useEffect(() => {
    if (view === 'logs' || view === 'errors') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, view]);

  // ── Actions ────────────────────────────────────────────────
  const handleStart = async () => {
    setLoading(true);
    try {
      await fetch('/api/preview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, port }),
      });
      await fetchStatus();
      await fetchLogs();
      setView('preview');
    } finally { setLoading(false); }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await fetch('/api/preview/stop', { method: 'POST' });
      await fetchStatus();
    } finally { setLoading(false); }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      await fetch('/api/preview/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, port }),
      });
      setIframeKey(k => k + 1);
      await fetchStatus();
      await fetchLogs();
    } finally { setLoading(false); }
  };

  // ── Derived ────────────────────────────────────────────────
  const status = state?.status ?? 'idle';
  const isRunning = status === 'running';
  const isStarting = status === 'starting';
  const isBusy = isStarting || status === 'stopping' || loading;
  const previewUrl = state?.url ?? `http://localhost:${port}`;
  const errorLogs = logs.filter(l => l.stream === 'stderr');

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-200">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-800 shrink-0 flex-wrap">
        {/* Status */}
        <StatusBadge status={status} />

        <div className="flex-1 min-w-0" />

        {/* Path input */}
        <Input
          value={projectPath}
          onChange={e => setProjectPath(e.target.value)}
          className="h-6 text-[10px] w-40 bg-slate-900 border-slate-700 text-slate-300 px-2"
          placeholder="./preview"
        />

        {/* Port input */}
        <Input
          value={String(port)}
          onChange={e => setPort(parseInt(e.target.value) || DEFAULT_PORT)}
          className="h-6 text-[10px] w-14 bg-slate-900 border-slate-700 text-slate-300 px-2"
          placeholder="3100"
          type="number"
        />

        {/* Controls */}
        {!isRunning && !isStarting && (
          <Button
            size="sm"
            className="h-6 px-2 text-[10px] bg-emerald-700 hover:bg-emerald-600"
            onClick={handleStart}
            disabled={isBusy}
          >
            ▶ Start
          </Button>
        )}
        {(isRunning || isStarting) && (
          <>
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-amber-700 hover:bg-amber-600"
              onClick={handleRestart}
              disabled={isBusy}
            >
              ↺ Restart
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-red-800 hover:bg-red-700"
              onClick={handleStop}
              disabled={isBusy}
            >
              ■ Stop
            </Button>
          </>
        )}
        {isRunning && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-sky-400 hover:text-sky-300 px-1"
          >
            ↗
          </a>
        )}

        {/* View switcher */}
        <div className="flex rounded overflow-hidden border border-slate-700">
          {(['preview', 'logs', 'errors'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[10px] px-2 py-0.5 capitalize ${view === v ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
            >
              {v === 'errors' ? `errors${errorLogs.length > 0 ? ` (${errorLogs.length})` : ''}` : v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error banner ── */}
      {state?.lastError && (
        <div className="px-3 py-1.5 bg-red-950/60 border-b border-red-900 text-red-400 text-[10px] shrink-0 font-mono">
          ✗ {state.lastError}
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* Preview iframe */}
        {view === 'preview' && (
          <div className="h-full flex flex-col">
            {isRunning ? (
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full flex-1 border-0"
                title="Preview"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <p className="text-3xl mb-3">👁️</p>
                  {isStarting ? (
                    <>
                      <p className="text-xs text-slate-400">Starting preview server…</p>
                      <p className="text-[10px] text-slate-600 mt-1">Waiting for port {port}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-400">Preview not running</p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        Set path to a local Next.js project and click Start
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs view */}
        {view === 'logs' && (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5 bg-slate-950">
              {logs.length === 0 ? (
                <p className="text-[10px] text-slate-600 italic p-2">No logs yet. Start the preview server first.</p>
              ) : (
                logs.map((entry, i) => <LogLine key={i} entry={entry} />)
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Errors view */}
        {view === 'errors' && (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5 bg-slate-950">
              {errorLogs.length === 0 ? (
                <p className="text-[10px] text-slate-600 italic p-2">No errors.</p>
              ) : (
                errorLogs.map((entry, i) => <LogLine key={i} entry={entry} />)
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        )}

      </div>
    </div>
  );
}
