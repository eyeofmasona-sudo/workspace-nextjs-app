// GET /api/workflows — List workflow templates
// POST /api/workflows — Create a new workflow template

import { NextRequest, NextResponse } from 'next/server';
import { workflowService } from '@/lib/workflows';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? undefined;

    const templates = await workflowService.listTemplates(category);
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[API] GET /workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, steps } = body;

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'name and steps (non-empty array) are required' },
        { status: 400 }
      );
    }

    const template = await workflowService.createTemplate(body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow template' },
      { status: 500 }
    );
  }
}
