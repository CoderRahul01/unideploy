# UniDeploy Edge API Gateway (`apps/worker`)

**Cloudflare Worker Edge Gateway, Sandbox Orchestration & D1 Storage**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020.svg?logo=cloudflare)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-4.0.0-E36002.svg?logo=hono)](https://hono.dev/)
[![E2B](https://img.shields.io/badge/E2B-Firecracker%20microVMs-FF5722.svg)](https://e2b.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

The primary backend edge service for [unideploy.in](https://www.unideploy.in), running on Cloudflare's global edge network.

---

## ⚡ Key Responsibilities

1. **Edge Routing & Middleware**: Low-latency request routing and CORS handling using the Hono framework.
2. **Device Code Authentication**: Creates and verifies 6-character device pairing codes for the CLI and macOS desktop app.
3. **E2B MicroVM Sandbox Orchestration**: Provisions and executes code in isolated E2B Firecracker microVMs (`@e2b/code-interpreter`).
4. **Model Deployment Endpoints**: Accepts Python code, manages deployed model endpoints, and validates API keys on incoming inference queries.
5. **D1 Persistent Storage**: Manages users, subscriptions, microVM sessions, and deployed models in Cloudflare D1.
6. **KV Caching**: Short-lived auth session tokens and fast lookup tables in Cloudflare Workers KV.
7. **Dodo Payments Webhooks**: Handles subscription lifecycle events (creation, renewal, upgrades, cancellations).

---

## 🛣️ Major API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Edge gateway health and status check |
| `POST` | `/auth/session` | Create a new 6-character CLI/desktop device code session |
| `GET` | `/auth/session/:code` | Poll session pairing state from the browser or client |
| `GET` | `/auth/me` | Fetch authenticated user profile, plan tier, and token balance |
| `POST` | `/api/sandbox/create` | Provision an isolated E2B Firecracker cloud microVM |
| `POST` | `/api/sandbox/run` | Execute Python, JS, or Bash in a microVM and stream output |
| `GET` | `/api/sandbox/list` | List active microVM sessions for the current user |
| `POST` | `/api/v1/models/deploy` | Deploy a Python script as a 24/7 HTTPS REST endpoint |
| `POST` | `/api/v1/models/:model_id/predict` | Authenticated inference endpoint using model API key |
| `POST` | `/webhooks/dodo` | Dodo Payments webhook handler |

---

## 💾 D1 Database Schema

Defined in `schema.sql`:
- `users`: User profiles, plan tiers (`Free`, `Starter`, `Pro`, `Team`), token balances.
- `sessions`: Short-lived device pairing sessions with TTLs.
- `sandboxes`: Active and historical microVM instances with specs and status.
- `models`: Deployed model microservices, endpoint URLs, and cryptographically hashed API keys.

---

## 💻 Local Development

```bash
# Start local edge runtime using Wrangler
npm run dev:worker

# Or run typechecks
npm run typecheck:worker
```

---

## 🚢 Deployment

```bash
# Deploy to Cloudflare Workers edge network
npm run deploy:worker
```
