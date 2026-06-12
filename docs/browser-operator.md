# Browser Operator Module

## What Is It

Browser Operator is a Playwright-based browser automation module for Agent OS. It enables agents to interact with web-based AI providers (ChatGPT, Claude, Gemini, Z.AI) and arbitrary websites through a headful browser, using legal UI automation only.

## Why It Exists

Some AI providers don't offer public APIs, or their API access is limited/expensive. Browser Operator allows agents to use these providers through their standard web interfaces — the same way a human would. This is **legal UI automation**, not reverse engineering.

## Architecture

```
src/lib/browser-operator/
  BrowserOperatorTypes.ts          — Type definitions
  BrowserOperatorService.ts        — Main service (singleton)
  BrowserOperatorToolBridge.ts     — Bridge to DB-backed Tool Hub
  BrowserOperatorDbService.ts      — DB persistence layer (Prisma)
  BrowserOperatorQueue.ts          — Priority task queue
  BrowserOperatorProviderRegistry.ts — Provider registry
  config/providers.config.json     — Provider configurations
  adapters/
    BaseBrowserProviderAdapter.ts  — Abstract base adapter
    ChatGPTAdapter.ts              — ChatGPT provider
    ClaudeAdapter.ts               — Claude provider
    GeminiAdapter.ts               — Gemini provider
    ZaiAdapter.ts                  — Z.AI provider
    CustomAdapter.ts               — Generic browser adapter
    adapter-utils.ts               — Shared adapter utilities
  playwright/
    BrowserSessionManager.ts       — Playwright session lifecycle
    ScreenshotService.ts           — Screenshot capture/storage
```

## How to Run

### Prerequisites

1. **Playwright** — Required for browser automation:
   ```bash
   bun add playwright
   bunx playwright install chromium
   ```

2. **No Playwright?** — The module gracefully degrades. All API endpoints work but return errors indicating Playwright is not installed. The rest of Agent OS continues to function normally.

### Starting the Service

The Browser Operator service auto-initializes on first API call. No manual startup needed.

### First-Time Provider Login

Each AI provider (ChatGPT, Claude, Gemini, Z.AI) requires a one-time manual login:

1. Submit a task with the provider and `mode: "navigate"`:
   ```bash
   curl -X POST http://localhost:3000/api/browser-operator/tasks \
     -H "Content-Type: application/json" \
     -d '{"provider": "chatgpt", "prompt": "navigate", "mode": "navigate", "url": "https://chatgpt.com"}'
   ```

2. The task will return `status: "needs_human"` with `needsHumanReason: "Login page detected — manual sign-in required"`

3. A headful browser window opens. **Log in manually** in that browser window.

4. After logging in, click **Resume** in the Browser Operator UI panel, or call:
   ```bash
   curl -X POST http://localhost:3000/api/browser-operator/tasks/{taskId}/resume
   ```

5. The browser profile is now persisted. Future tasks won't require login.

### Persistent Profiles

Browser profiles are stored at:
```
.storage/browser-operator/profiles/
  chatgpt/
  claude/
  gemini/
  zai/
  custom/
```

Each profile preserves cookies, localStorage, and session data between browser restarts.

**Important:** Do NOT manually edit profile directories. Do NOT share profile directories between providers.

## How to Use via Tool Hub

Agents call `browser_ai_provider` through the Tool Hub:

```json
{
  "toolKey": "browser_ai_provider",
  "action": "interact",
  "input": {
    "provider": "chatgpt",
    "prompt": "Explain quantum computing in simple terms",
    "mode": "interact",
    "url": "https://chatgpt.com"
  }
}
```

### How Agents Choose a Provider

Agents with `aiProviderMode: "browser_operator"` in their AgentConfig will use the Browser Operator instead of the API provider. The `browserProvider` field determines which provider to use:

```typescript
// In agent config:
{
  aiProviderMode: "browser_operator",
  browserProvider: "chatgpt"  // or "claude", "gemini", "zai", "custom"
}
```

If `aiProviderMode` is not set (or is "api"), the agent uses the standard API provider via OpenRouter.

## How `needs_human` Works

When the browser encounters a situation requiring manual intervention:

1. **Detection** — The BrowserSessionManager scans the page for:
   - Login forms (password inputs on login pages)
   - CAPTCHA challenges (reCAPTCHA, hCaptcha, Turnstile)
   - 2FA/MFA prompts (verification codes, authenticator apps)

2. **Status** — The task status changes to `needs_human` with a `needsHumanReason` field explaining what's needed.

3. **Pause** — The task pauses. The orchestrator treats this as a successful completion with metadata (not a failure).

4. **Manual Action** — The user completes the required action in the opened browser window.

