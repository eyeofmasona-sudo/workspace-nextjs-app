// GET  /api/marketing/brand-profile — get current brand profile
// PATCH /api/marketing/brand-profile — update workspace-specific overrides

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { brandProfileService } from '@/lib/marketing/BrandProfile';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId') ?? undefined;
  const profile = brandProfileService.get(workspaceId);
  return NextResponse.json({ ok: true, profile });
}

const patchSchema = z.object({
  workspaceId: z.string(),
  forbiddenClaims: z.array(z.string()).optional(),
  brandVoice: z.array(z.string()).optional(),
  targetAudience: z.array(z.string()).optional(),
  requiredDisclaimers: z.array(z.string()).optional(),
  toneRules: z.array(z.string()).optional(),
  visualStyleRules: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
  }

  const { workspaceId, ...override } = parsed.data;
  brandProfileService.setOverride(workspaceId, override);
  const updated = brandProfileService.get(workspaceId);
  return NextResponse.json({ ok: true, profile: updated });
}
