# UniDeploy Web Platform (`apps/frontend`)

**Next.js 16 Web Platform, Cloud Sandbox Studio, Template Marketplace & Dashboard**

The web client for [unideploy.in](https://www.unideploy.in), deployed on Vercel.

---

## 🚀 Features

- **Instant Sandbox Studio (`/sandbox`)**: Browser-based interactive Python and AI code execution powered by E2B Firecracker microVMs.
- **Template Marketplace**: Launch pre-configured environments (`colab-python`, `agent-code-interpreter`, `agent-scraper`, `model-deploy`, `cloud-terminal`).
- **macOS Desktop App Downloads (`/download`)**: Direct download links for `UniDeploy-arm64.dmg` (Apple Silicon) and `UniDeploy-x64.dmg` (Intel).
- **Pricing & Subscription Funnel (`/pricing`)**: Seamless INR checkout via Dodo Payments (UPI, RuPay, Netbanking, International Cards).
- **Device Pairing & Auth (`/auth`, `/connect`)**: Instant 6-digit device code pairing linking the desktop app and CLI to the user's dashboard account.
- **Dashboard (`/dashboard`)**: Token quota inspection, active microVM management, and deployed model endpoints.
- **Observability**: Client/server telemetry with PostHog analytics and Sentry error monitoring.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Vanilla CSS Variables & modern responsive design
- **Icons**: Lucide React
- **Payments**: Dodo Payments Merchant of Record (INR & USD)
- **Analytics & Errors**: PostHog & Sentry Next.js SDK

---

## 📂 App Routes Overview

| Route | Description |
|---|---|
| `/` | Public landing page explaining UniDeploy's value proposition |
| `/sandbox` | Interactive cloud sandbox runner and marketplace templates |
| `/download` | Native macOS desktop application (.dmg) download center |
| `/pricing` | Tier comparison and checkout (Free Trial, Starter, Pro, Team) |
| `/auth` | Device code pairing and user login screen |
| `/dashboard` | User dashboard for compute tokens, microVMs, and models |
| `/getting-started` | Interactive onboarding and getting started guide |
| `/changelog` | Product updates and platform release notes |
| `/terms` & `/privacy` | Legal policies and data privacy guarantees |

---

## 💻 Local Development

```bash
# From repository root
npm run dev:frontend

# Or from apps/frontend directly
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🌐 Environment Configuration

Create a `.env.local` file in `apps/frontend/`:

```bash
# Cloudflare Worker Edge Gateway
NEXT_PUBLIC_UNIDEPLOY_API_URL=https://unideploy-api.rahulpandey-creates.workers.dev

# Platform Domain
NEXT_PUBLIC_APP_URL=https://unideploy.in

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry Error Monitoring
SENTRY_AUTH_TOKEN=sntrys_...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## 🚢 Deployment

Deployed continuously on **Vercel** with automatic preview deployments on pull requests. Build verification is performed locally with:

```bash
npm run typecheck --workspace=apps/frontend
```
