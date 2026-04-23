#!/bin/bash

echo "🚀 Starting deep cleanup of Unideploy local artifacts..."

# Function to remove if exists
cleanup() {
    if [ -d "$1" ]; then
        echo "Removing $1..."
        rm -rf "$1"
    fi
    if [ -f "$1" ]; then
        echo "Removing $1..."
        rm -f "$1"
    fi
}

# Root
cleanup "node_modules"
cleanup "package-lock.json"

# Backend
cleanup "apps/backend/node_modules"
cleanup "apps/backend/venv"
cleanup "apps/backend/__pycache__"
cleanup "apps/backend/.pytest_cache"
cleanup "apps/backend/test_unideploy.db"

# Frontend
cleanup "apps/frontend/node_modules"
cleanup "apps/frontend/package-lock.json"
cleanup "apps/frontend/.next"
cleanup "apps/frontend/out"

# Gateway
cleanup "apps/gateway/node_modules"
cleanup "apps/gateway/package-lock.json"

echo "✨ Cleanup complete! Your computer is now free of local bloat."
echo "Use 'docker-compose up --build' to run the project in a contained, resource-limited environment."
