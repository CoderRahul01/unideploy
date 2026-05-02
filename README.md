# UniDeploy

**Production-readiness for vibe-coded apps.**

[www.unideploy.in](https://www.unideploy.in) · [API docs](https://api.unideploy.in/docs)

---

## What it does

UniDeploy scans apps built with Lovable, Bolt, V0, Claude Code, or Cursor
and finds production-readiness issues before they become breaches.

One command. Any framework. Security grade in 60 seconds.

```bash
npx unideploy@latest init
```

## Architecture

```
CLI (TypeScript/npm)
└─► FastAPI backend (Google Cloud Run)
    └─► AnalyzerAgent (Gemini ADK -> Agent Runtime)
    └─► InsForge (PostgreSQL + Auth)
    └─► WebSocket bridge (CLI <-> Browser)

Frontend (Next.js -> Vercel)
└─► /connect    (session code entry)
└─► /dashboard  (live scan results)

MCP Server (@unideploy/mcp)
└─► Works in Cursor, Claude Code, Windsurf
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Vercel |
| Backend | FastAPI, Google Cloud Run |
| Agents | Google ADK, Gemini 2.5 Flash/Pro, Agent Runtime |
| Database + Auth | InsForge (PostgreSQL + JWT) |
| Tool actions | Composio |
| Payments | Dodo Payments |
| Memory | Supermemory |
| Email | AutoSend |

## Local development

```bash
# 1. Clone
git clone https://github.com/CoderRahul01/unideploy
cd unideploy

# 2. Backend
cd apps/backend
cp .env.template .env.development
# Fill in your keys in .env.development
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# 3. Frontend
cd apps/frontend
cp .env.template .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install && npm run dev

# 4. CLI (in any project directory)
cd /your-project
UNIDEPLOY_API_URL=http://localhost:8000 npx ts-node /path/to/unideploy/apps/cli/src/index.ts init
```

## Deployment

```bash
# 1. Store secrets in GCP
bash scripts/setup-gcp-secrets.sh

# 2. Deploy backend to Cloud Run
bash scripts/deploy-backend.sh

# 3. Deploy agents to Agent Runtime
bash scripts/deploy-agents.sh

# 4. Update Vercel env vars
bash scripts/setup-vercel-env.sh

# 5. Redeploy frontend
vercel --prod
```

## Agent Studio

After running `deploy-agents.sh`, view agents at:
https://console.cloud.google.com/vertex-ai/agents

You should see: **UniDeploy Scanner** with sub-agents:
- UniDeployAnalyzer (gemini-2.5-flash)
- UniDeployAutoFix (gemini-2.5-pro)

## Verify locally

```bash
# Start backend
cd apps/backend && python -m uvicorn main:app --reload --port 8000

# In a second terminal
bash scripts/verify.sh
```
