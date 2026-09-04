# UniDeploy

**The AI Cloud Sandbox & Model Deployment Platform.**

[www.unideploy.in](https://www.unideploy.in) · [Sandbox Hub](https://www.unideploy.in/sandbox) · [Download for Mac](https://www.unideploy.in/download)

---

## What is UniDeploy?

UniDeploy provides instant, isolated cloud microVM compute environments powered by E2B Firecracker technology and a native macOS desktop application. Run complex Python data science codebases, test autonomous AI agents, and deploy AI models with instant API keys — all without infrastructure overhead, Google Colab disconnects, or local hardware constraints.

## Key Features

- ⚡ **Instant Cloud Sandboxes**: Disposable and persistent Linux microVMs booting in under 2 seconds.
- 🐍 **Google Colab Alternative**: Python 3.11 with NumPy, Pandas, Matplotlib, and auto-rendering visualizations that never randomly disconnect.
- 🍏 **Native Mac Desktop App (`.dmg`)**: Launch microVMs, manage deployed models, and inspect token usage from your dock.
- 🤖 **AI Model & Agent Deployment**: 1-click model deployment with instant API keys to query your cloud endpoints from any code.
- 🇮🇳 **Optimised for Indian Developers**: Low-latency edge execution, INR pricing via Dodo Payments (UPI, RuPay, Netbanking, Cards), and 50,000 free trial tokens on signup.

## Architecture

```
apps/
  frontend/         Next.js web platform, template marketplace, and dashboard (Vercel)
  worker/           Cloudflare Worker edge gateway, AI completions proxy, & D1/KV storage
  desktop/          Native macOS desktop application (.dmg)
  mcp/              Model Context Protocol (MCP) server for external agent integration

packages/
  cli/              @unideploy/cli — lightweight client for cloud sandbox execution
```

## Quick Start

### 1. Launch in Browser (Web Marketplace)
Visit [unideploy.in/sandbox](https://www.unideploy.in/sandbox) to test code in interactive microVMs.

### 2. Download for macOS
Download `UniDeploy.dmg` from [unideploy.in/download](https://www.unideploy.in/download) for a native macOS experience.

### 3. Or Use the CLI
```bash
npm install -g unideploy
unideploy auth      # Connect your account & activate 50,000 free trial tokens
unideploy whoami    # View plan tier and remaining token credits
```

## Plans & Pricing (Tailored for India)

- **Free Trial**: ₹0 / first month — 50,000 trial tokens, 3 concurrent cloud sandboxes.
- **Starter**: ₹499 / month — 500k tokens, 20 compute hours.
- **Pro**: ₹1,499 / month — 2.5M tokens, 80 compute hours, 3 deployed model endpoints with API keys.
- **Team**: ₹4,999 / month — 10M tokens, dedicated compute pool, team collaboration.

Payments are seamlessly handled via Dodo Payments with support for UPI, RuPay, Indian cards, and international credit cards.

## License

PolyForm Noncommercial 1.0.0 with commercial licensing grant. See [LICENSE.md](LICENSE.md).
