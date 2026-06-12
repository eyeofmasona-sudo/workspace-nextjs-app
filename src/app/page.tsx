// ─── Agent OS — Orchestrator-First Interface ──────────────────────
// User talks ONLY to the orchestrator. The orchestrator delegates to agents.
// Delegation flow is visualized inline in the chat.
// All 11 agents displayed with status, role, skills, tools.

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Cpu, Send, RefreshCw, Zap, Clock, Hash,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Sparkles,
  Crown, Wrench,
  ChevronDown, ChevronUp, UserPlus, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────

interface AgentSkillRef {
  skillId: string;
  enabled: boolean;
  hasConfig: boolean;
}

interface AgentToolRef {
  toolId: string;
  enabled: boolean;
  requiredPermission: string;
}

interface RuntimeAgent {
  id: string;
  name: string;
  role: string;
  type: string;
  description: string;
  status: string;
  model: {
    preferred: string;
    fallback: string | null;
  };
  execution: {
    temperature: number;
    maxTokens: number;
  };
  skills: AgentSkillRef[];
  tools: AgentToolRef[];
  hooks: string[];
  visualProfile: {
    color: string;
    icon: string;
    avatarEmoji: string;
  };
  executionCount: number;
  lastActivityAt: number | null;
}

interface RuntimeStatus {
  agents: RuntimeAgent[];
  stats: {
    totalAgents: number;
    permanentAgents: number;
    temporaryAgents: number;
    agentsByRole: Record<string, number>;
    agentsByStatus: Record<string, number>;
  };
  registrySize: number;
  skills: {
    totalSkills: number;
    skillIds: string[];
    registrations: Array<{
      id: string;
      name: string;
      version?: string;
      source: string;
    }>;
  };
  tools: {
    totalTools: number;
    toolIds: string[];
    toolsByPermission: Record<string, number>;
    registrations: Array<{
      id: string;
      name: string;
      version?: string;
      permission: string;
      source: string;
    }>;
  };
}

interface AIStatus {
  configured: boolean;
  providers: Array<{ id: string; name: string; available: boolean }>;
  registeredProviderIds: string[];
  error?: string;
}

interface DelegatedTask {
  agentId: string;
  agentName: string;
  task: string;
  status: 'completed' | 'failed' | 'running';
  result?: string;
  durationMs?: number;
}

interface OrchestratorChatResponse {
  orchestratorResponse: string;
  delegatedTasks: DelegatedTask[];
  totalDurationMs: number;
  modelUsed: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'delegation';
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs?: number;
  timestamp: number;
  error?: boolean;
  delegatedTasks?: DelegatedTask[];
  totalDurationMs?: number;
}

interface HiredAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  model: string;
  skills: string[];
  tools: string[];
}

// ─── Color Scheme for All 11 Roles ────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; glow: string; ring: string }> = {
  orchestrator: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300', glow: 'shadow-purple-500/20', ring: 'ring-purple-500/50' },
  analyst: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300', glow: 'shadow-blue-500/20', ring: 'ring-blue-500/50' },
  architect: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300', glow: 'shadow-amber-500/20', ring: 'ring-amber-500/50' },
  designer: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300', glow: 'shadow-pink-500/20', ring: 'ring-pink-500/50' },
  frontend_engineer: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300', glow: 'shadow-emerald-500/20', ring: 'ring-emerald-500/50' },
  backend_engineer: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300', glow: 'shadow-indigo-500/20', ring: 'ring-indigo-500/50' },
  data_engineer: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300', glow: 'shadow-teal-500/20', ring: 'ring-teal-500/50' },
  qa_engineer: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300', glow: 'shadow-rose-500/20', ring: 'ring-rose-500/50' },
  devops_engineer: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300', glow: 'shadow-orange-500/20', ring: 'ring-orange-500/50' },
  researcher: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300', glow: 'shadow-violet-500/20', ring: 'ring-violet-500/50' },
  security_engineer: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300', glow: 'shadow-red-500/20', ring: 'ring-red-500/50' },
  custom: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', badge: 'bg-slate-500/20 text-slate-300', glow: 'shadow-slate-500/20', ring: 'ring-slate-500/50' },
};

