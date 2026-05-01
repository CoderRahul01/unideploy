# UniDeploy — Production-Readiness for Vibe-Coded Apps

**Ship without getting hacked.** UniDeploy scans your AI-generated codebase for security vulnerabilities, missing production configs, and deployment anti-patterns — then auto-fixes what it can and opens a PR with the patches.

[![E2B Partner](https://e2b.dev/badge.svg)](https://e2b.dev)

---

## The Problem

**45% of AI-generated code contains OWASP Top 10 vulnerabilities** (Veracode, 2025). Lovable, Bolt, V0, and Cursor make it easy to build apps — but the code they generate ships with hardcoded secrets, missing auth checks, disabled RLS policies, and zero rate limiting. **2,000+ critical vulnerabilities were found in just 5,600 vibe-coded apps** (Escape.tech).

UniDeploy is the production-readiness layer that catches what the AI missed.

---

## How It Works

```bash
# 1. Install
npx unideploy@latest init

# 2. Scan
unideploy scan

# 3. Fix
unideploy fix
```

That's it. Three commands from "vibe-coded app" to "production-ready."

### What Happens Under the Hood

```
┌────────────────────────────────────────────────────────────────────┐
│  Developer runs: unideploy scan                                    │
│                                                                    │
│  CLI ──► Detects framework (Next.js / FastAPI / Django / Express)  │
│      ──► Builds project manifest (files, deps, env, git remote)    │
│      ──► Redacts secrets locally                                   │
│      ──► Sends manifest to UniDeploy API                           │
│                                                                    │
│  API ──► AnalyzerAgent (Gemini Flash) scans 13 categories          │
│      ──► BuildAgent verifies project builds in sandbox             │
│      ──► AutoFixAgent (Gemini Pro) generates patches               │
│      ──► PatchAgent opens PR via Composio GitHub                   │
│                                                                    │
│  CLI ◄── Streams findings with severity + auto-fix indicators      │
│      ◄── Shows security grade (A/B/C/D/F)                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## What It Checks (13 Categories)

| # | Category | Example Finding |
|---|---|---|
| 1 | **Secrets & Credentials** | Stripe live key hardcoded in `src/lib/stripe.ts` |
| 2 | **Authentication** | No auth check on `POST /api/users` |
| 3 | **Authorization & RLS** | Supabase RLS disabled on `profiles` table |
| 4 | **Input Validation** | `dangerouslySetInnerHTML` with user content |
| 5 | **Rate Limiting** | No rate limit on `/api/auth/login` |
| 6 | **CORS & CSRF** | `Access-Control-Allow-Origin: *` on auth endpoints |
| 7 | **Error Handling** | Stack trace returned to client in production |
| 8 | **Dependencies** | 3 packages with known RCE CVEs |
| 9 | **Environment Config** | `DEBUG=True` in production settings |
| 10 | **Security Headers** | Missing Content-Security-Policy |
| 11 | **Database** | No indexes on foreign key columns |
| 12 | **Frontend Security** | Auth tokens stored in localStorage |
| 13 | **Deployment Readiness** | No health check endpoint, running as root |

Each finding includes severity (Critical/High/Medium/Low), file path + line number, and whether an auto-fix is available.

---

## Installation

### CLI (npm)
```bash
npx unideploy@latest init
# or install globally
npm install -g unideploy
```

### MCP Server (Cursor / Claude Code)
```json
{
  "mcpServers": {
    "unideploy": {
      "command": "npx",
      "args": ["-y", "@unideploy/mcp"],
      "env": { "UNIDEPLOY_API_KEY": "your_key_here" }
    }
  }
}
```

### Cursor Rules (auto-scan on code generation)
Drop `.cursor/rules/unideploy.mdc` in your project — Cursor's AI will automatically call UniDeploy whenever it generates new code.

---

## Pricing

| Tier | Price | Scans | Projects | Key Features |
|---|---|---|---|---|
| **Free** | $0 | 5/month | 1 | AnalyzerAgent only, CLI + MCP, 7-day history |
| **Indie** | $15/mo | Unlimited | 3 | + AutoFix, GitHub PRs, secrets scanning |
| **Pro** | $39/mo | Unlimited | 10 | + All agents, Sentry/Vercel integrations, voice reports |
| **Team** | $99/mo + $19/seat | Unlimited | ∞ | + SSO, audit logs, custom rules, scheduled scans |

Payments powered by [Dodo Payments](https://dodopayments.com) — supports UPI (India), cards, Apple Pay, Google Pay worldwide.

---

## Tech Stack

```
CLI             Node.js / TypeScript
MCP Server      @unideploy/mcp (stdio)
Dashboard       Next.js 14 (Vercel)
API             FastAPI (Cloud Run)
Agents          Google Gemini Enterprise Agent Platform (ADK)
  ├── AnalyzerAgent     Gemini 2.5 Flash (pattern matching, cheap)
  ├── BuildAgent        Gemini 2.5 Flash + E2B sandbox
  ├── AutoFixAgent      Gemini 2.5 Pro (reasoning for patches)
  └── PatchAgent        No LLM — pure Composio tool execution
Auth            Clerk
Database        Supabase (PostgreSQL)
Payments        Dodo Payments (Merchant of Record)
Integrations    Composio (GitHub, Sentry, Vercel, Slack, Linear)
Memory          Supermemory (per-project context)
Email           AutoSend (transactional + marketing)
```

---

## Partner Stack

| Partner | Role | What It Does for UniDeploy |
|---|---|---|
| **Composio** | Action Layer | GitHub OAuth, PR creation, Sentry/Vercel/Slack integrations — agents act, never store tokens |
| **Google Gemini** | Agent Brain | ADK defines the agent graph, Agent Runtime executes, Model Armor blocks prompt injection |
| **Dodo Payments** | Billing | Full Merchant of Record with UPI + global payments, usage metering, tax compliance |
| **Supermemory** | Memory | Per-project scan history, user preferences, incremental scans — sub-300ms retrieval |
| **AutoSend** | Notifications | Scan reports, weekly digests, onboarding emails — pay per send, not per contact |
| **E2B** | Sandbox | Firecracker microVMs for BuildAgent to verify projects actually compile |

---

## Project Structure

```
unideploy/
├── apps/
│   ├── backend/        ← FastAPI scan API + Gemini agents
│   │   ├── agents/     ← ADK agent definitions
│   │   ├── routers/    ← API route modules
│   │   ├── rules/      ← 13 security check categories
│   │   └── core/       ← Config, plan enforcement, grading
│   ├── frontend/       ← Next.js dashboard + landing page
│   ├── cli/            ← Node.js CLI (npx unideploy)
│   └── mcp/            ← MCP server for Cursor/Claude Code
├── docs/               ← Architecture, check categories, agent design
└── README.md
```

---

## Roadmap

```
✅  Phase 0 — Pivot from sandbox-IDE to security tool
🔄  Phase 1 — Core scanner (Secrets + Auth + RLS) — catches 80% of criticals
⬜  Phase 2 — Expand to 13 categories + basic AutoFix
⬜  Phase 3 — GitHub integration + PR flow via Composio
⬜  Phase 4 — MCP server + Cursor rules
⬜  Phase 5 — Dodo billing + plan enforcement
⬜  Phase 6 — Dashboard polish + team features
```

---

## Contributing

UniDeploy's moat is the **rule library** — framework-specific security checks. To add a new rule:

1. Create a rule file in `apps/backend/rules/`
2. Define the check function with `framework`, `severity`, and `auto_fixable` metadata
3. Add test cases in `apps/backend/tests/`
4. Submit a PR

---

*Built by Rahul Pandey — [unideploy.in](https://unideploy.in)*
