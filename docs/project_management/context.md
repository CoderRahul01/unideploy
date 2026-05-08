# UniDeploy — Project Context

## What It Is
Production-readiness security scanner for "vibe-coded" apps. Users connect a GitHub repo, the system scans it for 13 security issues (RLS, secrets, auth, headers, BOLA), generates an AI remediation plan per finding, and lets users apply fixes as a GitHub PR — without storing the repo code.

## Monorepo Layout
```
unideploy/
├── apps/backend/          FastAPI API + agents + worker
├── apps/frontend/         Next.js 15 dashboard
├── apps/cli/              TypeScript CLI (unideploy scan / init)
├── apps/mcp/              MCP server (6 tools for Claude Code / Cursor)
├── docs/project_management/   context / plan / progress / research
├── scripts/               deploy-backend.sh, redeploy-run.sh, setup-gcp-secrets.sh
└── cloudbuild.yaml        GCP Cloud Build CI/CD
```

## Live Services

| Service | URL |
|---------|-----|
| Frontend | https://unideploy.vercel.app |
| Backend (Cloud Run) | https://unideploy-api-4b25n74mbq-uc.a.run.app |
| Backend health | https://unideploy-api-4b25n74mbq-uc.a.run.app/health |
| Agent Engine | projects/1063190328420/locations/us-central1/reasoningEngines/8590568460453412864 |
| GCR image | gcr.io/manifest-design-484007-m8/unideploy-api:latest |

## GCP
- Project ID: manifest-design-484007-m8 | Number: 1063190328420 | Region: us-central1
- Cloud Run service: unideploy-api
- Service account: unideploy-api@manifest-design-484007-m8.iam.gserviceaccount.com
- SA roles: secretmanager.secretAccessor, aiplatform.user, logging.logWriter
- Cloud Build SA: 1063190328420@cloudbuild.gserviceaccount.com (roles: run.admin, iam.serviceAccountUser)

## GitHub
- Repo: https://github.com/CoderRahul01/unideploy | Branch: main
- Vercel root directory: apps/frontend

## Secrets in GCP Secret Manager (project manifest-design-484007-m8)
- gemini-api-key, e2b-api-key, composio-api-key, dodo-api-key
- insforge-api-key, insforge-project-id, supermemory-api-key, autosend-api-key
- dodo-webhook-secret → EMPTY, needs value from Dodo Payments dashboard

## Cloud Run Env Vars
- APP_ENV=production
- GOOGLE_CLOUD_PROJECT=manifest-design-484007-m8
- GOOGLE_GENAI_USE_VERTEXAI=TRUE
- GOOGLE_CLOUD_LOCATION=us-central1
- BASE_URL=https://api.unideploy.in
- FRONTEND_URL=https://www.unideploy.in
- ALLOWED_ORIGINS=https://www.unideploy.in,https://unideploy.vercel.app
- AGENT_ENGINE_RESOURCE_NAME=projects/1063190328420/locations/us-central1/reasoningEngines/8590568460453412864

## Vercel Env Vars (STILL NEEDED — set in Vercel dashboard)
- NEXT_PUBLIC_API_URL=https://unideploy-api-4b25n74mbq-uc.a.run.app
- NEXT_PUBLIC_WS_URL=wss://unideploy-api-4b25n74mbq-uc.a.run.app

## Tech Stack
- Backend: Python 3.12, FastAPI 0.115, uvicorn --workers 1, google-adk, e2b (optional), composio-core
- Frontend: Next.js 15 + Turbopack, TypeScript strict, no UI framework, inline styles
- CLI: TypeScript, Commander, chalk, ora, cli-table3, ws
- MCP: @modelcontextprotocol/sdk, node-fetch
- Database: InsForge REST API (apps/backend/core/database.py) — httpx client, no ORM
- Payments: Dodo Payments (stub webhook handler)

## Key Backend Files
- main.py — FastAPI app + lifespan, starts scan worker
- adk_app.py — ADK agent definitions (analyzer_agent, autofix_agent, root_agent)
- agent_engine/ — package deployed to Vertex AI Agent Engine
- agents/analyzer.py — routes to Agent Engine or local ADK runner
- agents/e2b_runner.py — E2B sandbox or GitHub API fallback
- agents/plan_agent.py — Gemini 2.0 Flash remediation plans (JSON)
- agents/fix_agent.py — Gemini 2.5 Pro patches + Composio GitHub PR
- analyzer/security_checker.py — 13-rule deterministic checker
- workers/scan_worker.py — asyncio queue, max 10 concurrent scans
- routers/scans.py — POST/GET /api/v1/scan*
- routers/sessions.py — POST /api/v1/sessions/create
- routers/websockets.py — WS /ws/cli/{code}, WS /ws/browser/{code}
- core/database.py — InsForge REST client with lazy header loading