const DEFAULT_ROLE_COLORS = ROLE_COLORS.custom;

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-slate-400',
  thinking: 'bg-yellow-400 animate-pulse',
  working: 'bg-emerald-400 animate-pulse',
  waiting_api: 'bg-blue-400 animate-pulse',
  reviewing: 'bg-amber-400',
  waiting_approval: 'bg-orange-400',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
  offline: 'bg-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  working: 'Working',
  waiting_api: 'API Wait',
  reviewing: 'Reviewing',
  waiting_approval: 'Awaiting',
  done: 'Done',
  error: 'Error',
  offline: 'Offline',
};

const SKILL_COLORS: Record<string, string> = {
  planning: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  summarization: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  validation: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
  code_generation: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  testing: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  research: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  design: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
  security_audit: 'bg-red-500/15 text-red-300 border-red-500/20',
};

const TOOL_COLORS: Record<string, string> = {
  calculator: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  http_request: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  file_reader: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
  code_executor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  browser: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  database_query: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
};

const DEFAULT_SKILL_COLOR = 'bg-rose-500/15 text-rose-300 border-rose-500/20';
const DEFAULT_TOOL_COLOR = 'bg-amber-500/15 text-amber-300 border-amber-500/20';

const CAPABILITY_OPTIONS = [
  'planning', 'validation', 'summarization', 'code_generation',
  'testing', 'research', 'design', 'security_audit',
  'code_review', 'deployment', 'monitoring', 'documentation',
];

// ─── Sub-components ───────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || 'bg-slate-500'}`} />
      <span className="text-[10px] text-slate-500">{STATUS_LABELS[status] || status}</span>
    </span>
  );
}

// ─── Delegation Report (inline in chat) ───────────────────────

