# UniDeploy Platform Overview

## Purpose

UniDeploy is a production-readiness platform for applications built quickly with AI coding tools and modern full-stack frameworks. It helps a developer move from prototype to shippable software by scanning a project for security, reliability, and deployment gaps, explaining the risks, and generating fixes or deployment configuration where the platform can do so safely.

The core product promise is simple: run one command, connect the CLI to the dashboard, get a graded production-readiness report, and use UniDeploy to fix or prepare the app for deployment.

## Primary Audiences

- **Builders and founders** who used Lovable, Bolt, v0, Claude Code, Cursor, or similar tools to create an app and need to make it safe before launch.
- **Developers** who want fast security feedback without manually setting up a full AppSec toolchain.
- **Teams** that want a repeatable scan, fix, and deploy workflow across AI-generated or fast-moving codebases.
- **Investors, partners, and reviewers** who need a concise picture of what the platform includes today and where it is heading.

## What The Platform Does

UniDeploy combines local scanning, cloud-based repository scanning, AI remediation, deployment config generation, secrets posture tooling, and a dashboard.

At a high level, it can:

- Detect the project framework and collect relevant source/config files.
- Scan for hardcoded secrets, unsafe auth patterns, missing rate limiting, weak CORS, missing security headers, unsafe error handling, exposed debug behavior, vulnerable dependency signals, and database/security posture issues.
- Produce severity-ranked findings and calculate a security grade.
- Pair a CLI session with the web dashboard using a short session code.
- Persist scan results so the dashboard can display findings and remediation state.
- Generate remediation plans for GitHub repository scans.
- Apply selected fixes locally from the CLI or generate patches for GitHub PR workflows.
- Generate deployment configuration for detected stacks and selected platforms.
- Audit and migrate secrets posture through the `secrets` command group.
- Expose MCP tools so compatible AI clients can queue scans, retrieve findings, get remediation plans, and request fixes.

## Product Surfaces

### Website And Dashboard

The frontend is a Next.js application in `apps/frontend`. It includes:

- Public landing page.
- Login and registration flow.
- Pricing page.
- Dashboard for scan results.
- Connect page where a user enters the CLI session code.
- Demo, changelog, privacy, terms, security, robots, sitemap, and install script route.
- PostHog and Sentry instrumentation hooks.

The website currently presents UniDeploy as a fast production-readiness scanner for vibe-coded apps and uses `npx unideploy@latest init` as the primary activation path.

### CLI

The npm CLI lives in `apps/cli` and is the main developer entrypoint.

Current command inventory from `apps/cli/src/index.ts`:

- `unideploy init`
  - Scans the local project.
  - Detects the framework.
  - Pairs the CLI with the dashboard using a session code.
  - Supports `--json`, `--ci`, and `--local`.
  - In JSON/CI mode, runs offline local heuristics without interactive pairing.
- `unideploy scan [github_url]`
  - Legacy GitHub URL scan flow.
  - Queues a backend scan and polls for completion.
  - Supports `--branch`, `--ci`, `--json`, and `--local`.
- `unideploy fix`
  - Applies auto-fixable findings from the last local scan.
  - Supports `--dry-run`.
- `unideploy deploy`
  - Detects the project stack and asks the backend DeployAgent to generate deployment configs.
  - Supports `--local`, `--dry-run`, and `--platform <vercel|gcp|aws|cloudflare|railway>`.
- `unideploy run`
  - Combines scan, optional fix, and optional deploy config generation in one workflow.
  - Supports `--local`, `--ci`, `--skip-fix`, and `--skip-deploy`.
- `unideploy secrets audit`
  - Audits ignore-file coverage for secret leakage risk.
- `unideploy secrets scan`
  - Scans local source for hardcoded secrets.
- `unideploy secrets migrate`
  - Migrates flat `.env` files toward 1Claw vault flows.
  - Supports `--yes` and `--dry-run`.
- `unideploy secrets harden`
  - Rewrites supported LLM SDK calls to route through the Shroud proxy.

### MCP Server

The MCP package lives in `apps/mcp`. It exposes UniDeploy functionality to MCP-capable clients such as AI coding assistants.

Current MCP tools include:

- `scan_repo`
  - Queue a GitHub repository scan.
