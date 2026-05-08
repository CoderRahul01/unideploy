# UniDeploy — Architecture Decisions & Research Notes

## Why `--workers 1` in Dockerfile

The scan queue lives in an `asyncio.Queue` inside `workers/scan_worker.py`. With `uvicorn --workers 2`, uvicorn spawns two separate Python processes. The queue only exists in one of them — the other process receives HTTP requests but never drains the queue, so ~50% of scans are silently lost.

Cloud Run scales horizontally (multiple container instances), not vertically. Each instance should be a single process with one asyncio event loop. One worker per instance is correct.

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080",
     "--workers", "1", "--log-level", "info", "--proxy-headers"]
```

## Why E2B is Optional

`agents/e2b_runner.py` checks `E2B_API_KEY` at startup. If absent, `run_scan_in_sandbox()` falls back to:
1. Fetch repository file tree and contents via GitHub API
2. Write files to a local tmpdir
3. Run `analyzer/security_checker.py` in-process against those files
4. Clean up tmpdir

This makes the scanner work without E2B credits or sandbox billing. E2B adds isolation (Firecracker microVM) and is preferable for production, but the results are identical since the same `security_checker.py` runs in both paths.

Set `GITHUB_TOKEN` in the environment for private repo access in the fallback path.

## Why InsForge Instead of Supabase/SQLAlchemy

`core/database.py` is a thin httpx REST client over the InsForge API. No ORM, no migrations, no connection pool to manage. Persistence is **best-effort** — the in-memory `_scans` dict in `workers/scan_worker.py` is the authoritative source of truth for active scans. InsForge stores an audit trail and historical scan results only.

This means:
- Server restarts lose in-flight scan state (acceptable — scans are short-lived)
- InsForge failures are logged but never raise exceptions to callers
- No migration files to maintain; schema is managed in the InsForge dashboard

The old `apps/backend/database.py` at the repo root was a SQLAlchemy stub from an earlier design. It has been deleted along with `models.py` and `api_key_auth.py` to simplify the codebase.

## Why InsForge Headers Must Be Lazy

Early versions built the `Authorization` header at module import time:
```python
HEADERS = {"Authorization": f"Bearer {os.getenv('INSFORGE_API_KEY', '')}"}
```
This captures the env var value once, at import. In Cloud Run, secrets are injected as env vars at container start, but the import happens during the same startup sequence — depending on import order, the env var may not be set yet, yielding a permanent empty token.

The fix reads the env var on every request:
```python
def _headers() -> dict:
    return {
        "Authorization": f"Bearer {os.getenv('INSFORGE_API_KEY', '')}",
        "X-Project-ID": os.getenv("INSFORGE_PROJECT_ID", ""),
        "Content-Type": "application/json",
    }
```

## `^@^` gcloud Delimiter for ALLOWED_ORIGINS

gcloud's `--set-env-vars` uses `,` as a list separator. A value like `https://a.com,https://b.com` is parsed as two separate key=value pairs and fails.

The fix is to prefix the argument with `^@^` to tell gcloud to use `@` as the delimiter instead:
```
--set-env-vars=^@^ALLOWED_ORIGINS=https://www.unideploy.in,https://unideploy.vercel.app
```
Only the first `--set-env-vars` flag in a command needs the prefix. Each subsequent `--set-env-vars` flag uses its own delimiter scope.

## Agent Engine Architecture

Resource: `projects/1063190328420/locations/us-central1/reasoningEngines/8590568460453412864`  
Deployed from `apps/backend/agent_engine/` via `adk deploy agent_engine`.

```
UniDeployOrchestrator (root_agent, gemini-2.5-flash)
├── UniDeployAnalyzer  (analyzer_agent, gemini-2.5-flash)  → returns findings JSON array
└── UniDeployAutoFix   (autofix_agent,  gemini-2.5-pro)   → returns unified diff patches
```

`agents/analyzer.py` invokes the Agent Engine when `AGENT_ENGINE_RESOURCE_NAME` env var is set. If absent, it falls back to running the same ADK agents locally via `google-adk`. The local path is useful for development without a deployed engine.

