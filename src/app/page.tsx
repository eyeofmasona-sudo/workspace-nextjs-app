// ─── Agent OS — AI Infrastructure Dashboard ──────────────────
// Complete dashboard showing agents, models, provider status,
// chat interface, and multi-agent demo.

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Cpu, MessageSquare, Send, RefreshCw, RotateCcw, ChevronDown,
  ChevronUp, Bot, Zap, Clock, Hash, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Sparkles, ArrowRight, Terminal, Key,
  Radio, Activity, Crown, Search, Building2, Palette, Code2,
  Server, Database, ShieldCheck, Rocket, BookOpen, CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────

interface AgentModelConfig {
  id: string;
  provider: string;
  model: string;
  preferenceType: string;
  maxCostPerTask: number | null;
  maxTokens: number | null;
  enabled: boolean;
}

interface ResolvedModel {
  provider: string;
  model: string;
  preferenceType: string;
}

interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  role: string;
  type: string;
  visualProfile: string | null;
  professionalStyle: string | null;
  systemPrompt: string | null;
  status: string;
  locationZone: string;
  activeTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentWithModels extends Agent {
  modelConfigs: AgentModelConfig[];
  resolvedModel: ResolvedModel | null;
}

interface ProviderStatus {
  id: string;
  name: string;
  available: boolean;
}

interface AIStatus {
  configured: boolean;
  providers: ProviderStatus[];
  registeredProviderIds: string[];
  error?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  resolvedModel?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs?: number;
  finishReason?: string;
  timestamp: Date;
  error?: boolean;
}

interface DemoResult {
  agentId: string;
  agentName: string;
  agentRole: string;
  model: string;
  content: string;
  durationMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

// ─── Role Color Mapping ───────────────────────────────────────

type RoleCategory = 'leadership' | 'analysis' | 'architecture' | 'design' | 'engineering' | 'quality' | 'operations' | 'research';

const ROLE_CATEGORY_MAP: Record<string, RoleCategory> = {
  orchestrator: 'leadership',
  analyst: 'analysis',
  architect: 'architecture',
  designer: 'design',
  frontend_engineer: 'engineering',
  backend_engineer: 'engineering',
  data_engineer: 'engineering',
  qa_engineer: 'quality',
  devops_engineer: 'operations',
  researcher: 'research',
};

const CATEGORY_COLORS: Record<RoleCategory, { bg: string; border: string; text: string; badge: string; glow: string }> = {
  leadership: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300', glow: 'shadow-purple-500/10' },
  analysis: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300', glow: 'shadow-blue-500/10' },
  architecture: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300', glow: 'shadow-amber-500/10' },
  design: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300', glow: 'shadow-pink-500/10' },
  engineering: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300', glow: 'shadow-emerald-500/10' },
  quality: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300', glow: 'shadow-red-500/10' },
  operations: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300', glow: 'shadow-orange-500/10' },
  research: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300', glow: 'shadow-violet-500/10' },
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  orchestrator: <Crown className="w-4 h-4" />,
  analyst: <Search className="w-4 h-4" />,
  architect: <Building2 className="w-4 h-4" />,
  designer: <Palette className="w-4 h-4" />,
  frontend_engineer: <Code2 className="w-4 h-4" />,
  backend_engineer: <Server className="w-4 h-4" />,
  data_engineer: <Database className="w-4 h-4" />,
  qa_engineer: <ShieldCheck className="w-4 h-4" />,
  devops_engineer: <Rocket className="w-4 h-4" />,
  researcher: <BookOpen className="w-4 h-4" />,
};

const ROLE_EMOJIS: Record<string, string> = {
  orchestrator: '👑',
  analyst: '🔍',
  architect: '🏗️',
  designer: '🎨',
  frontend_engineer: '💻',
  backend_engineer: '⚙️',
  data_engineer: '🗃️',
  qa_engineer: '🛡️',
  devops_engineer: '🚀',
  researcher: '📚',
};

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
  waiting_api: 'Waiting API',
  reviewing: 'Reviewing',
  waiting_approval: 'Awaiting Approval',
  done: 'Done',
  error: 'Error',
  offline: 'Offline',
};

// ─── Status Badge Component ───────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || 'bg-slate-500'}`} />
      <span className="text-xs text-slate-400">{STATUS_LABELS[status] || status}</span>
    </span>
  );
}

// ─── Agent Card Component ─────────────────────────────────────

