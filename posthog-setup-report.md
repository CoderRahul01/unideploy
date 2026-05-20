<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the UniDeploy FastAPI backend.

## Summary of changes

- **`apps/backend/core/posthog.py`** *(new)* — A shared PostHog client module that initialises a single `Posthog` instance from environment variables (`POSTHOG_API_KEY`, `POSTHOG_HOST`) with exception autocapture enabled. All routers and workers import from here instead of each creating their own instance.
- **`apps/backend/main.py`** — Removed the duplicate inline `Posthog` instantiation; now imports `posthog_client` from `core.posthog`. The shutdown flush is unchanged.
- **`apps/backend/workers/scan_worker.py`** — Replaced the inline `ph = Posthog(...)` with `from core.posthog import posthog_client as ph`. Existing `agent_scan_started`, `agent_scan_completed`, and `agent_scan_failed` events are preserved unchanged.
- **`apps/backend/routers/sessions.py`** — Added `session_created`, `session_connected`, and `session_destroyed` events.
- **`apps/backend/routers/auth.py`** — Added `auth_session_verified` event.
- **`apps/backend/routers/scans.py`** — Added `scan_queued`, `scan_fix_triggered`, and `scan_fix_completed` events.
- **`apps/backend/routers/scan_results.py`** — Added `scan_results_received` and `fix_complete_received` events.
- **`apps/backend/routers/deploy.py`** — Added `deploy_plan_requested` and `deploy_generate_started` events.
- **`apps/backend/routers/ai.py`** — Added `ai_patch_requested` event.
- **`apps/backend/.env`** — `POSTHOG_API_KEY` and `POSTHOG_HOST` updated to the correct production values.

## Events

| Event | Description | File |
|---|---|---|
| `agent_scan_started` | Agent scan began processing in the background worker | `workers/scan_worker.py` |
| `agent_scan_completed` | Agent scan finished with findings and grade | `workers/scan_worker.py` |
| `agent_scan_failed` | Agent scan failed with an error | `workers/scan_worker.py` |
| `session_created` | CLI created a new scan session | `routers/sessions.py` |
| `session_connected` | Browser entered the session code and connected | `routers/sessions.py` |
| `session_destroyed` | Session was explicitly destroyed | `routers/sessions.py` |
| `auth_session_verified` | Browser verified the 6-digit auth code | `routers/auth.py` |
| `scan_queued` | A GitHub URL scan was accepted and queued | `routers/scans.py` |
| `scan_fix_triggered` | User triggered the FixAgent to generate patches | `routers/scans.py` |
| `scan_fix_completed` | FixAgent generated patches and raised a GitHub PR | `routers/scans.py` |
| `scan_results_received` | CLI posted local scan results (findings, grade) | `routers/scan_results.py` |
| `fix_complete_received` | CLI posted post-fix rescan results | `routers/scan_results.py` |
| `deploy_plan_requested` | CLI requested stack detection for deployment | `routers/deploy.py` |
| `deploy_generate_started` | CLI started streaming deploy config generation | `routers/deploy.py` |
| `ai_patch_requested` | CLI requested an AI-generated patch for a finding | `routers/ai.py` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behaviour, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1588229)
- [Scan pipeline volume](/insights/9n7rP0hb) — daily scans queued, completed, and failed
- [Scan completion funnel](/insights/xMjzFebV) — conversion from session created → browser connected → scan results received
- [Fix adoption](/insights/8xgVlVT1) — fix triggers and successful PR raises over time
- [Deploy activity](/insights/n4UGeip6) — stack detection and config generation starts
- [AI patch requests](/insights/bEosASdE) — volume of AI-generated patch requests from the CLI

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
