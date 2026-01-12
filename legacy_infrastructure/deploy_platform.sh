#!/bin/bash

# deploy_platform.sh - UniDeploy One-Click AWS Deployment
set -e

# 1. Configuration
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1" # Change if needed
ECR_BASE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

echo "🚀 Starting UniDeploy Production Release..."

# 2. Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_BASE

# 3. Build & Push Backend
echo "📦 Building Backend..."
docker build --platform linux/amd64 -t unideploy/backend ./backend
docker tag unideploy/backend:latest $ECR_BASE/unideploy/backend:latest
docker push $ECR_BASE/unideploy/backend:latest

# 4. Build & Push Frontend
# Load frontend .env if it exists
if [ -f frontend/.env ]; then
    export $(cat frontend/.env | xargs)
fi

echo "📦 Building Frontend (with API URL: $NEXT_PUBLIC_API_URL)..."
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_API_URL is not set. Frontend may not connect to backend."
fi

docker build --platform linux/amd64 \
    --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    -t unideploy/frontend ./frontend
docker tag unideploy/frontend:latest $ECR_BASE/unideploy/frontend:latest
docker push $ECR_BASE/unideploy/frontend:latest

# 5. Prepare Manifests (Variable Substitution)
echo "📝 Preparing Manifests..."
sed "s/AWS_ACCOUNT_ID/$AWS_ACCOUNT_ID/g; s/AWS_REGION/$AWS_REGION/g" k8s/production.yaml > k8s/production.final.yaml

# 6. Apply to EKS
echo "☸️  Deploying to Kubernetes..."
kubectl apply -f k8s/production.final.yaml

echo "✅ Deployment Successful!"
echo "------------------------------------------------"
echo "Services will be live at the LoadBalancer URLs below:"
echo "Backend: $(kubectl get svc unideploy-backend -n unideploy -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
echo "Frontend: $(kubectl get svc unideploy-frontend -n unideploy -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
echo "------------------------------------------------"

# 💡 Note: If your pods are 'Pending', you likely need compute nodes.
# To create a Free-Tier eligible node group:
# eksctl create nodegroup --cluster UniDeployEKS --name unideploy-free-tier --node-type t3.micro --nodes 2 --region us-east-1
