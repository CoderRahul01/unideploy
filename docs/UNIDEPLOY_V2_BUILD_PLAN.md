# UniDeploy V2 — Full Architecture & Build Plan
**For: Ayush (Backend), Jayati (Agents) | From: Rahul**
**Date: June 2026 | Status: Active Build**

---

## The one thing to understand before reading anything else

UniDeploy is not a scanner. Scanners are free. Scanners are ignored.

UniDeploy is the **trust layer** between "vibe-coded app" and "something I can charge money for."
The user's problem is not "I don't know my app has vulnerabilities." It's "I don't know how to fix them,
I don't have time, and I'm scared to ship."

We solve fear. We sell confidence. Everything below is in service of that.

---

## Part 1 — What we're actually building (no jargon)

Three things the user does today without us:
1. Build an app on Lovable/Bolt/V0/Claude Code
2. Panic about whether it's safe to ship
3. Either ship anyway (and get breached) or spend 2-4 weeks reading docs they don't understand

What UniDeploy does instead:
1. `npx unideploy@latest init` — one command, 30 seconds
2. Agent reads their code, finds the actual problems, explains them like a human
3. Fixes are applied or shown as PRs — user approves, not just reads
4. Secrets move to 1Claw vault automatically
5. Deploy config generated for whatever cloud they're on

The user pays because we save them weeks and we save them from a breach that would end their startup.

---

## Part 2 — Architecture overview

### What we're stealing from OpenClaw (not forking — pattern only)

OpenClaw (MIT license, TypeScript) is a personal AI agent framework with 100k+ GitHub stars.
We are NOT building a personal assistant. But their architecture pattern is exactly right for us.

**The key pattern:**
```text
Gateway (single Node.js process)
  └── Skills (markdown files loaded on demand)
  └── Tools (actual code the agent can call)
  └── Memory (persistent state)
  └── Sessions (CLI ↔ dashboard communication)
```

**How OpenClaw works:**
- Everything routes through one Gateway process (Express/WebSocket server)
- Agent identity and rules live in plain markdown files (SOUL.md, AGENTS.md)
- Skills are markdown files with natural language instructions + tool configs
- Agent loads skills on demand — doesn't bake everything into one prompt
- Model-agnostic — swap Claude for Gemini for GPT without changing logic

**How UniDeploy V2 mirrors this:**
```text
Gateway (Express/Node.js — Ayush owns this)
  └── SKILL.md per scan category (secrets, auth, RLS, cors, rate-limit, deps...)
  └── Tools (scanner, fixer, deploy-config-gen, secrets-migrator)
  └── Memory (Redis — last scan, session state, fix history)
  └── Sessions (CLI session code ↔ dashboard WebSocket)
```

This means Jayati's agent system doesn't hardcode scan logic. It loads the relevant
skill file for each category and runs it. Adding a new check = adding a new SKILL.md.
No code change. This is the moat: the skill files accumulate per-platform failure
patterns (Lovable fails at RLS, Bolt fails at env config, V0 fails at server-side auth).

---

## Part 3 — The stack decision (final, no more debate)

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + Express | Ayush knows it, team agreed, async WebSocket handling is cleaner |
| Agent framework | LangChain (Python) | Jayati knows it, model-agnostic, traceable, handles orchestrator/plan modes |
| CLI | Fork kilocode base + add unideploy commands | MIT license, saves 3 weeks of boilerplate |
| LLM routing | LiteLLM | Free, model-agnostic, spend tracking, swap models without code change |
| Models | Free tier first: Gemini Flash free tier, Groq (free), Claude Haiku | Start free, gate paid models behind Pro tier |
| Sandbox | E2B Firecracker | Already have credits, sub-second startup, zero cross-contamination |
| Secrets | 1Claw vault + Shroud TEE proxy | Partnership active, 1,000 req/month free, HSM-backed |
| Database | Upstash Redis (sessions/state) + InsForge (persistence) | Already configured |
| DNS | Cloudflare | Already migrated |
| Frontend | Next.js on Vercel | Unchanged |
| Payments | Dodo (international) + Razorpay (India) | Already integrated |

