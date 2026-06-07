// POST /api/seed — Initialize the system with default data
// GET /api/seed — Check if system has been initialized

import { NextResponse } from 'next/server';
import { initializeSystem } from '@/lib/seed';

export async function GET() {
  try {
    const { getSystemStatus } = await import('@/lib/seed');
    const status = await getSystemStatus();
    const initialized = status.users > 0;

    return NextResponse.json({ initialized, status });
  } catch (error) {
    console.error('[API] GET /seed error:', error);
    return NextResponse.json({ error: 'Failed to check system status' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await initializeSystem();
    return NextResponse.json({
      message: 'System initialized successfully',
      user: { id: result.user.id, email: result.user.email },
      workspace: { id: result.workspace.id, name: result.workspace.name },
      agentsSeeded: result.agentsSeeded,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /seed error:', error);
    return NextResponse.json({ error: 'Failed to initialize system' }, { status: 500 });
  }
}
