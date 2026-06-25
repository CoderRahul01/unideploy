#!/bin/bash
set -e

# Go to the CLI package directory
cd "$(dirname "$0")/.."

echo "Building the CLI TypeScript..."
npm run build

echo "Packaging with pkg..."
# Use Node 18 to maximize compatibility and avoid bytecode errors
npx pkg . --targets node18-macos-arm64,node18-macos-x64 --out-path dist/bin

echo "Setting up DMG source folder..."
rm -rf dist/dmg-arm64 dist/dmg-x64
mkdir -p dist/dmg-arm64
mkdir -p dist/dmg-x64

cp dist/bin/cli-arm64 dist/dmg-arm64/unideploy
cp dist/bin/cli-x64 dist/dmg-x64/unideploy

# Create appdmg configurations
cat <<EOF > dist/appdmg-arm64.json
{
  "title": "UniDeploy (Apple Silicon)",
  "icon": "../../../unideploy_diamond_logo_system.svg",
  "contents": [
    { "x": 192, "y": 344, "type": "file", "path": "dmg-arm64/unideploy" }
  ]
}
EOF

cat <<EOF > dist/appdmg-x64.json
{
  "title": "UniDeploy (Intel)",
  "icon": "../../../unideploy_diamond_logo_system.svg",
  "contents": [
    { "x": 192, "y": 344, "type": "file", "path": "dmg-x64/unideploy" }
  ]
}
EOF

echo "Creating DMGs..."
rm -f dist/UniDeploy-arm64.dmg dist/UniDeploy-x64.dmg
npx appdmg dist/appdmg-arm64.json dist/UniDeploy-arm64.dmg
npx appdmg dist/appdmg-x64.json dist/UniDeploy-x64.dmg

echo "Done! DMGs are located in packages/cli/dist/"
