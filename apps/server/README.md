# Ace Attorney Server (Phase 2)

Hono API + Pi LLM backend.

## Setup

Copy `.env.example` to `.env` and set:

- `PI_PROVIDER` / `PI_MODEL` — pi-ai model registry（默认 `deepseek` / `deepseek-v4-flash`）
- `PI_BASE_URL` — 可选，覆盖 API 地址（默认 `https://api.deepseek.com`）
- `DEEPSEEK_API_KEY` — DeepSeek API Key
- `PORT=3001`, `CORS_ORIGIN=http://localhost:5173`

## Run

```bash
pnpm dev:server      # server only
pnpm dev:all         # web + server
```

## Architecture

- `GameApiService` — implements all `IGameApi` endpoints
- `@ace-attorney/context-engine` — `GameContextStore` (evidence/clue/dialogue backtrack)
- `@earendil-works/pi-agent-core` — Maya Agent LLM calls
- 5 character templates in `src/characters/templates/`

## API

See plan Phase 2 section 6. Extra endpoint:

- `POST /api/session/dialogue/backtrack` — `{ sessionId, toSegmentId }`
