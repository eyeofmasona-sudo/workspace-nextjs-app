// GET /api/skills — List all skills with optional filters
// POST /api/skills — Seed default skills

import { NextRequest, NextResponse } from 'next/server';
import { skillRegistryService } from '@/lib/skill-registry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const tagsParam = searchParams.get('tags');

    const filters: { category?: string; status?: string; tags?: string[] } = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (tagsParam) {
      filters.tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const skills = await skillRegistryService.listSkills(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return NextResponse.json({ skills });
  } catch (error) {
    console.error('[API] GET /skills error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'seed') {
      const result = await skillRegistryService.seedDefaults();
      return NextResponse.json({ result }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported: "seed"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] POST /skills error:', error);
    return NextResponse.json(
      { error: 'Failed to process skills request' },
      { status: 500 }
    );
  }
}
