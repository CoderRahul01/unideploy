#!/bin/bash
# Updates Vercel env vars — removes old Firebase vars, sets new stack vars.
# Requires: vercel CLI (npm i -g vercel) + vercel login

set -e

echo "Updating Vercel environment variables for UniDeploy..."
echo ""

# Remove old Firebase and legacy vars
OLD_VARS=(
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "NEXT_PUBLIC_FIREBASE_APP_ID"
  "NEXT_PUBLIC_MEASUREMENT_ID"
  "NEXT_PUBLIC_GATEWAY_URL"
  "BRAIN_URL"
)

for var in "${OLD_VARS[@]}"; do
  vercel env rm "$var" production --yes 2>/dev/null && echo "  [removed] $var" || echo "  [skip]    $var (not found)"
done

echo ""
printf "Cloud Run API URL (e.g. https://unideploy-api-xxx-uc.a.run.app): "
read -r API_URL

# Strip trailing slash
API_URL="${API_URL%/}"
WS_URL="${API_URL/https/wss}"

vercel env add NEXT_PUBLIC_APP_URL production <<< "https://www.unideploy.in"
vercel env add NEXT_PUBLIC_API_URL production <<< "$API_URL"
vercel env add NEXT_PUBLIC_WS_URL production  <<< "$WS_URL"

echo ""
echo "Vercel env vars updated"
echo "  NEXT_PUBLIC_API_URL = $API_URL"
echo "  NEXT_PUBLIC_WS_URL  = $WS_URL"
echo ""
echo "Trigger redeployment: vercel --prod"
