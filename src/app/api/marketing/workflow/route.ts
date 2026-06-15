// ─── Marketing Department — Workflow API ─────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { marketingDepartmentRegistry } from '@/lib/marketing-department';
import { loggers } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query param: projectId' },
        { status: 400 }
      );
    }

    const workflowState = marketingDepartmentRegistry.getWorkflowState(projectId);
    const campaigns = marketingDepartmentRegistry.getCampaignsByProject(projectId);
    const intelligence = marketingDepartmentRegistry.getIntelligenceByProject(projectId);
    const contentAssets = marketingDepartmentRegistry.getContentAssetsByProject(projectId);
    const feedbackReports = marketingDepartmentRegistry.getFeedbackReportsByProject(projectId);

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        workflowState,
        campaigns,
        intelligence,
        contentAssets,
        feedbackReports,
      },
    });
  } catch (error) {
    loggers.api.error({ err: error }, '[Marketing Workflow API] Error:');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, workflowState } = body;

    if (!projectId || !workflowState) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, workflowState' },
        { status: 400 }
      );
    }

    marketingDepartmentRegistry.setWorkflowState(projectId, workflowState);

    return NextResponse.json({
      success: true,
      data: { projectId, workflowState },
    });
  } catch (error) {
    loggers.api.error({ err: error }, '[Marketing Workflow API] Error:');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
