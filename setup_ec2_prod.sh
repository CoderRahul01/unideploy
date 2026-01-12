#!/bin/bash

# 📦 UniDeploy AWS Production Setup (The "Control Plane")
# This script provisions a single Ubuntu 22.04 node to run the Backend + Gateway.
# User code runs on E2B (Serverless), so this node stays light.

set -e

echo "🚀 Starting UniDeploy Production Setup..."

# 1. Update & Install Dependencies
echo "📦 Installing Dependencies..."
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    git \
    nginx \
    python3-pip \
    python3-venv \
    nodejs \
    npm

# 2. Install Docker (For backend services if we containerize them)
echo "🐳 Installing Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  \"$(. /etc/os-release && echo "$VERSION_CODENAME")\" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER

# 3. Setup Project Directory
echo "📂 Cloning Repository..."
# Replace with your actual public repo or setup SSH keys before running
if [ ! -d "/home/ubuntu/unideploy" ]; then
    git clone https://github.com/CoderRahul01/unideploy.git /home/ubuntu/unideploy
else
    echo "Repo already exists, pulling latest..."
    cd /home/ubuntu/unideploy && git pull
fi

# 4. Setup Backend Environment (Python)
echo "🐍 Setting up Python Backend..."
cd /home/ubuntu/unideploy/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn uvicorn

# 5. Setup Node Gateway
echo "🟢 Setting up Node Gateway..."
cd /home/ubuntu/unideploy/backend-node
npm install
npm install -g pm2

# 6. Configure Nginx (Reverse Proxy)
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/unideploy <<EOF
server {
    listen 80;
    server_name _; 

    # Frontend (Next.js) - Assuming we build static or run it on 3000
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }

    # Python Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # Gateway (WebSockets)
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/unideploy /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 7. Start Services (PM2)
echo "🔥 Starting Services..."
# We use PM2 to manage both Node and Python processes
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name "unideploy-backend" --namespace "python"
pm2 start "npm start" --name "unideploy-gateway" --cwd "/home/ubuntu/unideploy/backend-node"

# Save PM2 list
pm2 save
pm2 startup

echo "✅ UniDeploy Control Plane is LIVE!"
echo "NOTE: Ensure you create a .env file in /home/ubuntu/unideploy/backend with your API Keys!"