**Free models Jayati should wire up via LiteLLM:**
- `gemini/gemini-2.0-flash-exp` — Google free tier, 1M token context
- `groq/llama-3.3-70b-versatile` — Groq free tier, fast inference
- `anthropic/claude-haiku-4-5` — cheapest Anthropic, good for quick scans
- Route: Free users → Gemini Flash. Pro users → Claude Sonnet. Enterprise → Claude Opus.

---

## Part 4 — The agent architecture (Jayati's domain)

### How the multi-agent pipeline works

```text
User runs: npx unideploy@latest init
           ↓
Gateway receives session + file manifest
           ↓
OrchestratorAgent (LangChain)
  ├── Reads project type (Next.js? FastAPI? Bolt export?)
  ├── Selects relevant SKILL.md files
  ├── Spawns sub-agents:
  │     ├── SecretsAgent      → finds exposed keys, .env leaks
  │     ├── AuthAgent         → checks auth logic, session handling
  │     ├── DatabaseAgent     → RLS policies, SQL injection, connection strings
  │     ├── NetworkAgent      → CORS, rate limiting, security headers
  │     ├── DependencyAgent   → known CVEs in package.json/requirements.txt
  │     └── DeployAgent       → generates Dockerfile, IaC, platform config
  └── Collects results → grades A-F → sends to dashboard
           ↓
AutoFixAgent
  ├── Takes Critical + High findings
  ├── Generates fixes inside E2B sandbox
  ├── Verifies app still runs after fix
  └── Returns diff for user approval (never auto-applies without consent)
           ↓
SecretsAgent (1Claw integration)
  ├── Detected secrets → migrate to 1Claw vault
  ├── Generate .env.1claw reference file
  └── Rewrite LLM SDK calls → Shroud TEE proxy
           ↓
DeployAgent
  ├── Detects stack
  ├── Fetches live platform docs (Tinyfish)
  └── Generates: Dockerfile + docker-compose + platform config
```

### SKILL.md format (Jayati, define these first, agents load them)

Each skill is a markdown file. Example for secrets:

```markdown
---
name: secrets-scanner
category: secrets
severity_weight: 1.0
platforms: [lovable, bolt, v0, replit, claude-code, generic]
---

# Secrets Scanner Skill

## What to look for
- Hardcoded API keys matching known patterns (OpenAI sk-, Anthropic sk-ant-, Stripe sk_live_)
- .env files committed to git history
- Secrets in NEXT_PUBLIC_ variables (exposed to browser)
- Database connection strings with credentials inline
- Private key PEM headers in any file

## Platform-specific patterns
### Lovable apps
- Supabase anon_key used directly in browser fetch calls
- VITE_SUPABASE_ANON_KEY in client bundle

### Bolt apps
- .env not in .gitignore in StackBlitz project export
- API keys in netlify.toml

## Severity rules
- Live production keys = Critical (block deploy)
- Keys in git history = Critical (must rotate)
- Keys on disk + gitignored = High
- Dev/sandbox keys = Medium

## Output format
Return JSON: { file, line, provider, masked_value, severity, in_history, recommendation }
```

This is how you get the per-platform dataset that compounds over time. Every scan updates these files.

---

## Part 5 — The 1Claw integration (first partnership deliverable)

This is not optional. This is the thing that makes us different from every other scanner.

### What 1Claw gives us

1. **HSM-backed vault** — secrets stored with MPC key splitting. Not just encrypted in a database.
2. **Shroud TEE proxy** — sits between the app's LLM calls and the provider. Scrubs secrets before they hit Claude/GPT/Gemini logs. Blocks prompt injection.
3. **27 MCP tools** — works natively with Claude, Cursor, GPT. Our users can connect 1Claw directly to their coding tool.
4. **Agent identity** — each deployed app gets a scoped agent identity with read-only vault access. Revocable from phone.

