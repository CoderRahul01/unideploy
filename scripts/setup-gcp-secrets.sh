#!/bin/bash
# Run ONCE to store all secrets in GCP Secret Manager.
# Cloud Run reads them at deploy time — no secrets in env vars or code.

set -e
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-manifest-design-484007-m8}"

echo "Setting up GCP Secret Manager for UniDeploy..."
echo "Project: $PROJECT_ID"
echo "You will be prompted for each secret value."
echo ""

create_secret() {
  local name=$1
  local description=$2
  printf "Enter %s: " "$description"
  read -rs value
  echo ""

  gcloud secrets describe "$name" --project="$PROJECT_ID" > /dev/null 2>&1 || \
    gcloud secrets create "$name" \
      --project="$PROJECT_ID" \
      --replication-policy=automatic

  printf '%s' "$value" | gcloud secrets versions add "$name" \
    --project="$PROJECT_ID" \
    --data-file=-

  echo "  [OK] $name stored"
}

create_secret "insforge-api-key"       "InsForge API Key"
create_secret "insforge-project-id"    "InsForge Project ID"
create_secret "gemini-api-key"         "Gemini API Key"
create_secret "composio-api-key"       "Composio API Key"
create_secret "dodo-api-key"           "Dodo Payments API Key"
create_secret "dodo-webhook-secret"    "Dodo Webhook Secret"
create_secret "supermemory-api-key"    "Supermemory API Key"
create_secret "autosend-api-key"       "AutoSend API Key"

echo ""
echo "All secrets stored in GCP Secret Manager"
echo "  View at: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID"
