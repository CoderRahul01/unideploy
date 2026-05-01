# UniDeploy System Architecture

## Overview

UniDeploy is a production-readiness tool distributed as **CLI + MCP server + VS Code extension + web dashboard**, backed by AI agents running on Google Gemini Enterprise Agent Platform.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER SURFACES                            │
│                                                                      │
│  CLI (npm)     MCP Server        VS Code Extension     Dashboard     │
│  `unideploy`   @unideploy/mcp    .cursor/rules/         Next.js      │
│                                  unideploy.mdc          (Vercel)     │
└──────────┬──────────┬───────────────┬──────────────────────┬─────────┘
           │          │               │                      │
           ▼          ▼               ▼                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      UniDeploy API (FastAPI on Cloud Run)             │
│                                                                      │
│  POST /api/v1/scan    POST /api/v1/fix    GET /api/v1/status         │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  API Key Auth    │  │  Plan Enforcement │  │  Project Storage   │  │
│  │  (verify_api_key)│  │  (Dodo Payments)  │  │  (Supabase)        │  │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│               GEMINI ENTERPRISE AGENT PLATFORM (ADK)                 │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ AnalyzerAgent│───▶│  BuildAgent  │───▶│   AutoFixAgent       │   │
│  │ (Flash)      │    │ (Flash+E2B)  │    │ (Pro for complex,    │   │
│  │ 13 categories│    │ verify build │    │  Flash for mechanical)│   │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘   │
│                                                      │               │
│                                           ┌──────────▼───────────┐  │
│                                           │    PatchAgent        │  │
│                                           │ (No LLM — Composio   │  │
│                                           │  GitHub tool calls)   │  │
│                                           └──────────────────────┘  │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Model Armor  │  │ Memory Bank  │  │ Agent Identity│               │
│  │ (anti-inject)│  │ (scan state) │  │ (audit trail) │               │
│  └─────────────┘  └──────────────┘  └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     ACTION LAYER (Composio)                          │
│                                                                      │
│  GitHub (OAuth, PR)  Sentry (errors)  Vercel (deploy)  Slack (alert)│
│  Linear (tickets)    Notion (reports)  Gmail (digest)               │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION LAYER                                 │
│                                                                      │
│  AutoSend (email digests)    Smallest AI Waves (optional voice)      │
│  Supermemory (project memory, preferences, dismissed warnings)       │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Single Scan

1. Developer runs `unideploy scan` in project root (or MCP tool from Cursor)
2. CLI walks project, builds manifest (package.json, file tree, git remote)
3. CLI **redacts secrets locally** before sending anything
4. CLI sends manifest + selected files to UniDeploy API with API key
5. API authenticates, checks plan quota (Dodo subscription state)
6. API dispatches job to AnalyzerAgent on Agent Runtime
7. AnalyzerAgent (Gemini Flash) emits structured findings JSON
8. BuildAgent verifies project builds in E2B sandbox
9. AutoFixAgent (Gemini Pro) generates patches
10. Memory Bank persists scan results; Supermemory stores user context
11. API streams results back to CLI/MCP client
12. If user accepts fixes → PatchAgent applies locally or opens PR via Composio
13. AutoSend emails digest; optional Slack notification via Composio

## Technology Choices

| Component | Technology | Why |
|---|---|---|
| CLI | Node.js + TypeScript | Same ecosystem as the target users (React/Next.js devs) |
| API | FastAPI (Python) | Best-in-class for async AI workloads, Pydantic validation |
| Dashboard | Next.js 14 | SEO, RSC, matches CLI ecosystem |
| Agents | Gemini ADK | Native sub-agent graphs, Agent Runtime, Memory Bank |
| Auth | Clerk | Drop-in, supports GitHub OAuth, org management |
| DB | Supabase (PostgreSQL) | Already popular with vibe-coders, RLS, real-time |
| Payments | Dodo Payments | MoR with UPI + global, usage metering |
| Integrations | Composio | 1000+ tools, handles OAuth, SOC 2 compliant |
| Memory | Supermemory | Sub-300ms, model-agnostic, contradiction handling |
| Email | AutoSend | Pay per send, AI-native, Resend-compatible |
| Sandbox | E2B | Firecracker microVMs for build verification |
