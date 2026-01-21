#!/bin/bash

# UniDeploy "One-Click" Local Start Script

# Function to kill all background processes on exit (Ctrl+C)
trap "kill 0" EXIT

echo "🚀 Starting UniDeploy Local Stack..."
echo "======================================"

# 1. Gateway (Node.js)
# We start this early as it's lightweight
echo "🔌 [Gateway] Checking setup..."
cd apps/gateway
if [ ! -d "node_modules" ]; then
    echo "📦 [Gateway] Installing dependencies..."
    npm install
fi
# Fix for missing nodemon if generic install fails or glob issues
if [ ! -f "node_modules/.bin/nodemon" ]; then
     echo "⚠️ [Gateway] Nodemon missing, reinstalling..."
     npm install
fi
echo "🔌 [Gateway] Starting on port 3001..."
npm run dev &
cd ..

# 2. Brain (Python)
echo "🧠 [Brain] Checking setup..."
cd apps/backend
# Check for venv
if [ ! -d "venv" ]; then
    echo "🐍 [Brain] Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "📦 [Brain] Installing requirements..."
pip install -r requirements.txt
echo "🧠 [Brain] Starting on port 8000..."
uvicorn main:app --reload --reload-exclude "temp/*" --port 8000 &
cd ..

# 3. Web (Next.js)
echo "🌐 [Web] Checking setup..."
cd apps/frontend
if [ ! -d "node_modules" ]; then
    echo "📦 [Web] Installing dependencies..."
    npm install
fi
echo "🌐 [Web] Starting on port 3000..."
npm run dev &
cd ..

echo "======================================"
echo "✅ All services starting..."
echo "👉 Web: http://localhost:3000"
echo "👉 Brain: http://localhost:8000/docs"
echo "👉 Gateway: http://localhost:3001"
echo "PRESS CTRL+C TO STOP ALL SERVICES"
echo "======================================"

wait
