// ─── Agent OS — Stage 3: Skills + Tools Dashboard ───────────────
// Complete dashboard showcasing the multi-agent system architecture:
// Config → Registry → Runtime → Skills → Tools
// With agent cards, chat, skills/tools panels, and execution demo.

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Cpu, MessageSquare, Send, RefreshCw, Bot, Zap, Clock, Hash,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Sparkles,
  ArrowRight, Terminal, Crown, Code2, BookOpen, Settings,
  Layers, Database, Play, Wrench, Anchor, Activity, Shield,
  ChevronRight, Boxes, CircuitBoard, Gauge, Puzzle,
  Globe, FileText, Calculator, Target, Eye, Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  version?: string;
}

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  version?: string;
  requiredPermission: string;
  functionName: string;
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

interface AIProviderStatus {
  id: string;
  name: string;
  available: boolean;
}

interface AIStatus {
  configured: boolean;
  providers: AIProviderStatus[];
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
  timestamp: number;
  error?: boolean;
}

// ─── Constants ────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; glow: string; ring: string }> = {
  orchestrator: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
    glow: 'shadow-purple-500/20',
    ring: 'ring-purple-500/50',
  },
  frontend_engineer: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
    glow: 'shadow-emerald-500/20',
    ring: 'ring-emerald-500/50',
  },
  researcher: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    badge: 'bg-violet-500/20 text-violet-300',
    glow: 'shadow-violet-500/20',
    ring: 'ring-violet-500/50',
  },
};

const DEFAULT_ROLE_COLORS = ROLE_COLORS.orchestrator;

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

const ROLE_ICONS: Record<string, React.ReactNode> = {
  orchestrator: <Crown className="w-4 h-4" />,
  frontend_engineer: <Code2 className="w-4 h-4" />,
  researcher: <BookOpen className="w-4 h-4" />,
};

const SKILL_ICONS: Record<string, React.ReactNode> = {
  planning: <Target className="w-3.5 h-3.5" />,
  summarization: <FileText className="w-3.5 h-3.5" />,
  validation: <Shield className="w-3.5 h-3.5" />,
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  calculator: <Calculator className="w-3.5 h-3.5" />,
  http_request: <Globe className="w-3.5 h-3.5" />,
  file_reader: <FileText className="w-3.5 h-3.5" />,
};

const PERMISSION_COLORS: Record<string, string> = {
  none: 'bg-slate-500/20 text-slate-400',
  read: 'bg-cyan-500/20 text-cyan-300',
  write: 'bg-amber-500/20 text-amber-300',
  admin: 'bg-red-500/20 text-red-300',
};

// ─── Sub-components ───────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || 'bg-slate-500'}`} />
      <span className="text-[10px] text-slate-500">{STATUS_LABELS[status] || status}</span>
    </span>
  );
}

// ─── Architecture Overview ────────────────────────────────────

