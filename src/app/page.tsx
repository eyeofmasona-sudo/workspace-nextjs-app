// ─── Agent OS — Landing Page ─────────────────────────────────
// Foundation dashboard with Orchestrator Core integration.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Crown,
  Search,
  Building2,
  Palette,
  Code2,
  Server,
  Database,
  ShieldCheck,
  Rocket,
  BookOpen,
  Activity,
  Users,
  FolderKanban,
  ListChecks,
  Brain,
  CheckCircle2,
  AlertCircle,
  Zap,
  Loader2,
  Cpu,
  BarChart3,
  Send,
  Sparkles,
  ShieldAlert,
  DollarSign,
  ListTree,
  UserCheck,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface SystemStatus {
  users: number;
  workspaces: number;
  projects: number;
  epics: number;
  tasks: number;
  agents: number;
  memories: number;
  approvals: number;
  events: number;
  costLogs: number;
}

interface AgentData {
  id: string;
  name: string;
  role: string;
  type: string;
  status: string;
  locationZone: string;
  visualProfile: string | null;
  professionalStyle: string | null;
  workspaceId: string;
  createdAt: string;
}

interface OrchestratorResponse {
  type: string;
  summary: string;
  plan?: {
    goal: string;
    taskSize: string;
    epics: Array<{
      title: string;
      tasks: Array<{ title: string; assignedAgentRole?: string }>;
    }>;
    estimatedCost: { level: string; estimatedTokens?: number; estimatedUsd?: number; notes: string[] };
    risks: string[];
    requiredApprovals: string[];
    executionMode: string;
  };
  createdTasks?: Array<{
    id: string;
    title: string;
    status: string;
    assignedAgentId?: string;
    assignedAgentName?: string;
  }>;
  approvals?: Array<{
    id: string;
    actionType: string;
    summary: string;
    risk: string;
    status: string;
  }>;
  estimatedCost?: { level: string; estimatedTokens?: number; estimatedUsd?: number; notes: string[] };
}

// ─── Constants ───────────────────────────────────────────────

const AGENT_ICONS: Record<string, React.ElementType> = {
  orchestrator: Crown,
  analyst: Search,
  architect: Building2,
  designer: Palette,
  frontend_engineer: Code2,
  backend_engineer: Server,
  data_engineer: Database,
  qa_engineer: ShieldCheck,
  devops_engineer: Rocket,
  researcher: BookOpen,
};

const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#8B5CF6',
  analyst: '#3B82F6',
  architect: '#F59E0B',
  designer: '#EC4899',
  frontend_engineer: '#10B981',
  backend_engineer: '#6366F1',
  data_engineer: '#14B8A6',
  qa_engineer: '#F43F5E',
  devops_engineer: '#F97316',
  researcher: '#8B5CF6',
};

const ZONE_LABELS: Record<string, string> = {
  command_area: 'Command Area',
  situation_room: 'Situation Room',
  development_area: 'Dev Area',
  design_area: 'Design Studio',
  research_area: 'Research Lab',
  server_room: 'Server Room',
  meeting_room: 'Meeting Room',
  lounge_area: 'Lounge',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-emerald-500',
  thinking: 'bg-amber-500',
  working: 'bg-blue-500',
  waiting_api: 'bg-yellow-500',
  reviewing: 'bg-purple-500',
  waiting_approval: 'bg-orange-500',
  done: 'bg-green-500',
  error: 'bg-red-500',
  offline: 'bg-gray-400',
};

const COST_COLORS: Record<string, string> = {
  low: 'text-emerald-500',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  potentially_high: 'text-red-500',
};

// ─── Component ───────────────────────────────────────────────