The Agent Engine is invoked with a structured prompt built from the project manifest (framework, files, security findings). It returns a JSON array of findings in the same schema as `security_checker.py`.

## Why gcloud Builds Submit Times Out Locally

`gcloud builds submit` uploads the source archive from the local machine to GCS before starting the build. On a slow or rate-limited network connection this times out (errno 60) before the upload completes.

Solutions in order of preference:
1. **Cloud Build Triggers** (push-based): GitHub push → GCP pulls source directly. No local upload. Set up in GCP Console → Cloud Build → Triggers.
2. **GCP Cloud Shell**: Run `gcloud builds submit` from inside Cloud Shell — the upload happens within GCP's network, no local bandwidth needed.
3. **`scripts/redeploy-run.sh`**: If the image is already in GCR, skip the build entirely and just redeploy the existing image.

## SecurityGrade TypeScript Narrowing

The `SecurityGrade` display component accepts `"A" | "B" | "C" | "D" | "F" | "?"` (the `"?"` is a UI fallback for unknown/null). The `ScanStatus.security_grade` field from the API was typed as `string | null`, which caused a TypeScript error because `string` is not assignable to the literal union.

Fix in `apps/frontend/src/lib/api.ts`:
```typescript
export type SecurityGrade = "A" | "B" | "C" | "D" | "F";

// In ScanStatus interface:
security_grade: SecurityGrade | null;   // was: string | null
```

The `"?"` value is only ever produced by the component itself when `security_grade` is `null` — it is never received from the API.

## Composio GitHub Integration

FixAgent uses Composio's `GITHUB_CREATE_A_PULL_REQUEST` action to raise PRs. Composio requires a one-time OAuth authorisation step:

```bash
composio add github
```

This opens a browser OAuth flow. The resulting token is stored in Composio's cloud and retrieved via `COMPOSIO_API_KEY` at runtime. The `COMPOSIO_API_KEY` secret is already in GCP Secret Manager and mounted in Cloud Run.

Without this OAuth step, `fix_agent.raise_github_pr()` will fail with an authentication error. It needs to be run once from a machine where the user can open a browser (or from Cloud Shell with the preview URL).

## Scan Worker Concurrency Model

```
POST /api/v1/scan
  → scan_id = uuid4()
  → _scans[scan_id] = {status: "queued", ...}
  → await scan_queue.put(scan_id)
  → return {scan_id, status: "queued"}

scan_worker (runs forever via asyncio.create_task in lifespan):
  → while True: scan_id = await queue.get()
  → async with semaphore:  # max 10 concurrent
      → run_scan(scan_id)
  → queue.task_done()
```

The semaphore limits concurrent scans to 10. Scans beyond that queue up in memory. On Cloud Run with `min-instances=0`, the first request after a cold start will find the queue empty and process immediately. No Redis or external queue needed for the current scale.

## 13 Security Rules Reference

| Rule ID | Severity | What it catches |
|---------|----------|-----------------|
| RLS-001 | CRITICAL | Supabase table without RLS enabled |
| RLS-002 | HIGH     | RLS enabled but no policies defined |
| RLS-003 | CRITICAL | RLS policy USING (true) — allows all |
| RLS-004 | HIGH     | UPDATE policy missing WITH CHECK clause |
| SEC-001 | CRITICAL | `service_role` key in client-side file |
| SEC-002 | CRITICAL | Hardcoded API key (entropy check + regex) |
| SEC-003 | HIGH     | Supabase anon JWT in fetch/axios URL |
| AUTH-001 | HIGH    | `createBrowserClient` in Next.js server component |
| AUTH-002 | CRITICAL | Inverted auth guard (negated condition) |
| AUTH-003 | HIGH    | API route returns data without auth check |
| PAY-001  | HIGH    | Stripe checkout with no server-side webhook |
| HDR-001  | MEDIUM  | Missing `Content-Security-Policy` header |
| BOLA-001 | HIGH   | Data query without `user_id` filter (BOLA/IDOR) |

Auto-fixable: RLS-001, RLS-003, RLS-004, SEC-001, AUTH-003, HDR-001, SEC-002
