// POST /api/installation/skill — Skill installation actions (install/uninstall/enable/disable)

import { NextRequest, NextResponse } from 'next/server';
import { installationService } from '@/lib/installation';
import { loggers } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, skillKey, action } = body;

    if (!agentId || !skillKey || !action) {
      return NextResponse.json(
        { error: 'agentId, skillKey, and action are required' },
        { status: 400 }
      );
    }

    const validActions = ['install', 'uninstall', 'enable', 'disable'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'install':
        result = await installationService.installSkill(agentId, skillKey);
        break;
      case 'uninstall':
        result = await installationService.uninstallSkill(agentId, skillKey);
        break;
      case 'enable':
        result = await installationService.enableSkill(agentId, skillKey);
        break;
      case 'disable':
        result = await installationService.disableSkill(agentId, skillKey);
        break;
    }

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /installation/skill error:');
    return NextResponse.json(
      { error: 'Failed to perform skill action' },
      { status: 500 }
    );
  }
}
