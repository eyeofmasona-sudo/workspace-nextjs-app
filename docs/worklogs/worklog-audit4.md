# Agent OS — Worklog (Audit 4 Append)

---
Task ID: audit-4
Agent: Main
Task: Tool Hub Audit — Fix 4 critical issues before Stage 5

Work Log:
- Studied all existing Tool Hub files: ToolHub.ts, ToolExecutionService.ts, ToolPermissionService.ts, ToolRegistryService.ts, ToolAdapterRegistry.ts, adapters/index.ts, types.ts, defaults.ts, index.ts
- Studied supporting files: events.ts, event-bus/index.ts, validations/index.ts, approval/index.ts, seed/index.ts, schema.prisma
- Identified 4 audit issues: (1) empty toolKey in events, (2) no ToolExecution cleanup, (3) no approval→resume lifecycle, (4) no correlationId for UI animation
- Fixed Prisma schema: Added `correlationId` field to ToolExecution model (String?, optional)
- Ran db:push to sync schema changes
- Updated ToolExecutionService: Added extractToolKey() helper, all mark* methods now read toolKey from metadata, createExecution accepts toolKey+correlationId, added resumeApprovedExecution(), getExecutionsNeedingCleanup(), cleanupOldExecutions()
- Updated ToolHub.ts: Added defence-in-depth guard for critical/approval tools, passes toolKey+correlationId to ToolExecutionService, supports resumedFromApproval flag
- Updated types.ts: Added correlationId and resumedFromApproval to ExecuteToolRequest
- Updated events.ts: Added TOOL_EXECUTION_RESUMED event type + ToolExecutionResumedPayload, added correlationId to all 7 tool event payload interfaces
- Updated event-bus/index.ts: Added TOOL_EXECUTION_RESUMED to onAny
- Updated validations/index.ts: Added correlationId and resumedFromApproval to executeToolSchema
- Updated API route: execute/route.ts now passes correlationId and resumedFromApproval
- Created new API: POST /api/tools/executions/[executionId]/resume — resumes approved execution and re-executes tool
- Created new API: GET/POST /api/tools/executions/cleanup — preview and execute cleanup of old records
- Created src/lib/tool-hub/approval-lifecycle.ts: Event listener that wires approval.approved → find linked ToolExecution → resumeApprovedExecution → re-execute tool with resumedFromApproval=true
- Updated src/lib/approval/index.ts: Added getLinkedToolExecutionId() method
- Updated src/lib/seed/index.ts: Calls initApprovalLifecycle() during system initialization
- Updated src/lib/tool-hub/index.ts: Exports initApprovalLifecycle
- Fixed safe JSON.parse for truncated inputSummary in resume endpoints (both API route and lifecycle)
- Verified: ESLint clean, TypeScript clean (0 src/ errors), dev server running
- API tested: filesystem.read with correlationId → success, terminal.run → requires_approval, resume before approval → 403 "not approved", cleanup endpoint → 0 eligible (nothing old enough), executions list shows correlationId correctly

Stage Summary:
- All 4 audit issues fixed and verified
- New: TOOL_EXECUTION_RESUMED event type (total 39)
- New: 2 API endpoints (resume + cleanup)
- New: approval-lifecycle.ts module
- Lint: clean, TSC: clean, Dev server: running