- `get_findings`
  - Poll scan status and retrieve findings.
- `get_remediation_plan`
  - Retrieve AI-generated remediation guidance after a completed scan.
- `apply_fixes`
  - Request fixes and a GitHub PR for selected findings.
- `get_deployment_status`
  - Retrieve scan status and summary statistics.
- `rotate_secret`
  - Return manual instructions for rotating a leaked secret.

### Backend API

The main backend is a FastAPI service in `apps/backend`.

Major route groups:

- `/health`
  - Reports API health and whether key services such as InsForge and Gemini are configured.
- `/auth/*`
  - Registration, login, session creation, current-user lookup, and CLI/browser session verification.
- `/api/v1/scan/*`
  - GitHub URL scan queueing, status polling, remediation plan retrieval, and fix triggering.
- `/scans/*`
  - Dashboard-oriented scan result persistence and update flows.
- `/api/v1/deploy/*`
  - Stack detection, deployment planning, and SSE-based config generation.
- `/api/v1/sessions/*`
  - Session support routes.
- WebSocket and polling routes
  - CLI-to-dashboard communication and agent interaction flows.
- `/payments/*`
  - Dodo checkout creation.
- `/webhooks/*`
  - Payment webhook handling.
- `/api/v1/ai/*`
  - AI-supporting backend routes.

### Cloudflare Worker API

The worker in `apps/worker` is an alternate edge API implementation using Hono, D1, KV, CORS, polling endpoints, and an OpenAI-compatible AI provider interface.

It currently includes:

- Health and status endpoints.
- Session creation and verification.
- CLI/browser polling mailboxes backed by D1 messages.
- D1 persistence for scan/session state.
- AI helper configured by `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY`.

This worker should be documented as an alternate or transitional runtime, not as the same thing as the primary FastAPI backend.

## Core Workflows

### 1. Local Scan And Dashboard Pairing

1. Developer runs `unideploy init`.
2. CLI detects the project framework and collects scannable files.
3. CLI creates an auth/session code with the backend.
4. User opens the connect page and enters the code.
5. Backend verifies the browser session and notifies the CLI.
6. CLI runs local heuristics and prints findings in the terminal.
7. CLI sends scan progress and final results to the backend.
8. Dashboard displays the session, grade, findings, and fix actions.
9. CLI remains available for dashboard-triggered fix commands during the active session window.

### 2. Offline JSON And CI Scan

1. Developer runs `unideploy init --json` or `unideploy init --ci`.
2. CLI scans local files without pairing with the dashboard.
3. CLI emits structured JSON or terminal output.
4. In CI mode, the command exits with a non-zero status when critical findings are found.

### 3. GitHub Repository Scan

1. Developer or MCP client submits a GitHub URL.
2. Backend creates a scan record and stores scan state in Redis.
3. Background worker pulls the scan from the in-process queue.
4. E2B runner clones and analyzes the repo when `E2B_API_KEY` is configured.
5. If E2B is not configured, the runner uses the fallback GitHub API/local checker path.
6. Backend computes a security grade.
7. PlanAgent generates remediation plans.
8. Results are stored in Redis and best-effort persisted to InsForge.
9. Client polls until status is `done` or `failed`.

### 4. Fix Flow

For local scans:

1. CLI saves the last scan to `~/.unideploy/last-scan.json`.
2. Developer runs `unideploy fix`.
3. CLI applies supported local fix rules, or previews them with `--dry-run`.

For GitHub scans:

1. Client calls the scan fix endpoint or MCP `apply_fixes`.
2. Backend selects requested findings or all auto-fixable findings.
3. FixAgent generates patches with Gemini.
4. E2B runner applies/verifies patches when configured.
5. Composio GitHub integration opens a pull request where configured.

### 5. Deploy Config Generation

1. Developer runs `unideploy deploy`.
2. CLI collects project files and sends a manifest to the backend.
3. DeployAgent detects frontend, backend, database, runtime, and likely deployment targets.
4. Backend returns clarifying questions for details that cannot be inferred.
5. DeployAgent optionally fetches live platform documentation through Tinyfish.
6. Gemini generates deployment config files.
7. Backend streams generated files as Server-Sent Events.
8. CLI writes the files or prints them in dry-run mode.

