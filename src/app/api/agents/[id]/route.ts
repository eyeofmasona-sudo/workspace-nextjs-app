// GET /api/agents/:id — Get a single agent by ID with full details
// PATCH /api/agents/:id — Update basic agent fields

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  agentProfileService,
  agentCapabilityService,
  agentPermissionService,
  agentModelConfigService,
  agentRuntimeService,
} from '@/lib/agent-system';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        profile: true,
        capabilities: true,
        permissions: true,
        modelConfigs: true,
        runtimeState: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Parse JSON fields on agent
    const parsedAgent = {
      ...agent,
      visualProfile: agent.visualProfile ? JSON.parse(agent.visualProfile) : null,
      professionalStyle: agent.professionalStyle ? JSON.parse(agent.professionalStyle) : null,
    };

    // Build profile summary
    const profileSummary = agent.profile
      ? {
          displayName: agent.profile.displayName,
          avatarKey: agent.profile.avatarKey,
          seniority: agent.profile.seniority,
        }
      : null;

    // Build capabilities summary
    const capabilitiesSummary = agent.capabilities.map((cap) => ({
      capabilityKey: cap.capabilityKey,
      level: cap.level,
      enabled: cap.enabled,
    }));

    // Build permissions summary
    const permissionsSummary = agent.permissions.map((perm) => ({
      permissionKey: perm.permissionKey,
      permissionLevel: perm.permissionLevel,
      enabled: perm.enabled,
    }));

    return NextResponse.json({
      agent: parsedAgent,
      profileSummary,
      capabilitiesSummary,
      permissionsSummary,
      models: agent.modelConfigs,
      runtimeState: agent.runtimeState
        ? {
            ...agent.runtimeState,
            metadata: agent.runtimeState.metadata
              ? JSON.parse(agent.runtimeState.metadata)
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error('[API] GET /agents/:id error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workspaceId, name, role, systemPrompt, visualProfile, professionalStyle } = body;

    // Verify workspaceId is provided
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify agent exists and belongs to workspace
    const existing = await db.agent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (existing.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Agent does not belong to the specified workspace' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (visualProfile !== undefined) updateData.visualProfile = JSON.stringify(visualProfile);
    if (professionalStyle !== undefined) updateData.professionalStyle = JSON.stringify(professionalStyle);

    const updated = await db.agent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      agent: {
        ...updated,
        visualProfile: updated.visualProfile ? JSON.parse(updated.visualProfile) : null,
        professionalStyle: updated.professionalStyle ? JSON.parse(updated.professionalStyle) : null,
      },
    });
  } catch (error) {
    console.error('[API] PATCH /agents/:id error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}
