// ─── Marketing Department — Handoff API ──────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { handoffService } from '@/lib/marketing-department';
import { EventTypes } from '@/lib/types/events';
import type { HandoffArtifact } from '@/lib/types/departments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, eventType, workspaceId, projectId, artifacts, emittedBy, feedbackReport } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'initiate_dev_to_marketing': {
        if (!eventType || !workspaceId || !projectId || !artifacts || !emittedBy) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: eventType, workspaceId, projectId, artifacts, emittedBy' },
            { status: 400 }
          );
        }

        const result = await handoffService.initiateDevToMarketingHandoff(
          eventType,
          workspaceId,
          projectId,
          artifacts as HandoffArtifact[],
          emittedBy,
        );

        return NextResponse.json({ success: result.success, data: result });
      }

      case 'send_feedback_to_dev': {
        if (!workspaceId || !projectId || !feedbackReport) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: workspaceId, projectId, feedbackReport' },
            { status: 400 }
          );
        }

        const result = await handoffService.sendFeedbackToDev(
          workspaceId,
          projectId,
          feedbackReport,
        );

        return NextResponse.json({ success: result.success, data: result });
      }

      case 'complete_handoff': {
        if (!body.contractId || !body.producedArtifacts) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: contractId, producedArtifacts' },
            { status: 400 }
          );
        }

        const result = await handoffService.completeHandoff(
          body.contractId,
          body.producedArtifacts as HandoffArtifact[],
        );

        return NextResponse.json({ success: result.success, data: result });
      }

      case 'list_handoffs': {
        const { marketingDepartmentRegistry } = await import('@/lib/marketing-department');
        const handoffs = marketingDepartmentRegistry.getAllHandoffStates();
        return NextResponse.json({ success: true, data: handoffs });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Marketing Handoff API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
