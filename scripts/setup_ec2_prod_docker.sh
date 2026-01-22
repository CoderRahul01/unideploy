#!/bin/bash

# 🐳 UniDeploy AWS Production Setup (Dockerized)
# This script migrates from PM2-based setup to Docker Compose.

set -e

echo "🚀 Starting UniDeploy Dockerized Setup..."

# 1. Stop existing PM2 services if they exist
if command -v pm2 &> /dev/null; then
    echo "Stopping PM2 services..."
    pm2 stop unideploy-brain || true
    pm2 stop unideploy-gateway || true
    pm2 stop unideploy-web || true
    pm2 delete unideploy-brain || true
    pm2 delete unideploy-gateway || true
    pm2 delete unideploy-web || true
    pm2 save || true
fi

# 2. Install Docker & Docker Compose if not present
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --batch --yes -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
fi

# 3. Ensure Environment Files Exist
echo "🔑 Checking Environment Files..."
CHECK_FILES=(
    "apps/backend/.env"
    "apps/gateway/.env"
    "apps/backend/firebase-credentials.json"
)

for file in "${CHECK_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "⚠️  WARNING: $file not found! Please create it before starting."
    fi
done

# 4. Start Docker Services
echo "🏗️  Starting Docker Containers..."
# We use the host network for simplicity with Nginx if needed, 
# or standard bridge networks (preferred).
docker compose up --build -d

# 5. Update Nginx Configuration
echo "🌐 Updating Nginx..."
NGINX_CONF="scripts/unideploy_nginx.conf"
if [ -f "$NGINX_CONF" ]; then
    sudo cp "$NGINX_CONF" /etc/nginx/sites-available/unideploy
    sudo ln -sf /etc/nginx/sites-available/unideploy /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl restart nginx
else
    echo "⚠️  Nginx config $NGINX_CONF not found. Skipping Nginx update."
fi

echo "✅ UniDeploy is now running on Docker!"
echo "------------------------------------------------"
echo "Backend: http://localhost:8000"
echo "Gateway: http://localhost:3001"
echo "------------------------------------------------"
