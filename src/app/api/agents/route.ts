// GET /api/agents — List all agents (with optional filters)
// POST /api/agents — Register a new agent (or seed defaults)

import { NextRequest, NextResponse } from 'next/server';
import { agentRegistry } from '@/lib/agent-registry';
import { agentCapabilityService } from '@/lib/agent-system';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const zone = searchParams.get('zone');
    const capability = searchParams.get('capability');

    // Find agents by capability
    if (capability && workspaceId) {
      const agents = await agentCapabilityService.findAgentsByCapability(workspaceId, capability);
      return NextResponse.json({ agents });
    }

    if (role) {
      const agents = await agentRegistry.getAgentsByRole(role, workspaceId ?? undefined);
      return NextResponse.json({ agents });
    }

    if (status) {
      const agents = await agentRegistry.getAgentsByStatus(status as 'idle' | 'thinking' | 'working' | 'waiting_api' | 'reviewing' | 'waiting_approval' | 'done' | 'error' | 'offline', workspaceId ?? undefined);
      return NextResponse.json({ agents });
    }

    if (zone) {
      const agents = await agentRegistry.getAgentsByZone(zone as 'command_area' | 'situation_room' | 'development_area' | 'design_area' | 'research_area' | 'server_room' | 'meeting_room' | 'lounge_area' | 'marketing_area' | 'content_studio' | 'growth_lab', workspaceId ?? undefined);
      return NextResponse.json({ agents });
    }

    const agents = await agentRegistry.getAgents(workspaceId ?? undefined);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[API] GET /agents error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Special action: seed default agents
    if (body.action === 'seed') {
      const { workspaceId } = body;
      if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId is required for seeding' }, { status: 400 });
      }
      const result = await agentRegistry.seedDefaultAgents(workspaceId);
      return NextResponse.json({ result }, { status: 201 });
    }

    // Register a custom agent
    const { workspaceId, name, role, type, systemPrompt, locationZone, visualProfile, professionalStyle } = body;
    if (!workspaceId || !name || !role) {
      return NextResponse.json(
        { error: 'workspaceId, name, and role are required' },
        { status: 400 }
      );
    }

    const agent = await agentRegistry.registerAgent(workspaceId, {
      name,
      role,
      type: type ?? 'temporary',
      systemPrompt: systemPrompt ?? '',
      defaultStatus: 'idle',
      defaultLocationZone: locationZone ?? 'lounge_area',
      visualProfile: visualProfile ?? { color: '#6B7280', icon: 'Bot', avatarEmoji: '🤖' },
      professionalStyle: professionalStyle ?? {
        communicationStyle: 'Direct and efficient',
        decisionMaking: 'Task-oriented',
        attentionToDetail: 'Focused on assigned tasks',
        collaborationStyle: 'Independent worker',
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /agents error:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
