# Agent OS

Visual AI multi-agent platform with a pixel-art office interface.

## Local Setup

### Prerequisites
- Node.js 18+ (or Bun)
- An [OpenRouter](https://openrouter.ai) API key

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://..." # see .env.example
OPENROUTER_API_KEY="sk-or-your-key-here"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
```

### 3. Initialize database

```bash
npx prisma generate
npm run db:deploy   # apply migrations (Supabase Postgres)
npm run db:seed     # seed agents, skills, tools
```

### 4. Start development server

```bash
npm run dev
# or
./start-dev.sh
```

Open [http://localhost:3000](http://localhost:3000).

The system seeds itself automatically on first start (creates default workspace and 16 agents).

### 5. Verify

```bash
curl http://localhost:3000/api/status
curl http://localhost:3000/api/seed  # check initialization status
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite path — `file:./db/custom.db` |
| `OPENROUTER_API_KEY` | ✅ | API key from openrouter.ai |
| `OPENROUTER_BASE_URL` | optional | Defaults to `https://openrouter.ai/api/v1` |
| `BROWSER_OPERATOR_API_KEY` | optional | Restricts browser operator API access |

## Key Features

- **Pixel Office** — 16 AI agents across 11 zones (dev + marketing departments)
- **Orchestrator Chat** — natural language task delegation to specialized agents
- **Tool Hub** — browser automation via Playwright (requires `npm run browser:install`)
- **Skill System** — planning, validation, summarization skills
- **Approval Queue** — human-in-the-loop for high-risk actions
- **Analytics** — usage stats, cost tracking, capability scores

## Browser Operator (Optional)

Requires Playwright:

```bash
npm run browser:install
npm run browser:smoke   # verify setup
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Sync schema to DB |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run browser:install` | Install Playwright Chromium |
| `npm run browser:smoke` | Run browser operator smoke tests |
