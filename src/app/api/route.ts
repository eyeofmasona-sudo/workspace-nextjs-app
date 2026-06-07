// GET /api — System health check and overview

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Agent OS',
    version: '0.1.0',
    status: 'running',
    description: 'Visual AI Platform with Agent Office',
    endpoints: {
      projects: '/api/projects',
      agents: '/api/agents',
      tasks: '/api/tasks',
      events: '/api/events',
      memory: '/api/memory',
      approvals: '/api/approvals',
      seed: '/api/seed',
      status: '/api/status',
    },
  });
}
