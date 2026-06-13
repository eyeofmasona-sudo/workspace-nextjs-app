# Browser Operator Module

Browser automation via Playwright with headful mode, persistent profiles, and needs_human detection.

## Architecture

```
Agent → Tool Hub → browser_ai_provider → BrowserOperatorService → ProviderAdapter → BrowserSessionManager → Playwright → result → ToolExecution → Orchestrator
```

### Naming Convention

| Term | Context | Description |
|------|---------|-------------|
| `browser_operator` | Stage 3 built-in tool ID | Internal tool registered in `src/lib/tools/`. Agents invoke this tool. |
| `browser_ai_provider` | Tool Hub key | The DB-backed Tool Hub adapter key. Links browser tasks to ToolExecution records. |
| `BrowserOperatorService` | Backend service | Main singleton that orchestrates the queue, adapters, and session manager. |
| `BrowserOperatorPanel` | UI component | The Sheet panel in the pixel office for managing browser tasks. |

**Note**: Both `browser_operator` and `browser_ai_provider` refer to the same Browser Operator Module. The difference is the integration layer — Stage 3 tools vs. Tool Hub.

## Setup

### 1. Install Playwright (required for browser automation)

```bash
bun run browser:install
# Or manually: bunx playwright install chromium
```

### 2. Run smoke tests

```bash
bun run browser:smoke
```

### 3. Configure API key (optional)

Set `BROWSER_OPERATOR_API_KEY` in `.env` to require API key authentication on all endpoints. Without it, the API is open (dev mode).

## Providers

5 built-in providers:

| Provider | ID | URL | Profile | Description |
|----------|----|-----|---------|-------------|
| ChatGPT | `chatgpt` | chatgpt.com | `.storage/browser-operator/profiles/chatgpt` | OpenAI ChatGPT |
| Claude | `claude` | claude.ai | `.storage/browser-operator/profiles/claude` | Anthropic Claude |
| Gemini | `gemini` | gemini.google.com | `.storage/browser-operator/profiles/gemini` | Google Gemini |
| ZAI | `zai` | chat.z.ai | `.storage/browser-operator/profiles/zai` | Z.AI |
| Custom | `custom` | (any) | `.storage/browser-operator/profiles/custom` | General browser tasks |

### Provider Configuration

Each provider has a config in `src/lib/browser-operator/config/providers.config.json`:

- `headless`: `false` (headful by default for manual login)
- `profileDir`: Persistent profile directory name
- `viewport`: Browser window size
- `defaultTimeout`: Page load timeout (ms)
- `maxSessions`: Concurrent sessions (default 1)
- `allowedDomains`: Domain allowlist
- `blockedDomains`: Domain blocklist
- `submitStrategy`: `'enter'` or `'ctrl+enter'`
- `inputSelectors`: Ordered list of CSS selectors for the input element
- `responseSelectors`: Ordered list of CSS selectors for the response element

## API Endpoints

All endpoints under `/api/browser-operator/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/providers` | List all providers with status |
| POST | `/tasks` | Submit a new browser task |
| GET | `/tasks` | List all tasks (optional `?status=queued`) |
| GET | `/tasks/:id` | Get a specific task |
| POST | `/tasks/:id/retry` | Retry a failed task |
| POST | `/tasks/:id/resume` | Resume a needs_human task |
| POST | `/tasks/:id/screenshot` | Take a manual screenshot |
| GET | `/screenshots/:filename` | Serve a screenshot PNG |

### Submit Task Body

```json
{
  "provider": "custom",
  "prompt": "Navigate to example.com and extract the main heading",
  "mode": "extract",
  "url": "https://example.com",
  "priority": "normal",
  "timeout": 30000
}
```

### Task Modes

| Mode | Description |
|------|-------------|
| `navigate` | Just navigate to URL and screenshot |
| `extract` | Navigate + extract visible text |
| `interact` | Navigate + click/type/scroll actions |
| `automate` | Multi-step automation (falls back to extract in MVP) |

### Task Statuses

| Status | Description |
|--------|-------------|
| `queued` | Waiting in queue |
| `running` | Currently executing |
| `completed` | Successfully finished |
| `failed` | Errored out |
| `needs_human` | Paused for manual login/CAPTCHA/2FA |
| `cancelled` | Cancelled by user |

## Manual Login Flow

1. Submit a task with an AI provider (e.g., `chatgpt`)
2. If the provider requires login, the task pauses with `status: needs_human`
3. The headful browser window stays open with the login page
4. **Manually** log in to the provider in the browser window
5. Click **Resume** in the Browser Operator panel (or POST `/tasks/:id/resume`)
6. The adapter checks if login is complete and continues

### Persistent Profiles

Each provider has a persistent browser profile stored under `.storage/browser-operator/profiles/`. This means:
- Cookies and localStorage persist between sessions
- You only need to log in once per provider
- The profile directory is gitignored

## Security

- **No password storage** — the module never stores or auto-fills passwords
- **No CAPTCHA/2FA bypass** — requires manual intervention
- **No reverse engineering** — only legal UI automation
- **No secrets in logs** — cookies, tokens, and passwords are never logged
- **API key protection** — set `BROWSER_OPERATOR_API_KEY` in `.env`
- **Path traversal protection** — screenshot endpoint validates filenames
- **Domain allowlisting** — providers restrict which domains can be visited
- **Localhost-only** — API only accessible from localhost (enforced by gateway)

## Graceful Degradation

When Playwright is not installed:
- Tasks are created successfully
- Tasks fail with clear error: "Failed to launch browser session. Is Playwright installed?"
- UI displays the error message
- No crashes or unhandled exceptions

## DB Persistence

Tasks, logs, and screenshots are persisted to SQLite via Prisma:
- `BrowserOperatorTask` — task records with status, result, error
- `BrowserOperatorLog` — timestamped log entries
- `BrowserOperatorScreenshot` — screenshot metadata
- `BrowserOperatorProviderConfig` — provider configurations

If Prisma/DB is unavailable, the module falls back to in-memory operation.

## Limitations

1. **Single concurrent browser session** by default (configurable)
2. **No AI-powered automation** — `automate` mode falls back to `extract`
3. **Selector fragility** — AI provider selectors may break when providers update their UI
4. **No streaming responses** — waits for full response before returning
5. **Chromium only** — only Chromium browser is supported
6. **Headless requires login first** — you must log in with headful mode before using headless
