#!/bin/bash
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-manifest-design-484007-m8}"
REGION="us-central1"

echo "Deploying UniDeploy API to Cloud Run..."
echo "Project: $PROJECT_ID"
echo ""

# Build and push
gcloud builds submit apps/backend/ \
  --tag gcr.io/$PROJECT_ID/unideploy-api:latest \
  --project $PROJECT_ID

# Deploy
gcloud run deploy unideploy-api \
  --image gcr.io/$PROJECT_ID/unideploy-api:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars APP_ENV=production \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=TRUE \
  --set-env-vars GOOGLE_CLOUD_LOCATION=$REGION \
  --set-env-vars FRONTEND_URL=https://www.unideploy.in \
  --set-env-vars "^@^ALLOWED_ORIGINS=https://www.unideploy.in,https://unideploy.vercel.app" \
  --set-env-vars BASE_URL=https://api.unideploy.in \
  --set-secrets INSFORGE_API_KEY=insforge-api-key:latest \
  --set-secrets INSFORGE_PROJECT_ID=insforge-project-id:latest \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --set-secrets COMPOSIO_API_KEY=composio-api-key:latest \
  --set-secrets DODO_API_KEY=dodo-api-key:latest \
  --set-secrets DODO_WEBHOOK_SECRET=dodo-webhook-secret:latest \
  --set-secrets SUPERMEMORY_API_KEY=supermemory-api-key:latest \
  --set-secrets AUTOSEND_API_KEY=autosend-api-key:latest \
  --set-secrets E2B_API_KEY=e2b-api-key:latest \
  --service-account unideploy-api@$PROJECT_ID.iam.gserviceaccount.com \
  --project $PROJECT_ID

URL=$(gcloud run services describe unideploy-api \
  --region $REGION --project $PROJECT_ID \
  --format "value(status.url)")

echo ""
echo "Backend deployed: $URL"
echo "  Health: $URL/health"
echo ""
echo "Next steps:"
echo "  1. Set NEXT_PUBLIC_API_URL=$URL in Vercel"
echo "  2. Set NEXT_PUBLIC_WS_URL=${URL/https/wss} in Vercel"
echo "  3. Run: bash scripts/setup-vercel-env.sh"
