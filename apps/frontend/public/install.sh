#!/usr/bin/env bash
# UniDeploy CLI Installer (macOS & Linux)
# Usage: curl -fsSL https://unideploy.in/install.sh | bash

set -e

OWNER="rahulpandey535"
REPO="unideploy"
BINARY_NAME="unideploy"
INSTALL_DIR="/usr/local/bin"

OS="$(uname -s)"
ARCH="$(uname -m)"

if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
  ASSET_NAME="cli-arm64"
elif [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "amd64" ]; then
  ASSET_NAME="cli-x64"
else
  echo -e "\033[31m❌ Unsupported CPU architecture: $ARCH\033[0m"
  exit 1
fi

DOWNLOAD_URL="https://github.com/$OWNER/$REPO/releases/latest/download/$ASSET_NAME"

echo -e "\033[36m┌─────────────────────────────────────────────────┐\033[0m"
echo -e "\033[36m│  UniDeploy CLI Installer                        │\033[0m"
echo -e "\033[36m└─────────────────────────────────────────────────┘\033[0m"
echo ""
echo "Detecting environment..."
echo "  OS:           $OS"
echo "  Architecture: $ARCH"
echo "  Target:       $ASSET_NAME"
echo ""

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Downloading latest UniDeploy binary..."
if curl -sL --fail -o "$TEMP_DIR/unideploy" "$DOWNLOAD_URL"; then
  echo "Download successful."
  chmod +x "$TEMP_DIR/unideploy"
  echo "Installing binary to $INSTALL_DIR/unideploy..."
  if [ -w "$INSTALL_DIR" ]; then
    mv "$TEMP_DIR/unideploy" "$INSTALL_DIR/unideploy"
  else
    sudo mv "$TEMP_DIR/unideploy" "$INSTALL_DIR/unideploy"
  fi
else
  echo "Binary asset unavailable, falling back to npm package..."
  if command -v npm >/dev/null 2>&1; then
    npm install -g @unideploy/cli
  else
    echo -e "\033[31m❌ Could not download binary and npm is not installed.\033[0m"
    exit 1
  fi
fi

echo ""
echo -e "\033[32m✓ UniDeploy installed successfully!\033[0m"
echo ""
echo "Verify installation by running:"
echo "  unideploy --version"
echo ""
echo "Connect to your account & Cloudflare server:"
echo "  unideploy auth"
echo ""