function ArchitectureOverview() {
  const layers = [
    {
      label: 'Config',
      icon: <Settings className="w-3.5 h-3.5" />,
      color: 'from-cyan-500/20 to-cyan-500/5',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      desc: 'AgentConfig',
    },
    {
      label: 'Registry',
      icon: <Database className="w-3.5 h-3.5" />,
      color: 'from-purple-500/20 to-purple-500/5',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      desc: 'Lookup & Resolve',
    },
    {
      label: 'Runtime',
      icon: <CircuitBoard className="w-3.5 h-3.5" />,
      color: 'from-emerald-500/20 to-emerald-500/5',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      desc: 'Execute & Loop',
    },
    {
      label: 'Skills',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: 'from-rose-500/20 to-rose-500/5',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      desc: 'Capabilities',
    },
    {
      label: 'Tools',
      icon: <Wrench className="w-3.5 h-3.5" />,
      color: 'from-amber-500/20 to-amber-500/5',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      desc: 'Functions',
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {layers.map((layer, i) => (
        <div key={layer.label} className="flex items-center gap-1.5 shrink-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${layer.color} border ${layer.border}`}
          >
            <span className={layer.text}>{layer.icon}</span>
            <div>
              <div className={`text-[11px] font-semibold ${layer.text} leading-tight`}>{layer.label}</div>
              <div className="text-[9px] text-slate-500 leading-tight">{layer.desc}</div>
            </div>
          </motion.div>
          {i < layers.length - 1 && (
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Agent Card ───────────────────────────────────────────────

function AgentCard({
  agent,
  isSelected,
  onSelect,
}: {
  agent: RuntimeAgent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const colors = ROLE_COLORS[agent.role] || DEFAULT_ROLE_COLORS;
  const enabledSkills = agent.skills.filter((s) => s.enabled).length;
  const enabledTools = agent.tools.filter((t) => t.enabled).length;

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card
        className={`cursor-pointer transition-all duration-200 ${colors.bg} ${colors.border} border ${
          isSelected
            ? `ring-2 ring-offset-1 ring-offset-[#0f0f1a] ${colors.ring} shadow-lg ${colors.glow}`
            : 'hover:shadow-md'
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{agent.visualProfile.avatarEmoji}</span>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">{agent.name}</h3>
                <Badge className={`${colors.badge} text-[9px] h-4 px-1.5 mt-0.5`}>
                  {ROLE_ICONS[agent.role]}
                  <span className="ml-1">{agent.role.replace(/_/g, ' ')}</span>
                </Badge>
              </div>
            </div>
            <StatusDot status={agent.status} />
          </div>

          {/* Model */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-1.5 text-[10px]">
              <Cpu className="w-3 h-3 text-slate-500" />
              <span className="text-slate-400 font-mono truncate">{agent.model.preferred.split('/').pop()}</span>
            </div>
          </div>

          {/* Skills & Tools Row */}
          <div className="flex items-center gap-2 mb-3">
            {/* Skills pills */}
            {agent.skills.filter((s) => s.enabled).map((s) => (
              <TooltipProvider key={s.skillId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-rose-500/15 text-rose-300 border border-rose-500/20`}>
                      {SKILL_ICONS[s.skillId] || <Sparkles className="w-2.5 h-2.5" />}
                      {s.skillId}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 text-slate-300 text-xs">
                    Skill: {s.skillId} {s.hasConfig ? '(configured)' : ''}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {/* Tools pills */}
            {agent.tools.filter((t) => t.enabled).map((t) => (
              <TooltipProvider key={t.toolId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/20`}>
                      {TOOL_ICONS[t.toolId] || <Wrench className="w-2.5 h-2.5" />}
                      {t.toolId}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 text-slate-300 text-xs">
                    Tool: {t.toolId} (perm: {t.requiredPermission})
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Zap className="w-3 h-3" />
                    {agent.executionCount}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-800 text-slate-300 text-xs">
                  Executions
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {enabledSkills}
            </span>
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              {enabledTools}
            </span>
            <span className="flex items-center gap-1">
              <Anchor className="w-3 h-3" />
              {agent.hooks.length}
            </span>
          </div>

          {/* Chat Button */}
          <Button
            size="sm"
            className={`w-full h-7 text-xs ${
              isSelected
                ? colors.badge
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
            }`}
            variant={isSelected ? 'default' : 'ghost'}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            {isSelected ? 'Selected' : 'Chat'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────

function ChatPanel({
  agent,
  messages,
  onSend,
  loading,
  configured,
}: {
  agent: RuntimeAgent | null;
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
    if (agent) inputRef.current?.focus();
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
      <Card className="h-full min-h-[400px] bg-[#12122a] border-slate-700/50 flex items-center justify-center">
        <CardContent className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-base font-medium text-slate-400 mb-1">No Agent Selected</h3>
          <p className="text-sm text-slate-600">Choose an agent from the registry to chat</p>
        </CardContent>
      </Card>
    );
  }

  const colors = ROLE_COLORS[agent.role] || DEFAULT_ROLE_COLORS;
  const modelShort = agent.model.preferred.split('/').pop();

  return (
    <Card className="h-full min-h-[400px] bg-[#12122a] border-slate-700/50 flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{agent.visualProfile.avatarEmoji}</span>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base text-slate-200">{agent.name}</CardTitle>
            <CardDescription className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
              <span>{agent.role.replace(/_/g, ' ')}</span>
              <span className="text-slate-700">·</span>
              <span className="font-mono">{modelShort}</span>
              <span className="text-slate-700">·</span>
              <StatusDot status={agent.status} />
            </CardDescription>
          </div>
        </div>
        {/* Skills & Tools badges */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {agent.skills.filter((s) => s.enabled).map((s) => (
            <Badge key={s.skillId} className="bg-rose-500/15 text-rose-300 border-rose-500/20 text-[9px] h-4 px-1.5">
              {SKILL_ICONS[s.skillId]} <span className="ml-0.5">{s.skillId}</span>
            </Badge>
          ))}
          {agent.tools.filter((t) => t.enabled).map((t) => (
            <Badge key={t.toolId} className="bg-amber-500/15 text-amber-300 border-amber-500/20 text-[9px] h-4 px-1.5">
              {TOOL_ICONS[t.toolId]} <span className="ml-0.5">{t.toolId}</span>
            </Badge>
          ))}
        </div>
      </CardHeader>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[400px]">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">{agent.visualProfile.avatarEmoji}</div>
            <p className="text-sm text-slate-500 mb-1">Chat with {agent.name}</p>
            <p className="text-xs text-slate-600">Model: {modelShort} · Temp: {agent.execution.temperature}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-[10px] text-rose-400">{agent.skills.filter(s => s.enabled).length} skills</span>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] text-amber-400">{agent.tools.filter(t => t.enabled).length} tools</span>
            </div>
            {!configured && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-sm mx-auto">
                <p className="text-xs text-amber-300 flex items-center gap-1.5">
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
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? `bg-cyan-600/15 border border-cyan-500/20 text-slate-200`
                    : msg.error
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                    : `${colors.bg} border ${colors.border} text-slate-300`
                }`}
              >
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
            <div className={`${colors.bg} border ${colors.border} rounded-xl px-3.5 py-3`}>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
                <span className="text-[10px] text-slate-500">(skills + tools active)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700/50 shrink-0">
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

// ─── Skills & Tools Registry Panel ────────────────────────────

function SkillsToolsPanel({
  runtimeStatus,
}: {
  runtimeStatus: RuntimeStatus | null;
}) {
  if (!runtimeStatus) return null;

  const skills = runtimeStatus.skills;
  const tools = runtimeStatus.tools;

  return (
    <Card className="bg-[#12122a] border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Puzzle className="w-4 h-4 text-slate-400" />
          <CardTitle className="text-sm font-medium text-slate-300">Skills & Tools Registry</CardTitle>
        </div>
        <CardDescription className="text-xs text-slate-500">
          {skills.totalSkills} skills · {tools.totalTools} tools registered
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Skills Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <h3 className="text-xs font-semibold text-rose-400">Skills</h3>
              <Badge variant="outline" className="text-[9px] h-4 bg-slate-800/50 text-slate-500 border-slate-700">
                {skills.totalSkills}
              </Badge>
            </div>
            <div className="space-y-2">
              {skills.registrations.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15"
                >
                  <span className="mt-0.5">{SKILL_ICONS[s.id] || <Sparkles className="w-3.5 h-3.5 text-rose-400" />}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-rose-300">{s.name}</span>
                      {s.version && (
                        <Badge variant="outline" className="text-[8px] h-3 px-1 bg-slate-800/50 text-slate-500 border-slate-700">
                          v{s.version}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      id: {s.id} · from: {s.source}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tools Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-400">Tools</h3>
              <Badge variant="outline" className="text-[9px] h-4 bg-slate-800/50 text-slate-500 border-slate-700">
                {tools.totalTools}
              </Badge>
            </div>
            <div className="space-y-2">
              {tools.registrations.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15"
                >
                  <span className="mt-0.5">{TOOL_ICONS[t.id] || <Wrench className="w-3.5 h-3.5 text-amber-400" />}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-amber-300">{t.name}</span>
                      {t.version && (
                        <Badge variant="outline" className="text-[8px] h-3 px-1 bg-slate-800/50 text-slate-500 border-slate-700">
                          v{t.version}
                        </Badge>
                      )}
                      <Badge className={`text-[8px] h-3 px-1 ${PERMISSION_COLORS[t.permission] || PERMISSION_COLORS.none}`}>
                        {t.permission}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      id: {t.id} · from: {t.source}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Agent Detail Panel ───────────────────────────────────────

function AgentDetailPanel({ agent }: { agent: RuntimeAgent }) {
  const colors = ROLE_COLORS[agent.role] || DEFAULT_ROLE_COLORS;

  return (
    <Card className="bg-[#12122a] border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-400" />
          <CardTitle className="text-sm font-medium text-slate-300">Agent Detail: {agent.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Skills binding */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span className="text-[11px] font-semibold text-rose-300">Bound Skills</span>
            </div>
            {agent.skills.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic">No skills configured</p>
            ) : (
              <div className="space-y-1.5">
                {agent.skills.map((s) => (
                  <div
                    key={s.skillId}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] ${
                      s.enabled
                        ? 'bg-rose-500/10 border border-rose-500/20'
                        : 'bg-slate-800/30 border border-slate-700/30 opacity-50'
                    }`}
                  >
                    {SKILL_ICONS[s.skillId] || <Sparkles className="w-3 h-3" />}
                    <span className={s.enabled ? 'text-rose-300' : 'text-slate-500'}>{s.skillId}</span>
                    {!s.enabled && <span className="text-slate-600">(disabled)</span>}
                    {s.hasConfig && <Badge className="bg-rose-500/20 text-rose-300 text-[8px] h-3 px-1">configured</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tools binding */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-300">Bound Tools</span>
            </div>
            {agent.tools.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic">No tools configured</p>
            ) : (
              <div className="space-y-1.5">
                {agent.tools.map((t) => (
                  <div
                    key={t.toolId}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] ${
                      t.enabled
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'bg-slate-800/30 border border-slate-700/30 opacity-50'
                    }`}
                  >
                    {TOOL_ICONS[t.toolId] || <Wrench className="w-3 h-3" />}
                    <span className={t.enabled ? 'text-amber-300' : 'text-slate-500'}>{t.toolId}</span>
                    {!t.enabled && <span className="text-slate-600">(disabled)</span>}
                    <Badge className={`${PERMISSION_COLORS[t.requiredPermission] || PERMISSION_COLORS.none} text-[8px] h-3 px-1 ml-auto`}>
                      {t.requiredPermission}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Multi-Agent Demo ─────────────────────────────────────────

function MultiAgentDemo({
  agents,
  configured,
  onRunDemo,
  running,
  results,
}: {
  agents: RuntimeAgent[];
  configured: boolean;
  onRunDemo: () => void;
  running: boolean;
  results: DemoResult[];
}) {
  return (
    <Card className="bg-[#12122a] border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-300">Multi-Agent Demo</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={onRunDemo}
            disabled={running || !configured || agents.length === 0}
            className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {running ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 mr-1" />
                Run All Agents
              </>
            )}
          </Button>
        </div>
        <CardDescription className="text-xs text-slate-500">
          Send the same prompt to all agents — each responds with its own model, skills, and tools.
        </CardDescription>
      </CardHeader>

      {results.length > 0 && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {results.map((r) => {
              const colors = ROLE_COLORS[r.agentRole] || DEFAULT_ROLE_COLORS;
              return (
                <motion.div
                  key={r.agentId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={`bg-slate-900/50 ${colors.border} border`}>
                    <CardHeader className="py-2.5 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <span className="text-base">{r.emoji}</span>
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
                          <p className="text-[11px] text-slate-400 line-clamp-5 mb-2 leading-relaxed">{r.content}</p>
                          <div className="flex items-center gap-2 text-[9px] text-slate-600">
                            {r.usage && <span>{r.usage.totalTokens} tok</span>}
                            {r.durationMs > 0 && <span>{(r.durationMs / 1000).toFixed(1)}s</span>}
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

interface DemoResult {
  agentId: string;
  agentName: string;
  agentRole: string;
  emoji: string;
  color: string;
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

// ─── Main Page ────────────────────────────────────────────────

export default function Home() {
  const isMobile = useIsMobile();
  const [agents, setAgents] = useState<RuntimeAgent[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [chatLoading, setChatLoading] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResults, setDemoResults] = useState<DemoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

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

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRuntimeStatus(), fetchAIStatus()]);
    setRefreshing(false);
  }, [fetchRuntimeStatus, fetchAIStatus]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchRuntimeStatus(), fetchAIStatus()]);
      setLoading(false);
    };
    init();
  }, [fetchRuntimeStatus, fetchAIStatus]);

  // Auto-refresh agent statuses every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchRuntimeStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchRuntimeStatus]);

  // ─── Chat Handler ────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!selectedAgentId) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
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

        const res = await fetch('/api/runtime/execute', {
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
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: data.content || data.error || 'No response',
          model: data.model || data.resolvedModel?.model,
          resolvedModel: data.resolvedModel?.model,
          usage: data.usage,
          durationMs: data.durationMs,
          finishReason: data.finishReason,
          timestamp: Date.now(),
          error: !res.ok || data.status === 'error',
        };

        setChatHistories((prev) => ({
          ...prev,
          [selectedAgentId]: [...(prev[selectedAgentId] || []), assistantMsg],
        }));
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Failed to get response',
          timestamp: Date.now(),
          error: true,
        };

        setChatHistories((prev) => ({
          ...prev,
          [selectedAgentId]: [...(prev[selectedAgentId] || []), errorMsg],
        }));
      } finally {
        setChatLoading(false);
        fetchRuntimeStatus();
      }
    },
    [selectedAgentId, chatHistories, fetchRuntimeStatus],
  );

  // ─── Demo Handler ────────────────────────────────────────────

  const handleRunDemo = useCallback(async () => {
    if (agents.length === 0) return;

    setDemoRunning(true);
    setDemoResults([]);

    const demoPrompt =
      'What is your primary specialty and how would you approach a typical task? Keep your response brief (2-3 sentences).';

    const results: DemoResult[] = await Promise.all(
      agents.map(async (agent) => {
        try {
          const res = await fetch('/api/runtime/execute', {
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
            emoji: agent.visualProfile.avatarEmoji,
            color: agent.visualProfile.color,
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
            emoji: agent.visualProfile.avatarEmoji,
            color: agent.visualProfile.color,
            model: agent.model.preferred,
            content: '',
            durationMs: 0,
            error: error instanceof Error ? error.message : 'Failed',
          } as DemoResult;
        }
      }),
    );

    setDemoResults(results);
    setDemoRunning(false);
    fetchRuntimeStatus();
  }, [agents, fetchRuntimeStatus]);

  // ─── Loading State ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.2s]" />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.4s]" />
          </div>
          <p className="text-sm text-slate-400 font-mono">Initializing Agent Runtime...</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────

  const currentMessages = selectedAgentId ? chatHistories[selectedAgentId] || [] : [];
  const configured = aiStatus?.configured ?? false;
  const totalSkills = agents.reduce((sum, a) => sum + a.skills.filter((s) => s.enabled).length, 0);
  const totalTools = agents.reduce((sum, a) => sum + a.tools.filter((t) => t.enabled).length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f1a]">
      {/* ─── Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h1 className="text-lg font-bold text-slate-200 tracking-tight">
                Agent OS
              </h1>
            </div>
            <Badge variant="outline" className="text-[10px] h-5 bg-slate-800/50 text-slate-400 border-slate-700">
              Stage 3: Skills + Tools
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {aiStatus?.configured ? (
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
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshAll}
              disabled={refreshing}
              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ──────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Architecture Overview */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-medium text-slate-300">Architecture</h2>
            <Badge variant="outline" className="text-[9px] h-4 bg-slate-800/50 text-slate-500 border-slate-700">
              5-Layer
            </Badge>
          </div>
          <ArchitectureOverview />
        </section>

        {/* Agent Registry + Chat */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Agent Registry Panel */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-medium text-slate-300">Agent Registry</h2>
                <Badge variant="outline" className="text-[9px] h-4 bg-slate-800/50 text-slate-500 border-slate-700">
                  {agents.length} registered
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <AnimatePresence>
                {agents.map((agent) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AgentCard
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      onSelect={() => setSelectedAgentId(agent.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {agents.length === 0 && (
                <Card className="bg-slate-900/30 border-slate-700/50">
                  <CardContent className="p-6 text-center">
                    <Bot className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No agents registered</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-medium text-slate-300">Agent Chat</h2>
              {selectedAgent && (
                <Badge variant="outline" className="text-[9px] h-4 bg-slate-800/50 text-slate-500 border-slate-700">
                  {selectedAgent.model.preferred.split('/').pop()}
                </Badge>
              )}
            </div>
            <ChatPanel
              agent={selectedAgent}
              messages={currentMessages}
              onSend={handleSendMessage}
              loading={chatLoading}
              configured={configured}
            />
          </div>
        </section>

        {/* Agent Detail Panel (when selected) */}
        {selectedAgent && (
          <section>
            <AgentDetailPanel agent={selectedAgent} />
          </section>
        )}

        {/* Skills & Tools Registry */}
        <section>
          <SkillsToolsPanel runtimeStatus={runtimeStatus} />
        </section>

        {/* Multi-Agent Demo */}
        <section>
          <MultiAgentDemo
            agents={agents}
            configured={configured}
            onRunDemo={handleRunDemo}
            running={demoRunning}
            results={demoResults}
          />
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-slate-800/50 bg-[#0a0a16]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5" />
              <span>Stage 3 Complete</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-500">Skills & Tools integrated</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{agents.length} agents</span>
              <span className="text-slate-700">·</span>
              <span className="text-rose-400">{totalSkills} skills</span>
              <span className="text-slate-700">·</span>
              <span className="text-amber-400">{totalTools} tools</span>
              <span className="text-slate-700">·</span>
              <span>{configured ? 'Provider active' : 'No provider'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
