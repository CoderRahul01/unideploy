<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into UniDeploy. Here is a summary of every change made:

- **`instrumentation-client.ts`** (new) — Client-side PostHog initialisation using the Next.js 15.3+ pattern. Replaces the old `useEffect`-based init in `PostHogProvider`. Enables automatic pageview capture, error tracking (`capture_exceptions: true`), and routes events through the `/ingest` reverse proxy.
- **`src/providers/PostHogProvider.tsx`** (updated) — Removed the `posthog.init()` call and `PostHogPageview` component (now handled by `instrumentation-client.ts`). The `PHProvider` wrapper is kept for context hooks.
- **`src/app/layout.tsx`** (updated) — Removed the `PostHogPageview` `<Suspense>` wrapper that was no longer needed.
- **`next.config.ts`** (updated) — Added PostHog reverse-proxy rewrites (`/ingest/static/*`, `/ingest/array/*`, `/ingest/*`) alongside the existing `/docs` rewrites, plus `skipTrailingSlashRedirect: true`.
- **`src/lib/posthog-server.ts`** (new) — Server-side PostHog singleton using `posthog-node` for server route tracking.
- **`src/app/install.sh/route.ts`** (updated) — Fires `install_script_fetched` server-side event on every CLI install script download.
- **`src/app/page.tsx`** (updated) — Fires `install_command_copied` (hero) and `demo_booking_clicked` (landing demo section).
- **`src/app/connect/page.tsx`** (updated) — Fires `session_code_submitted`, `session_code_error`, `install_command_copied` (connect page), and calls `posthog.identify()` on successful session verification.
- **`src/app/pricing/page.tsx`** (updated) — Fires `pricing_cta_clicked` (with `tier` and `billing_period` properties) and `pricing_billing_toggle_changed`.
- **`src/app/dashboard/page.tsx`** (updated) — Fires `github_scan_started`, `scan_report_viewed` (with grade/issue counts), `ai_fix_triggered`, and `github_pr_fix_triggered`.
- **`src/components/FloatingDemoButton.tsx`** (updated) — Fires `demo_booking_clicked` (with `location: "floating_button"` and current page).
- **`.env.local`** (updated) — `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` set.

## Events

| Event | Description | File |
|---|---|---|
| `install_command_copied` | User copies `npx unideploy@latest init` from the hero block | `src/app/page.tsx` |
| `install_command_copied` | User copies `npx unideploy@latest init` from the connect page | `src/app/connect/page.tsx` |
| `demo_booking_clicked` | User clicks Book a Demo on the landing page demo section | `src/app/page.tsx` |
| `demo_booking_clicked` | User clicks the floating Book Demo button | `src/components/FloatingDemoButton.tsx` |
| `session_code_submitted` | User submits a 6-digit CLI session code | `src/app/connect/page.tsx` |
| `session_code_error` | Session code verification fails | `src/app/connect/page.tsx` |
| `github_scan_started` | User submits a GitHub repo URL for remote scan | `src/app/dashboard/page.tsx` |
| `scan_report_viewed` | CLI scan report loaded and displayed (grade, issue counts) | `src/app/dashboard/page.tsx` |
| `ai_fix_triggered` | User clicks Fix all with AI via CLI WebSocket | `src/app/dashboard/page.tsx` |
| `github_pr_fix_triggered` | User triggers auto-fix flow creating a GitHub PR | `src/app/dashboard/page.tsx` |
| `pricing_cta_clicked` | User clicks a pricing tier CTA (tier + billing_period properties) | `src/app/pricing/page.tsx` |
| `pricing_billing_toggle_changed` | User toggles between monthly and annual billing | `src/app/pricing/page.tsx` |
| `install_script_fetched` | Server-side: install.sh requested (CLI install intent) | `src/app/install.sh/route.ts` |

## Next steps

We've built a dashboard and five insights to monitor user behaviour based on the instrumented events:

- [Analytics basics dashboard](/dashboard/1566175)
- [CLI onboarding funnel](/insights/gDz7x3dQ) — Conversion from session code submission → scan report viewed
- [Install command copies (unique users)](/insights/oy9Q02I9) — Daily unique users copying the install command (top-of-funnel)
- [Pricing CTA clicks by tier](/insights/5xkW7xV6) — Which pricing tiers attract the most click intent (broken down by tier)
- [AI fix triggered trend](/insights/nrB8gCyP) — CLI vs GitHub PR auto-fix usage over time (power user metric)
- [Demo bookings vs GitHub scans started](/insights/vbMPbYVR) — Sales intent vs self-serve intent comparison

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
