# UniDeploy — Multimodal AI Development Cloud

**Describe it. Screenshot it. Say it. Upload it. It ships.**

UniDeploy is a sandbox-first AI development cloud powered by a multimodal input pipeline. You can describe your app in text, sketch a wireframe and take a photo, record a voice note, or upload a PDF spec — the agent understands all of it, writes the code, runs it in a real Linux VM, and deploys to production in one click.

[![Sponsored by E2B](https://e2b.dev/badge.svg)](https://e2b.dev)
[![E2B Pro — $20K Credits](https://img.shields.io/badge/E2B-Pro%20Partner-%2300DC82)](https://e2b.dev)
[![NVIDIA NIM](https://img.shields.io/badge/Inference-NVIDIA%20NIM-%2376B900)](https://build.nvidia.com)
[![HuggingFace](https://img.shields.io/badge/Models-HuggingFace-%23FF9D00)](https://huggingface.co)

---

## What's New: Multimodal Input System

UniDeploy now accepts **five input modalities**. Every modality routes to the right model automatically — no configuration needed.

```
┌─────────────────────────────────────────────────────────┐
│                 MULTIMODAL INPUT LAYER                  │
│                                                         │
│  Text prompt ──────────────────────────────────────┐   │
│  Screenshot / Wireframe image ─── Vision model ──┐ │   │
│  Voice note / Audio ──── Whisper (HF) ────────┐  │ │   │
│  PDF / Spec document ─── Doc parser ────────┐ │  │ │   │
│  Video screen recording ─── Frame extractor┐│ │  │ │   │
│                                             ▼▼ ▼  ▼ ▼   │
│                        ┌──────────────────────────┐    │
│                        │     ModelRouter           │    │
│                        │   (unified text context)  │    │
│                        └──────────────┬───────────┘    │
└───────────────────────────────────────┼─────────────────┘
                                        ▼
                              Agent Swarm (E2B Sandbox)
                                        │
                                        ▼
                              Google Cloud Run deploy
```

---

## The Inference Stack (Free Tier — Zero Cost)

UniDeploy runs entirely on free API tiers. No Anthropic. No OpenAI. No per-token billing.

### NVIDIA NIM  (`https://integrate.api.nvidia.com/v1`)

OpenAI-compatible API. 40 requests/minute free. 100+ models. Swap `base_url` and `api_key` — zero other code changes.

| Role in UniDeploy | Model | Why |
|---|---|---|
| Code generation (primary) | `qwen/qwen2.5-coder-32b-instruct` | Best open-weight code model. Beats GPT-4 on HumanEval. |
| Code generation (fast) | `deepseek-ai/deepseek-coder-6.7b-instruct` | Sub-second for autocomplete + small edits |
| Complex reasoning / planning | `meta/llama-3.3-70b-instruct` | Agent orchestration, architecture decisions |
| Vision → Code (screenshot to app) | `meta/llama-3.2-90b-vision-instruct` | Understands wireframes, UI screenshots, design mockups |
| Vision → Code (fast) | `microsoft/phi-3.5-vision-instruct` | Quick image reads, error screenshot analysis |
| Multimodal reasoning | `qwen/qwen3.5` | Native vision+text, 400B MoE, best for complex UI understanding |
| Embeddings (project memory) | `nvidia/llama-3.2-nv-embedqa-1b-v2` | Replaces Pinecone calls for semantic search within a project |

### HuggingFace Inference API (`https://router.huggingface.co/v1`)

OpenAI-compatible router. Free tier: ~50 req/hour. Best for audio and specialized tasks.

| Role in UniDeploy | Model | Why |
|---|---|---|
| Voice → Code (speech transcription) | `openai/whisper-large-v3` | Best open ASR model. Multilingual. Handles Indian English perfectly. |
| Document understanding | `facebook/bart-large-cnn` | Summarizes uploaded spec PDFs before passing to code agent |
| Embeddings fallback | `sentence-transformers/all-MiniLM-L6-v2` | Fast, lightweight, good enough for session-scoped memory |
| Image captioning (fallback) | `Salesforce/blip-image-captioning-large` | When NIM vision quota is exhausted |

### Rate Limit Strategy

```python
# Priority order per task — auto-falls back on 429
ROUTING_TABLE = {
    "code":      ["nvidia/qwen2.5-coder-32b", "nvidia/deepseek-coder-6.7b"],
    "reasoning": ["nvidia/llama-3.3-70b",     "nvidia/llama-3.1-8b"],
    "vision":    ["nvidia/llama-3.2-90b-vision", "nvidia/phi-3.5-vision", "hf/blip-large"],
    "audio":     ["hf/whisper-large-v3"],
    "embedding": ["nvidia/nv-embedqa-1b-v2",  "hf/all-MiniLM-L6-v2"],
}
```

---

## Multimodal Input Flows

### 1. Text → App (original)
```
"Build me a FastAPI backend with JWT auth and PostgreSQL"
    │
    ▼  ModelRouter → qwen2.5-coder-32b (NVIDIA NIM)
    ▼  Agent writes files in E2B sandbox
    ▼  Live preview URL → Deploy
```

### 2. Screenshot / Wireframe → App  *(new)*
```
User uploads: napkin sketch photo, Figma screenshot, or existing app UI
    │
    ▼  llama-3.2-90b-vision (NVIDIA NIM)
       "Describe the UI layout, components, and interactions
        as a technical spec for code generation."
    │
    ▼  Vision output → text spec → qwen2.5-coder-32b generates implementation
    ▼  E2B sandbox builds + previews matching UI
```

Use cases: whiteboard wireframe → working code · competitor UI → rebuild it · Figma screenshot → Next.js components

### 3. Voice → App  *(new)*
```
User records: voice note explaining what they want to build
    │
    ▼  HuggingFace Whisper large-v3 transcribes audio → clean text
    ▼  Text runs through standard pipeline
    ▼  E2B sandbox builds + previews
```

Use cases: non-technical founders who think faster than they type · complex flows described verbally · mobile-first / accessibility

### 4. PDF / Document → App  *(new)*
```
User uploads: product spec, PRD, or API documentation PDF
    │
    ▼  pdfplumber extracts text + structure (local, zero cost)
    ▼  HuggingFace BART summarizes long documents into key requirements
    ▼  llama-3.3-70b (NVIDIA NIM) extracts: entities, endpoints, data models
    ▼  Structured spec → qwen2.5-coder-32b generates implementation
    ▼  E2B sandbox builds + previews
```

Use cases: upload a Notion PRD → get a working prototype · API spec → full client + server · legacy docs → modern code

### 5. Error Screenshot → Fix  *(new)*
```
User pastes: screenshot of error message, browser console, or stack trace
    │
    ▼  phi-3.5-vision (NVIDIA NIM) reads the error from the image
    ▼  AutoFixAgent gets error text + current codebase context
    ▼  Generates patch → tests in correction sandbox → applies if passing
```

Use cases: "something is broken" with a screenshot · visual browser bugs · Sentry error screenshot

---

## Updated Agent Architecture

```
                    ┌──────────────────────┐
                    │     ModelRouter      │
                    │                      │
                    │  Input type detector │
                    │  Rate limit tracker  │
                    │  Auto-fallback       │
                    └──────────┬───────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                   ▼
     VisionAgent          AudioAgent          TextAgent
  (NVIDIA NIM VLMs)   (HF Whisper)        (NVIDIA NIM LLMs)
  llama-3.2-90b-v      whisper-large-v3    qwen2.5-coder-32b
  phi-3.5-vision       ──────┬──────       llama-3.3-70b
  qwen3.5 VL                 │             deepseek-coder-6.7b
  ──────┬──────              │             ──────┬────────
        │                    │                   │
        └────────────────────┴───────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    AnalyzerAgent      │
                         │  Detects framework,   │
                         │  dependencies, stack  │
                         └──────────┬────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       E2B Firecracker VM       │
                    │                               │
                    │  BuildAgent                   │
                    │    │                          │
                    │    ├─ Error? → AutoFixAgent   │
                    │    │      │                   │
                    │    │  Correction sandbox      │
                    │    │      │                   │
                    │    │  PatchAgent applies      │
                    │    │                          │
                    │    └─ Success → Live preview  │
                    └───────────────┬───────────────┘
                                    │
                              RecallMaxAgent
                         (nv-embedqa-1b-v2 + Pinecone)
                                    │
                                    ▼
                         Google Cloud Run deploy
```

---

## Technical Stack

```
Frontend        Next.js 14 (App Router), Tailwind CSS, Framer Motion
Backend         FastAPI (Python 3.11), SQLAlchemy, Prefect
Compute         E2B Firecracker VMs (sandboxes), Google Cloud Run (control plane)

─── Inference (zero API cost) ───────────────────────────────────────
Code models     NVIDIA NIM → qwen2.5-coder-32b, deepseek-coder-6.7b
Reasoning       NVIDIA NIM → llama-3.3-70b-instruct
Vision models   NVIDIA NIM → llama-3.2-90b-vision, phi-3.5-vision, qwen3.5
Speech / ASR    HuggingFace → openai/whisper-large-v3
Embeddings      NVIDIA NIM → nv-embedqa-1b-v2 | HF → all-MiniLM-L6-v2
Image fallback  HuggingFace → blip-image-captioning-large

─── Base URLs ────────────────────────────────────────────────────────
NVIDIA NIM      https://integrate.api.nvidia.com/v1  (OpenAI-compatible)
HuggingFace     https://router.huggingface.co/v1     (OpenAI-compatible)
HF Native       https://api-inference.huggingface.co (Whisper)
──────────────────────────────────────────────────────────────────────

PDF parsing     pdfplumber (local, zero cost)
Memory          Pinecone + RecallMax | fallback: HF sentence-transformers
Auth            Clerk
Database        Supabase (PostgreSQL)
WebSockets      Node.js gateway
```

---

## Environment Variables

```bash
# Required
E2B_API_KEY=            # build.e2b.dev
NVIDIA_API_KEY=         # build.nvidia.com → API Keys
HF_API_KEY=             # huggingface.co → Settings → Access Tokens

# Optional (fallbacks work without these)
PINECONE_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

---

## Project Structure

```
unideploy/
├── apps/
│   ├── backend/
│   │   ├── agents/
│   │   │   ├── analyzer_agent.py
│   │   │   ├── build_agent.py
│   │   │   ├── autofix_agent.py
│   │   │   ├── patch_agent.py
│   │   │   ├── recall_max_agent.py
│   │   │   └── notify_agent.py
│   │   ├── clients/
│   │   │   ├── model_router.py       ← unified routing (NVIDIA NIM + HF)
│   │   │   ├── vision_agent.py       ← screenshot / wireframe → code
│   │   │   ├── audio_agent.py        ← voice → code (Whisper)
│   │   │   └── document_agent.py     ← PDF → code (pdfplumber)
│   │   ├── builder/
│   │   │   └── e2b_manager.py
│   │   └── core/
│   │       └── prefect_flows.py
│   ├── frontend/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── dashboard/
│   │   │   └── project/[id]/page.tsx
│   │   └── components/
│   │       ├── MultimodalInputBar/   ← text | image | voice | doc tabs
│   │       ├── VoiceRecorder/        ← MediaRecorder API
│   │       └── ImageDropzone/        ← drag + drop upload
│   └── gateway/
├── docs/
└── scripts/
```

---

## Roadmap

```
✅  Phase 1 — Core sandbox loop
✅  Phase 2 — AutoFix brain (correction sandbox)
✅  Phase 3 — RecallMax memory
🔄  Phase 4 — Multimodal input (current)
      ✅ NVIDIA NIM ModelRouter (code + reasoning + vision)
      ✅ HuggingFace Whisper (voice input)
      ✅ Auto-fallback on rate limits
      ⬜ MultimodalInputBar frontend component
      ⬜ PDF document agent (pdfplumber)
      ⬜ Error screenshot → AutoFix pipeline
⬜  Phase 5 — Production deploy
      One-click → Google Cloud Run
      Custom domains (*.unideploy.in)
      Deployment history + rollback
⬜  Phase 6 — Multi-repo orchestration
⬜  Phase 7 — AI model deployment (E2B GPU tier)
```

---

## Getting Started

```bash
pip install openai huggingface-hub pdfplumber

chmod +x scripts/start.sh
./scripts/start.sh
```

Starts: FastAPI (8000) · WebSocket Gateway (3001) · Next.js Frontend (3000)

---

*Built by Rahul Pandey — E2B startup partner*
*Inference: NVIDIA NIM + HuggingFace (zero API cost during development)*
*unideploy.in*
