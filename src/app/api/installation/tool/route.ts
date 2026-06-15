// POST /api/installation/tool — Tool installation actions (install/uninstall/enable/disable)

import { NextRequest, NextResponse } from 'next/server';
import { installationService } from '@/lib/installation';
import { loggers } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, toolKey, action } = body;

    if (!agentId || !toolKey || !action) {
      return NextResponse.json(
        { error: 'agentId, toolKey, and action are required' },
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
        result = await installationService.installTool(agentId, toolKey);
        break;
      case 'uninstall':
        result = await installationService.uninstallTool(agentId, toolKey);
        break;
      case 'enable':
        result = await installationService.enableTool(agentId, toolKey);
        break;
      case 'disable':
        result = await installationService.disableTool(agentId, toolKey);
        break;
    }

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] POST /installation/tool error:');
    return NextResponse.json(
      { error: 'Failed to perform tool action' },
      { status: 500 }
    );
  }
}
