#!/usr/bin/env bash
# UniDeploy Installer (vibe-coder onboarding)

set -e

echo "========================================="
echo "🚀 Installing UniDeploy CLI..."
echo "========================================="

# The actual tool is distributed via npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    echo "Please install Node.js and try again."
    exit 1
fi

npm install -g unideploy

echo ""
echo "✅ Installed successfully!"
echo "Run the following command in your project directory to scan:"
echo ""
echo "  unideploy init"
echo ""
