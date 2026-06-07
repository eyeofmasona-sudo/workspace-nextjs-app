# Task 6 — API Endpoints for Agent System

## Task
Create and update API endpoint files for the Agent System in Next.js App Router.

## Work Completed

### Files Modified
- `src/app/api/agents/route.ts` — Added `capability` search param to GET handler

### Files Created (9 new route files)
1. `src/app/api/agents/[id]/route.ts` — GET (full agent details) + PATCH (basic fields)
2. `src/app/api/agents/[id]/profile/route.ts` — GET + PATCH agent profile
3. `src/app/api/agents/[id]/capabilities/route.ts` — GET + PATCH agent capabilities
4. `src/app/api/agents/[id]/permissions/route.ts` — GET + PATCH agent permissions
5. `src/app/api/agents/[id]/models/route.ts` — GET + PATCH agent model configs
6. `src/app/api/agents/[id]/runtime/route.ts` — GET + PATCH agent runtime state
7. `src/app/api/agents/propose-temporary/route.ts` — POST propose temporary agent
8. `src/app/api/agents/create-temporary/route.ts` — POST create temporary agent
9. `src/app/api/agents/[id]/deactivate/route.ts` — POST deactivate agent

### Key Patterns
- All dynamic routes use Next.js 16 Promise params: `{ params }: { params: Promise<{ id: string }> }`
- All PATCH/POST endpoints validate with Zod schemas from `@/lib/validations`
- All endpoints verify agent exists (404) and check workspace ownership (403)
- Runtime PATCH dispatches to specialized service methods based on field type
- Models PATCH uses setPreferredModel vs addFallbackModel based on preferenceType

### Verification
- ESLint: passes with no errors
- Dev server: running successfully