export default function Home() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Orchestrator state
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'manual' | 'balanced' | 'autonomous'>('balanced');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<OrchestratorResponse | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data.status);
      setInitialized(data.status?.users > 0);
    } catch {
      console.error('Failed to fetch status');
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents ?? []);
    } catch {
      console.error('Failed to fetch agents');
    }
  }, []);

  const initSystem = async () => {
    setSeeding(true);
    try {
      const seedRes = await fetch('/api/seed', { method: 'POST' });
      const seedData = await seedRes.json();
      if (seedData.workspace?.id) {
        setWorkspaceId(seedData.workspace.id);
      }
      await fetchStatus();
      await fetchAgents();
      setInitialized(true);
    } catch {
      console.error('Failed to initialize system');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchStatus();
      await fetchAgents();
      setLoading(false);
    };
    load();
  }, [fetchStatus, fetchAgents]);

  // Get workspace ID from agents if available
  useEffect(() => {
    if (!workspaceId && agents.length > 0) {
      setWorkspaceId(agents[0].workspaceId);
    }
  }, [agents, workspaceId]);

  const sendMessage = async () => {
    if (!message.trim() || !workspaceId) return;
    setSending(true);
    setResponse(null);
    try {
      const res = await fetch('/api/orchestrator/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          message,
          mode,
        }),
      });
      const data = await res.json();
      setResponse(data);
      // Refresh status to show new tasks/events
      await fetchStatus();
    } catch (error) {
      console.error('Failed to send message:', error);
      setResponse({
        type: 'error',
        summary: 'Failed to communicate with the orchestrator',
      });
    } finally {
      setSending(false);
    }
  };

  const approvePlan = async () => {
    if (!response?.plan || !workspaceId) return;
    setSending(true);
    try {
      const res = await fetch('/api/orchestrator/approve-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          plan: response.plan,
        }),
      });
      const data = await res.json();
      setResponse(data);
      await fetchStatus();
    } catch (error) {
      console.error('Failed to approve plan:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Agent OS</h1>
              <p className="text-xs text-muted-foreground">Visual AI Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <Badge variant="outline" className="gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${initialized ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {initialized ? 'System Ready' : 'Not Initialized'}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={initSystem}
              disabled={seeding || initialized}
            >
              {seeding ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Initializing...</>
              ) : initialized ? (
                <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Initialized</>
              ) : (
                <><Zap className="w-3.5 h-3.5 mr-1.5" /> Initialize System</>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Orchestrator Command Center */}
            {initialized && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Orchestrator
                  <Badge variant="secondary" className="ml-1 text-[10px]">v2</Badge>
                </h2>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {/* Mode Selector */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Mode:</span>
                        <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="autonomous">Autonomous</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">
                          {mode === 'manual' ? 'Always plan first' : mode === 'balanced' ? 'Plan for large tasks' : 'Execute small tasks directly'}
                        </span>
                      </div>

                      {/* Message Input */}
                      <div className="flex gap-3">
                        <Textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Describe a task... e.g., &quot;Create a dashboard for user analytics&quot; or &quot;Fix the login button color&quot;"
                          className="min-h-[80px] resize-none text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              sendMessage();
                            }
                          }}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={sending || !message.trim()}
                          className="shrink-0 self-end"
                          size="lg"
                        >
                          {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Response */}
                      {response && (
                        <div className="space-y-3">
                          <Separator />

                          {/* Response Header */}
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                response.type === 'error' ? 'destructive' :
                                response.type === 'plan_required' ? 'default' :
                                response.type === 'task_started' ? 'secondary' :
                                'outline'
                              }
                            >
                              {response.type.replace(/_/g, ' ')}
                            </Badge>
                            <p className="text-sm">{response.summary}</p>
                          </div>

                          {/* Plan Preview */}
                          {response.plan && (
                            <Card className="bg-muted/50">
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <ListTree className="w-4 h-4" />
                                    Plan: {response.plan.goal.slice(0, 80)}
                                  </CardTitle>
                                  <Badge variant="outline" className="text-[10px]">
                                    {response.plan.taskSize}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0 space-y-3">
                                {/* Epics */}
                                {response.plan.epics.map((epic, i) => (
                                  <div key={i} className="text-xs">
                                    <p className="font-semibold mb-1">
                                      Epic {i + 1}: {epic.title}
                                    </p>
                                    <ul className="space-y-0.5 ml-3">
                                      {epic.tasks.map((task, j) => (
                                        <li key={j} className="text-muted-foreground flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                          {task.title}
                                          {task.assignedAgentRole && (
                                            <span className="text-[10px] opacity-60">
                                              ({task.assignedAgentRole.replace(/_/g, ' ')})
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}

                                {/* Risks & Approvals */}
                                {(response.plan.risks.length > 0 || response.plan.requiredApprovals.length > 0) && (
                                  <div className="flex flex-wrap gap-2">
                                    {response.plan.risks.map((risk, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px] gap-1 border-orange-300 text-orange-600">
                                        <ShieldAlert className="w-3 h-3" /> {risk}
                                      </Badge>
                                    ))}
                                    {response.plan.requiredApprovals.map((ap, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px] gap-1 border-red-300 text-red-600">
                                        <ShieldAlert className="w-3 h-3" /> Approval: {ap}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {/* Cost */}
                                {response.plan.estimatedCost && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    <span className={COST_COLORS[response.plan.estimatedCost.level] ?? ''}>
                                      {response.plan.estimatedCost.level.replace(/_/g, ' ')}
                                    </span>
                                    {response.plan.estimatedCost.estimatedUsd !== undefined && (
                                      <span className="text-muted-foreground">
                                        (~${response.plan.estimatedCost.estimatedUsd})
                                      </span>
                                    )}
                                    {response.plan.estimatedCost.notes.map((note, i) => (
                                      <span key={i} className="text-muted-foreground italic">{note}</span>
                                    ))}
                                  </div>
                                )}

                                {/* Approve Button */}
                                {response.type === 'plan_required' && (
                                  <Button onClick={approvePlan} disabled={sending} size="sm" className="mt-2">
                                    {sending ? (
                                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating tasks...</>
                                    ) : (
                                      <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve Plan & Create Tasks</>
                                    )}
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Created Tasks */}
                          {response.createdTasks && response.createdTasks.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold flex items-center gap-1.5">
                                <ListChecks className="w-3.5 h-3.5" />
                                Created Tasks ({response.createdTasks.length})
                              </p>
                              {response.createdTasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-3 py-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span className="font-medium">{task.title}</span>
                                  {task.assignedAgentName && (
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <UserCheck className="w-3 h-3" /> {task.assignedAgentName}
                                    </span>
                                  )}
                                  <Badge variant="outline" className="text-[10px] ml-auto">{task.status}</Badge>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Cost Estimate (for non-plan responses) */}
                          {response.estimatedCost && !response.plan && (
                            <div className="flex items-center gap-2 text-xs">
                              <DollarSign className="w-3.5 h-3.5" />
                              <span className={COST_COLORS[response.estimatedCost.level] ?? ''}>
                                Cost: {response.estimatedCost.level.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}

                          {/* Approvals */}
                          {response.approvals && response.approvals.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
                                Pending Approvals ({response.approvals.length})
                              </p>
                              {response.approvals.map((ap) => (
                                <div key={ap.id} className="flex items-center gap-2 text-xs bg-orange-50 dark:bg-orange-950/20 rounded px-3 py-1.5">
                                  <span className="font-medium">{ap.summary}</span>
                                  <Badge variant="outline" className="text-[10px]">{ap.risk} risk</Badge>
                                  <Badge variant="outline" className="text-[10px]">{ap.status}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            <Separator className="mb-8" />

            {/* Status Cards */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-500" />
                System Overview
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <StatusCard icon={<Users className="w-4 h-4" />} label="Users" value={status?.users ?? 0} color="text-violet-500" />
                <StatusCard icon={<FolderKanban className="w-4 h-4" />} label="Projects" value={status?.projects ?? 0} color="text-blue-500" />
                <StatusCard icon={<ListChecks className="w-4 h-4" />} label="Tasks" value={status?.tasks ?? 0} color="text-emerald-500" />
                <StatusCard icon={<Brain className="w-4 h-4" />} label="Agents" value={status?.agents ?? 0} color="text-amber-500" />
                <StatusCard icon={<BarChart3 className="w-4 h-4" />} label="Events" value={status?.events ?? 0} color="text-pink-500" />
              </div>
            </section>

            <Separator className="mb-8" />

            {/* Agent Team */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Agent Team
                <Badge variant="secondary" className="ml-2">{agents.length} agents</Badge>
              </h2>

              {agents.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm mb-4">
                      No agents registered yet. Initialize the system to create the default team.
                    </p>
                    <Button onClick={initSystem} disabled={seeding}>
                      {seeding ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" /> Initialize System</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
                  {agents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              )}
            </section>

            {/* Entity Stats */}
            {initialized && status && (
              <>
                <Separator className="mb-8" />
                <section className="mb-8">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-pink-500" />
                    Entity Breakdown
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MiniStat label="Workspaces" value={status.workspaces} />
                    <MiniStat label="Epics" value={status.epics} />
                    <MiniStat label="Memories" value={status.memories} />
                    <MiniStat label="Approvals" value={status.approvals} />
                    <MiniStat label="Cost Logs" value={status.costLogs} />
                    <MiniStat label="Events" value={status.events} />
                    <MiniStat label="Tasks" value={status.tasks} />
                    <MiniStat label="Projects" value={status.projects} />
                  </div>
                </section>
              </>
            )}

            {/* Architecture Info */}
            <Separator className="mb-8" />
            <section>
              <h2 className="text-lg font-semibold mb-4">Architecture</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard
                  title="Orchestrator Core"
                  description="Deterministic orchestrator with planning, decomposition, agent assignment, and approval workflows. 3 execution modes: manual, balanced, autonomous."
                  badge="Active"
                />
                <InfoCard
                  title="Event Bus"
                  description="Type-safe event-driven architecture with 22 event types. Future: WebSocket-based pub/sub for real-time UI updates."
                  badge="Active"
                />
                <InfoCard
                  title="Agent Registry"
                  description="10 default specialist agents with keyword-based assignment. Dynamic registration for temporary specialists."
                  badge="Active"
                />
                <InfoCard
                  title="Planning Engine"
                  description="Heuristic task classification (small/medium/large/epic) with plan templates for CRM, Dashboard, RAG, Auth. Deterministic, no AI."
                  badge="Active"
                />
                <InfoCard
                  title="Approval Engine"
                  description="Keyword-based risk detection with 10 risk groups. Automatic approval requests for delete/deploy/secret/payment actions."
                  badge="Active"
                />
                <InfoCard
                  title="Data Model"
                  description="10 entities: User, Workspace, Project, Epic, Task, Agent, MemoryItem, ApprovalRequest, EventLog, CostLog."
                  badge="Complete"
                />
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Agent OS v0.2.0 — Orchestrator Core</span>
          <span>Next.js 16 · Prisma · SQLite · TypeScript</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatusCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={color}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function AgentCard({ agent }: { agent: AgentData }) {
  const IconComponent = AGENT_ICONS[agent.role] ?? Cpu;
  const color = AGENT_COLORS[agent.role] ?? '#6B7280';
  const zoneLabel = ZONE_LABELS[agent.locationZone] ?? agent.locationZone;
  const statusDot = STATUS_COLORS[agent.status] ?? 'bg-gray-400';

  let parsedProfile: { avatarEmoji?: string; color?: string; icon?: string } | null = null;
  try {
    parsedProfile = agent.visualProfile ? JSON.parse(agent.visualProfile) : null;
  } catch {
    parsedProfile = null;
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {parsedProfile?.avatarEmoji ?? <IconComponent className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">{agent.name}</CardTitle>
              <CardDescription className="text-xs truncate">
                {agent.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {agent.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-muted-foreground capitalize">{agent.status.replace(/_/g, ' ')}</span>
          </div>
          <span className="text-muted-foreground">{zoneLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function InfoCard({ title, description, badge }: { title: string; description: string; badge: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge
            variant={badge === 'Complete' ? 'default' : badge === 'Active' ? 'secondary' : 'outline'}
            className="text-[10px]"
          >
            {badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
