#!/bin/bash
# Stores Clerk secrets in GCP Secret Manager and hot-updates Cloud Run.
# NO full image rebuild — uses `gcloud run services update` (takes ~15s).
#
# Usage:
#   bash scripts/add-clerk-secrets.sh
#
# Or non-interactively:
#   CLERK_SECRET_KEY=sk_live_... CLERK_JWKS_URL=https://... bash scripts/add-clerk-secrets.sh

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-manifest-design-484007-m8}"
REGION="us-central1"
SERVICE="unideploy-api"

# ── Helpers ─────────────────────────────────────────────────────────────────

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*"; }

upsert_secret() {
  local name=$1
  local value=$2

  if gcloud secrets describe "$name" --project="$PROJECT_ID" > /dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" \
      --project="$PROJECT_ID" --data-file=- --quiet
    green "  ✓ $name — new version added"
  else
    gcloud secrets create "$name" \
      --project="$PROJECT_ID" \
      --replication-policy=automatic --quiet
    printf '%s' "$value" | gcloud secrets versions add "$name" \
      --project="$PROJECT_ID" --data-file=- --quiet
    green "  ✓ $name — created and stored"
  fi
}

# ── Collect values ───────────────────────────────────────────────────────────

bold "UniDeploy — Clerk secrets setup"
echo "Project: $PROJECT_ID"
echo ""
echo "Values are read from environment variables if set, otherwise prompted."
echo "Find both values in Clerk Dashboard → Configure → API Keys."
echo ""

if [ -z "${CLERK_SECRET_KEY:-}" ]; then
  printf "CLERK_SECRET_KEY (starts with sk_): "
  read -rs CLERK_SECRET_KEY
  echo ""
fi

if [ -z "${CLERK_JWKS_URL:-}" ]; then
  echo "JWKS URL is shown in Clerk Dashboard → Configure → API Keys → right sidebar."
  echo "Format: https://<your-clerk-frontend-api>/.well-known/jwks.json"
  printf "CLERK_JWKS_URL: "
  read -r CLERK_JWKS_URL
fi

if [ -z "$CLERK_SECRET_KEY" ] || [ -z "$CLERK_JWKS_URL" ]; then
  red "Both CLERK_SECRET_KEY and CLERK_JWKS_URL are required."
  exit 1
fi

echo ""
bold "Storing secrets in GCP Secret Manager..."

upsert_secret "clerk-secret-key" "$CLERK_SECRET_KEY"
upsert_secret "clerk-jwks-url"   "$CLERK_JWKS_URL"

# ── Hot-update Cloud Run (no rebuild) ────────────────────────────────────────

echo ""
bold "Updating Cloud Run service (no rebuild, ~15s)..."

gcloud run services update "$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --update-secrets="CLERK_SECRET_KEY=clerk-secret-key:latest" \
  --update-secrets="CLERK_JWKS_URL=clerk-jwks-url:latest" \
  --quiet

echo ""
green "✓ Done. Cloud Run is now serving with Clerk JWT verification."
echo ""
echo "Verify with:"
echo "  curl -s https://unideploy-api-4b25n74mbq-uc.a.run.app/health | jq"
echo ""
echo "Test JWT rejection (should return 401):"
echo "  curl -s https://unideploy-api-4b25n74mbq-uc.a.run.app/api/v1/sessions/create | jq"
