// GET /api/ai/status — Check AI provider status and configuration

import { NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/ai-provider/provider-registry';
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
      providers.map(async (provider) => ({
        id: provider.id,
        name: provider.name,
        available: await provider.isAvailable().catch(() => false),
      })),
    );

    return NextResponse.json({
      configured: providerStatuses.some((provider) => provider.available),
      providers: providerStatuses,
      registeredProviderIds: providerRegistry.listIds(),
    });
  } catch (error) {
    loggers.api.error({ err: error }, '[API] GET /ai/status error:');
    return NextResponse.json({
      configured: false,
      providers: [],
      registeredProviderIds: providerRegistry.listIds(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
