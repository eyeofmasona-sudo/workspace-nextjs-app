// ─── Agent OS — Seed / Initialization ───────────────────────
// Creates the default user, workspace, and agents on first run.

import { db } from '../db';
import { agentRegistry } from '../agent-registry';

const DEFAULT_USER_EMAIL = 'admin@agent-os.local';
const DEFAULT_USER_NAME = 'Admin';
const DEFAULT_WORKSPACE_NAME = 'My Workspace';

/**
 * Initialize the system with default data.
 * Safe to call multiple times — checks for existing data.
 */
export async function initializeSystem() {
  // 1. Ensure default user exists
  let user = await db.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });

  if (!user) {
    user = await db.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        name: DEFAULT_USER_NAME,
        settings: JSON.stringify({
          theme: 'system',
          language: 'en',
          notifications: true,
        }),
      },
    });
    console.log('[Seed] Created default user:', user.id);
  }

  // 2. Ensure default workspace exists
  let workspace = await db.workspace.findFirst({
    where: { ownerId: user.id },
  });

  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        ownerId: user.id,
        name: DEFAULT_WORKSPACE_NAME,
        mode: 'single',
      },
    });
    console.log('[Seed] Created default workspace:', workspace.id);
  }

  // 3. Seed default agents
  const result = await agentRegistry.seedDefaultAgents(workspace.id);
  if (result.created > 0) {
    console.log(`[Seed] Created ${result.created} default agents (skipped ${result.skipped})`);
  }

  return { user, workspace, agentsSeeded: result };
}

/**
 * Get the system status (counts of all entities)
 */
export async function getSystemStatus() {
  const [
    userCount,
    workspaceCount,
    projectCount,
    epicCount,
    taskCount,
    agentCount,
    memoryCount,
    approvalCount,
    eventCount,
    costLogCount,
  ] = await Promise.all([
    db.user.count(),
    db.workspace.count(),
    db.project.count(),
    db.epic.count(),
    db.task.count(),
    db.agent.count(),
    db.memoryItem.count(),
    db.approvalRequest.count(),
    db.eventLog.count(),
    db.costLog.count(),
  ]);

  return {
    users: userCount,
    workspaces: workspaceCount,
    projects: projectCount,
    epics: epicCount,
    tasks: taskCount,
    agents: agentCount,
    memories: memoryCount,
    approvals: approvalCount,
    events: eventCount,
    costLogs: costLogCount,
  };
}
