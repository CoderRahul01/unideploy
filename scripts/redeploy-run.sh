#!/bin/bash
# Redeploy Cloud Run from existing image — skips the Docker build step.
# Use this when the image is already in GCR and you only need to update config/secrets.
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-manifest-design-484007-m8}"
REGION="us-central1"
SA="unideploy-api@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Redeploying unideploy-api from existing image..."

gcloud run deploy unideploy-api \
  --image="gcr.io/${PROJECT_ID}/unideploy-api:latest" \
  --region="$REGION" --platform=managed --allow-unauthenticated \
  --port=8080 --memory=1Gi --cpu=1 --min-instances=0 --max-instances=10 \
  --service-account="$SA" \
  --set-env-vars="APP_ENV=production" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-env-vars="GOOGLE_GENAI_USE_VERTEXAI=TRUE" \
  --set-env-vars="GOOGLE_CLOUD_LOCATION=${REGION}" \
  --set-env-vars="FRONTEND_URL=https://www.unideploy.in" \
  --set-env-vars="BASE_URL=https://api.unideploy.in" \
  --set-env-vars="AGENT_ENGINE_RESOURCE_NAME=projects/1063190328420/locations/us-central1/reasoningEngines/8590568460453412864" \
  --set-env-vars="^@^ALLOWED_ORIGINS=https://www.unideploy.in,https://unideploy.vercel.app" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --set-secrets="E2B_API_KEY=e2b-api-key:latest" \
  --set-secrets="COMPOSIO_API_KEY=composio-api-key:latest" \
  --set-secrets="DODO_API_KEY=dodo-api-key:latest" \
  --set-secrets="INSFORGE_API_KEY=insforge-api-key:latest" \
  --set-secrets="INSFORGE_PROJECT_ID=insforge-project-id:latest" \
  --project="$PROJECT_ID"

URL=$(gcloud run services describe unideploy-api \
  --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")

echo ""
echo "Deployed: $URL"
echo "Health:   $URL/health"