function DelegationReport({
  tasks,
  totalDurationMs,
}: {
  tasks: DelegatedTask[];
  totalDurationMs: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 space-y-2">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🔄</span>
          <span className="text-xs font-medium text-slate-300">
            Delegated to {tasks.length} agent{tasks.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            {completedCount > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] h-4 px-1.5">
                ✓ {completedCount}
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge className="bg-red-500/20 text-red-300 text-[9px] h-4 px-1.5">
                ✗ {failedCount}
              </Badge>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">
            {totalDurationMs > 0 ? `${(totalDurationMs / 1000).toFixed(1)}s` : ''}
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
      </button>

      {/* Agent Task List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1">
              {tasks.map((task, i) => {
                const colors = ROLE_COLORS[task.agentId] || DEFAULT_ROLE_COLORS;
                return (
                  <motion.div
                    key={`${task.agentId}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/30"
                  >
                    <span className="mt-0.5">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : task.status === 'failed' ? (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-300">{task.agentName}</span>
                        {task.durationMs !== undefined && (
                          <span className="text-[10px] text-slate-500">{(task.durationMs / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{task.task}</p>
                      {task.result && expanded && (
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-3">{task.result}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Orchestrator Chat Panel ──────────────────────────────────

function OrchestratorChatPanel({
  messages,
  onSend,
  loading,
  configured,
  orchestrator,
  delegatingAgentCount,
}: {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  loading: boolean;
  configured: boolean;
  orchestrator: RuntimeAgent | null;
  delegatingAgentCount: number;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12122a] border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 shrink-0 bg-[#12122a]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-2xl leading-none">👑</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#12122a]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-200">Orchestrator</h2>
            <p className="text-[11px] text-slate-500 flex items-center gap-2">
              <span>I coordinate all agents</span>
              {orchestrator && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="font-mono">{orchestrator.model.preferred.split('/').pop()}</span>
                </>
              )}
            </p>
          </div>
          {orchestrator && (
            <div className="flex items-center gap-1.5">
              {orchestrator.skills.filter((s) => s.enabled).map((s) => (
                <Badge key={s.skillId} className={`text-[8px] h-4 px-1.5 ${SKILL_COLORS[s.skillId] || DEFAULT_SKILL_COLOR} border`}>
                  {s.skillId}
                </Badge>
              ))}
              {orchestrator.tools.filter((t) => t.enabled).map((t) => (
                <Badge key={t.toolId} className={`text-[8px] h-4 px-1.5 ${TOOL_COLORS[t.toolId] || DEFAULT_TOOL_COLOR} border`}>
                  {t.toolId}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-base font-medium text-slate-300 mb-1">Talk to the Orchestrator</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Tell me what you need. I&apos;ll delegate to the right agents and synthesize their work.
            </p>
            {!configured && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-sm mx-auto">
                <p className="text-xs text-amber-300 flex items-center gap-1.5 justify-center">
                  <AlertTriangle className="w-3 h-3" />
                  OPENROUTER_API_KEY not set. Configure .env to enable AI.
                </p>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-cyan-600/15 border border-cyan-500/20 text-slate-200'
                    : msg.error
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                    : 'bg-purple-500/[0.08] border border-purple-500/20 text-slate-300'
                }`}
              >
                {msg.role === 'delegation' && msg.delegatedTasks && (
                  <DelegationReport
                    tasks={msg.delegatedTasks}
                    totalDurationMs={msg.totalDurationMs || 0}
                  />
                )}

                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>

                {msg.role === 'assistant' && !msg.error && (
                  <div className="mt-2 pt-1.5 border-t border-slate-700/30 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    {msg.model && (
                      <span className="flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" />
                        {msg.model.split('/').pop()}
                      </span>
                    )}
                    {msg.usage && (
                      <span className="flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />
                        {msg.usage.totalTokens} tok
                      </span>
                    )}
                    {msg.durationMs !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {(msg.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="bg-purple-500/[0.08] border border-purple-500/20 rounded-xl px-3.5 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>
                  {delegatingAgentCount > 0
                    ? `🔄 Delegating to ${delegatingAgentCount} agent${delegatingAgentCount !== 1 ? 's' : ''}...`
                    : '👑 Orchestrator thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-700/50 shrink-0 bg-[#12122a]">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={configured ? 'Tell the orchestrator what you need...' : 'AI not configured'}
            disabled={loading || !configured}
            className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 text-sm resize-none min-h-[40px] max-h-[120px]"
            rows={1}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={loading || !input.trim() || !configured}
            className="bg-purple-600 hover:bg-purple-500 text-white shrink-0 h-10 w-10 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Agent Card ───────────────────────────────────────────────

function AgentCard({
  agent,
  onClick,
}: {
  agent: RuntimeAgent;
  onClick: () => void;
}) {
  const colors = ROLE_COLORS[agent.role] || DEFAULT_ROLE_COLORS;
  const enabledSkills = agent.skills.filter((s) => s.enabled);
  const enabledTools = agent.tools.filter((t) => t.enabled);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card
        className={`cursor-pointer transition-all duration-200 ${colors.bg} ${colors.border} border hover:shadow-lg hover:${colors.glow}`}
        onClick={onClick}
      >
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg leading-none shrink-0">{agent.visualProfile.avatarEmoji}</span>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-slate-200 truncate">{agent.name}</h3>
                <Badge className={`${colors.badge} text-[8px] h-3.5 px-1.5 mt-0.5`}>
                  {agent.role.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <StatusDot status={agent.status} />
          </div>

          {/* Model */}
          <div className="flex items-center gap-1.5 text-[10px] mb-2">
            <Cpu className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-slate-400 font-mono truncate">{agent.model.preferred.split('/').pop()}</span>
          </div>

          {/* Skills & Tools Pills */}
          <div className="flex flex-wrap gap-1 mb-2">
            {enabledSkills.map((s) => (
              <span
                key={s.skillId}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] border ${SKILL_COLORS[s.skillId] || DEFAULT_SKILL_COLOR}`}
              >
                <Sparkles className="w-2 h-2" />
                {s.skillId}
              </span>
            ))}
            {enabledTools.map((t) => (
              <span
                key={t.toolId}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] border ${TOOL_COLORS[t.toolId] || DEFAULT_TOOL_COLOR}`}
              >
                <Wrench className="w-2 h-2" />
                {t.toolId}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />
              {agent.executionCount}
            </span>
            <span className="flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              {enabledSkills.length}
            </span>
            <span className="flex items-center gap-0.5">
              <Wrench className="w-2.5 h-2.5" />
              {enabledTools.length}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Orchestrator Card (Prominent) ────────────────────────────

function OrchestratorCard({ agent }: { agent: RuntimeAgent }) {
  const colors = ROLE_COLORS.orchestrator;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Card className={`${colors.bg} ${colors.border} border shadow-lg ${colors.glow} relative overflow-hidden`}>
        {/* Purple glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500" />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center shadow-lg shadow-purple-500/10">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#12122a]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-purple-200">Orchestrator</h3>
                <Badge className="bg-purple-500/20 text-purple-300 text-[8px] h-4 px-1.5 border border-purple-500/30">
                  👑 LEAD
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mb-1">{agent.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  {agent.model.preferred.split('/').pop()}
                </span>
                <span className="text-slate-700">·</span>
                <StatusDot status={agent.status} />
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                  <Zap className="w-2.5 h-2.5" />
                  {agent.executionCount} runs
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {agent.skills.filter((s) => s.enabled).map((s) => (
                  <span
                    key={s.skillId}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] border ${SKILL_COLORS[s.skillId] || DEFAULT_SKILL_COLOR}`}
                  >
                    <Sparkles className="w-2 h-2" />
                    {s.skillId}
                  </span>
                ))}
                {agent.tools.filter((t) => t.enabled).map((t) => (
                  <span
                    key={t.toolId}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] border ${TOOL_COLORS[t.toolId] || DEFAULT_TOOL_COLOR}`}
                  >
                    <Wrench className="w-2 h-2" />
                    {t.toolId}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Agent Detail Sheet ───────────────────────────────────────

function AgentDetailSheet({
  agent,
  open,
  onOpenChange,
  isHired,
  onFire,
}: {
  agent: RuntimeAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isHired: boolean;
  onFire?: () => void;
}) {
  if (!agent) return null;
  const colors = ROLE_COLORS[agent.role] || DEFAULT_ROLE_COLORS;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#0f0f1a] border-slate-700/50 w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-slate-200">
            <span className="text-2xl">{agent.visualProfile.avatarEmoji}</span>
            <div>
              <span>{agent.name}</span>
              <Badge className={`${colors.badge} text-[9px] h-4 px-1.5 ml-2`}>
                {agent.role.replace(/_/g, ' ')}
              </Badge>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Description */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-1">Description</h4>
            <p className="text-sm text-slate-300">{agent.description}</p>
          </div>

          {/* Status & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <h4 className="text-[10px] text-slate-500 mb-1">Status</h4>
              <StatusDot status={agent.status} />
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <h4 className="text-[10px] text-slate-500 mb-1">Model</h4>
              <span className="text-xs text-slate-300 font-mono">{agent.model.preferred.split('/').pop()}</span>
              {agent.model.fallback && (
                <span className="text-[10px] text-slate-500 block mt-0.5">fallback: {agent.model.fallback.split('/').pop()}</span>
              )}
            </div>
          </div>

          {/* Execution Config */}
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <h4 className="text-[10px] text-slate-500 mb-2">Execution Config</h4>
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span>Temperature: {agent.execution.temperature}</span>
              <span>Max Tokens: {agent.execution.maxTokens}</span>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Bound Skills</h4>
            {agent.skills.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No skills configured</p>
            ) : (
              <div className="space-y-1.5">
                {agent.skills.map((s) => (
                  <div
                    key={s.skillId}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs ${
                      s.enabled
                        ? 'bg-purple-500/10 border border-purple-500/20'
                        : 'bg-slate-800/30 border border-slate-700/30 opacity-50'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className={s.enabled ? 'text-slate-300' : 'text-slate-500'}>{s.skillId}</span>
                    {!s.enabled && <span className="text-slate-600">(disabled)</span>}
                    {s.hasConfig && <Badge className="bg-purple-500/20 text-purple-300 text-[8px] h-3 px-1">configured</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Bound Tools</h4>
            {agent.tools.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No tools configured</p>
            ) : (
              <div className="space-y-1.5">
                {agent.tools.map((t) => (
                  <div
                    key={t.toolId}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs ${
                      t.enabled
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'bg-slate-800/30 border border-slate-700/30 opacity-50'
                    }`}
                  >
                    <Wrench className="w-3 h-3" />
                    <span className={t.enabled ? 'text-slate-300' : 'text-slate-500'}>{t.toolId}</span>
                    {!t.enabled && <span className="text-slate-600">(disabled)</span>}
                    <Badge className={`text-[8px] h-3 px-1 ml-auto ${
                      t.requiredPermission === 'none' ? 'bg-slate-500/20 text-slate-400' :
                      t.requiredPermission === 'read' ? 'bg-cyan-500/20 text-cyan-300' :
                      t.requiredPermission === 'write' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {t.requiredPermission}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hooks */}
          {agent.hooks.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-slate-400 mb-2">Hooks</h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.hooks.map((h) => (
                  <Badge key={h} className="bg-slate-700/30 text-slate-400 text-[10px] h-5 px-2">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Executions: {agent.executionCount}</span>
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Type: {agent.type}</span>
            </div>
          </div>

          {/* Fire button for hired agents */}
          {isHired && onFire && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={onFire}
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Fire Agent
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Hire Agent Dialog ────────────────────────────────────────

function HireAgentDialog({
  onHire,
  hiring,
}: {
  onHire: (role: string, task: string, capabilities: string[]) => void;
  hiring: boolean;
}) {
  const [role, setRole] = useState('');
  const [task, setTask] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSubmit = () => {
    if (!role.trim() || !task.trim() || capabilities.length === 0) return;
    onHire(role.trim(), task.trim(), capabilities);
    setRole('');
    setTask('');
    setCapabilities([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-500 text-white h-8 text-xs"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Hire Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f0f1a] border-slate-700/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-200 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            Hire a Temporary Agent
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-400 text-xs">Role</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., code_reviewer, data_analyst"
              className="mt-1 bg-slate-800/50 border-slate-700/50 text-slate-200 text-sm"
            />
          </div>

          <div>
            <Label className="text-slate-400 text-xs">Task Description</Label>
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe what this agent should do..."
              className="mt-1 bg-slate-800/50 border-slate-700/50 text-slate-200 text-sm resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-slate-400 text-xs">Capabilities</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CAPABILITY_OPTIONS.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => toggleCapability(cap)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all ${
                    capabilities.includes(cap)
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-slate-800/30 border-slate-700/30 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {cap.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="text-slate-400">
              Cancel
            </Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!role.trim() || !task.trim() || capabilities.length === 0 || hiring}
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            {hiring ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Hiring...
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3 mr-1.5" />
                Hire
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function Home() {
  const isMobile = useIsMobile();
  const [agents, setAgents] = useState<RuntimeAgent[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [delegatingAgentCount, setDelegatingAgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hiredAgents, setHiredAgents] = useState<HiredAgent[]>([]);
  const [hiring, setHiring] = useState(false);
  const [detailAgent, setDetailAgent] = useState<RuntimeAgent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const orchestrator = agents.find((a) => a.role === 'orchestrator') || null;
  const nonOrchestratorAgents = agents.filter((a) => a.role !== 'orchestrator');
  const hiredAgentIds = new Set(hiredAgents.map((h) => h.id));

  // ─── Fetch Data ──────────────────────────────────────────────

  const fetchRuntimeStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/runtime/status');
      if (!res.ok) throw new Error('Failed');
      const data: RuntimeStatus = await res.json();
      setRuntimeStatus(data);
      setAgents(data.agents);
      return data;
    } catch (err) {
      console.error('Failed to fetch runtime status:', err);
      return null;
    }
  }, []);

  const fetchAIStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/status');
      if (!res.ok) throw new Error('Failed');
      const data: AIStatus = await res.json();
      setAIStatus(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
      return null;
    }
  }, []);

  const fetchHiredAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/orchestrator/hire');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setHiredAgents(data.agents || []);
    } catch (err) {
      console.error('Failed to fetch hired agents:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRuntimeStatus(), fetchAIStatus(), fetchHiredAgents()]);
    setRefreshing(false);
  }, [fetchRuntimeStatus, fetchAIStatus, fetchHiredAgents]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchRuntimeStatus(), fetchAIStatus(), fetchHiredAgents()]);
      setLoading(false);
    };
    init();
  }, [fetchRuntimeStatus, fetchAIStatus, fetchHiredAgents]);

  // Auto-refresh agent statuses every 8 seconds
  useEffect(() => {
    const interval = setInterval(fetchRuntimeStatus, 8000);
    return () => clearInterval(interval);
  }, [fetchRuntimeStatus]);

  // ─── Chat Handler ────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (message: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setChatLoading(true);
      setDelegatingAgentCount(0);

      try {
        const history = messages
          .filter((m) => !m.error)
          .map((m) => ({ role: m.role === 'delegation' ? 'assistant' as const : m.role, content: m.content }));

        const res = await fetch('/api/orchestrator/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history,
            mode: 'auto',
          }),
        });

        const data: OrchestratorChatResponse = await res.json();

        // If there are delegated tasks, show delegation report first
        if (data.delegatedTasks && data.delegatedTasks.length > 0) {
          setDelegatingAgentCount(data.delegatedTasks.length);

          const delegationMsg: ChatMessage = {
            id: `delegation-${Date.now()}`,
            role: 'delegation',
            content: '',
            delegatedTasks: data.delegatedTasks,
            totalDurationMs: data.totalDurationMs,
            timestamp: Date.now(),
          };

          const orchestratorMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: data.orchestratorResponse || 'Task completed.',
            model: data.modelUsed,
            usage: data.usage,
            durationMs: data.totalDurationMs,
            timestamp: Date.now(),
            error: !res.ok,
          };

          setMessages((prev) => [...prev, delegationMsg, orchestratorMsg]);
        } else {
          // Simple response without delegation
          const assistantMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: data.orchestratorResponse || data.error || 'No response',
            model: data.modelUsed,
            usage: data.usage,
            durationMs: data.totalDurationMs,
            timestamp: Date.now(),
            error: !res.ok,
          };

          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Failed to get response',
          timestamp: Date.now(),
          error: true,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setChatLoading(false);
        setDelegatingAgentCount(0);
        fetchRuntimeStatus();
      }
    },
    [messages, fetchRuntimeStatus],
  );

  // ─── Hire Handler ────────────────────────────────────────────

  const handleHireAgent = useCallback(
    async (role: string, task: string, capabilities: string[]) => {
      setHiring(true);
      try {
        const res = await fetch('/api/orchestrator/hire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, task, capabilities }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          // Add a system message about the hiring
          const systemMsg: ChatMessage = {
            id: `hire-${Date.now()}`,
            role: 'assistant',
            content: `🆕 Hired **${data.agentName}** as ${data.role}. Assigned skills: ${data.assignedSkills.join(', ') || 'none'}. Assigned tools: ${data.assignedTools.join(', ') || 'none'}. Model: ${data.model.split('/').pop()}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, systemMsg]);
          await Promise.all([fetchRuntimeStatus(), fetchHiredAgents()]);
        }
      } catch (error) {
        console.error('Failed to hire agent:', error);
      } finally {
        setHiring(false);
      }
    },
    [fetchRuntimeStatus, fetchHiredAgents],
  );

  // ─── Fire Handler ────────────────────────────────────────────

  const handleFireAgent = useCallback(
    async (agentId: string) => {
      try {
        const res = await fetch(`/api/orchestrator/hire/${agentId}`, { method: 'DELETE' });
        if (res.ok) {
          setDetailOpen(false);
          setDetailAgent(null);
          const fireMsg: ChatMessage = {
            id: `fire-${Date.now()}`,
            role: 'assistant',
            content: `🗑️ Agent **${agentId}** has been fired.`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, fireMsg]);
          await Promise.all([fetchRuntimeStatus(), fetchHiredAgents()]);
        }
      } catch (error) {
        console.error('Failed to fire agent:', error);
      }
    },
    [fetchRuntimeStatus, fetchHiredAgents],
  );

  // ─── Agent Detail Click ─────────────────────────────────────

  const handleAgentClick = (agent: RuntimeAgent) => {
    setDetailAgent(agent);
    setDetailOpen(true);
  };

  // ─── Stats ───────────────────────────────────────────────────

  const totalSkills = runtimeStatus?.skills.totalSkills ?? 0;
  const totalTools = runtimeStatus?.tools.totalTools ?? 0;
  const totalAgents = agents.length;

  // ─── Loading State ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Crown className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-slate-300 mb-1">Loading Agent OS</h2>
          <p className="text-sm text-slate-500">Initializing 11 agents...</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      {/* ─── Header Bar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0a0a1a]/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Branding */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Crown className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-200">Agent OS</h1>
                <p className="text-[10px] text-slate-500 hidden sm:block">Multi-Agent Orchestrator System</p>
              </div>
            </div>

            {/* Center: Stats */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20 text-[10px] h-5 px-2">
                <Crown className="w-2.5 h-2.5 mr-1" />
                {totalAgents} agents
              </Badge>
              <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/20 text-[10px] h-5 px-2">
                <Sparkles className="w-2.5 h-2.5 mr-1" />
                {totalSkills} skills
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20 text-[10px] h-5 px-2">
                <Wrench className="w-2.5 h-2.5 mr-1" />
                {totalTools} tools
              </Badge>
            </div>

            {/* Right: Status + Refresh */}
            <div className="flex items-center gap-2">
              {aiStatus && (
                <Badge
                  className={`text-[10px] h-5 px-2 ${
                    aiStatus.configured
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${aiStatus.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {aiStatus.configured ? 'AI Ready' : 'Not Configured'}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
                onClick={refreshAll}
                disabled={refreshing}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4">
        <div className={`flex gap-4 ${isMobile ? 'flex-col' : 'flex-row'} h-full`}>
          {/* Left Column: Orchestrator Chat */}
          <div className={`${isMobile ? 'w-full' : 'w-[60%]'} flex flex-col`}>
            <OrchestratorChatPanel
              messages={messages}
              onSend={handleSendMessage}
              loading={chatLoading}
              configured={aiStatus?.configured ?? false}
              orchestrator={orchestrator}
              delegatingAgentCount={delegatingAgentCount}
            />
          </div>

          {/* Right Column: Agent Panel */}
          <div className={`${isMobile ? 'w-full' : 'w-[40%]'}`}>
            <div
              className="overflow-y-auto custom-scrollbar pr-1"
              style={{ maxHeight: isMobile ? '500px' : 'calc(100vh - 200px)' }}
            >
              <div className="space-y-3">
                {/* Orchestrator Card (Prominent) */}
                {orchestrator && (
                  <div onClick={() => handleAgentClick(orchestrator)}>
                    <OrchestratorCard agent={orchestrator} />
                  </div>
                )}

                {/* Section label */}
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Agents</span>
                  <Separator className="flex-1 bg-slate-700/30" />
                  <span className="text-[10px] text-slate-600">{nonOrchestratorAgents.length}</span>
                </div>

                {/* Agent Grid */}
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                  {nonOrchestratorAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onClick={() => handleAgentClick(agent)}
                    />
                  ))}
                </div>

                {/* Hired Agents Section */}
                {hiredAgents.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-1 pt-2">
                      <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">Hired</span>
                      <Separator className="flex-1 bg-slate-700/30" />
                      <span className="text-[10px] text-slate-600">{hiredAgents.length}</span>
                    </div>
                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                      {agents
                        .filter((a) => hiredAgentIds.has(a.id))
                        .map((agent) => (
                          <AgentCard
                            key={agent.id}
                            agent={agent}
                            onClick={() => handleAgentClick(agent)}
                          />
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Sticky Footer ────────────────────────────────────── */}
      <footer className="border-t border-slate-700/50 bg-[#0a0a1a] mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Crown className="w-3.5 h-3.5 text-purple-400" />
              <span>Agent OS · Multi-Agent System</span>
              <span className="text-slate-700">·</span>
              <span>{totalAgents} agents active</span>
            </div>
            <HireAgentDialog onHire={handleHireAgent} hiring={hiring} />
          </div>
        </div>
      </footer>

      {/* ─── Agent Detail Sheet ───────────────────────────────── */}
      <AgentDetailSheet
        agent={detailAgent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isHired={detailAgent ? hiredAgentIds.has(detailAgent.id) : false}
        onFire={detailAgent ? () => handleFireAgent(detailAgent.id) : undefined}
      />
    </div>
  );
}