### What we build

#### CLI: `unideploy secrets` subcommand

```bash
unideploy secrets audit              # read-only, safe in CI — shows what's exposed
unideploy secrets scan               # just the detector
unideploy secrets migrate            # interactive: moves secrets to 1Claw vault
unideploy secrets migrate --dry-run  # shows what would happen, touches nothing
unideploy secrets harden             # rewrites LLM SDK calls to route through Shroud
unideploy secrets verify             # re-scans, expects zero plaintext
```

#### The migration flow (what the user sees)

```text
$ unideploy secrets migrate

Found 4 secrets in your project (2 Critical, 1 High, 1 Medium)

  CRITICAL  OPENAI_API_KEY     sk-proj-...  (hardcoded in /src/api/chat.ts line 3)
  CRITICAL  STRIPE_SECRET_KEY  sk_live_...  (in .env, committed to git 3 days ago)
  HIGH      DATABASE_URL       postgres://...  (in .env, not in git history)
  MEDIUM    RESEND_API_KEY     re_...  (in .env, properly gitignored)

This will:
  → Create vault "myapp-prod" in your 1Claw account
  → Move 4 secrets to encrypted vault paths
  → Register a scoped runtime agent (read-only access)
  → Rewrite .env → .env.1claw (references, no values)
  → Backup .env → .env.local.bak (gitignored)
  → Generate ROTATION_REQUIRED.md for the 2 git-history secrets

Proceed? [y/N]: y

✓ Vault created: myapp-prod
✓ Secrets migrated (4/4)
✓ Agent identity: myapp-runtime (revocable from 1Claw dashboard)
✓ .env.1claw written
✓ ROTATION_REQUIRED.md written — rotate OPENAI_API_KEY and STRIPE_SECRET_KEY NOW

Grade: F → B+  (rotate the 2 git-history secrets to reach A)
```

#### The Shroud hardening (automatic rewrite)

Before (what vibe-coders write):

```typescript
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

After (what `unideploy secrets harden` writes):

```typescript
import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.SHROUD_TOKEN,           // from 1Claw vault
  baseURL: "https://shroud.1claw.xyz/v1",    // TEE proxy
  defaultHeaders: { "X-Shroud-Provider": "openai" }
});
// Shroud intercepts this call, scrubs secrets from the prompt,
// blocks injection attempts, then forwards to OpenAI
```

This is the thing that makes Lovable breach incidents impossible for our users.
When your LLM calls route through a TEE proxy, even if the prompt contains a secret by mistake,
it gets scrubbed before leaving the user's infrastructure.

#### Ignore coverage checker (the thing no one else does)

Most scanners only check `.gitignore`. We check 12 surfaces:

| File | Tool | What it protects |
|---|---|---|
| `.gitignore` | git | git history |
| `.dockerignore` | Docker | image layers |
| `.cursorignore` | Cursor | LLM indexing |
| `.cursorindexingignore` | Cursor | deeper indexing |
| `.claudeignore` | Claude Code | Claude's file access |
| `.claude/settings.json` deny list | Claude Code | tool restrictions |
| `.aiderignore` | Aider | aider context |
| `.codeiumignore` | Codeium/Windsurf | Codeium indexing |
| `.continueignore` | Continue | Continue context |
| `.clineignore` | Cline | Cline access |
| `.geminiignore` | Gemini Code Assist | Gemini indexing |
| `.agentsignore` | Generic agents | catch-all |

Why this matters: a developer can have `.env` in `.gitignore` and think they're safe,
while Cursor's indexer is happily reading all their production credentials every time they open the IDE.
We're the only tool that catches this. This is the dashboard tile that makes people share us.

---

## Part 6 — The build prompt (drop this into Claude Code or Cursor)

This is the single prompt that Ayush and Jayati use to start the V2 build.
Split into two parts — one for each.

---

### PROMPT A — For Ayush (Backend: Node.js Gateway)

```text
You are rebuilding the UniDeploy backend from FastAPI to Node.js/Express.
Repository: https://github.com/CoderRahul01/unideploy