5. **Resume** — The user clicks Resume (UI or API). The adapter checks if the issue is resolved:
   - If still blocked → stays `needs_human`
   - If resolved → continues the task

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/browser-operator/tasks` | Create a new task |
| GET | `/api/browser-operator/tasks` | List all tasks |
| GET | `/api/browser-operator/tasks/:id` | Get task details |
| POST | `/api/browser-operator/tasks/:id/retry` | Retry a failed task |
| POST | `/api/browser-operator/tasks/:id/resume` | Resume after manual intervention |
| POST | `/api/browser-operator/tasks/:id/screenshot` | Take a manual screenshot |
| GET | `/api/browser-operator/providers` | List available providers |
| GET | `/api/browser-operator/screenshots/:filename` | Serve a screenshot file |

## Task Modes

| Mode | Description |
|------|-------------|
| `navigate` | Navigate to URL and take a screenshot |
| `extract` | Navigate + extract visible text content |
| `interact` | Navigate + perform actions (click, type, submit) |
| `automate` | Multi-step automation (future: AI-driven) |

## Provider Adapters

### ChatGPT
- **URL:** https://chatgpt.com
- **Input selectors:** textarea → [contenteditable='true'] → [role='textbox']
- **Response selectors:** [data-message-author-role='assistant'] → .markdown → main
- **Submit:** Enter key

### Claude
- **URL:** https://claude.ai
- **Input selectors:** textarea → [contenteditable='true'] → div.ProseMirror → [role='textbox']
- **Response selectors:** .font-claude-message → [data-testid='assistant-message'] → main
- **Submit:** Enter key

### Gemini
- **URL:** https://gemini.google.com
- **Input selectors:** textarea → [contenteditable='true'] → div.ql-editor → [role='textbox']
- **Response selectors:** model-response → message-content → main
- **Submit:** Enter key

### Z.AI
- **URL:** https://chat.z.ai
- **Input selectors:** textarea → [contenteditable='true'] → [role='textbox']
- **Response selectors:** [data-message-role='assistant'] → .assistant-message → main
- **Submit:** Enter key

All adapters use **resilient selector chains** — if the primary selector fails, fallbacks are tried in order. This makes them more robust against UI changes.

## Screenshots

Screenshots are stored at:
```
/tmp/browser-operator/screenshots/
```

Auto-cleanup:
- Max age: 24 hours
- Max files: 500

Screenshots are taken:
- After navigation
- On error
- On `needs_human` detection
- Manually via API/UI
- At task completion

## DB Persistence

The BrowserOperatorDbService persists tasks, logs, and screenshots to the Prisma database. It gracefully falls back to in-memory operation if the database is unavailable.

### Prisma Models

- **BrowserOperatorTask** — Task records with status, result, error, needsHumanReason
- **BrowserOperatorLog** — Log entries per task (level, message, step)
- **BrowserOperatorScreenshot** — Screenshot metadata per task (filename, label, sizeBytes)
- **BrowserOperatorProviderConfig** — Provider configuration stored in DB

## Security

### What We Do
- Localhost-only API access (API key check)
- URL allow/block lists per provider
- Headful mode by default (user can see what's happening)
- Screenshot on error for debugging
- needs_human detection for login/CAPTCHA/2FA

### What We Do NOT Do
- **No CAPTCHA bypass** — We detect and pause for manual intervention
- **No 2FA bypass** — We detect and pause for manual code entry
- **No paywall bypass** — We don't circumvent payment walls
- **No rate limit bypass** — We respect provider rate limits
- **No reverse engineering** — We interact with public UI only
- **No password storage** — We never store or auto-fill passwords
- **No cookie/token logging** — We never log sensitive session data
- **No private API usage** — We only use the standard web interface

## Limitations

1. **Playwright Required** — Browser automation requires Playwright + Chromium. Without it, the module degrades gracefully but cannot automate.

2. **UI Changes** — Provider UIs change over time. Adapters use resilient selector chains but may break. Manual selector updates may be needed.

3. **Rate Limits** — Providers enforce rate limits on web interfaces. The Browser Operator does not bypass these.

4. **No Parallel Sessions** — Each provider supports one session at a time by default. Multiple providers can run concurrently.

5. **Automate Mode** — The `automate` mode currently falls back to `extract` mode. Full AI-driven multi-step automation is planned for future releases.

6. **Headless Limitations** — Some providers may not work in headless mode due to bot detection. Use headful mode (default).

## Example Complete Flow

```
1. User: "Ask ChatGPT about quantum computing"

2. Orchestrator delegates to researcher agent
   → Agent config: aiProviderMode="browser_operator", browserProvider="chatgpt"

3. Agent calls Tool Hub: browser_ai_provider
   → input: { provider: "chatgpt", prompt: "Explain quantum computing", mode: "interact" }

4. Tool Hub → BrowserOperatorService.submitTask()
   → Creates BrowserOperatorTask in DB
   → Enqueues task

5. BrowserOperatorService processes task:
   → ChatGPTAdapter.execute()
   → Navigate to chatgpt.com
   → Check needs_human (login required?)
   → If needs_human: pause, wait for manual login
   → Find input textarea
   → Fill prompt via clipboard
   → Press Enter
   → Wait for response
   → Extract last assistant response
   → Return result

6. BrowserOperatorToolBridge syncs status to ToolExecution

7. Agent receives result and returns to orchestrator

8. Orchestrator presents answer to user
```