function AgentCard({
  agent,
  isSelected,
  onSelect,
}: {
  agent: AgentWithModels;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const category = ROLE_CATEGORY_MAP[agent.role] || 'operations';
  const colors = CATEGORY_COLORS[category];
  const preferred = agent.modelConfigs.find((m) => m.preferenceType === 'preferred');
  const fallback = agent.modelConfigs.find((m) => m.preferenceType === 'fallback');

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card
        className={`cursor-pointer transition-all duration-200 ${colors.bg} ${colors.border} border ${
          isSelected ? `ring-2 ring-offset-1 ring-offset-[#0f0f1a] ${colors.text.replace('text-', 'ring-')} shadow-lg ${colors.glow}` : 'hover:shadow-md'
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-md ${colors.badge}`}>
                {ROLE_ICONS[agent.role] || <Bot className="w-4 h-4" />}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                  {agent.name}
                  <span className="text-xs">{ROLE_EMOJIS[agent.role] || '🤖'}</span>
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{agent.role.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <StatusDot status={agent.status} />
          </div>

          <div className="space-y-1.5">
            {preferred && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-500 w-16">Preferred:</span>
                <span className="text-slate-300 font-mono truncate">{preferred.model}</span>
              </div>
            )}
            {fallback && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-500 w-16">Fallback:</span>
                <span className="text-slate-400 font-mono truncate">{fallback.model}</span>
              </div>
            )}
            {(preferred || fallback) && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-500 w-16">Provider:</span>
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                  OpenRouter
                </Badge>
              </div>
            )}
          </div>

          <Button
            size="sm"
            className={`w-full mt-3 h-7 text-xs ${isSelected ? colors.badge : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'}`}
            variant={isSelected ? 'default' : 'ghost'}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Chat
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Chat Panel Component ─────────────────────────────────────

function ChatPanel({
  agent,
  messages,
  onSend,
  loading,
  configured,
}: {
  agent: AgentWithModels | null;
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  loading: boolean;
  configured: boolean;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (agent) {
      inputRef.current?.focus();
    }
  }, [agent]);

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

  if (!agent) {
    return (
      <Card className="h-full bg-[#12122a] border-slate-700/50 flex items-center justify-center">
        <CardContent className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-400 mb-2">No Agent Selected</h3>
          <p className="text-sm text-slate-600">Select an agent to start chatting</p>
        </CardContent>
      </Card>
    );
  }

  const category = ROLE_CATEGORY_MAP[agent.role] || 'operations';
  const colors = CATEGORY_COLORS[category];
  const preferred = agent.modelConfigs.find((m) => m.preferenceType === 'preferred');

  return (
    <Card className="h-full bg-[#12122a] border-slate-700/50 flex flex-col">
      {/* Chat Header */}
      <CardHeader className="pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className={`p-2 rounded-lg ${colors.badge}`}>
            {ROLE_ICONS[agent.role] || <Bot className="w-5 h-5" />}
          </span>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base text-slate-200 flex items-center gap-2">
              {agent.name}
              <span className="text-sm">{ROLE_EMOJIS[agent.role] || '🤖'}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 flex items-center gap-2">
              <span>{agent.role.replace(/_/g, ' ')}</span>
              {preferred && (
                <>
                  <span>·</span>
                  <span className="font-mono">{preferred.model}</span>
                </>
              )}
            </CardDescription>
          </div>
          <StatusDot status={agent.status} />
        </div>
      </CardHeader>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Start a conversation with {agent.name}</p>
            {!configured && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-sm mx-auto">
                <p className="text-xs text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  OPENROUTER_API_KEY not configured. Set it in .env to enable AI responses.
                </p>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-cyan-600/20 border border-cyan-500/20 text-slate-200'
                    : msg.error
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                    : 'bg-slate-800/50 border border-slate-700/50 text-slate-300'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.role === 'assistant' && !msg.error && (
                  <div className="mt-2 pt-2 border-t border-slate-700/30 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    {msg.model && (
                      <span className="flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" />
                        {msg.model}
                      </span>
                    )}
                    {msg.usage && (
                      <span className="flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />
                        {msg.usage.totalTokens} tokens
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
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            disabled={loading || !configured}
            className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={loading || !input.trim() || !configured}
            className="bg-cyan-600 hover:bg-cyan-500 text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Provider Status Section ──────────────────────────────────

function ProviderStatusSection({
  status,
  modelCount,
  onRefresh,
  onReset,
  refreshing,
  resetting,
  workspaceId,
}: {
  status: AIStatus | null;
  modelCount: number;
  onRefresh: () => void;
  onReset: () => void;
  refreshing: boolean;
  resetting: boolean;
  workspaceId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-[#12122a] border-slate-700/50">
      <CardHeader
        className="cursor-pointer py-3 px-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-slate-400" />
            <CardTitle className="text-sm font-medium text-slate-300">Provider Status</CardTitle>
            {status?.configured ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] h-5">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-500/10 text-red-300 border-red-500/30 text-[10px] h-5">
                <XCircle className="w-3 h-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </motion.div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 px-4 pb-4">
              <Separator className="mb-4 bg-slate-700/50" />

              <div className="space-y-3">
                {/* OpenRouter Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${status?.configured ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    OpenRouter
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5 bg-slate-800/50 text-slate-400 border-slate-700">
                      {status?.providers.find((p) => p.id === 'openrouter')?.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>

                {/* API Key Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    API Key
                  </div>
                  <Badge variant="outline" className={`text-[10px] h-5 ${status?.configured ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-red-500/10 text-red-300 border-red-500/30'}`}>
                    {status?.configured ? 'Configured ✓' : 'Not Set ✗'}
                  </Badge>
                </div>

                {/* Available Models */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    Available Models
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5 bg-slate-800/50 text-slate-400 border-slate-700">
                    {modelCount} models
                  </Badge>
                </div>

                {/* Registered Providers */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    Registered Providers
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5 bg-slate-800/50 text-slate-400 border-slate-700">
                    {status?.registeredProviderIds?.length || 0} providers
                  </Badge>
                </div>

                {!status?.configured && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs text-amber-300/80 mb-1 font-medium">Setup Instructions</p>
                    <code className="text-[11px] text-amber-200/60 font-mono">
                      echo &quot;OPENROUTER_API_KEY=sk-or-...&quot; &gt; .env
                    </code>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                    disabled={refreshing}
                    className="h-7 text-xs bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resetting || !workspaceId}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 text-xs bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                      >
                        <RotateCcw className={`w-3 h-3 mr-1 ${resetting ? 'animate-spin' : ''}`} />
                        Reset Model Configs
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1a2e] border-slate-700" onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-slate-200">Reset Model Configs?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          This will reset all agent model configurations back to OpenRouter defaults. Any custom model assignments will be lost.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.stopPropagation(); onReset(); }} className="bg-red-600 hover:bg-red-500 text-white">
                          Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Demo Section ─────────────────────────────────────────────

function DemoSection({
  onRunDemo,
  running,
  results,
}: {
  onRunDemo: () => void;
  running: boolean;
  results: DemoResult[];
}) {
  return (
    <Card className="bg-[#12122a] border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-300">Multi-Agent Demo</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={onRunDemo}
            disabled={running}
            className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {running ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Running...
              </>
            ) : (
              <>
                🚀 Run Demo
              </>
            )}
          </Button>
        </div>
        <CardDescription className="text-xs text-slate-500">
          Send the same prompt to 3 different agents and see how each uses a different model through OpenRouter
        </CardDescription>
      </CardHeader>

      {results.length > 0 && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {results.map((r) => {
              const category = ROLE_CATEGORY_MAP[r.agentRole] || 'operations';
              const colors = CATEGORY_COLORS[category];
              return (
                <motion.div
                  key={r.agentId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={`bg-slate-900/50 ${colors.border} border`}>
                    <CardHeader className="py-2 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                          <span>{ROLE_EMOJIS[r.agentRole] || '🤖'}</span>
                          {r.agentName}
                        </CardTitle>
                        {r.error ? (
                          <Badge className="bg-red-500/20 text-red-300 text-[9px] h-4">Error</Badge>
                        ) : (
                          <Badge className={`${colors.badge} text-[9px] h-4`}>
                            {r.model ? r.model.split('/').pop() : 'N/A'}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 px-3">
                      {r.error ? (
                        <p className="text-[11px] text-red-400">{r.error}</p>
                      ) : (
                        <>
                          <p className="text-[11px] text-slate-400 line-clamp-4 mb-2">{r.content}</p>
                          <div className="flex items-center gap-2 text-[9px] text-slate-600">
                            {r.usage && <span>{r.usage.totalTokens} tokens</span>}
                            <span>{(r.durationMs / 1000).toFixed(1)}s</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page Component ──────────────────────────────────────

export default function Home() {
  const isMobile = useIsMobile();
  const [agents, setAgents] = useState<AgentWithModels[]>([]);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [modelCount, setModelCount] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [chatLoading, setChatLoading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [resettingModels, setResettingModels] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResults, setDemoResults] = useState<DemoResult[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  // ─── Initialize System ─────────────────────────────────────

  const ensureSystem = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      const status = data.status;

      if (status?.users > 0 && status?.agents > 0) {
        setInitialized(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const seedSystem = useCallback(async () => {
    try {
      await fetch('/api/seed', { method: 'POST' });
      setInitialized(true);
    } catch {
      console.error('Failed to seed system');
    }
  }, []);

  // ─── Fetch Agents with Models ──────────────────────────────

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      const agentList: Agent[] = data.agents || [];

      if (agentList.length > 0) {
        setWorkspaceId(agentList[0].workspaceId);

        // Fetch model configs for each agent
        const agentsWithModels = await Promise.all(
          agentList.map(async (agent) => {
            try {
              const modelsRes = await fetch(`/api/agents/${agent.id}/models`);
              const modelsData = await modelsRes.json();
              return {
                ...agent,
                modelConfigs: modelsData.models || [],
                resolvedModel: modelsData.resolvedModel || null,
              } as AgentWithModels;
            } catch {
              return {
                ...agent,
                modelConfigs: [],
                resolvedModel: null,
              } as AgentWithModels;
            }
          })
        );

        setAgents(agentsWithModels);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  }, []);

  // ─── Fetch AI Status ───────────────────────────────────────

  const fetchAIStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/status');
      const data = await res.json();
      setAIStatus(data);
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
    }
  }, []);

  // ─── Fetch Model Count ─────────────────────────────────────

  const fetchModelCount = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/models');
      const data = await res.json();
      setModelCount(data.total || 0);
    } catch {
      setModelCount(0);
    }
  }, []);

  // ─── Initial Load ──────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const isReady = await ensureSystem();
      if (!isReady) {
        await seedSystem();
      }
      await Promise.all([fetchAgents(), fetchAIStatus(), fetchModelCount()]);
      setLoading(false);
    };
    init();
  }, [ensureSystem, seedSystem, fetchAgents, fetchAIStatus, fetchModelCount]);

  // ─── Chat Handler ──────────────────────────────────────────

  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedAgentId) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setChatHistories((prev) => ({
      ...prev,
      [selectedAgentId]: [...(prev[selectedAgentId] || []), userMsg],
    }));
    setChatLoading(true);

    try {
      const history = (chatHistories[selectedAgentId] || [])
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          message,
          history,
        }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || data.error || 'No response',
        model: data.model,
        resolvedModel: data.resolvedModel?.model,
        usage: data.usage,
        durationMs: data.durationMs,
        finishReason: data.finishReason,
        timestamp: new Date(),
        error: !res.ok,
      };

      setChatHistories((prev) => ({
        ...prev,
        [selectedAgentId]: [...(prev[selectedAgentId] || []), userMsg, assistantMsg].filter(
          (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
        ),
      }));
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Failed to get response',
        timestamp: new Date(),
        error: true,
      };

      setChatHistories((prev) => ({
        ...prev,
        [selectedAgentId]: [...(prev[selectedAgentId] || []), userMsg, errorMsg].filter(
          (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
        ),
      }));
    } finally {
      setChatLoading(false);
    }
  }, [selectedAgentId, chatHistories]);

  // ─── Refresh Status Handler ────────────────────────────────

  const handleRefreshStatus = useCallback(async () => {
    setRefreshingStatus(true);
    await Promise.all([fetchAIStatus(), fetchModelCount()]);
    setRefreshingStatus(false);
  }, [fetchAIStatus, fetchModelCount]);

  // ─── Reset Models Handler ──────────────────────────────────

  const handleResetModels = useCallback(async () => {
    if (!workspaceId) return;
    setResettingModels(true);
    try {
      await fetch('/api/ai/reset-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      await fetchAgents();
    } catch (error) {
      console.error('Failed to reset models:', error);
    }
    setResettingModels(false);
  }, [workspaceId, fetchAgents]);

  // ─── Demo Handler ──────────────────────────────────────────

  const handleRunDemo = useCallback(async () => {
    if (agents.length === 0) return;

    const demoAgents = ['orchestrator', 'frontend_engineer', 'researcher']
      .map((role) => agents.find((a) => a.role === role))
      .filter(Boolean) as AgentWithModels[];

    if (demoAgents.length === 0) return;

    setDemoRunning(true);
    setDemoResults([]);

    const demoPrompt = 'What is your primary specialty and how would you approach a typical task? Keep your response brief (2-3 sentences).';

    const results: DemoResult[] = await Promise.all(
      demoAgents.map(async (agent) => {
        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: agent.id,
              message: demoPrompt,
              history: [],
            }),
          });
          const data = await res.json();

          return {
            agentId: agent.id,
            agentName: agent.name,
            agentRole: agent.role,
            model: data.model || data.resolvedModel?.model || 'N/A',
            content: data.content || data.error || 'No response',
            durationMs: data.durationMs || 0,
            usage: data.usage,
            error: !res.ok ? data.error : undefined,
          } as DemoResult;
        } catch (error) {
          return {
            agentId: agent.id,
            agentName: agent.name,
            agentRole: agent.role,
            model: agent.modelConfigs.find((m) => m.preferenceType === 'preferred')?.model || 'N/A',
            content: '',
            durationMs: 0,
            error: error instanceof Error ? error.message : 'Failed',
          } as DemoResult;
        }
      })
    );

    setDemoResults(results);
    setDemoRunning(false);
  }, [agents]);

  // ─── Loading State ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.2s]" />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.4s]" />
          </div>
          <p className="text-sm text-slate-400 font-mono">Loading AI Infrastructure...</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────

  const currentMessages = selectedAgentId ? (chatHistories[selectedAgentId] || []) : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f1a]">
      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h1 className="text-lg font-bold text-slate-200 tracking-tight">
                Agent OS <span className="text-cyan-400 font-normal">— AI Infrastructure</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Provider Status Indicator */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${aiStatus?.configured ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-xs text-slate-400">
                {aiStatus?.configured ? 'OpenRouter Connected' : 'OpenRouter Not Configured'}
              </span>
            </div>
            {/* Workspace ID Badge */}
            {workspaceId && (
              <Badge variant="outline" className="text-[10px] h-5 bg-slate-800/50 text-slate-500 border-slate-700 font-mono">
                {workspaceId.slice(0, 8)}...
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────── */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-4">
        <div className={`flex gap-4 ${isMobile ? 'flex-col' : 'flex-row'}`} style={{ height: isMobile ? 'auto' : 'calc(100vh - 180px)' }}>
          {/* Left Column: Agent Cards Grid */}
          <div className={`${isMobile ? 'w-full' : 'w-[55%]'} ${isMobile ? '' : 'overflow-y-auto'} pr-1`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-500" />
                Agent Fleet
                <Badge variant="outline" className="text-[10px] h-4 bg-slate-800/50 text-slate-500 border-slate-700">
                  {agents.length} agents
                </Badge>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={agent.id === selectedAgentId}
                  onSelect={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                />
              ))}
            </div>

            {/* Spacer on mobile */}
            {isMobile && selectedAgentId && <div className="h-4" />}
          </div>

          {/* Right Column: Chat Panel */}
          <div className={`${isMobile ? 'w-full' : 'w-[45%]'} ${isMobile ? '' : 'h-full'}`} style={isMobile ? { minHeight: '500px' } : {}}>
            <ChatPanel
              agent={selectedAgent}
              messages={currentMessages}
              onSend={handleSendMessage}
              loading={chatLoading}
              configured={aiStatus?.configured ?? false}
            />
          </div>
        </div>

        {/* ─── Bottom Sections ────────────────────────────────── */}
        <div className="mt-4 space-y-4">
          {/* Demo Section */}
          <DemoSection
            onRunDemo={handleRunDemo}
            running={demoRunning}
            results={demoResults}
          />

          {/* Provider Status Section */}
          <ProviderStatusSection
            status={aiStatus}
            modelCount={modelCount}
            onRefresh={handleRefreshStatus}
            onReset={handleResetModels}
            refreshing={refreshingStatus}
            resetting={resettingModels}
            workspaceId={workspaceId}
          />
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="mt-auto bg-[#0a0a18] border-t border-slate-800/50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Zap className="w-3 h-3" />
            <span>Agent OS — AI Infrastructure Dashboard</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-700">
            <span>{agents.length} agents</span>
            <span>·</span>
            <span>{modelCount} models</span>
            <span>·</span>
            <span className={aiStatus?.configured ? 'text-emerald-600' : 'text-red-600'}>
              {aiStatus?.configured ? 'Provider Active' : 'Provider Offline'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
