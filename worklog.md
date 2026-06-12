---
Task ID: 1
Agent: main
Task: Implement Stage 2 — Agent Runtime + Registry + Config Layer

Work Log:
- Explored existing project: AI provider layer, AgentExecutor, AgentRegistry, AgentModelConfigService, Prisma schema
- Designed 3-layer architecture: Config → Registry → Runtime
- Created src/lib/agent-core/types.ts — AgentConfig, AgentResult, SkillRef, ToolRef, AgentHook, HookContext
- Created src/lib/agent-core/registry.ts — AgentRegistry singleton with register/get/resolveModel/getStats
- Created src/lib/agent-core/runtime.ts — AgentRuntime with execute() lifecycle, fallback retry, hook pipeline, cost logging
- Created src/lib/agent-core/hooks.ts — composeHooks(), loggingHook, costTrackingHook
- Created src/lib/agent-core/config-loader.ts — loadAgentConfigs() and loadAgentsFromDb()
- Created src/lib/agent-core/index.ts — barrel export
- Created src/lib/agent-configs/orchestrator.ts — Claude 3.5 Sonnet, temp 0.6
- Created src/lib/agent-configs/frontend-engineer.ts — GPT-4o, temp 0.5
- Created src/lib/agent-configs/researcher.ts — Claude 3.5 Sonnet, temp 0.8
- Created src/lib/agent-configs/index.ts — AGENT_CONFIGS barrel
- Created src/app/api/runtime/execute/route.ts — POST endpoint using AgentRuntime
- Created src/app/api/runtime/status/route.ts — GET endpoint for runtime status
- Updated src/app/page.tsx — full Stage 2 dashboard with architecture, registry, chat, demo, extensions
- Fixed lucide-react Hook icon (replaced with Anchor)
- Verified page renders, API works, lint passes

Stage Summary:
- 3-layer architecture fully implemented: Config → Registry → Runtime
- 3 demo agents with distinct models and temperatures
- AgentRuntime handles full lifecycle: config resolution → model resolution → prompt building → provider call → hook pipeline → cost logging
- Extension points for Stage 3: SkillRef, ToolRef, AgentHook interfaces defined
- Built-in hooks: logging, cost-tracking
- API endpoints: POST /api/runtime/execute, GET /api/runtime/status
- UI: architecture diagram, agent registry, chat panel, multi-agent demo, Stage 3 preview
