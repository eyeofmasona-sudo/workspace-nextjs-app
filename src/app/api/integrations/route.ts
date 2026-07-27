import { NextResponse } from 'next/server';
import { JARVIS_INTEGRATIONS, integrationCategories } from '@/lib/integrations/catalog';

export async function GET() {
  const enabled = JARVIS_INTEGRATIONS.filter((item) => item.enabledByDefault).length;
  const services = JARVIS_INTEGRATIONS.filter((item) => item.mode === 'managed-service' || item.mode === 'remote-only').length;

  return NextResponse.json({
    integrations: JARVIS_INTEGRATIONS,
    categories: integrationCategories,
    summary: {
      total: JARVIS_INTEGRATIONS.length,
      enabledByDefault: enabled,
      isolatedServices: services,
      orchestrator: 'jarvis',
      installRoot: 'D:/JARVIS',
    },
  });
}
