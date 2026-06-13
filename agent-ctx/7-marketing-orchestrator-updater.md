# Task 7 — Marketing Department Orchestrator Updater

## Task
Update OrchestratorChatEngine for Department-Aware Delegation

## Summary of Changes

### File Modified: `src/lib/orchestrator/OrchestratorChatEngine.ts`

1. **Import added** (line 24):
   - `import { isMarketingAgent, getAgentDepartment, Departments } from '../types/departments';`

2. **AgentSummary interface** — added `department: string;` field after `tools: string[];`

3. **getAvailableAgents()** — added `department: getAgentDepartment(config.role),` to the map output

4. **analyzeDelegation() agent catalog** — updated agent line to include `Department: ${a.department}`

5. **analyzeDelegation() system prompt RULES** — added 4 new rules:
   - Rule 6: Consider department boundaries
   - Rule 7: Prefer marketing agents for marketing tasks
   - Rule 8: Prefer dev agents for technical tasks
   - Rule 9: Cross-department collaboration goes through orchestrator

6. **OrchestratorChatInput interface** — added `targetDepartment?: 'dev_department' | 'marketing_department';`

7. **chat() method** — changed `const availableAgents` to `let availableAgents` and added department filtering:
   ```typescript
   if (input.targetDepartment) {
     availableAgents = availableAgents.filter(
       (a) => a.department === input.targetDepartment
     );
   }
   ```

## Validation
- `bun run lint` passed with no errors
