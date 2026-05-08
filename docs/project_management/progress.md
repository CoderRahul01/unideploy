# UniDeploy — Build Progress

## Done ✅

### Backend (apps/backend/)
- FastAPI app (`main.py`) with lifespan, CORS, all routers mounted
- Background scan worker (`workers/scan_worker.py`) — asyncio Queue, Semaphore(10), processes scans concurrently
- 13-rule security checker (`analyzer/security_checker.py`) — deterministic, produces JSON findings
- E2B runner (`agents/e2b_runner.py`) — E2B optional; falls back to GitHub API fetch + in-process checker
- PlanAgent (`agents/plan_agent.py`) — Gemini 2.0 Flash, structured per-finding JSON remediation plans
- FixAgent (`agents/fix_agent.py`) — Gemini 2.5 Pro patches + Composio GITHUB_CREATE_A_PULL_REQUEST
- ADK agents (`agents/analyzer.py`) — routes to Agent Engine or local ADK runner based on env var
- InsForge REST client (`core/database.py`) — lazy `_headers()` function (per-request env var reads, not frozen at import)
- Auth middleware (`core/auth.py`) + API key auth (`api_key_auth.py`)
- All routers: `routers/scans.py`, `routers/sessions.py`, `routers/websockets.py`, `routers/payments.py`
- Dockerfile fixed: `--workers 1` (asyncio queue lives in one process)
- requirements.txt includes `google-cloud-aiplatform>=1.60.0` for vertexai SDK

### Agents (Vertex AI Agent Engine)
- 3 ADK agents deployed: UniDeployOrchestrator (root), UniDeployAnalyzer, UniDeployAutoFix
- Resource: `projects/1063190328420/locations/us-central1/reasoningEngines/8590568460453412864`
- Package at `apps/backend/agent_engine/` (agent.py + requirements.txt)

### Infrastructure
- Cloud Run deployed and healthy: `https://unideploy-api-4b25n74mbq-uc.a.run.app`
- All 9 secrets stored in GCP Secret Manager (project `manifest-design-484007-m8`)
- Service account `unideploy-api@manifest-design-484007-m8.iam.gserviceaccount.com` with correct IAM roles
- `cloudbuild.yaml` — full build+push+deploy pipeline, all secrets mounted, `^@^` delimiter for ALLOWED_ORIGINS
- `scripts/redeploy-run.sh` — redeploys Cloud Run from existing image (no rebuild)
- `scripts/setup-gcp-secrets.sh` — stores secrets from `.env`, skips empty values safely

### Frontend (apps/frontend/)
- Next.js 15 dashboard with GitHub URL scan flow + WebSocket CLI session flow
- `src/lib/api.ts` — typed API client; `security_grade: SecurityGrade | null` (TypeScript build error fixed)
- Dashboard routing: `?session_id=` → CliSessionFlow, `?scan_id=` or no params → GithubScanFlow
- Deployed to Vercel at `https://unideploy.vercel.app`

### CLI (apps/cli/)
- `unideploy scan [github_url]` — polls `/api/v1/scan` every 3s, shows findings table
  - `--ci`: exits 1 on CRITICAL findings (GitHub Actions gate)
  - `--json`: structured JSON output
  - `--local`: hits `localhost:8000`
  - Auto-detects GitHub URL from `git remote`
- `unideploy init` — WebSocket session pairing, streams findings to terminal

### MCP (apps/mcp/)
- 6 tools wired to real backend endpoints: `scan_repo`, `get_findings`, `get_remediation_plan`, `apply_fixes`, `get_deployment_status`, `rotate_secret`

### CI/CD
- GitHub Actions (`.github/workflows/unideploy.yml`) — installs CLI, scans, gates on CRITICAL, comments on PRs
- Cloud Build (`cloudbuild.yaml`) — builds image, pushes to GCR, deploys to Cloud Run on push to main

---

## Pending / Needs Action ⏳

### Immediate (blocks full functionality)

| Item | What's needed | Where |
|------|--------------|-------|
| Vercel env vars | Set `NEXT_PUBLIC_API_URL=https://unideploy-api-4b25n74mbq-uc.a.run.app` and `NEXT_PUBLIC_WS_URL=wss://unideploy-api-4b25n74mbq-uc.a.run.app` in Vercel dashboard | Vercel → Project → Settings → Environment Variables |
| Cloud Build Trigger | Connect `CoderRahul01/unideploy` repo in GCP Console → Cloud Build → Triggers, branch `main`, config `cloudbuild.yaml` | GCP Console |
| Composio GitHub auth | Run `composio add github` in Cloud Shell to grant OAuth access for FixAgent PR creation | Cloud Shell |

### Configuration (one-time manual steps)

| Item | What's needed | Where |
|------|--------------|-------|
| InsForge tables | Create `scans`, `findings`, `remediation_plans` tables via InsForge dashboard | InsForge dashboard |
| DODO_WEBHOOK_SECRET | Get signing secret from Dodo Payments dashboard, store as `dodo-webhook-secret` in Secret Manager | Dodo dashboard → Secret Manager |
| Custom domain DNS | `api.unideploy.in` → Cloud Run URL (DNS mapping) | Domain registrar + GCP Cloud Run domain mappings |

### Known Issues / Tech Debt

- `apps/backend/database.py` at repo root — deleted ✅
- `apps/backend/models.py` — deleted ✅
- `apps/backend/api_key_auth.py` — deleted ✅
- `apps/backend/tests/test_api_key_auth.py` — deleted ✅
- `apps/backend/requirements.txt` — SQLAlchemy/ORM dependencies removed ✅

---

## Deployment State

| Service | Status | URL |
|---------|--------|-----|
| Frontend (Vercel) | ✅ Live | https://unideploy.vercel.app |
| Backend (Cloud Run) | ✅ Live | https://unideploy-api-4b25n74mbq-uc.a.run.app |
| Agent Engine (Vertex AI) | ✅ Deployed | projects/1063190328420/locations/us-central1/reasoningEngines/8590568460453412864 |
| GitHub repo | ✅ Live | https://github.com/CoderRahul01/unideploy |
| GCP Secret Manager | ✅ 9 secrets stored | manifest-design-484007-m8 |
| Cloud Build Trigger | ⏳ Not connected | needs manual setup in GCP Console |
| Custom domain | ⏳ Not mapped | api.unideploy.in → Cloud Run |
