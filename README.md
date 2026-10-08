<div align="center">

# UniDeploy

**The 100% Cloud-Native AI Sandbox & Model Deployment Platform**

*Zero-setup Firecracker microVMs in the browser, terminal, and AI agents.*

[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue.svg)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black.svg?logo=next.js)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%26%20D1-F38020.svg?logo=cloudflare)](https://workers.cloudflare.com/)
[![E2B Sandboxes](https://img.shields.io/badge/E2B-Firecracker%20microVMs-FF5722.svg)](https://e2b.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[**Launch Web Sandbox**](https://www.unideploy.in/sandbox) · [**Browse Marketplace**](https://www.unideploy.in/download) · [**Pricing (₹0 Free Trial)**](https://www.unideploy.in/pricing) · [**Product Architecture**](product.md)

</div>

---

## 💡 What is UniDeploy?

**UniDeploy** makes cloud compute sandboxes and AI model deployment as fast and effortless as running a local script.

Developers and AI teams lose hours to four major problems:
1. **Google Colab Disconnects**: Free notebooks constantly disconnect, kill long-running data pipelines, and throttle GPUs without warning.
2. **AI Agent Code Execution Hazards**: Autonomous agents (LangChain, CrewAI, AutoGen, Claude Code) cannot safely run generated Python or shell scripts on your local laptop without risking file loss or dependency pollution.
3. **Deployment Friction**: Turning a simple Python script or model into a permanent, secure HTTPS REST API typically requires Docker, AWS/GCP IAM configuration, Kubernetes, and expensive US-dollar subscriptions with credit-card friction.
4. **Tool Fragmentation**: Connecting deployed models or agent workflows to external platforms (GitHub, Slack, Discord, Linear, Notion) requires managing dozens of OAuth credentials and webhooks manually.

**UniDeploy gives you a 100% cloud-native alternative:**
- **Zero Install Web Studio**: Open [unideploy.in/sandbox](https://www.unideploy.in/sandbox) on any device (Mac, Windows, Linux, iPad), write Python or data science code, and run in isolated Firecracker microVMs booting in under 2 seconds.
- **One-Command CLI**: Run `npx unideploy run script.py` directly from your terminal.
- **AI Model Deployment & Fine-Tuning**: Deploy small AI models (PyTorch, ONNX, Scikit-Learn, GGUF) into private microVMs with zero downtime hot swapping.
- **Agent Code Interpreter API**: Call UniDeploy's sandbox API from Python, TypeScript, or cURL to give any AI agent a quarantined execution sandbox.
- **Composio Platform Integration**: Trigger authenticated actions on 250+ external tools (GitHub, Slack, Discord, Linear) directly from sandbox agents or model endpoints.
- **Smart Edge Rate Limiting**: Built-in token-bucket rate limits at Cloudflare Worker edge with graceful burst handling and HTTP 429 Retry-After headers.
- **Transparent Indian & Global Pricing**: ₹0 Free Trial (50,000 tokens), ₹499/mo Starter, with instant UPI (GPay, PhonePe, Paytm), RuPay, and international card payments via Dodo Payments.

---

## 🌐 The 4 Universal Ways People Use UniDeploy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DISTRIBUTION CHANNELS                            │
│                                                                             │
│  1. Web Studio (0 Install)     2. Terminal CLI (npx)                        │
│     unideploy.in/sandbox          npx unideploy run script.py               │
│     Browser-native microVMs       Zero-config local developer flow          │
│                                                                             │
│  3. Agent Sandbox API (REST)   4. AI Editor MCP (Cursor & Claude Code)      │
│     POST /api/sandbox/run         @unideploy/mcp                            │
│     LangChain / CrewAI / SDK      Direct agent tool integration             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 UNIDEPLOY CLOUDFLARE WORKER EDGE GATEWAY                    │
│                 (unideploy-api.rahulpandey-creates.workers.dev)             │
│                                                                             │
│  • Edge Gateway & Hono API           • Token-Bucket Rate Limiter            │
│  • Cloudflare D1 Persistent DB       • Live Dodo Payments (UPI / RuPay)     │
│  • Fast KV Caching & Device Pairing  • Composio Action Hooks                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUD COMPUTE SANDBOXES (E2B FIRECRACKER)                │
│                                                                             │
│  • Sub-2s cold boot times            • Dedicated Guest Linux Kernel         │
│  • Persistent Python 3.11 / NumPy    • Auto-rendered Matplotlib plots       │
│  • Quarantined Agent Interpreter     • Zero-Downtime Model Deployments      │
│  • Live Model Fine-Tuning & Editing  • Full Linux Root Cloud Shell          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### Channel 1: In the Browser (Zero Install)
Visit [**unideploy.in/sandbox**](https://www.unideploy.in/sandbox) to write code, test marketplace templates, and visualize charts in real-time.

---

### Channel 2: From Your Terminal (`npx unideploy`)

No permanent installation required:

```bash
# Authenticate and activate your 50,000 free compute tokens
npx unideploy auth

# Check your account and remaining tokens
npx unideploy whoami

# Provision an isolated cloud microVM (<2s boot)
npx unideploy sandbox create colab-python

# Run any Python data science script in the cloud microVM
npx unideploy run analysis.py

# Deploy a script or model as a live 24/7 HTTPS REST API
npx unideploy deploy app.py
```

Or install globally:
```bash
npm install -g unideploy
```

---

### Channel 3: In AI Agents & Codebases (REST API / SDK)

Use UniDeploy as a quarantined code interpreter for your autonomous agents (LangChain, CrewAI, AutoGen, LlamaIndex, or custom scripts).

#### Python:
```python
import requests

# Execute code inside UniDeploy Cloud Sandbox
response = requests.post(
    "https://unideploy-api.rahulpandey-creates.workers.dev/api/sandbox/run",
    headers={"Authorization": "Bearer YOUR_UNIDEPLOY_TOKEN"},
    json={
        "code": """
import numpy as np
import pandas as pd

data = np.random.randn(100)
print(f"Mean: {data.mean():.4f}, Std: {data.std():.4f}")
""",
        "language": "python",
        "timeoutMs": 30000
    }
)

result = response.json()
print("MicroVM Output:\n", result["stdout"])
```

#### cURL:
```bash
curl -X POST https://unideploy-api.rahulpandey-creates.workers.dev/api/sandbox/run \
  -H "Authorization: Bearer YOUR_UNIDEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "print(2 + 2)", "language": "python"}'
```

---

### Channel 4: Inside Cursor & Claude Code via MCP

Add UniDeploy to your MCP configuration (`~/.cursor/mcp.json` or Claude Desktop):

```json
{
  "mcpServers": {
    "unideploy": {
      "command": "npx",
      "args": ["-y", "@unideploy/mcp"],
      "env": {
        "UNIDEPLOY_API_KEY": "YOUR_UNIDEPLOY_TOKEN"
      }
    }
  }
}
```

Now your AI assistant can run sandboxed Python scripts, evaluate code safely, and deploy APIs without touching your local filesystem.

---

## 🚀 1-Click AI Model Deployment & Composio Actions

Turn any Python script or model inference function into a live, authenticated HTTPS REST API with edge rate limiting and zero downtime:

```bash
npx unideploy deploy model.py
```

**Instant Result:**
```text
✓ Microservice Deployed Successfully!
  Model ID:     model
  Status:       Active (Live)
  Endpoint URL: https://api.unideploy.in/v1/models/model/invoke
  API Key:      uni_live_839a2f...

Test command:
  curl -X POST https://api.unideploy.in/v1/models/model/invoke \
    -H "Authorization: Bearer uni_live_839a2f..." \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Run inference"}'
```

### Multi-Platform Management via Composio:
```python
from composio import ComposioToolSet, Action

toolset = ComposioToolSet(api_key="comp_live_demo")
prediction = model.predict(input_data)

if prediction["anomaly_detected"]:
    toolset.execute_action(
        action=Action.SLACK_CHAT_POST_MESSAGE,
        params={"channel": "#engineering", "text": f"Anomaly detected in model {prediction['confidence']}"}
    )
```

---

## 🧩 Cloud Marketplace Templates

| Template | Runtime | Use Case |
|---|---|---|
| **`colab-python`** | Python 3.11, NumPy, Pandas, Matplotlib | Persistent Google Colab alternative that never disconnects |
| **`agent-code-interpreter`** | Python 3.11 / Node 20 Sandbox | Safe execution sandbox for LangChain, CrewAI, and OpenAI function calls |
| **`agent-scraper`** | Python, BeautifulSoup, Requests | Headless scraping overcoming serverless execution timeouts |
| **`model-deploy`** | Python, FastAPI Microservice | 1-click script-to-API runner with Composio actions & rate limits |
| **`cloud-terminal`** | Debian 13 Firecracker Root Shell | Full Linux root cloud terminal with curl, git, node, python |

---

## 💳 Pricing (Tailored for India & Global Devs)

| Plan | Price (INR) | Compute Tokens | Compute Hours | Deployed Endpoints | MicroVM Sandbox Pool |
|---|---|---|---|---|---|
| **Free Trial** | **₹0** (1st Month) | 50,000 | 3 sessions / day | Public templates | Shared Sub-2s |
| **Starter** | **₹499** / mo (~$6) | 500,000 | 20 hours | 1 live endpoint | Standard Sub-2s |
| **Pro** | **₹1,499** / mo (~$18) | 2,500,000 | 80 hours | 3 endpoints + API keys | High-Priority Sub-2s |
| **Team** | **₹4,999** / mo (~$59) | 10,000,000 | 300 hours | Unlimited + Team sharing | Dedicated Compute Pool |

*Live product IDs verified with Dodo Payments (`pdt_0NfRPIDZgIPVGLL45EiGe`, `pdt_0NfRPxJ2x8CUfGx9IzZT9`, `pdt_0NfRR1eES9t51E5OLG7j9`). Supports UPI (GPay, PhonePe, Paytm), RuPay, Indian debit/credit cards, netbanking, and international cards.*

---

## 🏗️ Release Architecture: v1 Launch vs v2 Roadmap

- **v1 Launch (Now)**: 100% Cloud-Native:
  - Zero-Install Web Studio (`unideploy.in/sandbox`)
  - Zero-Config Terminal CLI (`npx unideploy`)
  - Agent REST API & Edge Proxy (`apps/worker`)
  - Cursor/Claude MCP Server (`apps/mcp`)
- **v2 Roadmap (Upcoming)**:
  - Native Desktop Companion (.dmg for macOS, .exe for Windows) in `apps/desktop`
  - Local offline caching of model weights and dataset checkpoints
  - Hardware acceleration passthrough for local Apple Silicon (Metal) / NVIDIA CUDA execution

---

## 📦 Monorepo Architecture

```
unideploy/
├── apps/
│   ├── frontend/         # Next.js 16 Web Platform, Sandbox Studio & Marketplace (Vercel)
│   ├── worker/           # Cloudflare Worker edge gateway, AI proxy & D1/KV storage
│   ├── mcp/              # Model Context Protocol (MCP) server for Claude Code & Cursor
│   └── desktop/          # Optional native desktop client (.dmg, v2 roadmap)
│
├── packages/
│   ├── cli/              # @unideploy/cli — published as 'unideploy' on npm
│   ├── ai/               # Unified multi-provider LLM engine (@earendil-works/pi-ai)
│   └── agent/            # Stateful agent harness with streaming (@earendil-works/pi-agent-core)
│
├── docs/                 # Architectural specifications and guides
├── product.md            # Master product vision and specification
├── CONTRIBUTING.md       # Contribution guidelines and 7EDGE standards
└── LICENSE.md            # PolyForm Noncommercial 1.0.0 license
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup and standards.

- Strict TypeScript mode (`no any`)
- British English in user-facing strings
- Pull requests required (`main` branch protected)

---

## 📄 License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). For commercial licensing or enterprise self-hosting, contact [support@unideploy.in](mailto:support@unideploy.in).
