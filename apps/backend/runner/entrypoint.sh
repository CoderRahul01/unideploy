#!/bin/bash
set -e

echo "[Runner] Starting UniDeploy Sandbox..."
echo "[Runner] Repo: $REPO_URL"

# Clone if repo is provided
if [ ! -z "$REPO_URL" ]; then
    echo "[Runner] Cloning repository..."
    # Clean directory just in case
    rm -rf *
    git clone $REPO_URL .
fi

# Build
if [ ! -z "$BUILD_COMMAND" ]; then
    echo "[Runner] Executing Build: $BUILD_COMMAND"
    eval "$BUILD_COMMAND"
else
    echo "[Runner] No build command provided."
fi

# Start
if [ ! -z "$START_COMMAND" ]; then
    echo "[Runner] Executing Start: $START_COMMAND"
    eval "$START_COMMAND"
else
    echo "[Runner] No start command provided. Sleeper mode."
    # Loop to keep container alive for debugging if needed
    tail -f /dev/null
fi
