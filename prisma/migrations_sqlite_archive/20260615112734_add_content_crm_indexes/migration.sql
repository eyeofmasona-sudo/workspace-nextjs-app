-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'text',
    "caption" TEXT NOT NULL DEFAULT '',
    "script" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "createdByAgentId" TEXT,
    "approvedByAgentId" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "score" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentItemId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT,
    "status" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "notes" TEXT,
    "issues" TEXT NOT NULL DEFAULT '[]',
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_reviews_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "publishing_queue_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentItemId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedBy" TEXT,
    "platform" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "publishing_queue_items_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'new',
    "assignedAgentId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "telegramHandle" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" DATETIME,
    "nextFollowUpAt" DATETIME,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contacts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalThreadId" TEXT,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT,
    "content" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stage" TEXT NOT NULL DEFAULT 'discovery',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "closedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deals_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_memory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL DEFAULT 'workspace',
    "scopeId" TEXT,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "agentId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT,
    "importance" TEXT NOT NULL DEFAULT 'medium',
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "visibility" TEXT NOT NULL DEFAULT 'workspace',
    "conflictIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_memory_items" ("content", "createdAt", "id", "metadata", "scope", "scopeId", "type", "updatedAt") SELECT "content", "createdAt", "id", "metadata", "scope", "scopeId", "type", "updatedAt" FROM "memory_items";
DROP TABLE "memory_items";
ALTER TABLE "new_memory_items" RENAME TO "memory_items";
CREATE INDEX "memory_items_workspaceId_idx" ON "memory_items"("workspaceId");
CREATE INDEX "memory_items_workspaceId_type_idx" ON "memory_items"("workspaceId", "type");
CREATE INDEX "memory_items_workspaceId_importance_idx" ON "memory_items"("workspaceId", "importance");
CREATE INDEX "memory_items_workspaceId_visibility_idx" ON "memory_items"("workspaceId", "visibility");
CREATE INDEX "memory_items_agentId_idx" ON "memory_items"("agentId");
CREATE INDEX "memory_items_projectId_idx" ON "memory_items"("projectId");
CREATE INDEX "memory_items_type_idx" ON "memory_items"("type");
CREATE INDEX "memory_items_createdAt_idx" ON "memory_items"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "content_items_workspaceId_idx" ON "content_items"("workspaceId");

-- CreateIndex
CREATE INDEX "content_items_workspaceId_status_idx" ON "content_items"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "content_items_workspaceId_platform_idx" ON "content_items"("workspaceId", "platform");

-- CreateIndex
CREATE INDEX "content_items_workspaceId_scheduledAt_idx" ON "content_items"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "content_items_createdByAgentId_idx" ON "content_items"("createdByAgentId");

-- CreateIndex
CREATE INDEX "content_items_status_idx" ON "content_items"("status");

-- CreateIndex
CREATE INDEX "content_items_scheduledAt_idx" ON "content_items"("scheduledAt");

-- CreateIndex
CREATE INDEX "content_reviews_contentItemId_idx" ON "content_reviews"("contentItemId");

-- CreateIndex
CREATE INDEX "content_reviews_contentItemId_status_idx" ON "content_reviews"("contentItemId", "status");

-- CreateIndex
CREATE INDEX "publishing_queue_items_workspaceId_idx" ON "publishing_queue_items"("workspaceId");

-- CreateIndex
CREATE INDEX "publishing_queue_items_workspaceId_isPublished_idx" ON "publishing_queue_items"("workspaceId", "isPublished");

-- CreateIndex
CREATE INDEX "publishing_queue_items_workspaceId_scheduledAt_idx" ON "publishing_queue_items"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "publishing_queue_items_contentItemId_idx" ON "publishing_queue_items"("contentItemId");

-- CreateIndex
CREATE INDEX "publishing_queue_items_scheduledAt_idx" ON "publishing_queue_items"("scheduledAt");

-- CreateIndex
CREATE INDEX "leads_workspaceId_idx" ON "leads"("workspaceId");

-- CreateIndex
CREATE INDEX "leads_workspaceId_status_idx" ON "leads"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "leads_workspaceId_source_idx" ON "leads"("workspaceId", "source");

-- CreateIndex
CREATE INDEX "leads_workspaceId_score_idx" ON "leads"("workspaceId", "score");

