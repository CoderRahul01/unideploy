#!/bin/bash

# 📦 UniDeploy AWS Production Setup (The "Control Plane")
# This script provisions a single Ubuntu 22.04 node to run the Backend + Gateway.
# User code runs on E2B (Serverless), so this node stays light.

set -e

echo "🚀 Starting UniDeploy Production Setup..."

# 1. Update & Install Dependencies
echo "📦 Installing Dependencies..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git nginx python3-pip python3-venv

# Install Node.js 22 via NodeSource
echo "🟢 Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install Docker
echo "🐳 Installing Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
# Added --batch --yes to avoid TTY issues
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --batch --yes -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
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
cd /home/ubuntu/unideploy/brain
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
./venv/bin/pip install gunicorn uvicorn docker kubernetes

# 5. Setup Node Gateway & Web
echo "🟢 Setting up Node Services..."
sudo npm install -g pm2

cd /home/ubuntu/unideploy/gateway
npm install

cd /home/ubuntu/unideploy/web
npm install

# 6. Configure Nginx (Reverse Proxy)
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/unideploy <<EOF
server {
    listen 80;
    server_name api.unideploy.in unideploy.in; 

    # Web (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }

    # Brain API (Python)
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Gateway (WebSockets)
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/unideploy /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 7. Start Services (PM2)
echo "🔥 Starting Services..."
cd /home/ubuntu/unideploy

# Start Brain
pm2 start "/home/ubuntu/unideploy/brain/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000" --name "unideploy-brain" --cwd "/home/ubuntu/unideploy/brain"

# Start Gateway
pm2 start "npm start" --name "unideploy-gateway" --cwd "/home/ubuntu/unideploy/gateway"

# Start Web (Next.js)
pm2 start "npm run dev" --name "unideploy-web" --cwd "/home/ubuntu/unideploy/web"

# Save PM2 list
pm2 save
pm2 startup

echo "✅ UniDeploy Control Plane is LIVE!"
echo "------------------------------------------------"
echo "CRITICAL: You MUST create .env files in:"
echo "1. /home/ubuntu/unideploy/brain/.env"
echo "2. /home/ubuntu/unideploy/gateway/.env"
echo "3. /home/ubuntu/unideploy/web/.env"
echo "Ensure firebase-credentials.json is in /home/ubuntu/unideploy/brain/"
echo "------------------------------------------------"
# 8. SSL Setup (Optional - Requires Domain Name)
# To enable HTTPS:
# 1. Point a domain/subdomain to this IP.
# 2. Run: sudo apt-get install -y certbot python3-certbot-nginx
# 3. Run: sudo certbot --nginx -d your-domain.com