READ FIRST: apps/backend/ (understand existing routes), apps/cli/src/ (understand CLI flow),
docs/PLATFORM_OVERVIEW.md (full system context).

DELIVER:

1. Gateway server (apps/backend-node/src/gateway/index.ts)
   - Express + ws (WebSocket) server
   - Strict JSON schema validation on startup (use Zod, same pattern as OpenClaw)
   - Config at ~/.unideploy/config.json (JSON5, safe defaults if missing)
   - Binds to localhost:3001 by default, configurable via env

2. Auth routes (apps/backend-node/src/routes/auth.ts)
   - POST /auth/register — email + password, bcrypt hash, store in InsForge
   - POST /auth/login — returns session token stored in Upstash Redis (1h TTL)
   - GET /auth/me — validates token, returns user
   - POST /auth/session — creates 6-char CLI session code (stored in Redis 10min TTL)
   - GET /auth/session/:code — browser polls this; returns status (pending/verified)
   - POST /auth/session/:code/verify — CLI hits this after user enters code in browser

3. Session/WebSocket bridge (apps/backend-node/src/gateway/ws.ts)
   - CLI connects via WebSocket using session token
   - Dashboard connects via WebSocket using session token
   - Messages route between CLI and dashboard during active session
   - Redis pub/sub as the backbone (so multiple server instances work)
   - Message types: scan_progress, scan_complete, fix_request, fix_complete, grade_update

4. Scan routes (apps/backend-node/src/routes/scan.ts)
   - POST /api/v1/scan — accepts { github_url, branch } OR receives file manifest from CLI WS
   - GET /api/v1/scan/:id — poll status (queued/running/done/failed)
   - GET /api/v1/scan/:id/findings — returns findings array
   - GET /api/v1/scan/:id/plan — returns remediation plan
   - POST /api/v1/scan/:id/fix — triggers fix flow, returns PR URL if GitHub

5. Deploy routes (apps/backend-node/src/routes/deploy.ts)
   - POST /api/v1/deploy/detect — returns detected stack
   - POST /api/v1/deploy/generate — streams Dockerfile + IaC as SSE
   - Platforms: vercel, gcp, aws, cloudflare, railway

6. Secrets routes (apps/backend-node/src/routes/secrets.ts)
   - POST /api/v1/secrets/audit — trigger ignore-coverage + scan (read-only)
   - POST /api/v1/secrets/migrate — trigger 1Claw vault migration flow
   - GET /api/v1/secrets/status — migration status

7. Payment routes (apps/backend-node/src/routes/payments.ts)
   - Port existing Dodo Payments integration exactly
   - Port existing Razorpay integration exactly

8. Quota middleware (apps/backend-node/src/middleware/quota.ts)
   - Free: 10 scans/month
   - Builder: 50 scans/month
   - Pro: 200 scans/month
   - Enterprise: 1000 scans/month
   - Check quota on every scan route, return 429 with upgrade prompt if exceeded

CONSTRAINTS:
- Never store plaintext secrets anywhere — only fingerprint hashes in logs
- Session codes expire in 10 minutes
- All routes validate with Zod before processing
- Errors return { error: string, code: string } — never stack traces in production
- CORS: allow unideploy.in + app.unideploy.in only
- Rate limiting: 100 req/min per IP on public routes
- Health endpoint: GET /health returns { status, redis, insforge, version }

