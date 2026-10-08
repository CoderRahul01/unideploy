# UniDeploy — Product Master Document

**The 100% Cloud-Native AI Sandbox & Model Deployment Platform**  
*Official Product Specification & Distribution Strategy*  
*Website:* [unideploy.in](https://www.unideploy.in) · *Web Studio:* [unideploy.in/sandbox](https://www.unideploy.in/sandbox) · *Marketplace:* [unideploy.in/download](https://www.unideploy.in/download)

---

## 1. Executive Summary

UniDeploy is an **AI Cloud Sandbox & Model Deployment Platform** designed to give every developer, data scientist, and AI agent instant access to isolated cloud compute microVMs (powered by E2B Firecracker technology) and 1-click model deployments with zero infrastructure overhead.

### The Problem We Solve
1. **Google Colab Disconnects**: Free and basic Colab runtimes disconnect unexpectedly, wipe memory and variables mid-analysis, and aggressively throttle GPU and CPU resources.
2. **AI Agent Code Execution Hazards**: Autonomous agents (LangChain, CrewAI, AutoGen, Claude Code) cannot safely run generated Python or shell scripts on local machines without risking accidental file loss, credential exposure, or system pollution.
3. **Model Deployment Friction**: Exposing a simple Python script, data pipeline, or trained model as an authenticated HTTPS REST API typically requires Dockerfiles, cloud IAM permissions, reverse proxies, and costly US-dollar subscriptions with card authorization friction.
4. **Tool Fragmentation**: Connecting deployed models or agent workflows to external platforms (GitHub, Slack, Discord, Linear, Notion) requires managing dozens of OAuth credentials and webhooks manually.

### The UniDeploy Solution
UniDeploy eliminates the friction by providing **sub-2-second cloud microVMs** accessible from anywhere:
- **Zero-Setup Web Studio**: Run Python, Pandas, Matplotlib, and AI agent workloads in your browser on any operating system without installing anything.
- **Universal CLI (`npx unideploy`)**: Execute scripts in cloud sandboxes or deploy model APIs with a single terminal command.
- **AI Model Deployment & Fine-Tuning**: Deploy small AI models (PyTorch, ONNX, Scikit-Learn, GGUF) into private microVMs with zero downtime hot swapping.
- **Agent Code Interpreter REST API**: Integrate isolated cloud execution into your Python or TypeScript agent loops in 3 lines of code.
- **Composio Platform Integration**: Trigger authenticated actions on 250+ external tools (GitHub, Slack, Discord, Linear) directly from sandbox agents or model endpoints.
- **Smart Edge Rate Limiting**: Built-in token-bucket rate limits at Cloudflare Worker edge with graceful burst handling and HTTP 429 Retry-After headers.
- **Fair INR Pricing via UPI**: ₹0 Free Trial (50,000 tokens), followed by ₹499/mo Starter via instant UPI, RuPay, and international cards powered by Dodo Payments.

---

## 2. Distribution Strategy: How People Actually Use UniDeploy

Rather than requiring users to download heavy desktop packages for v1, UniDeploy prioritizes the **4 universal developer channels**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE 4 UNIVERSAL CHANNELS                              │
│                                                                             │
│  Channel 1: Web Sandbox Studio (0 Install)                                  │
│  • Target: Students, data scientists, quick experiments                     │
│  • Flow: Open unideploy.in/sandbox, pick a template, run code in <2s        │
│                                                                             │
│  Channel 2: Terminal CLI (npx unideploy)                                    │
│  • Target: Backend devs, terminal-first engineers                           │
│  • Flow: npx unideploy run script.py OR npx unideploy deploy app.py        │
│                                                                             │
│  Channel 3: Agent Code Interpreter API (REST & Python)                      │
│  • Target: AI agent builders (LangChain, CrewAI, AutoGen, LlamaIndex)       │
│  • Flow: POST /api/sandbox/run with code payload; get stdout + charts       │
│                                                                             │
│  Channel 4: AI Editor Integration (MCP Server)                              │
│  • Target: Cursor, Claude Code, and Windsurf users                          │
│  • Flow: Connect @unideploy/mcp to run sandboxes directly from chat         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 UNIDEPLOY CLOUDFLARE WORKER EDGE GATEWAY                    │
│                 (unideploy-api.rahulpandey-creates.workers.dev)             │
│                                                                             │
│  • Global Edge Routing & CORS        • Token-Bucket Rate Limiter            │
│  • D1 Persistent SQLite Database     • Live Dodo Payments (UPI / RuPay)     │
│  • Fast KV Caching & Device Pairing  • Composio Action Hooks                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUD COMPUTE SANDBOXES (E2B FIRECRACKER)                │
│                                                                             │
│  • Sub-2s microVM cold boots         • Dedicated Guest Linux Kernel         │
│  • Persistent Python 3.11 runtimes   • Auto-rendered Matplotlib plots       │
│  • Quarantined Agent Interpreter     • Zero-Downtime Model Deployments      │
│  • Live Model Fine-Tuning & Editing  • Full Linux Root Cloud Terminal       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Product Capabilities & Sandbox Superpowers

### 3.1 Cloud Compute Sandboxes (E2B Firecracker)
- **Sub-2-Second Boot Times**: Ephemeral or persistent Linux microVMs spin up instantly using Amazon Firecracker lightweight virtualization.
- **Pre-Configured Data Science Environment**: Out-of-the-box Python 3.11/3.13 runtimes equipped with `numpy`, `pandas`, `scipy`, `matplotlib`, and `seaborn`.
- **Auto-Rendered Visualizations**: Matplotlib and Seaborn figures are intercepted, base64-encoded, and rendered directly in the web studio or returned as visual artifacts.
- **Linux Root Cloud Shell**: Full Debian/Ubuntu environments with `curl`, `git`, `python`, `node`, and `bash`.

### 3.2 Private Sandbox Architecture & Security
- **Kernel-Level MicroVM Isolation**: Unlike shared Docker containers or Kubernetes namespaces where host kernel vulnerabilities risk container breakouts, Firecracker assigns each microVM its own dedicated guest kernel.
- **Total Data Privacy**: Proprietary model weights, fine-tuning datasets, and end-user inference prompts execute in quarantined microVM memory. Zero data leaks across tenants.
- **No System Pollution**: Test untrusted GitHub repositories, experimental pip packages, or web scrapers without breaking local macOS/Linux configurations or eating 10GB RAM with Docker Desktop.

### 3.3 AI Model Deployment & In-Sandbox Fine-Tuning
- **Deploy Small Models into Live APIs**: Easily deploy Scikit-Learn models, ONNX runtimes, lightweight PyTorch classifiers, embeddings, or GGUF models with sub-2s startup latency.
- **Interactive Model Editing & Fine-Tuning**: Tweak prompt templates, hyperparameters, or training weights right inside the sandbox environment. Test outputs immediately before committing.
- **Zero-Downtime Hot Swapping**: When redeploying or updating model inference logic, warm standby microVMs receive new requests only after passing health checks. Existing in-flight requests finish gracefully without dropped sockets.

### 3.4 Smart Edge Rate Limiting
- **Token-Bucket Edge Protection**: The Cloudflare Worker edge gateway enforces rate limits per API key (e.g. 30 sustained req/sec, burst allowances up to 100 requests).
- **Clear HTTP 429 Headers**: Returns standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers to prevent accidental runaway costs or denial of service.

### 3.5 Multi-Platform Action Management via Composio
- **Seamless Tooling Hook**: Connect deployed models and agent loops to 250+ SaaS platforms (GitHub, Slack, Discord, Linear, Notion, Vercel) through Composio.
- **Automated Actions on Model Inference**: When a model detects an anomaly or finishes processing, it triggers authenticated external actions without manual OAuth configuration.

---

## 4. Ideal Customer Profile (ICP)

| Customer Segment | Core Pain Point | How UniDeploy Solves It |
|---|---|---|
| **Solo AI Developers & Indie Hackers** | AWS ECS, EKS, and SageMaker are too costly ($50–$300/mo minimum), complex, and slow to set up. | Deploy small models (embeddings, classifiers, agents) in 5s for ₹499/mo with zero DevOps. |
| **Data Scientists & Researchers** | Google Colab randomly disconnects, wiping variables, downloads, and charts mid-analysis. | Persistent microVM kernel that never disconnects; browser studio with auto-rendered charts. |
| **AI Agent Engineers (LangChain / CrewAI)** | Running LLM-generated code locally risks deleting files or leaking environment credentials. | 1-line REST API / MCP server executing code in isolated Firecracker microVMs. |
| **Students & Developers in India** | US-dollar SaaS tools fail on Indian debit cards or lack UPI payment options. | ₹0 Free Trial, ₹499/mo Starter, native UPI (GPay, PhonePe, Paytm) via Dodo Payments. |

---

## 5. Code Examples & Integration

### A. Terminal Flow
```bash
# Authenticate
npx unideploy auth

# Run Python script in isolated cloud microVM
npx unideploy run analysis.py

# Deploy script / model as a live 24/7 HTTPS REST API
npx unideploy deploy app.py
```

### B. Calling Deployed Model from Any Project (cURL / Python / TypeScript)
```bash
# cURL invocation
curl -X POST https://api.unideploy.in/v1/models/mod_8f21/invoke \
  -H "Authorization: Bearer uni_live_9a72e8140f" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Classify incoming feedback", "temperature": 0.2}'
```

```python
# Python invocation
import requests

res = requests.post(
    "https://api.unideploy.in/v1/models/mod_8f21/invoke",
    headers={"Authorization": "Bearer uni_live_9a72e8140f"},
    json={"prompt": "Classify incoming feedback", "temperature": 0.2}
)
print(res.json())  # {"prediction": "positive", "confidence": 0.98}
```

```typescript
// TypeScript / Next.js server action
const res = await fetch("https://api.unideploy.in/v1/models/mod_8f21/invoke", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.UNIDEPLOY_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ prompt: "Classify incoming feedback" }),
});
const data = await res.json();
```

### C. Triggering Composio Actions from Model Inference
```python
from composio import ComposioToolSet, Action

toolset = ComposioToolSet(api_key="comp_live_demo")
prediction = model.predict(input_data)

if prediction["anomaly_detected"]:
    toolset.execute_action(
        action=Action.SLACK_CHAT_POST_MESSAGE,
        params={"channel": "#engineering-alerts", "text": f"Anomaly detected in model {prediction['confidence']}"}
    )
```

---

## 6. Pricing & Quotas (Dodo Payments)

| Plan | Price (INR) | Tokens | Compute Hours | Deployed Endpoints | MicroVM Pool |
|---|---|---|---|---|---|
| **Free Trial** | **₹0** (1st Month) | 50,000 | 3 sessions / day | Public templates | Shared Sub-2s |
| **Starter** | **₹499** / mo (~$6) | 500,000 | 20 hours | 1 live endpoint | Standard Sub-2s |
| **Pro** | **₹1,499** / mo (~$18) | 2,500,000 | 80 hours | 3 endpoints + API keys | High-Priority Sub-2s |
| **Team** | **₹4,999** / mo (~$59) | 10,000,000 | 300 hours | Unlimited + Team sharing | Dedicated Compute Pool |

*Live product IDs verified with Dodo Payments (`pdt_0NfRPIDZgIPVGLL45EiGe`, `pdt_0NfRPxJ2x8CUfGx9IzZT9`, `pdt_0NfRR1eES9t51E5OLG7j9`). Supports UPI (GPay, PhonePe, Paytm), RuPay, Indian cards, and international cards.*

---

## 7. Roadmap: v1 Launch vs v2 Architecture

- **v1 Production Launch (Now)**:
  - 100% Cloud-Native: Zero-Install Web Sandbox Studio (`unideploy.in/sandbox`)
  - Zero-Config Terminal CLI (`npx unideploy`)
  - Agent Code Interpreter REST API (`apps/worker`)
  - Cursor & Claude Code MCP Server (`apps/mcp`)
  - 1-Click Model Deployment with smart rate limits & Composio tooling hooks
- **v2 Roadmap (Next Version)**:
  - Native Desktop Companion (.dmg for macOS, .exe for Windows) in `apps/desktop`
  - Local offline caching of model weights and dataset checkpoints
  - Hardware acceleration passthrough for local Apple Silicon (Metal) / NVIDIA CUDA execution

---

## 8. Monorepo Workspaces

| Workspace | Package / App | Purpose |
|---|---|---|
| `apps/frontend/` | `unideploy-web` | Next.js 16 Web Platform, Sandbox Studio & Marketplace |
| `apps/worker/` | `unideploy-api` | Cloudflare Worker Edge Gateway, Rate Limiting & D1 Storage |
| `apps/mcp/` | `@unideploy/mcp` | Model Context Protocol Server for Cursor & Claude Code |
| `packages/cli/` | `unideploy` | npm CLI client for terminal microVM runs & model deployment |
| `packages/ai/` | `@earendil-works/pi-ai` | Multi-provider LLM engine |
| `packages/agent/` | `@earendil-works/pi-agent-core` | Stateful agent execution loop |
| `apps/desktop/` | `@unideploy/desktop` | Optional native desktop client (v2 roadmap) |
