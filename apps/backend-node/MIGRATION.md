# FastAPI → Node.js/Express Migration Map

Every FastAPI route and its Node.js equivalent.

## Auth

| FastAPI (Python)                        | Node.js/Express                          | Notes                                      |
|-----------------------------------------|------------------------------------------|--------------------------------------------|
| `POST /auth/session`                    | `POST /auth/session`                     | Now returns 6-char alphanumeric code       |
| `POST /auth/verify`                     | `POST /auth/verify`                      | Legacy — kept for CLI compat               |
| `GET  /auth/session/:code`              | `GET  /auth/session/:code`               | New: frontend polls this                   |
| `POST /auth/session/:code/verify`       | `POST /auth/session/:code/verify`        | New: CLI hits this with Bearer token       |
| `POST /auth/register`                   | `POST /auth/register`                    | bcrypt instead of sha256                   |
| `POST /auth/login`                      | `POST /auth/login`                       | Identical logic                            |
| `GET  /auth/me`                         | `GET  /auth/me`                          | Identical                                  |

## Scans

| FastAPI (Python)                        | Node.js/Express                          | Notes                                      |
|-----------------------------------------|------------------------------------------|--------------------------------------------|
| `POST /api/v1/scan`                     | `POST /api/v1/scan`                      | Proxies to Python agent service            |
| `GET  /api/v1/scan/:id`                 | `GET  /api/v1/scan/:scanId`              | Identical                                  |
| `GET  /api/v1/scan/:id/plan`            | Removed                                  | Plan now embedded in scan result           |
| `POST /api/v1/scan/:id/fix`             | `POST /api/v1/scan/:scanId/fix`          | Proxies to Python agent service            |
| `POST /scans/:sessionId/results`        | `POST /api/v1/scan/results`              | CLI posts local findings here              |
| `GET  /scans/:sessionId/report`         | `GET  /api/v1/scan/:scanId/report`       | Falls back to InsForge                     |
| `POST /scans/:sessionId/fix-complete`   | `POST /api/v1/scan/:sessionId/fix-complete` | Relays rescan_done via Redis publish    |

## Deploy

| FastAPI (Python)                        | Node.js/Express                          | Notes                                      |
|-----------------------------------------|------------------------------------------|--------------------------------------------|
| `POST /api/v1/deploy/plan`              | Removed                                  | CLI detects stack locally                  |
| `POST /api/v1/deploy/generate`          | `POST /api/v1/deploy/generate`           | SSE stream, proxied to agent service       |
| `POST /api/v1/deploy/chat`              | Removed                                  | Moved to agent service                     |

## Secrets

| FastAPI (Python)                        | Node.js/Express                          | Notes                                      |
|-----------------------------------------|------------------------------------------|--------------------------------------------|
| (none)                                  | `POST /api/v1/secrets/audit`             | New — deep AI audit via agent service      |
| (none)                                  | `POST /api/v1/secrets/scan`              | New — local scan result ingest             |

## Payments

| FastAPI (Python)                        | Node.js/Express                          | Notes                                      |
|-----------------------------------------|------------------------------------------|--------------------------------------------|
| `POST /payments/checkout`               | `POST /payments/checkout`                | Identical Dodo checkout flow               |
| `POST /webhooks/dodo`                   | `POST /payments/webhook/dodo`            | URL changed, HMAC verification identical   |

## AI / Agent Proxy

| FastAPI (Python)                        | Node.js/Express                          | Notes                                      |
|-----------------------------------------|------------------------------------------|--------------------------------------------|
| `POST /api/v1/ai/patch`                 | `POST /api/v1/scan/:scanId/fix`          | Finding ID based, not content-only         |
| `POST /api/v1/ai/chat`                  | Removed                                  | CLI calls agent service directly           |

## WebSockets

| FastAPI (Python)                        | Node.js/Express                          | Notes                                      |
|-----------------------------------------|------------------------------------------|--------------------------------------------|
| `WS /ws/session/:sessionId`             | `WS /ws?role=cli&session=:id&token=:tok` | Token auth on connect                      |
| `WS /ws/cli/:sessionCode`               | `WS /ws?role=cli&session=:id&token=:tok` | Merged into single endpoint                |
| `WS /ws/browser/:sessionId`             | `WS /ws?role=browser&session=:id&token=:tok` | Token auth required                    |

## HTTP Polling Fallbacks (CLI compat, unchanged paths)

| FastAPI (Python)                        | Node.js/Express                          |
|-----------------------------------------|------------------------------------------|
| `GET  /poll/cli/:sessionId`             | `GET  /poll/cli/:sessionId`              |
| `GET  /poll/browser/:sessionId`         | `GET  /poll/browser/:sessionId`          |
| `POST /send/cli/:sessionId`             | `POST /send/cli/:sessionId`              |
| `POST /send/browser/:sessionId`         | `POST /send/browser/:sessionId`          |

## What moved to the Python agent service (port 8001)

- All LangGraph / LangChain execution
- E2B sandbox management
- AnalyzeAgent, FixAgent, PlanAgent, DeployAgent
- Gemini / Groq / Anthropic model calls (via LiteLLM)
- Tinyfish platform docs fetching

## Breaking changes for the CLI

1. `--local` flag should now point to `http://localhost:3001` (not `:8000`)
2. WebSocket URL format changed — old: `/ws/session/:id` → new: `/ws?role=cli&session=:id&token=:tok`
3. Session code changed from 6-digit numeric to 6-char alphanumeric (e.g. `ABC123`)
4. All responses now wrapped in `{ data: ... }` on success, `{ error, code }` on failure