WHEN DONE:
- Write a Dockerfile for Cloud Run (keep existing GCP setup until AWS Activate approved)
- Write a migration guide from FastAPI routes to new Node routes (so frontend doesn't break)
- List every env var required with descriptions in .env.example
```

---

### PROMPT B — For Jayati (Agents: LangChain multi-agent system)

```text
You are building the UniDeploy agent system — a LangChain-based multi-agent pipeline
that scans vibe-coded apps for production-readiness issues, generates fixes, and
orchestrates secrets migration via 1Claw.

Repository: https://github.com/CoderRahul01/unideploy
READ FIRST: apps/backend/ (existing agent logic), docs/PLATFORM_OVERVIEW.md,
and the 1Claw docs at https://docs.1claw.xyz

ARCHITECTURE: model-agnostic via LiteLLM
- Free tier users: gemini/gemini-2.0-flash-exp
- Pro users: anthropic/claude-sonnet-4-20250514
- Enterprise: anthropic/claude-opus-4-6
- All model calls go through LiteLLM — never direct provider SDK calls
- This lets us track spend per user and switch models without code changes

SKILL FILES: Create these first (they are the agent's knowledge base)
Location: agents/skills/
Each is a markdown file the agent loads on demand.

Create SKILL.md files for:
1. secrets.md — secret detection patterns, provider regex, entropy rules, ignore files
2. auth.md — auth flow checks, session handling, JWT validation, CSRF
3. database.md — RLS policies, SQL injection, connection string exposure, Supabase patterns
4. network.md — CORS wildcard, rate limiting, security headers, HTTPS
5. dependencies.md — CVE detection, outdated packages, license issues
6. deploy.md — Dockerfile patterns, IaC templates, platform-specific configs
7. lovable.md — platform-specific: RLS via anon_key, VITE_ prefix leaks
8. bolt.md — platform-specific: StackBlitz env, Netlify integration patterns
9. v0.md — platform-specific: Next.js server components, NEXT_PUBLIC_ leaks
10. replit.md — platform-specific: Replit secrets, .replit config

DELIVER, IN ORDER:

1. OrchestratorAgent (agents/orchestrator.py)
   - Input: { project_type, file_manifest, platform_hint }
   - Detects which skills are relevant for this project
   - Spawns sub-agents in parallel (LangChain parallel tool calls)
   - Collects results, deduplicates findings, calculates grade A-F
   - Output: { grade, findings[], summary, recommended_fixes[] }

   Grading logic:
   - Any Critical finding = max grade D (not A/B/C)
   - More than 3 High findings = max grade C
   - Grade A = zero Critical, zero High, fewer than 2 Medium
   - Grade B = zero Critical, fewer than 2 High
   - etc.

2. SecretsAgent (agents/secrets_agent.py)
   - Three-layer detection:
     a. Provider regex pack (OpenAI sk-, Anthropic sk-ant-, Stripe sk_live_,
        AWS AKIA, GitHub ghp_, Google AIza, Slack xox, Supabase service-role,
        JWT triplets, RSA/EC PEM headers, Tavily, Composio tokens)
     b. Shannon entropy >=4.0 bits/char over 20+ char strings in .env-like files
     c. Git history scan: git log -p over last 500 commits, same pattern pack
   - Ignore coverage check: verify each of the 12 ignore files has required patterns
   - Risk grading: exposure_axis × sensitivity_axis (see Part 5 of architecture doc)
   - 1Claw migration: call 1Claw Platform API to create vault, write secrets,
     register agent identity, attach scoped policy
   - NEVER log plaintext values. Log fingerprint_sha256 only.
   - Shroud codemod: detect LLM SDK construction sites, rewrite to Shroud proxy URL
     (jscodeshift for JS/TS, libcst for Python)

3. AuthAgent (agents/auth_agent.py)
   - Check every API route for server-side auth guard
   - Detect inverted auth logic (Lovable's common failure)
   - Check session token generation (crypto.randomUUID not Math.random)
   - Check httpOnly + SameSite=Strict on session cookies
   - Check CSRF protection on state-mutating routes
   - Check for missing RLS enforcement at the query layer

4. DatabaseAgent (agents/database_agent.py)
   - Parse Supabase client initialization — is it using service_role or anon key?
   - Detect direct browser→Supabase REST calls with public anon key
   - Find queries without WHERE clauses on user-scoped tables
   - Check for SQL string concatenation (injection risk)
   - Detect missing indexes on columns used in WHERE/JOIN (performance, not just security)
   - For Supabase: simulate what an unauthenticated direct API call returns

5. AutoFixAgent (agents/autofix_agent.py)
   - Receives: finding from OrchestratorAgent
   - Spins up E2B Firecracker microVM
   - Applies fix inside sandbox
   - Runs the app (npm run dev or equivalent)
   - Verifies behavior preserved (no new errors in logs)
   - Returns: { diff, test_result, confidence_score }
   - confidence_score < 0.8 → return diff for manual review, don't auto-apply
   - NEVER auto-applies without user approval (show diff, user clicks Apply)

6. DeployAgent (agents/deploy_agent.py)
   - Input: stack detection result
   - Fetch live platform docs via Tinyfish for target platform
   - Generate: Dockerfile, docker-compose.yml, platform config
   - Stream output as SSE to backend
   - Supported targets: vercel.json, gcp/cloudbuild.yaml, aws/template.yaml,
     cloudflare/wrangler.toml, railway.toml

7. Background scan worker (agents/worker.py)
   - Pulls from Redis scan queue
   - Runs: OrchestratorAgent → grade → plan → persist to InsForge
   - Updates scan status in Redis throughout
   - Handles E2B timeout (30s default, 120s max on Pro)
   - Retries failed scans once with exponential backoff

TRUST RULES (non-negotiable):
- Plaintext secrets: never in logs, never in InsForge, never sent to backend
  Only fingerprint_sha256 hashes are stored/transmitted
- Destructive operations (git history rewrite, delete .env): require explicit --yes flag
  and a second confirmation flag: --i-understand-this-is-irreversible
- In CI environment ($CI=true): default to read-only audit only
  Never hit 1Claw Platform API from CI unless explicit --ci-service-account flag set
- All file edits: backup before mutating (.bak suffix)
- Dry-run on migrate by default

WHEN DONE:
- Write unit tests: regex pack, path classifier, ignore parser (at minimum)
- Write integration test: mock 1Claw API, run full migrate flow on a sample .env
- Write a SKILLS.md index listing all skill files and what they detect
- Write a one-paragraph explanation of the grading system for the dashboard tooltip
```

---

## Part 7 — The free-to-paid monetization model (simple, clear)

**The rule: scans are always free. Fixes are the paywall.**

| Tier | Price | Scans | Auto-fixes | 1Claw migration | Deploy config | Model |
|---|---|---|---|---|---|---|
| Free | $0 | 10/month | Show diff only, manual apply | — | — | Gemini Flash |
| Builder | $19/mo | 50/month | Up to 5 auto-applied | Audit only | Basic (1 platform) | Gemini Flash |
| Pro | $39/mo | 200/month | Unlimited | Full migration | All platforms + IaC | Claude Haiku |
| Enterprise | Custom | 1000/month | Unlimited + PR | Full + Shroud hardening | Custom + team | Claude Sonnet |

**How free model works:**
- Gemini 2.0 Flash has a free API tier: 1M tokens/day, 15 requests/minute
- Groq free tier: Llama 3.3 70B, 14,400 requests/day
- For the scanner (reading code, finding issues) these are more than enough
- Fix generation needs better models → that's the upgrade motivation

**The upgrade moment:**
Free scan runs → shows user 3 Critical findings → says "2 of these can be auto-fixed with Builder plan" → user upgrades → fixes applied → user ships.

This is the conversion funnel. Not "pay to see your issues." Pay to fix them without spending a day figuring out how.

---

## Part 8 — Manual steps Rahul does (not for Ayush/Jayati)

These are the things the code can't do. Rahul does them.

### Step 1: Fork kilocode for the CLI base

```bash
git clone https://github.com/kilocode-dev/kilocode apps/cli-v2
cd apps/cli-v2
# Remove kilocode-specific commands
# Keep: framework detection, file collection, session pairing, local fix apply
# Add: unideploy scan, unideploy secrets, unideploy deploy, unideploy run
```

kilocode is MIT licensed. Keep the attribution comment in package.json.

### Step 2: Set up LiteLLM proxy

```yaml
# apps/litellm/config.yaml
model_list:
  - model_name: "scanner"        # what agents call
    litellm_params:
      model: "gemini/gemini-2.0-flash-exp"
      api_key: os.environ/GEMINI_API_KEY

  - model_name: "scanner-pro"
    litellm_params:
      model: "anthropic/claude-haiku-4-5-20251001"
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: "fixer"
    litellm_params:
      model: "anthropic/claude-sonnet-4-6"
      api_key: os.environ/ANTHROPIC_API_KEY

litellm_settings:
  success_callback: ["langfuse"]   # track spend per user_id
  drop_params: true
```

### Step 3: 1Claw partnership — get the API spec from Kevin Jones

Kevin has the Platform API endpoints. You need:
- POST /v1/vaults
- POST /v1/vaults/{id}/secrets
- POST /v1/agents
- POST /v1/policies
- POST /v1/auth/agent-token

Schedule the tech sync Kevin mentioned. Tell him Phase 1 (audit + scan) ships first — no Platform API calls yet. Phase 2 (migrate) needs the API. Give him 2 weeks heads up.

### Step 4: Cloudflare DNS — add these records

```text
app.unideploy.in   → CNAME → Vercel (frontend)
api.unideploy.in   → CNAME → Cloud Run backend URL
cli.unideploy.in   → not needed (npm package doesn't need DNS)
```

### Step 5: Linear setup (from the meeting)

Create three projects:
- Backend V2 (Ayush) — add the Prompt A tasks as issues
- Agent System (Jayati) — add the Prompt B tasks as issues
- Secrets Module (both) — the 1Claw integration tasks

---

## Part 9 — Build sequence (in order, no skipping)

**Week 1 (Ayush: Gateway + Auth)**
- Node.js Gateway up and running locally
- Auth routes: register, login, session code generation
- WebSocket bridge: CLI ↔ dashboard
- Redis session state
- Health endpoint

**Week 1 (Jayati: Skills + Scanner)**
- Write all 10 SKILL.md files (no code yet — just the knowledge base)
- SecretsAgent: regex pack + entropy detection (Phase 1 — read only)
- OrchestratorAgent: basic routing to SecretsAgent
- Return findings as JSON

**Week 2 (Ayush: Scan + Deploy routes)**
- Scan routes wired to Jayati's agent system
- Deploy routes with SSE streaming
- Quota middleware
- Payment routes ported

**Week 2 (Jayati: AuthAgent + DatabaseAgent)**
- Auth check patterns
- Supabase RLS detection
- Grade calculation
- Background worker

**Week 3 (both: 1Claw migration)**
- CLI secrets audit command (read-only, Phase 1 — demo-able)
- Dashboard secrets tile
- Start 1Claw Platform API client (after Kevin sync)

**Week 4 (both: fixes + deploy)**
- AutoFixAgent with E2B sandbox
- Diff UI in dashboard
- DeployAgent + IaC generation
- End-to-end test: Lovable export → scan → fix → deploy config

**Week 5: Polish + ship**
- Full secrets migrate flow (Phase 2)
- Shroud codemod
- LiteLLM model routing by tier
- 10 beta users on the full flow

---

## Part 10 — The three words that guide every decision

**Production. Readiness. Layer.**

Not a scanner. Not an AI tool. Not another dev tool.

The *layer* between "vibe-coded app" and "app that can handle real users, real money, real data."

Every feature either makes this promise real or it doesn't ship.

When you're not sure whether to build something: ask "does this make a vibe-coded app more production-ready?"
If yes, build it. If no, cut it.

---

*This document is the source of truth. Update it when decisions change. Don't let it get stale.*
