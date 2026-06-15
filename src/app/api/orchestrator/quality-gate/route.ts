// POST /api/orchestrator/quality-gate
// Run a quality gate check on an agent's result against a TaskContract.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { qualityGateService } from '@/lib/orchestrator/QualityGateService';
import { createTaskContract } from '@/lib/orchestrator/TaskContract';

const schema = z.object({
  contract: z.object({
    goal: z.string().min(1),
    context: z.array(z.string()).optional(),
    inputs: z.record(z.string(), z.unknown()).optional(),
    expectedOutput: z.record(z.string(), z.unknown()).optional(),
    constraints: z.array(z.string()).optional(),
    assignedDepartment: z.string(),
    assignedAgentRole: z.string(),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    successCriteria: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    workspaceId: z.string(),
    sourceTaskId: z.string().optional(),
  }),
  agentResult: z.unknown(),
  agentId: z.string(),
  routingConfidence: z.number().min(0).max(1).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const { contract: contractInput, agentResult, agentId, routingConfidence } = parsed.data;

  // Build full contract
  const contract = createTaskContract(contractInput);
  if (routingConfidence !== undefined) {
    contract.routingConfidence = routingConfidence;
  }

  try {
    const result = await qualityGateService.check(contract, agentResult, agentId);
    return NextResponse.json({ ok: true, contract, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