Supported target labels in current docs/code are Vercel, GCP/Cloud Run, AWS, Cloudflare, and Railway.

### 6. Secrets Posture

The CLI has a dedicated `secrets` command group for secret hygiene:

- Ignore-file audit.
- Source scan for plaintext secrets.
- `.env` migration toward 1Claw vaults.
- Shroud hardening for selected LLM SDK calls.

These commands should be described separately from the general production-readiness scan because they are a focused secrets-management workflow.

## Architecture

### Frontend

- Framework: Next.js.
- Deployment target in docs/config: Vercel.
- Observability: PostHog and Sentry client/server instrumentation.
- Responsibilities:
  - Public product website.
  - User auth screens.
  - Pricing and checkout initiation.
  - Dashboard scan views.
  - CLI session pairing.

### Backend

- Framework: FastAPI.
- Runtime targets represented in repository: Render, Docker, Google Cloud Run scripts/configs, and local development through Uvicorn.
- Responsibilities:
  - Auth/session API.
  - Scan orchestration.
  - Redis state and queue coordination.
  - InsForge persistence.
  - AI-agent calls.
  - Deployment config generation.
  - Payment checkout/webhooks.
  - Dashboard/CLI messaging.
  - Observability and rate limiting.

### CLI Runtime

- Language: TypeScript/Node.
- Distributed as npm package.
- Local responsibilities:
  - File collection.
  - Framework detection.
  - Secret redaction and heuristic scanning.
  - Terminal report generation.
  - Dashboard session pairing.
  - Local auto-fix application.
  - Deploy manifest creation.
  - Secrets posture tools.

### Agent Layer

There are two architecture lines in the repository:

- **Current/implemented code paths**
  - Gemini-backed analyzer, planning, fix, and deploy components.
  - E2B-backed sandbox runner with fallback logic.
  - Background scan worker that runs scan, grade, plan, and persistence steps.
  - DeployAgent for stack detection, clarification, documentation fetch, and config generation.
- **Target/transition architecture**
  - LangGraph graph in `apps/backend/agents/graph.py` with research, planning, coding, database, and memory nodes.
  - Older docs also describe a Google ADK/Agent Runtime architecture with AnalyzerAgent, BuildAgent, AutoFixAgent, PatchAgent, and MemoryAgent.

The corrected platform language should say UniDeploy is moving toward a scalable multi-agent architecture. It should not imply every ADK/LangGraph capability is fully productionized unless that specific path is wired into the active backend flow.

### Data And State

- Redis/Upstash:
  - Auth session codes.
  - User tokens.
  - Active scan state.
  - Deploy chat history.
  - Queue-adjacent coordination for running scans.
- InsForge:
  - App users.
  - Scan records.
  - Best-effort persistence of scan results and remediation plans.
- Local disk:
  - CLI stores last scan state in `~/.unideploy/last-scan.json`.
  - CLI may store credentials in `~/.unideploy/credentials.json` for MCP/API flows.
- Cloudflare Worker:
  - D1 tables for sessions/messages/scans in the edge implementation.
  - KV for short-lived auth session state.

## Integrations And External Services

### Current Or Code-Referenced Integrations

- **InsForge**
  - Current database client target for backend persistence and user records.
- **Dodo Payments**
  - Checkout links, plan metadata, and webhook integration.
- **Gemini / Google GenAI / Vertex AI**
  - AI reasoning and generation layer for remediation/deployment agents.
- **E2B**
  - Optional isolated sandbox for scanning and applying fixes.
- **Tinyfish**
  - Live documentation search/fetch for deployment config generation.
- **Composio**
  - GitHub PR automation for patch workflows.
- **PostHog**
  - Product analytics and backend event capture.
- **Sentry**
  - Error monitoring for frontend/backend.
- **Upstash Redis or Redis-compatible REST**
  - Runtime state for sessions, tokens, and scans.
- **1Claw / Shroud**
  - Secrets migration and LLM SDK hardening flows referenced by CLI modules.

### Legacy Or Conflicting References

Some existing docs mention Supabase and Clerk as the database/auth layer. The active backend database client uses InsForge, and the auth router implements email/password users plus Redis-backed sessions. Supabase remains relevant as a scan target and as an example of application risks such as RLS problems, but it should not be listed as UniDeploy's current platform database unless the implementation changes.

