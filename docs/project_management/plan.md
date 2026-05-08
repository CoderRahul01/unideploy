# UniDeploy — Product & Architecture Plan

## Scan Pipeline (GitHub URL flow)
```
POST /api/v1/scan {github_url, branch}
  → workers/scan_worker.py (asyncio.Queue, max 10 concurrent via Semaphore)
  → agents/e2b_runner.run_scan_in_sandbox()
      → If E2B_API_KEY set: E2B Firecracker VM, git clone, run security_checker.py, kill sandbox
      → If no E2B: GitHub API fetch files → write tmpdir → run security_checker.py in-process
  → analyzer/security_checker.py → 13 rules → findings JSON
  → agents/analyzer.compute_grade() → "A"–"F"
  → agents/plan_agent.generate_remediation_plan() → Gemini 2.0 Flash → per-finding JSON plans
  → core/database.db_update() → InsForge persist (best-effort, non-blocking)
  → _scans dict updated (in-memory source of truth for active scans)

GET  /api/v1/scan/{id}        → poll status + findings
GET  /api/v1/scan/{id}/plan   → remediation plans
POST /api/v1/scan/{id}/fix    → user-triggered:
     → agents/fix_agent.generate_patches() → Gemini 2.5 Pro → file patches
     → agents/e2b_runner.run_fix_in_sandbox() → clone, apply patches, commit
     → agents/fix_agent.raise_github_pr() → Composio GITHUB_CREATE_A_PULL_REQUEST
     → return {pr_url, pr_number, files_changed}
```

## WebSocket / CLI Init Flow
```
CLI: unideploy init
  → POST /api/v1/sessions/create → {session_code, websocket_url}
  → CLI displays session code (boxed), connects WebSocket
  → User opens unideploy.in/connect, enters code
  → Browser connects to /ws/browser/{code}
  → CLI sends {type: "cli_ready", project_manifest: {framework, files}}
  → routers/websockets.py bridges CLI ↔ browser
  → agents/analyzer.run_analysis() → Agent Engine (if AGENT_ENGINE_RESOURCE_NAME set) or local ADK
  → findings streamed back as {type: "finding"} messages
  → {type: "scan_complete"} closes session
```

## Frontend Routing (apps/frontend/src/app/dashboard/page.tsx)
- `?session_id=XXX` → CliSessionFlow component (WebSocket pairing display)
- `?scan_id=XXX` → GithubScanFlow component (polls GET /api/v1/scan/{id} every 3s)
- No params → GithubScanFlow with URL input form

## Agent Engine Architecture
Deployed resource: projects/1063190328420/locations/us-central1/reasoningEngines/8590568460453412864
Package: apps/backend/agent_engine/ (agent.py + requirements.txt)
```
UniDeployOrchestrator (root_agent, gemini-2.5-flash)
├── UniDeployAnalyzer (analyzer_agent, gemini-2.5-flash) — returns findings JSON array
└── UniDeployAutoFix  (autofix_agent, gemini-2.5-pro)   — returns unified diff patches
```
Invoked by: agents/analyzer._run_via_agent_engine() when AGENT_ENGINE_RESOURCE_NAME is set.

## 13 Security Rules (analyzer/security_checker.py)
| Rule ID | Severity | Check |
|---------|----------|-------|
| RLS-001 | CRITICAL | Supabase table without RLS enabled |
| RLS-002 | HIGH | RLS enabled but no policies defined |
| RLS-003 | CRITICAL | RLS policy USING (true) |
| RLS-004 | HIGH | UPDATE policy missing WITH CHECK |
| SEC-001 | CRITICAL | service_role key in client-side file |
| SEC-002 | CRITICAL | Hardcoded API key (entropy + regex) |
| SEC-003 | HIGH | Supabase anon JWT in fetch/axios URL |
| AUTH-001 | HIGH | createBrowserClient in Next.js server component |
| AUTH-002 | CRITICAL | Inverted auth guard |
| AUTH-003 | HIGH | API route returns data without auth check |
| PAY-001 | HIGH | Stripe checkout with no server webhook |
| HDR-001 | MEDIUM | Missing Content-Security-Policy |
| BOLA-001 | HIGH | Data query without user_id filter |

Auto-fixable rules: RLS-001, RLS-003, RLS-004, SEC-001, AUTH-003, HDR-001, SEC-002

## MCP Tools (apps/mcp/src/index.ts)
All backed by real backend endpoints:
- scan_repo(github_url, branch?) → POST /api/v1/scan
- get_findings(scan_id) → GET /api/v1/scan/{id}
- get_remediation_plan(scan_id) → GET /api/v1/scan/{id}/plan
- apply_fixes(scan_id, finding_ids?) → POST /api/v1/scan/{id}/fix
- get_deployment_status(scan_id) → GET /api/v1/scan/{id}
- rotate_secret(scan_id, secret_name) → manual rotation guide

## CLI Commands (apps/cli/src/index.ts)
- `unideploy scan [github_url]` — polls /api/v1/scan every 3s, shows findings table
  - --ci: exit 1 if CRITICAL findings (GitHub Actions gate)
  - --json: structured JSON output for CI parsing
  - --local: hit localhost:8000 instead of production
  - Auto-detects GitHub URL from git remote if not provided
- `unideploy init` — WebSocket session pairing, streams findings to terminal

## GitHub Actions CI (.github/workflows/unideploy.yml)
- Runs on push to main + PRs
- Installs unideploy CLI, runs scan --ci --json
- Parses report with jq, writes to GITHUB_STEP_SUMMARY
- Comments on PRs with grade + findings count
- Exits 1 on CRITICAL findings (blocks merge)

## Pending Decisions / Next Items
1. InsForge table schema — needs to be created via InsForge dashboard (no migrations yet)
2. Composio GitHub OAuth — run `composio add github` once in Cloud Shell
3. Dodo webhook secret — get from Dodo dashboard, store as `dodo-webhook-secret` in Secret Manager
4. Cloud Build Trigger — connect GitHub repo in GCP Console (one-time manual step)
5. Custom domain — api.unideploy.in → Cloud Run URL (DNS mapping needed)
