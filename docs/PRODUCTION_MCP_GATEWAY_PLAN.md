# JARVIS Production MCP Gateway

## Authority boundary

JARVIS remains the only top-level orchestrator. The standalone `jarvis-mcp-gateway` process owns tool discovery, provider adapters, policy checks, health state and sanitized audit events. OpenHands, OpenManus, n8n, browser-use, Vane, Penpot, OpenMontage and GPU media services are subordinate workers only.

## Provider mapping

- ChatGPT subscription / Codex OAuth: coding worker through `codex exec --json --ephemeral`; not a universal OpenAI API credential.
- OpenCode Go: coding worker through `opencode run --format json` and OpenCode's local credential store.
- Ollama Cloud: direct API provider through `https://ollama.com/api` and `OLLAMA_API_KEY`.
- OpenRouter: direct API provider and model fallback through `OPENROUTER_API_KEY`.

## Selected production integrations

Core: MCP TypeScript SDK v1, Playwright, CodeGraph MCP, Agency Agents selected divisions, Superpowers, Motion.

Workers: OpenHands Agent Server, Agent Reach, Vane, n8n + n8n-mcp, Penpot MCP, Docling, MarkItDown, OpenMontage, LivePortrait, optional MinerU and PersonaLive.

Catalogs: OpenAPI Directory as primary machine-readable source; API Mega List and social-media API list as untrusted discovery metadata only.

Remote infrastructure: Dokploy on a Linux VPS only.

Adapter-only: Semantic Kernel plugins/connectors. Its planner must not become a second orchestrator.

Not in production core: BuildingAI, OpenManus multi-agent mode, invalid Open Design URL, duplicate browser engines and complete external platforms embedded inside Next.js.

## Deployment directories

- `D:/JARVIS/jarvis-mcp-gateway`
- `D:/JARVIS/workers`
- `D:/JARVIS/catalogs`
- `D:/JARVIS/skills`
- `D:/JARVIS/logs`
- `D:/JARVIS/locks`

Every job receives a specific project directory or temporary worktree. No worker receives unrestricted `D:` access by default.

## Integration sequence

1. Install and test the standalone MCP Gateway.
2. Authenticate Codex and OpenCode locally; configure Ollama Cloud and OpenRouter keys.
3. Connect JARVIS to the gateway over local stdio.
4. Add CodeGraph and restricted OpenHands coding workers.
5. Add Vane, Agent Reach and browser-use behind read/write approval policy.
6. Add n8n, verified OpenAPI tools and short-lived secrets.
7. Add document, design and media profiles.
8. Move always-on services to a Linux VPS and deploy through Dokploy.

## Release gates

- no secrets in logs;
- fixed executable allowlist and no generic shell MCP tool;
- workspace path enforcement;
- approvals for write, deploy, publish, credential, payment, delete and security actions;
- pinned worker commits and dependency locks;
- health checks, timeouts, rollback and append-only audit;
- tests and browser smoke checks before merge.