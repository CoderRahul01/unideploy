#!/bin/bash
set -e

echo "🧹 Cleaning Frontend Build Artifacts..."
cd web

# 1. Remove Cache
if [ -d ".next" ]; then
    echo "🗑️ Removing .next cache..."
    rm -rf .next
fi

# 2. Remove Node Modules & Lockfile
if [ -d "node_modules" ]; then
    echo "🗑️ Removing node_modules..."
    rm -rf node_modules
fi
if [ -f "package-lock.json" ]; then
    echo "🗑️ Removing package-lock.json..."
    rm package-lock.json
fi

# 3. Clean Install
echo "🧹 Cleaning npm cache..."
npm cache clean --force

echo "📦 Reinstalling Dependencies..."
npm install

echo "✅ Frontend Reset Complete."
