# UniDeploy — Agent Workspace Context

AI Cloud Sandbox & Model Deployment Platform. Brand: UniDeploy (unideploy.in)

## Overview

UniDeploy is an **AI Cloud Sandbox & Model Deployment Platform** purpose-built for the Indian and global developer ecosystem. It provides instant, disposable or persistent cloud microVMs (powered by E2B Firecracker technology) and a native macOS desktop application (`.dmg`) to run Python/data science codebases, test AI agents, and deploy AI models with instant API keys — without the hassle of configuring cloud infrastructure, dealing with random Google Colab disconnects, or managing local GPU throttling.

```
apps/
  frontend/         Next.js web platform, template marketplace, and dashboard (Vercel)
  worker/           Cloudflare Worker edge gateway, AI proxy, sandbox sessions & D1/KV storage
  desktop/          Native macOS desktop application (.dmg) for 1-click cloud microVMs & model deployment
  mcp/              Model Context Protocol (MCP) server for external agent integration

packages/
  cli/              @unideploy/cli — lightweight client for cloud sandbox execution & device pairing

skills/             Agent skills repository
```

## Core Platform Capabilities

1. **E2B Cloud Compute Sandboxes**:
   - Disposable & persistent Firecracker microVMs booting in under 2 seconds.
   - Google Colab alternative: persistent Python 3.11 with NumPy, Pandas, Matplotlib, and auto-rendered visualizations.
   - Linux cloud shell: Full root bash environment with curl, git, python, and node.

2. **Native Mac Desktop App (`apps/desktop/`)**:
   - Native macOS distribution: `UniDeploy-arm64.dmg` and `UniDeploy-x64.dmg`.
   - 1-click sandbox launcher, model endpoint deployment, and API key management.
   - Device code authentication paired with `unideploy.in/auth`.

3. **AI Model Deployment & Instant API Keys**:
   - Deploy AI models and agents to cloud microVMs with a single click.
   - Generate secure API keys to integrate cloud-hosted models into any application.

4. **Indian Developer Pricing (Dodo Payments)**:
   - Primary domain: `unideploy.in` tailored for the Indian tech and developer market.
   - **Free Trial**: ₹0 / first month with 50,000 free trial tokens + 3 cloud microVM sessions.
   - **Starter**: ₹499 / month (~$6) — 500k tokens, 20 compute hours.
   - **Pro**: ₹1,499 / month (~$18) — 2.5M tokens, 80 compute hours, 3 deployed model endpoints with API keys.
   - **Team**: ₹4,999 / month (~$59) — 10M tokens, dedicated compute pool, team collaboration.
   - Frictionless payments supporting UPI, RuPay, Indian debit cards, and international cards via Dodo Payments.

## Code Standards (7EDGE)

- TypeScript strict mode — no `any`
- British English in user-facing strings
- Clean error messaging with actionable next steps
- No direct push to main — PRs required
