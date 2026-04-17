# UniDeploy — Deployment Guide

## Frontend → Vercel

### One-time setup

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. From the frontend directory, link to Vercel:
   ```bash
   cd apps/frontend
   vercel link
   ```

3. Add the required secret environment variables via the Vercel dashboard
   (Project → Settings → Environment Variables), or via CLI:
   ```bash
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
   vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
   vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
   vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
   vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
   vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
   vercel env add NEXT_PUBLIC_API_URL production        # your Cloud Run backend URL
   vercel env add BRAIN_URL production                  # same Cloud Run backend URL
   vercel env add GATEWAY_URL production                # gateway service URL if separate
   ```

4. Deploy to production:
   ```bash
   vercel --prod
   ```

### Automatic deploys (recommended)

Connect your GitHub repo in the Vercel dashboard and set the **Root Directory**
to `apps/frontend`. Vercel will redeploy on every push to `main`.

---

## Backend → Google Cloud Run

### Prerequisites

- Google Cloud project created (e.g. `unideploy-prod`)
- `gcloud` CLI installed and authenticated: `gcloud auth login`
- Docker installed locally (only needed for local testing)
- Artifact Registry API and Cloud Run API enabled

### One-time infrastructure setup

```bash
export PROJECT_ID=unideploy-prod
export REGION=us-central1

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  --project=$PROJECT_ID

# Create Artifact Registry repository
gcloud artifacts repositories create unideploy \
  --repository-format=docker \
  --location=$REGION \
  --project=$PROJECT_ID

# Store secrets in Secret Manager
# (replace placeholder values with real ones)
echo -n "postgresql://..." | gcloud secrets create unideploy-db-url \
  --data-file=- --project=$PROJECT_ID

echo -n "your-groq-api-key" | gcloud secrets create unideploy-groq-key \
  --data-file=- --project=$PROJECT_ID

echo -n "your-e2b-api-key" | gcloud secrets create unideploy-e2b-key \
  --data-file=- --project=$PROJECT_ID

# For Firebase service account JSON, store the file contents:
gcloud secrets create unideploy-firebase-creds \
  --data-file=apps/backend/firebase-credentials.json \
  --project=$PROJECT_ID

# Grant Cloud Run service account access to secrets
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
for SECRET in unideploy-db-url unideploy-groq-key unideploy-e2b-key unideploy-firebase-creds; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
done
```

### Deploy via Cloud Build (CI/CD)

Connect the GitHub repo in Cloud Build and point the trigger to
`apps/backend/cloudbuild.yaml`.

Alternatively, trigger a manual build from the repo root:

```bash
gcloud builds submit \
  --config=apps/backend/cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_REPO=unideploy,_SERVICE=unideploy-backend \
  --project=$PROJECT_ID \
  .
```

### Manual deploy (faster iteration)

```bash
cd apps/backend

# Build and push
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/unideploy/unideploy-backend:latest"
docker build -t $IMAGE .
docker push $IMAGE

# Deploy
gcloud run deploy unideploy-backend \
  --image=$IMAGE \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8000 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=10 \
  --set-secrets=DATABASE_URL=unideploy-db-url:latest,GROQ_API_KEY=unideploy-groq-key:latest,E2B_API_KEY=unideploy-e2b-key:latest,GATEWAY_URL=unideploy-gateway-url:latest,/secrets/firebase-credentials.json=unideploy-firebase-creds:latest \
  --set-env-vars=ENVIRONMENT=production,FIREBASE_SERVICE_ACCOUNT_JSON=/secrets/firebase-credentials.json \
  --project=$PROJECT_ID
```

After deploy, get the service URL:

```bash
gcloud run services describe unideploy-backend \
  --region=$REGION \
  --format='value(status.url)' \
  --project=$PROJECT_ID
```

Set this URL as `NEXT_PUBLIC_API_URL` and `BRAIN_URL` in your Vercel project.

### CORS configuration

Update `main.py` to add your Vercel production domain to `allow_origins`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "https://unideploy.app",   # custom domain if configured
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy after updating CORS.

---

## Environment variable reference

| Variable | Where used | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Frontend (Vercel) | Firebase client SDK config |
| `NEXT_PUBLIC_API_URL` | Frontend (Vercel) | Backend Cloud Run URL |
| `BRAIN_URL` | Frontend (Vercel, server-side rewrites) | Backend URL |
| `GATEWAY_URL` | Frontend (Vercel, server-side rewrites) | Gateway/socket service URL |
| `DATABASE_URL` | Backend (Secret Manager) | PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Backend (Secret Manager) | Path to Firebase admin credentials |
| `GROQ_API_KEY` | Backend (Secret Manager) | Groq API key (LLM inference) |
| `E2B_API_KEY` | Backend (Secret Manager) | E2B sandbox API key |