Older architecture docs also describe ADK/Agent Runtime as the definitive architecture. The repository contains Gemini and LangGraph-related code, so the safest current wording is:

- Gemini is the current LLM/provider layer.
- E2B is the current sandbox option.
- LangGraph is an in-repo target architecture.
- ADK/Agent Runtime is legacy or roadmap documentation unless actively deployed.

## Security Model

UniDeploy's security posture is based on several layers:

- Local scanning can run without uploading files in JSON/CI mode.
- CLI skips common generated, dependency, cache, and environment-secret files.
- Secret redaction patterns exist in the CLI.
- GitHub repository scans can run in E2B isolation when configured.
- Backend stores scan status in Redis with TTLs for active state.
- InsForge persistence is best-effort in several scan paths.
- Session codes are short-lived and one-time use.
- Payment and user sessions are token-based through Redis.

Important caveat: current auth code uses custom password hashing and token sessions rather than a managed auth provider. That should be treated as current implementation detail and reviewed before presenting the system as enterprise-grade authentication.

## Plans And Monetization

The current payment code defines these paid tiers:

- **Builder**
  - 50 monthly scans or 600 annual scans.
- **Pro**
  - 200 monthly scans or 2,400 annual scans.
- **Enterprise**
  - 1,000 monthly scans or 12,000 annual scans.

Free users are created with:

- Plan tier: `Free`.
- Default scan allowance: 10 scans.

Dodo checkout uses environment-configured payment link IDs and sends metadata for user ID, tier, billing interval, and scan allocation.

## Deployment And Runtime Paths

The repository contains multiple deployment paths:

- Frontend:
  - Vercel configuration.
  - Next.js Dockerfile also present.
- Backend:
  - Dockerfile.
  - Render configuration.
  - Cloud Run / Cloud Build scripts and config.
  - Local Uvicorn development.
- Worker:
  - Cloudflare Workers configuration through Wrangler.
- LiteLLM:
  - Docker Compose and config files for local/proxy experimentation.

These should be documented as supported or available runtime paths, not as a single exclusive deployment architecture.

## Current Reality

The platform currently includes:

- Next.js website/dashboard.
- FastAPI backend with auth, sessions, scans, deploy, payments, webhooks, and AI route groups.
- TypeScript CLI with local scan, GitHub scan, fix, deploy, run, and secrets commands.
- MCP server with scan/finding/remediation/fix/status/secret-rotation tools.
- Cloudflare Worker edge API implementation.
- Redis-backed transient state.
- InsForge-backed persistence client.
- Dodo checkout integration.
- Gemini-based agents and generation flows.
- Optional E2B sandboxing with fallback path.
- Tinyfish documentation fetch for deployment generation.
- Composio GitHub PR integration path.
- PostHog and Sentry instrumentation.

## Partial, Transitional, Or Needs Cleanup

The following areas should be cleaned up before being described as fully stable:

- ADK vs LangGraph vs current Gemini direct-agent architecture.
- Cloud Run vs Render vs Cloudflare Worker as the primary production backend path.
- Supabase/Clerk references in older architecture docs.
- Exact public API domain mismatch across docs, frontend, CLI defaults, and worker/backend configs.
- Whether the dashboard uses WebSockets, HTTP polling, or both in the production path.
- Whether plan quota enforcement is fully wired for every scan path.
- Whether GitHub PR creation is fully available for all users or depends on Composio entity configuration.

## Roadmap

Near-term roadmap items implied by the repository context and docs:

- Consolidate architecture documentation around the active runtime.
- Complete the LangGraph-based multi-agent orchestration or remove stale references.
- Unify CLI-to-dashboard communication around one production mechanism.
- Harden authentication and plan enforcement.
- Make deployment target selection explicit across Render, Cloud Run, Cloudflare, and Vercel.
- Promote the new platform overview into the public docs navigation after review.
- Update README and Mintlify pages to use the same source-of-truth language.

## One-Sentence Platform Description

UniDeploy is a CLI, dashboard, API, and MCP platform that scans AI-generated or fast-built apps for production-readiness risks, grades the project, explains and fixes issues, and generates deployment configuration using a mix of local heuristics, cloud agents, sandboxed analysis, and integrated payment/observability infrastructure.

