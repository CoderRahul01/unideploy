import { NextResponse } from "next/server";

export async function GET() {
  const scriptContent = `#!/bin/bash
# UniDeploy CLI Installer
# Usage: curl -fsSL https://unideploy.in/install.sh | bash

set -e

# Define variables
OWNER="rahulpandey535"
REPO="unideploy"
BINARY_NAME="unideploy"
INSTALL_DIR="/usr/local/bin"

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

if [ "$OS" != "Darwin" ]; then
  echo -e "\\033[31m❌ UniDeploy CLI currently only supports macOS (Darwin).\\033[0m"
  echo "Support for Linux and Windows (WSL) is coming soon."
  exit 1
fi

if [ "$ARCH" = "arm64" ]; then
  ASSET_NAME="cli-arm64"
elif [ "$ARCH" = "x86_64" ]; then
  ASSET_NAME="cli-x64"
else
  echo -e "\\033[31m❌ Unsupported CPU architecture: $ARCH\\033[0m"
  exit 1
fi

DOWNLOAD_URL="https://github.com/$OWNER/$REPO/releases/latest/download/$ASSET_NAME"

echo -e "\\033[36m┌─────────────────────────────────────────────────┐\\033[0m"
echo -e "\\033[36m│  UniDeploy CLI Installer                        │\\033[0m"
echo -e "\\033[36m└─────────────────────────────────────────────────┘\\033[0m"
echo ""
echo "Detecting environment..."
echo "  OS:           $OS"
echo "  Architecture: $ARCH"
echo "  Target:       $ASSET_NAME"
echo ""

# Create temporary directory
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Downloading latest UniDeploy binary..."
if curl -sL --fail -o "$TEMP_DIR/unideploy" "$DOWNLOAD_URL"; then
  echo "Download successful."
else
  echo -e "\\033[31m❌ Failed to download binary from $DOWNLOAD_URL\\033[0m"
  echo "Please check your internet connection or verify the latest release exists."
  exit 1
fi

chmod +x "$TEMP_DIR/unideploy"

echo "Installing binary to $INSTALL_DIR/unideploy..."
echo "Note: This step may require sudo privileges."

# Check if we have write access to INSTALL_DIR
if [ -w "$INSTALL_DIR" ]; then
  mv "$TEMP_DIR/unideploy" "$INSTALL_DIR/unideploy"
else
  sudo mv "$TEMP_DIR/unideploy" "$INSTALL_DIR/unideploy"
fi

echo ""
echo -e "\\033[32m✓ UniDeploy CLI installed successfully!\\033[0m"
echo ""
echo "Verify installation by running:"
echo "  \\033[36munideploy --version\\033[0m"
echo ""
echo "Get started by authenticating:"
echo "  \\033[36munideploy auth\\033[0m"
echo ""
`;

  return new NextResponse(scriptContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
