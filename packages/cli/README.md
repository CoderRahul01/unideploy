# @unideploy/cli (`unideploy`)

**Lightweight CLI client for UniDeploy — AI Cloud Sandboxes & Model Deployments**

[![npm version](https://img.shields.io/npm/v/unideploy.svg?color=cb3837)](https://www.npmjs.com/package/unideploy)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue.svg)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

The official command-line interface for [unideploy.in](https://www.unideploy.in). Launch cloud microVMs in under 2 seconds, execute Python/data science code in isolated sandboxes, and deploy scripts as live HTTPS REST APIs with instant API keys.

---

## 🚀 Installation

```bash
# Global installation (recommended)
npm install -g unideploy

# Or run directly via npx
npx unideploy --help
```

---

## 🔑 Authentication & Pairing

Authenticate your CLI session with your `unideploy.in` account to unlock 50,000 free trial compute tokens:

```bash
# Connect account via 6-digit device code
unideploy auth

# Check authenticated user, active plan, and token balance
unideploy whoami

# Check token quota details
unideploy tokens
```

Credentials are saved securely at `~/.unideploy/auth.json` with restricted `0600` permissions.

---

## ⚡ Commands Reference

### 1. Cloud Sandboxes (E2B Firecracker)

```bash
# Provision a cloud microVM (<2s boot)
unideploy sandbox create colab-python

# List all active cloud microVMs
unideploy sandbox list
```

Available Marketplace Templates:
- `colab-python`: Persistent Python 3.11 with NumPy, Pandas, Matplotlib, and auto-rendered visualizations.
- `agent-code-interpreter`: Quarantined sandbox for LangChain, CrewAI, AutoGen, and OpenAI tool-calling.
- `agent-scraper`: Headless web scraper overcoming serverless execution timeouts.
- `model-deploy`: Microservice runner turning scripts into live REST APIs.
- `cloud-terminal`: Full Linux root bash environment with curl, git, python, and node.

### 2. Run Code in Cloud Sandboxes

Execute local Python, JavaScript, or Bash scripts directly in isolated cloud microVMs:

```bash
# Run a Python script in an isolated microVM
unideploy run analysis.py

# Run a Bash script
unideploy run setup.sh
```

Any charts generated with Matplotlib or Seaborn are automatically detected and captured as visual artifacts.

### 3. 1-Click Model Deployment

Turn any Python script or handler into a 24/7 live HTTPS REST endpoint with an instant API key:

```bash
# Deploy script to the cloud
unideploy deploy app.py
```

**Output:**
```text
✓ Microservice Deployed Successfully!
  Model ID:     app
  Status:       Active (Live)
  Endpoint URL: https://unideploy-api.rahulpandey-creates.workers.dev/api/v1/models/app/predict
  API Key:      ud_live_38bf8a...

Sample Test Command:
  curl -X POST https://unideploy-api.rahulpandey-creates.workers.dev/api/v1/models/app/predict \
    -H "Authorization: Bearer ud_live_38bf8a..." \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Run inference"}'
```

### 4. Configuration & BYOK (Bring Your Own Key)

UniDeploy Cloud provides zero-config AI execution for authenticated accounts. If you prefer to supply your own API keys for local audits:

```bash
# Store keys persistently in ~/.unideploy/config.json
unideploy config set GEMINI_API_KEY AIzaSy...
unideploy config set GROQ_API_KEY gsk_...
unideploy config set ANTHROPIC_API_KEY sk-ant-...

# View configured keys (masked)
unideploy config
```

---

## 🌐 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `UNIDEPLOY_API_URL` | Cloudflare Worker edge API gateway | `https://unideploy-api.rahulpandey-creates.workers.dev` |
| `UNIDEPLOY_APP_URL` | UniDeploy web application URL | `https://unideploy.in` |
| `GEMINI_API_KEY` | Optional Google Gemini API key for local LLM routing | — |
| `GROQ_API_KEY` | Optional Groq API key for local LLM routing | — |
| `ANTHROPIC_API_KEY`| Optional Anthropic API key for local LLM routing | — |

---

## 📄 License

PolyForm Noncommercial 1.0.0. See [LICENSE.md](../../LICENSE.md).
