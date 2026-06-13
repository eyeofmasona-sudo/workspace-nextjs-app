# Task 2a — API Routes for Skills, Skill Packs, and Tool Packs

## Summary
Created 12 API route files for the Agent OS Skills, Skill Packs, and Tool Packs subsystem.

## Files Created
1. `src/app/api/skills/route.ts` — GET (list+filters), POST (seed)
2. `src/app/api/skills/[key]/route.ts` — GET single skill
3. `src/app/api/skills/[key]/install/route.ts` — POST install skill
4. `src/app/api/skills/[key]/uninstall/route.ts` — POST uninstall skill
5. `src/app/api/skills/[key]/toggle/route.ts` — POST enable/disable skill
6. `src/app/api/skill-packs/route.ts` — GET (list), POST (seed)
7. `src/app/api/skill-packs/[key]/route.ts` — GET single pack
8. `src/app/api/skill-packs/[key]/install/route.ts` — POST install pack
9. `src/app/api/skill-packs/[key]/uninstall/route.ts` — POST uninstall pack
10. `src/app/api/tool-packs/route.ts` — GET (list), POST (seed)
11. `src/app/api/tool-packs/[key]/route.ts` — GET single pack
12. `src/app/api/tool-packs/[key]/install/route.ts` — POST install pack

## Service Dependencies
- `skillRegistryService` from `@/lib/skill-registry` — listSkills, getSkill, installSkill, uninstallSkill, enableSkill, disableSkill, seedDefaults
- `skillPackService` from `@/lib/packs` — listPacks, getPack, installPack, uninstallPack, seedDefaults
- `toolPackService` from `@/lib/packs` — listPacks, getPack, installPack, seedDefaults

## Patterns
- Next.js 16 App Router with `export async function GET/POST`
- Dynamic params: `{ params }: { params: Promise<{ key: string }> }` + `await params`
- Error handling: try/catch with status codes 200, 201, 400, 404, 500
- Validation: required fields checked before service calls
- Error classification: "not found" / "not installed" → 404

## Test Results
- Lint: 0 errors
- GET /api/skills → 47 skills ✓
- GET /api/skills/research → skill details ✓
- GET /api/skills?category=analysis → filtered results ✓
- POST /api/skills {"action":"seed"} → {created: 47} ✓
- GET /api/skill-packs → empty packs (not seeded yet) ✓
- GET /api/tool-packs → empty packs (not seeded yet) ✓
