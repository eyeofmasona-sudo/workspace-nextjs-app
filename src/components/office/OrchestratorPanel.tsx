// ─── Agent OS — OrchestratorPanel ────────────────────────────
// Chat-style panel for sending messages to the Orchestrator.

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, CheckCircle, AlertCircle, HelpCircle, ListChecks } from 'lucide-react';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import type { OfficeAgent } from '@/hooks/useOfficeData';

interface OrchestratorMessage {
  id: string;
  role: 'user' | 'system';
  content: string;
  type?: string;
  plan?: PlanPreview;
  timestamp: Date;
}

interface PlanPreview {
  goal: string;
  epics: Array<{ title: string; tasks: Array<{ title: string }> }>;
  estimatedCost: { level: string; estimatedUsd?: number };
  risks: string[];
}

interface OrchestratorPanelProps {
  workspaceId: string;
  agents: OfficeAgent[];
}

export function OrchestratorPanel({ workspaceId, agents }: OrchestratorPanelProps) {
  const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'manual' | 'balanced' | 'autonomous'>('balanced');
  const [loading, setLoading] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanPreview | null>(null);
  // C6: Ref-based double-submit guard — synchronous check prevents concurrent fetches
  // even when React batches state updates
  const submittingRef = useRef(false);

  const sendMessage = async () => {
    if (!input.trim() || loading || submittingRef.current) return;
    submittingRef.current = true;
    const msg = input.trim();
    setInput('');

    const userMsg: OrchestratorMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/orchestrator/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, message: msg, mode }),
      });
      const data = await res.json();

      const sysMsg: OrchestratorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: data.summary ?? 'No response',
        type: data.type,
        plan: data.plan,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, sysMsg]);

      if (data.type === 'plan_required' && data.plan) {
        setPendingPlan(data.plan);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          type: 'error',
          timestamp: new Date(),
        },
      ]);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const approvePlan = async () => {
    if (!pendingPlan || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/orchestrator/approve-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, plan: pendingPlan, createProject: true }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: data.summary ?? 'Plan approved',
          type: data.type,
          timestamp: new Date(),
        },
      ]);
      setPendingPlan(null);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `Approval error: ${err instanceof Error ? err.message : 'Unknown'}`,
          type: 'error',
          timestamp: new Date(),
        },
      ]);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const typeIcon = (type?: string) => {
    switch (type) {
      case 'plan_required': return <ListChecks className="w-3 h-3 text-amber-500" />;
      case 'task_started': return <CheckCircle className="w-3 h-3 text-emerald-500" />;
      case 'clarification_needed': return <HelpCircle className="w-3 h-3 text-blue-500" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">👑 Orchestrator</h3>
        <div className="flex gap-1">
          {(['manual', 'balanced', 'autonomous'] as const).map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setMode(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 mb-2">
        <div className="space-y-2 pr-2">
          {messages.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-xs">Send a message to the Orchestrator</p>
              <p className="text-[10px] mt-1">e.g. &quot;Build a dashboard for user analytics&quot;</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-primary/10 ml-6'
                  : 'bg-slate-50 mr-6'
              }`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                {msg.role === 'system' && typeIcon(msg.type)}
                <span className="text-[10px] text-muted-foreground">
                  {msg.role === 'user' ? 'You' : 'Orchestrator'}
                </span>
                {msg.type && msg.role === 'system' && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                    {msg.type}
                  </Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Plan preview */}
              {msg.plan && (
                <div className="mt-1.5 p-1.5 bg-white rounded border text-[10px]">
                  <p className="font-semibold">📋 Plan: {msg.plan.goal}</p>
                  <p className="text-muted-foreground">{msg.plan.epics.length} epic(s), Cost: {msg.plan.estimatedCost.level}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Pending plan approval */}
      {pendingPlan && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-medium text-amber-800 mb-1.5">Plan ready for approval</p>
          <Button size="sm" className="h-7 text-xs" onClick={approvePlan} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Approve Plan
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe a task..."
          className="min-h-[36px] max-h-[80px] text-xs resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <Button size="sm" onClick={sendMessage} disabled={loading || !input.trim()} className="h-9 self-end">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
