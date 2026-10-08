# UniDeploy System Architecture

**AI Cloud Sandbox & Model Deployment Platform**  
*Technical Architecture Document*  
*Website:* [unideploy.in](https://www.unideploy.in) · *Edge Gateway:* [unideploy-api.rahulpandey-creates.workers.dev](https://unideploy-api.rahulpandey-creates.workers.dev)

---

## 1. High-Level System Topology

UniDeploy is distributed across four client surfaces backed by a global Cloudflare Worker Edge Gateway and an isolated E2B Firecracker microVM compute plane:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DEVELOPER SURFACES                              │
│                                                                             │
│  Next.js Web Studio       Native macOS App (.dmg)   npm CLI (unideploy)     │
│  apps/frontend            apps/desktop              packages/cli            │
│  • Browser sandbox runner • Dock launcher           • Terminal microVM exec │
│  • Marketplace templates  • Endpoint manager        • Model deployment      │
│  • Dashboard & billing    • Device code pairing     • Device authentication │
│                                                                             │
│                      MCP Server (@unideploy/mcp)                            │
│                      • Cursor, Claude Code & Windsurf integration           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ HTTPS / WebSocket
┌─────────────────────────────────────────────────────────────────────────────┐
│                 UNIDEPLOY CLOUDFLARE WORKER EDGE GATEWAY                    │
│                 (apps/worker — unideploy-api)                               │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Hono Edge Router & CORS                                               │  │
│  │ • /health                    • /api/sandbox/* (create, run, list)     │  │
│  │ • /auth/* (session, me)      • /api/v1/models/* (deploy, predict)     │  │
│  │ • /webhooks/dodo             • /poll/cli/* (device code mailboxes)    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │ Cloudflare D1 (SQLite)    │  │ Cloudflare Workers KV                  │  │
│  │ • Users & subscription tier│  │ • Short-lived device session tokens    │  │
│  │ • Sandboxes & metadata    │  │ • Fast token lookups                   │  │
│  │ • Deployed model routes   │  │ • Cache layers                         │  │
│  └───────────────────────────┘  └────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ Secure E2B SDK Bridge
┌─────────────────────────────────────────────────────────────────────────────┐
│                 CLOUD COMPUTE SANDBOXES (E2B FIRECRACKER)                   │
│                                                                             │
│  ┌──────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │ colab-python             │  │ agent-code-interpreter                  │  │
│  │ • Python 3.11 / 3.13     │  │ • Quarantined agent execution           │  │
│  │ • NumPy, Pandas, Scipy   │  │ • Safe for LangChain, CrewAI, AutoGen   │  │
│  │ • Matplotlib auto-render │  │ • Strict time & memory guardrails       │  │
│  └──────────────────────────┘  └─────────────────────────────────────────┘  │
│  ┌──────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │ model-deploy             │  │ cloud-terminal                          │  │
│  │ • 1-Click live HTTPS API │  │ • Linux root bash environment           │  │
│  │ • Instant API keys       │  │ • curl, git, python, node               │  │
│  └──────────────────────────┘  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Subsystems

### 2.1 Developer Client Surfaces

1. **Web Studio & Marketplace (`apps/frontend`)**:
   - Built on Next.js 16 with App Router, Turbopack, and vanilla CSS design tokens.
   - Deployed on Vercel with PostHog analytics and Sentry telemetry.
   - Provides instant browser execution for non-install trials, template browsing, download links for macOS binaries, and Dodo payment checkouts.

2. **Native macOS Desktop Application (`apps/desktop`)**:
   - Built with Electron 33, Vite 6, and React 18 in strict TypeScript mode.
   - Packaged as native macOS `.dmg` bundles: `UniDeploy-arm64.dmg` (Apple Silicon) and `UniDeploy-x64.dmg` (Intel).
   - Manages local session credentials via `electron-store` and pairs via device authorization.

3. **npm Command Line Interface (`packages/cli`)**:
   - Distributed as `unideploy` on npm (Node.js >= 22).
   - Provides terminal commands: `unideploy auth`, `unideploy sandbox create`, `unideploy run <file>`, `unideploy deploy <file>`, and `unideploy whoami`.
   - Stores user tokens locally with `0600` permissions at `~/.unideploy/auth.json`.

4. **Model Context Protocol (MCP) Server (`apps/mcp`)**:
   - Compliant with Anthropic's Model Context Protocol (MCP).
   - Enables agents in Cursor, Claude Code, and Windsurf to trigger sandboxed code execution and deployments remotely.

### 2.2 Cloudflare Worker Edge Gateway (`apps/worker`)

- **Routing & Framework**: Lightweight, high-throughput Hono web application running on Cloudflare Workers edge nodes.
- **Authentication**: Generates and polls 6-character alphanumeric device codes for frictionless CLI/desktop login without requiring long browser copy-pastes.
- **Persistence (Cloudflare D1)**:
  - `users`: User identity, email, plan tier (`Free`, `Starter`, `Pro`, `Team`), compute tokens remaining, and stripe/dodo subscription status.
  - `sessions`: Device pairing states with 10-minute TTLs.
  - `sandboxes`: Records active microVM IDs, runtime templates, memory limits, and timestamps.
  - `models`: Stores deployed script names, frameworks, endpoint URLs, and cryptographically hashed API keys.
- **Ephemeral State (Cloudflare KV)**: Handles high-speed authentication cache lookups and short-lived polling mailboxes.

### 2.3 Cloud Compute Plane (E2B Firecracker)

- **Virtualization Technology**: Amazon Firecracker microVMs managed via E2B Code Interpreter SDK.
- **Cold Boot Speed**: Sub-2-second boot time per microVM instance.
- **Isolation Boundaries**:
  - Full hardware-assisted virtualization with separate Linux kernel for each sandbox.
  - Quarantined memory allocations (2GB standard, up to 8GB for Pro/Team).
  - Isolated root filesystem destroyed on ephemeral runs or saved for persistent workspaces.
- **Visual Artifact Streaming**: MicroVM stdout and graphical output (Matplotlib figures, charts, dataframes) are encoded and returned as structured JSON artifacts.

### 2.4 Multi-Provider AI Engine (`packages/ai` & `packages/agent`)

- **`@earendil-works/pi-ai`**: Unified multi-provider LLM connector supporting tool-calling across OpenAI, Anthropic, Google Gemini, Groq, NVIDIA NIM, and Hugging Face.
- **`@earendil-works/pi-agent-core`**: Resilient event-driven agent loop managing tool execution, context pruning, streaming deltas, and lifecycle events.

---

## 3. Key Data & Interaction Flows

### 3.1 Device Authentication Flow (`unideploy auth`)

```
CLI / Desktop                  Worker Edge Gateway                 Browser / User
     │                                  │                                 │
     │── 1. POST /auth/session ────────▶│                                 │
     │◀─ 2. { code: "ABC-123" } ────────│                                 │
     │                                  │                                 │
     │── 3. Opens browser (unideploy.in/auth?code=ABC-123) ──────────────▶│
     │                                  │                                 │
     │── 4. Polls /poll/cli/:sessionId ─▶│                                │
     │      (every 2 seconds)           │◀── 5. User signs in & confirms ─│
     │                                  │                                 │
     │◀─ 6. Emits auth token ───────────│                                 │
     │                                  │                                 │
     ▼                                  ▼                                 ▼
Saves ~/.unideploy/auth.json (0600)  Session verified in D1
```

### 3.2 Cloud Sandbox Execution Flow (`unideploy run script.py`)

1. User issues `unideploy run script.py`.
2. CLI reads file contents, resolves language runtime, and attaches the bearer token from `~/.unideploy/auth.json`.
3. Worker Edge Gateway verifies token, checks compute token quota in D1, and deducts execution units.
4. Worker calls E2B Code Interpreter to launch or resume an isolated Firecracker microVM.
5. MicroVM executes script, intercepts stdout, stderr, and graphical plots.
6. Execution results stream back to the CLI; charts are displayed or linked; microVM either suspends (persistent) or terminates (ephemeral).

### 3.3 1-Click Model Deployment Flow (`unideploy deploy app.py`)

1. User executes `unideploy deploy app.py`.
2. CLI packages script code and posts to `/api/v1/models/deploy`.
3. Worker creates a model record in D1, provisions a permanent HTTPS routing path, and generates a cryptographically secure API key (`ud_live_...`).
4. Worker returns live endpoint URL (`https://.../predict`) and API key to the user.
5. Subsequent incoming HTTP requests validate the API key and run inference inside the microservice sandbox.

---

## 4. Security & Compliance Architecture

| Layer | Implementation | Security Benefit |
|---|---|---|
| **MicroVM Isolation** | Firecracker virtualization (E2B) | Kernel-level isolation; zero host breakout risk |
| **Edge Gateway** | Cloudflare Workers & Hono | Global DDoS mitigation, edge TLS termination |
| **Credential Storage** | Local `0600` permissions (`auth.json`) | OS-level protection against unauthorized user reading |
| **Model Ingestion** | Cryptographic token hashing (SHA-256) | API keys never stored in plain text in database |
| **Payments** | Dodo Payments Merchant of Record | PCI-DSS compliant; no card data touches UniDeploy servers |
| **Code Standards** | 7EDGE strict TypeScript | Zero `any` types; full compile-time safety across all packages |
