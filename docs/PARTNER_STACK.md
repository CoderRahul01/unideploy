# UniDeploy Partner Stack

## Overview

UniDeploy uses a "partner everything undifferentiated" strategy. The only differentiated work is the rule library, agent prompts, and developer experience. Every infrastructure piece is a partner.

## Partners

### Composio — Action Layer
- **What:** Authentication + tool-execution layer for AI agents. 1,000+ pre-built toolkits, SOC 2 Type II.
- **How UniDeploy uses it:** GitHub OAuth, PR creation, Sentry error pull, Vercel deploy hooks, Slack/Discord alerts, Linear ticket creation. Agents never store tokens.
- **Key benefit:** UniDeploy never writes OAuth flows or manages third-party credentials.
- **Program:** Startups Program — 7 months free Growth plan, $2,000 in production credits.

### Google Gemini Enterprise Agent Platform — Agent Brain
- **What:** ADK (code-first agent framework), Agent Runtime (managed serverless), Memory Bank, Model Armor, Model Garden (200+ models).
- **How UniDeploy uses it:** ADK defines the 4-agent graph. Agent Runtime executes scans. Memory Bank persists per-project context. Model Armor blocks prompt injection from malicious repos. Model Garden provides Gemini Flash (analyzer) and Pro (fix generation).
- **Key benefit:** Enterprise-grade agent infrastructure with built-in security (Model Armor) and observability.

### Dodo Payments — Billing Layer
- **What:** Full Merchant of Record with UPI (India), cards, Apple Pay, Google Pay, 150+ countries, 80+ currencies.
- **How UniDeploy uses it:** All subscription billing (Free/Indie/Pro/Team), usage metering for scan quotas, webhook-driven plan enforcement.
- **Key benefit:** Only MoR with native UPI. Single integration replaces Razorpay + Lemon Squeezy.
- **Credits:** $3,000 processing credits (fee-free on first ~$50-60k GMV).

### Supermemory — Memory Layer
- **What:** Memory engine for AI agents. Sub-300ms retrieval, model-agnostic, auto-handles contradictions.
- **How UniDeploy uses it:** Per-project scan history, user preferences, dismissed warnings, incremental scans.
- **Key benefit:** Scans get smarter over time. "This user always uses Drizzle → suggest Drizzle-flavored fixes."

### AutoSend — Notification Layer
- **What:** Developer-first transactional + marketing email. Pay per send, not per contact.
- **How UniDeploy uses it:** Scan-complete emails, weekly digests, billing receipts, onboarding sequences.
- **Key benefit:** Better pricing than Resend/SendGrid for a product with a large free tier.

### E2B — Sandbox Layer
- **What:** Firecracker microVMs for running code in sandboxed environments.
- **How UniDeploy uses it:** BuildAgent verifies projects actually compile before running expensive fix-generation.
- **Credits:** $20K infrastructure credits via E2B Pro partnership.

### Smallest AI / Waves — Voice (Optional)
- **What:** Real-time TTS engine.
- **How UniDeploy uses it:** Optional voice-narrated audit reports on Pro tier. Marketing video voiceovers.
- **Credits:** $50 API credits.

### TinyFish — Live Probes (v1.5)
- **What:** Serverless web agents — give URL + goal, get structured data back.
- **Future use:** "Live Probe" feature — visit deployed app URL and test security headers, login flow, CSP, mixed content.
