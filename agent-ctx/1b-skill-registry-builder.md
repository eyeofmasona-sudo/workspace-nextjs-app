# Task 1b — Skill Registry Service & Default Skill Definitions

## Agent: skill-registry-builder

## Summary
Created the DB-backed Skill Registry service with 47 default skill definitions, extending (not replacing) the existing in-memory skill system at `src/lib/skills/`.

## Files Created

### 1. `src/lib/skill-registry/defaults.ts`
- **47 default skill definitions** across 8 categories
- Exports `DEFAULT_SKILLS` array and `DefaultSkillDefinition` interface
- Each skill has: key, name, description, category, icon (emoji), version, status, requiredTools (string[]), tags (string[])
- Categories & counts:
  - analysis (7): research, deep_research, web_search, fact_checking, data_analysis, summarization, ocr
  - creation (11): coding, debugging, refactoring, architecture_design, database_design, ui_design, ux_design, content_creation, image_generation, video_generation, voice_generation
  - communication (6): translation, email_management, social_media_management, marketing, sales, seo
  - automation (6): browser_automation, computer_use, automation, agent_creation, agent_training, task_delegation
  - management (4): project_management, lead_qualification, crm_management, calendar_management
  - technical (6): legal_analysis, legal_drafting, contract_review, rag_search, embedding_management, document_processing
  - media (3): image_editing, video_editing, audio_processing
  - specialized (4): prompt_engineering, security_audit, compliance_check, financial_analysis

### 2. `src/lib/skill-registry/SkillRegistryService.ts`
- Singleton pattern (matches existing ToolRegistryService convention)
- Uses `import { db } from '../db'` for Prisma access
- Methods:
  - `listSkills(filters?)` — category, status, tags filtering
  - `getSkill(key)` — find by unique key
  - `installSkill(agentId, skillKey, score?)` — create/update AgentSkillLink, increment installCount
  - `uninstallSkill(agentId, skillKey)` — remove link, decrement installCount
  - `enableSkill(agentId, skillKey)` — set enabled=true
  - `disableSkill(agentId, skillKey)` — set enabled=false
  - `getAgentSkills(agentId)` — list agent's skills with definitions
  - `getSkillAgents(skillKey)` — list agents with a given skill
  - `seedDefaults()` — upsert all 47 skills, returns created/updated/skipped counts
  - `logUsage(skillKey, agentId?, action, success?, durationMs?)` — create SkillUsageLog
  - `getCategoryCounts()` / `getSkillCount()` — utility methods
- Proper error handling with descriptive messages

### 3. `src/lib/skill-registry/index.ts`
- Barrel export for service, types, and defaults

## Verification
- `bun run lint` passes with zero errors
- All TypeScript types align with Prisma schema (SkillDefinition, AgentSkillLink, SkillUsageLog)
