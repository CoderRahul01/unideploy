# UniDeploy — Agent Workspace Context

**Brand**: UniDeploy ([unideploy.in](https://www.unideploy.in))  
**Product**: 100% Cloud-Native AI Sandbox & Model Deployment Platform

---

## 1. Overview

UniDeploy is an **AI Cloud Sandbox & Model Deployment Platform** purpose-built for developers, data scientists, and autonomous AI agents. It provides instant, disposable or persistent cloud microVMs (powered by E2B Firecracker technology) accessible via the browser, terminal CLI (`npx unideploy`), agent REST APIs, and MCP for Cursor/Claude Code.

```
apps/
  frontend/         Next.js 16 web platform, sandbox studio, and template marketplace (Vercel)
  worker/           Cloudflare Worker edge gateway, AI proxy, sandbox sessions & D1/KV storage
  mcp/              Model Context Protocol (MCP) server for Cursor & Claude Code
  desktop/          Optional native desktop client (.dmg)

packages/
  cli/              @unideploy/cli — lightweight client for cloud sandbox execution & model deployment
  ai/               @earendil-works/pi-ai — unified multi-provider LLM engine
  agent/            @earendil-works/pi-agent-core — stateful agent loop with streaming & tools

skills/             Agent skills repository
docs/               Platform architecture, specifications, and deployment guides
```

---

## 2. Core Distribution Channels

1. **Zero-Install Web Studio (`unideploy.in/sandbox`)**:
   - Browser-native code runner with sub-2s Firecracker microVM boots.
   - Persistent Python 3.11 with NumPy, Pandas, Matplotlib, and auto-rendered visualisations.
   - Cloud Marketplace templates (`colab-python`, `agent-code-interpreter`, `agent-scraper`, `model-deploy`, `cloud-terminal`).

2. **Zero-Config Terminal CLI (`packages/cli/`)**:
   - Run code in cloud microVMs: `npx unideploy run script.py`.
   - Deploy scripts to live HTTPS REST APIs: `npx unideploy deploy app.py`.
   - Device pairing and token management: `npx unideploy auth`, `npx unideploy whoami`.

3. **Agent Code Interpreter REST API (`apps/worker/`)**:
   - `POST /api/sandbox/run` enables LangChain, CrewAI, AutoGen, and Python scripts to execute code in isolated microVMs safely.

4. **Model Context Protocol (MCP) Server (`apps/mcp/`)**:
   - Connects Cursor and Claude Code directly to UniDeploy cloud sandboxes.

5. **Indian & Global Pricing (Dodo Payments)**:
   - Primary domain: `unideploy.in` tailored for the Indian tech and developer market.
   - **Free Trial**: ₹0 / first month with 50,000 free trial tokens + 3 cloud microVM sessions.
   - **Starter**: ₹499 / month (~$6) — 500k tokens, 20 compute hours.
   - **Pro**: ₹1,499 / month (~$18) — 2.5M tokens, 80 compute hours, 3 deployed model endpoints with API keys.
   - **Team**: ₹4,999 / month (~$59) — 10M tokens, dedicated compute pool, team collaboration.
   - Frictionless payments supporting UPI, RuPay, Indian debit cards, and international cards via Dodo Payments.

---

## 3. Monorepo Scripts & Validation

All agents working in this repository must ensure the following checks pass before concluding tasks:

```bash
# Typecheck and validate all workspaces
npm run check

# Targeted typechecks
npm run typecheck:cli       # Validate packages/cli
npm run typecheck:worker    # Validate apps/worker

# Local development commands
npm run dev                 # Run CLI locally
npm run dev:frontend        # Run Next.js web application
npm run dev:worker          # Run Cloudflare Worker locally (wrangler dev)
npm run dev:desktop         # Run Electron desktop app in development
```

---

## 4. Code Standards (7EDGE)

- **TypeScript strict mode**: No `any` types permitted. Explicitly type return values and parameters.
- **British English**: Use British English in all user-facing copy, documentation, and error messages (e.g. *optimised*, *visualisation*, *prioritise*).
- **Clean error messaging**: All error messages must be actionable, suggesting the precise next command or step to resolve the issue.
- **Git workflow**: No direct push to `main` — all feature work and fixes must use pull requests.
