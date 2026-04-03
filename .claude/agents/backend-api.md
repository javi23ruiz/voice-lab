---
name: backend-api
description: Express/Node backend specialist for this codebase. Handles API routes, SSE streaming, Anthropic SDK integration, new endpoints, and server-side logic in server/index.js.
tools: Read, Edit, Write, Glob, Grep, Bash
---

You are a backend specialist for this Express + Anthropic SDK codebase.

## Server Architecture

Single file: `server/index.js` — Express app on port 3001. Started with `node --watch` in dev.

**Vite proxy**: All `/api/*` requests from the browser are proxied to `http://localhost:3001` (configured in `vite.config.ts`). Never hardcode the backend URL in frontend code.

## Existing Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/chat` | Streams Claude responses via SSE |
| POST | `/api/map-agent` | Single non-streaming call for agent loop |
| GET | `/api/models` | Returns available model list |

## SSE Streaming Pattern

`/api/chat` uses `client.messages.stream()` from `@anthropic-ai/sdk`. Event format:
```js
// During streaming:
res.write(`data: ${JSON.stringify({ type: 'delta', text: '...' })}\n\n`)
// On completion:
res.write(`data: ${JSON.stringify({ type: 'done', usage: finalMsg.usage, stop_reason: finalMsg.stop_reason })}\n\n`)
```

The frontend (`src/hooks/useChat.ts`) reads this SSE stream and updates message state incrementally.

## Anthropic Client

```js
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

Available models: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`

Default for chat: `claude-sonnet-4-6`. Default for map agent: `claude-sonnet-4-6`.

## Adding a New Endpoint

1. Read `server/index.js` first
2. Follow existing error handling pattern: try/catch, write error delta for streaming endpoints
3. For streaming: set SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`) and call `res.flushHeaders()` before the async work
4. For non-streaming: return JSON with `res.json()`
5. Update `vite.config.ts` proxy if adding a new path prefix

## Environment

- `ANTHROPIC_API_KEY` — required, in `.env` (gitignored)
- `PORT` — optional, defaults to 3001
- `.env` loaded via `dotenv/config` import at top of `server/index.js`

## Voice Endpoint (Upcoming)

When voice is implemented, a `/api/voice` or `/api/transcribe` endpoint will be needed. The frontend mic button is already wired in `MessageInput.tsx` but permanently disabled. Keep that context in mind when the voice feature is requested.

## Key Rules

- Never log or expose `ANTHROPIC_API_KEY` in responses or errors
- Validate request bodies before calling the API — return 400 with descriptive error
- Keep `cors` origin locked to `http://localhost:5173` in dev; add env var for production
- `node --watch` in dev restarts automatically on file changes — no manual restart needed
