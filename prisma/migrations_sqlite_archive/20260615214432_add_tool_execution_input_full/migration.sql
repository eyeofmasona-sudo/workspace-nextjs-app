-- Add inputFull column to tool_executions
-- Stores the complete, untruncated tool input JSON for reliable resume-after-approval.
-- inputSummary is kept for display/logs only (max 500 chars).
ALTER TABLE "tool_executions" ADD COLUMN "inputFull" TEXT;
