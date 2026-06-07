// ─── Agent OS — Landing Page ─────────────────────────────────
// Foundation dashboard showing system status, agents, and entities.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  createdAt: string;
}

// ─── Agent Icon Map ──────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────

export default function Home() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

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
      await fetch('/api/seed', { method: 'POST' });
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
            {/* Status Cards */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-500" />
                System Overview
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <StatusCard
                  icon={<Users className="w-4 h-4" />}
                  label="Users"
                  value={status?.users ?? 0}
                  color="text-violet-500"
                />
                <StatusCard
                  icon={<FolderKanban className="w-4 h-4" />}
                  label="Projects"
                  value={status?.projects ?? 0}
                  color="text-blue-500"
                />
                <StatusCard
                  icon={<ListChecks className="w-4 h-4" />}
                  label="Tasks"
                  value={status?.tasks ?? 0}
                  color="text-emerald-500"
                />
                <StatusCard
                  icon={<Brain className="w-4 h-4" />}
                  label="Agents"
                  value={status?.agents ?? 0}
                  color="text-amber-500"
                />
                <StatusCard
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="Events"
                  value={status?.events ?? 0}
                  color="text-pink-500"
                />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[800px] overflow-y-auto">
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
              <h2 className="text-lg font-semibold mb-4">Foundation Architecture</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard
                  title="Event Bus"
                  description="Type-safe event-driven architecture with 16 event types. Future: WebSocket-based pub/sub for real-time UI updates."
                  badge="Active"
                />
                <InfoCard
                  title="Agent Registry"
                  description="10 default specialist agents with roles, zones, and professional styles. Dynamic registration supported."
                  badge="Active"
                />
                <InfoCard
                  title="Memory System"
                  description="Scoped memory storage (global, workspace, project, agent, task) with search. Future: RAG + vector search."
                  badge="Skeleton"
                />
                <InfoCard
                  title="Approval System"
                  description="Human-in-the-loop approval for risky operations. Events: requested, approved, rejected."
                  badge="Skeleton"
                />
                <InfoCard
                  title="Cost Tracking"
                  description="Per-agent and per-task cost logging for AI model usage. Aggregation by workspace supported."
                  badge="Skeleton"
                />
                <InfoCard
                  title="Data Model"
                  description="11 entities: User, Workspace, Project, Epic, Task, Agent, MemoryItem, ApprovalRequest, EventLog, CostLog."
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
          <span>Agent OS v0.1.0 — Foundation Architecture</span>
          <span>Next.js 16 · Prisma · SQLite · TypeScript</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatusCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
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

function InfoCard({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge: string;
}) {
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
