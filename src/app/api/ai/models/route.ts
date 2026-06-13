// GET /api/ai/models — List available models from OpenRouter

import { NextRequest, NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/ai-provider/provider-registry';
import { initProviders } from '@/lib/ai-provider';

let providersInitialized = false;
async function ensureProviders() {
  if (!providersInitialized) {
    await initProviders();
    providersInitialized = true;
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureProviders();

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider') || 'openrouter';
    const query = searchParams.get('q')?.toLowerCase();

    const provider = providerRegistry.get(providerId);
    if (!provider) {
      // Provider not registered (e.g., API key not configured)
      return NextResponse.json({ models: [], total: 0 });
    }

    if (!provider.listModels) {
      return NextResponse.json({ models: [], total: 0 });
    }

    let models = await provider.listModels();

    // Filter by search query if provided
    if (query) {
      models = models.filter(
        (m) => m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query),
      );
    }

    // Limit to 100 results
    models = models.slice(0, 100);

    return NextResponse.json({ models, total: models.length });
  } catch (error) {
    console.error('[API] GET /ai/models error:', error);
    return NextResponse.json(
      { error: 'Failed to list models' },
      { status: 500 },
    );
  }
}
