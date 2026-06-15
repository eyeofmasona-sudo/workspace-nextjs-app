// GET /api/ai/status — Check AI provider status and configuration

import { NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/ai-provider/provider-registry';
import { isOpenRouterConfigured } from '@/lib/ai-provider/openrouter/config';
import { initProviders } from '@/lib/ai-provider';
import { loggers } from '@/lib/logger';

let providersInitialized = false;
async function ensureProviders() {
  if (!providersInitialized) {
    await initProviders();
    providersInitialized = true;
  }
}

export async function GET() {
  try {
    await ensureProviders();

    const providers = providerRegistry.listAll();
    const providerStatuses = await Promise.all(
      providers.map(async (p) => ({
        id: p.id,
        name: p.name,
        available: await p.isAvailable().catch(() => false),
      })),
    );

    return NextResponse.json({
      configured: isOpenRouterConfigured(),
      providers: providerStatuses,
      registeredProviderIds: providerRegistry.listIds(),
    });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /ai/status error:');
    return NextResponse.json({
      configured: isOpenRouterConfigured(),
      providers: [],
      registeredProviderIds: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
