#!/bin/bash
# Run ONCE to store all secrets in GCP Secret Manager.
# Cloud Run reads them at deploy time — no secrets in env vars or code.
# Press Enter to skip a secret (stores placeholder "not_configured").

set -e
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-manifest-design-484007-m8}"

echo "Setting up GCP Secret Manager for UniDeploy..."
echo "Project: $PROJECT_ID"
echo "Press Enter to skip a secret (stores placeholder — update later)."
echo ""

create_secret() {
  local name=$1
  local description=$2
  printf "Enter %s (Enter to skip): " "$description"
  read -rs value
  echo ""

  if [ -z "$value" ]; then
    value="not_configured"
    echo "  [SKIP] $name → placeholder stored (update later)"
  fi

  gcloud secrets describe "$name" --project="$PROJECT_ID" > /dev/null 2>&1 || \
    gcloud secrets create "$name" \
      --project="$PROJECT_ID" \
      --replication-policy=automatic

  printf '%s' "$value" | gcloud secrets versions add "$name" \
    --project="$PROJECT_ID" \
    --data-file=-

  [ "$value" != "not_configured" ] && echo "  [OK] $name stored"
}

create_secret "insforge-api-key"       "InsForge API Key"
create_secret "insforge-project-id"    "InsForge Project ID"
create_secret "gemini-api-key"         "Gemini API Key"
create_secret "composio-api-key"       "Composio API Key"
create_secret "dodo-api-key"           "Dodo Payments API Key"
create_secret "dodo-webhook-secret"    "Dodo Webhook Secret"
create_secret "supermemory-api-key"    "Supermemory API Key (skip if unused)"
create_secret "autosend-api-key"       "AutoSend API Key (skip if unused)"
create_secret "e2b-api-key"            "E2B API Key"

echo ""
echo "Done. View secrets at:"
echo "  https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID"
echo ""
echo "To update a skipped secret later:"
echo "  printf 'YOUR_KEY' | gcloud secrets versions add SECRET_NAME --data-file=- --project=$PROJECT_ID"