-- CreateIndex
CREATE INDEX "leads_assignedAgentId_idx" ON "leads"("assignedAgentId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_nextFollowUpAt_idx" ON "leads"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "contacts_leadId_idx" ON "contacts"("leadId");

-- CreateIndex
CREATE INDEX "conversations_leadId_idx" ON "conversations"("leadId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_idx" ON "conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_direction_idx" ON "conversation_messages"("conversationId", "direction");

-- CreateIndex
CREATE INDEX "conversation_messages_timestamp_idx" ON "conversation_messages"("timestamp");

-- CreateIndex
CREATE INDEX "deals_leadId_idx" ON "deals"("leadId");

-- CreateIndex
CREATE INDEX "deals_leadId_stage_idx" ON "deals"("leadId", "stage");

-- CreateIndex
CREATE INDEX "deals_stage_idx" ON "deals"("stage");

-- CreateIndex
CREATE INDEX "follow_ups_leadId_idx" ON "follow_ups"("leadId");

-- CreateIndex
CREATE INDEX "follow_ups_leadId_done_idx" ON "follow_ups"("leadId", "done");

-- CreateIndex
CREATE INDEX "follow_ups_date_idx" ON "follow_ups"("date");

-- CreateIndex
CREATE INDEX "follow_ups_done_idx" ON "follow_ups"("done");

-- CreateIndex
CREATE INDEX "agent_capabilities_agentId_idx" ON "agent_capabilities"("agentId");

-- CreateIndex
CREATE INDEX "agent_capabilities_capabilityKey_idx" ON "agent_capabilities"("capabilityKey");

-- CreateIndex
CREATE INDEX "agent_capability_scores_agentId_idx" ON "agent_capability_scores"("agentId");

-- CreateIndex
CREATE INDEX "agent_memory_links_agentId_idx" ON "agent_memory_links"("agentId");

-- CreateIndex
CREATE INDEX "agent_memory_links_memoryItemId_idx" ON "agent_memory_links"("memoryItemId");

-- CreateIndex
CREATE INDEX "agent_model_configs_agentId_idx" ON "agent_model_configs"("agentId");

-- CreateIndex
CREATE INDEX "agent_permissions_agentId_idx" ON "agent_permissions"("agentId");

-- CreateIndex
CREATE INDEX "agent_runtime_states_status_idx" ON "agent_runtime_states"("status");

-- CreateIndex
CREATE INDEX "agent_skill_links_agentId_idx" ON "agent_skill_links"("agentId");

-- CreateIndex
CREATE INDEX "agent_skill_links_skillId_idx" ON "agent_skill_links"("skillId");

-- CreateIndex
CREATE INDEX "agent_tool_links_agentId_idx" ON "agent_tool_links"("agentId");

-- CreateIndex
CREATE INDEX "agent_tool_links_toolId_idx" ON "agent_tool_links"("toolId");

-- CreateIndex
CREATE INDEX "agents_workspaceId_idx" ON "agents"("workspaceId");

-- CreateIndex
CREATE INDEX "agents_workspaceId_status_idx" ON "agents"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "agents_workspaceId_role_idx" ON "agents"("workspaceId", "role");

-- CreateIndex
CREATE INDEX "agents_workspaceId_locationZone_idx" ON "agents"("workspaceId", "locationZone");

-- CreateIndex
CREATE INDEX "agents_status_idx" ON "agents"("status");

-- CreateIndex
CREATE INDEX "agents_role_idx" ON "agents"("role");

-- CreateIndex
CREATE INDEX "approval_requests_workspaceId_idx" ON "approval_requests"("workspaceId");

-- CreateIndex
CREATE INDEX "approval_requests_workspaceId_status_idx" ON "approval_requests"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "approval_requests_agentId_idx" ON "approval_requests"("agentId");

-- CreateIndex
CREATE INDEX "approval_requests_taskId_idx" ON "approval_requests"("taskId");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_createdAt_idx" ON "approval_requests"("createdAt");

-- CreateIndex
CREATE INDEX "browser_operator_logs_taskId_idx" ON "browser_operator_logs"("taskId");

-- CreateIndex
CREATE INDEX "browser_operator_logs_taskId_level_idx" ON "browser_operator_logs"("taskId", "level");

-- CreateIndex
CREATE INDEX "browser_operator_logs_timestamp_idx" ON "browser_operator_logs"("timestamp");

-- CreateIndex
CREATE INDEX "browser_operator_screenshots_taskId_idx" ON "browser_operator_screenshots"("taskId");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_workspaceId_idx" ON "browser_operator_tasks"("workspaceId");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_workspaceId_status_idx" ON "browser_operator_tasks"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_agentId_idx" ON "browser_operator_tasks"("agentId");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_status_idx" ON "browser_operator_tasks"("status");

-- CreateIndex
CREATE INDEX "browser_operator_tasks_createdAt_idx" ON "browser_operator_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "cost_logs_agentId_idx" ON "cost_logs"("agentId");

-- CreateIndex
CREATE INDEX "cost_logs_taskId_idx" ON "cost_logs"("taskId");

-- CreateIndex
CREATE INDEX "cost_logs_createdAt_idx" ON "cost_logs"("createdAt");

-- CreateIndex
CREATE INDEX "epics_projectId_idx" ON "epics"("projectId");

-- CreateIndex
CREATE INDEX "epics_projectId_status_idx" ON "epics"("projectId", "status");

-- CreateIndex
CREATE INDEX "epics_status_idx" ON "epics"("status");

-- CreateIndex
CREATE INDEX "event_logs_workspaceId_idx" ON "event_logs"("workspaceId");

-- CreateIndex
CREATE INDEX "event_logs_workspaceId_eventType_idx" ON "event_logs"("workspaceId", "eventType");

-- CreateIndex
CREATE INDEX "event_logs_workspaceId_createdAt_idx" ON "event_logs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "event_logs_eventType_idx" ON "event_logs"("eventType");

-- CreateIndex
CREATE INDEX "event_logs_entityType_entityId_idx" ON "event_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "event_logs_createdAt_idx" ON "event_logs"("createdAt");

-- CreateIndex
CREATE INDEX "handoff_records_workspaceId_idx" ON "handoff_records"("workspaceId");

-- CreateIndex
CREATE INDEX "handoff_records_workspaceId_status_idx" ON "handoff_records"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "handoff_records_fromDepartment_idx" ON "handoff_records"("fromDepartment");

-- CreateIndex
CREATE INDEX "handoff_records_toDepartment_idx" ON "handoff_records"("toDepartment");

-- CreateIndex
CREATE INDEX "handoff_records_status_idx" ON "handoff_records"("status");

-- CreateIndex
CREATE INDEX "marketplace_items_type_idx" ON "marketplace_items"("type");

-- CreateIndex
CREATE INDEX "marketplace_items_status_idx" ON "marketplace_items"("status");

-- CreateIndex
CREATE INDEX "marketplace_items_category_idx" ON "marketplace_items"("category");

-- CreateIndex
CREATE INDEX "projects_workspaceId_idx" ON "projects"("workspaceId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_status_idx" ON "projects"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "skill_definitions_category_idx" ON "skill_definitions"("category");

-- CreateIndex
CREATE INDEX "skill_definitions_status_idx" ON "skill_definitions"("status");

-- CreateIndex
CREATE INDEX "skill_pack_items_packId_idx" ON "skill_pack_items"("packId");

-- CreateIndex
CREATE INDEX "skill_pack_items_skillId_idx" ON "skill_pack_items"("skillId");

-- CreateIndex
CREATE INDEX "skill_packs_status_idx" ON "skill_packs"("status");

-- CreateIndex
CREATE INDEX "skill_usage_logs_skillId_idx" ON "skill_usage_logs"("skillId");

-- CreateIndex
CREATE INDEX "skill_usage_logs_agentId_idx" ON "skill_usage_logs"("agentId");

-- CreateIndex
CREATE INDEX "skill_usage_logs_createdAt_idx" ON "skill_usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "tasks_epicId_idx" ON "tasks"("epicId");

-- CreateIndex
CREATE INDEX "tasks_epicId_status_idx" ON "tasks"("epicId", "status");

-- CreateIndex
CREATE INDEX "tasks_assignedAgentId_idx" ON "tasks"("assignedAgentId");

-- CreateIndex
CREATE INDEX "tasks_assignedAgentId_status_idx" ON "tasks"("assignedAgentId", "status");

-- CreateIndex
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_createdAt_idx" ON "tasks"("createdAt");

-- CreateIndex
CREATE INDEX "tool_executions_workspaceId_idx" ON "tool_executions"("workspaceId");

-- CreateIndex
CREATE INDEX "tool_executions_workspaceId_status_idx" ON "tool_executions"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "tool_executions_workspaceId_createdAt_idx" ON "tool_executions"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "tool_executions_agentId_idx" ON "tool_executions"("agentId");

-- CreateIndex
CREATE INDEX "tool_executions_taskId_idx" ON "tool_executions"("taskId");

-- CreateIndex
CREATE INDEX "tool_executions_toolId_idx" ON "tool_executions"("toolId");

-- CreateIndex
CREATE INDEX "tool_executions_approvalRequestId_idx" ON "tool_executions"("approvalRequestId");

-- CreateIndex
CREATE INDEX "tool_executions_correlationId_idx" ON "tool_executions"("correlationId");

-- CreateIndex
CREATE INDEX "tool_executions_status_idx" ON "tool_executions"("status");

-- CreateIndex
CREATE INDEX "tool_executions_createdAt_idx" ON "tool_executions"("createdAt");

-- CreateIndex
CREATE INDEX "tool_pack_items_packId_idx" ON "tool_pack_items"("packId");

-- CreateIndex
CREATE INDEX "tool_pack_items_toolId_idx" ON "tool_pack_items"("toolId");

-- CreateIndex
CREATE INDEX "tool_packs_status_idx" ON "tool_packs"("status");

-- CreateIndex
CREATE INDEX "tool_permission_policies_toolId_idx" ON "tool_permission_policies"("toolId");

-- CreateIndex
CREATE INDEX "tool_usage_logs_toolId_idx" ON "tool_usage_logs"("toolId");

-- CreateIndex
CREATE INDEX "tool_usage_logs_agentId_idx" ON "tool_usage_logs"("agentId");

-- CreateIndex
CREATE INDEX "tool_usage_logs_createdAt_idx" ON "tool_usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "tools_workspaceId_idx" ON "tools"("workspaceId");

-- CreateIndex
CREATE INDEX "tools_workspaceId_category_idx" ON "tools"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "tools_workspaceId_enabled_idx" ON "tools"("workspaceId", "enabled");

-- CreateIndex
CREATE INDEX "tools_category_idx" ON "tools"("category");

-- CreateIndex
CREATE INDEX "workflow_templates_status_idx" ON "workflow_templates"("status");

-- CreateIndex
CREATE INDEX "workflow_templates_category_idx" ON "workflow_templates"("category");

-- CreateIndex
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");

