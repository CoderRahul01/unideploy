# UniDeploy macOS Desktop App (`apps/desktop`)

**Native macOS Application for 1-Click Cloud Sandboxes & AI Model Deployments**

[![Electron](https://img.shields.io/badge/Electron-33.2.1-47848F.svg?logo=electron)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1.0-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

The official native macOS desktop application for [unideploy.in](https://www.unideploy.in), packaged as `UniDeploy-arm64.dmg` (Apple Silicon) and `UniDeploy-x64.dmg` (Intel).

---

## 🍏 Overview

The UniDeploy desktop app brings cloud compute sandboxes directly into your macOS workflow:
- **Dock-Accessible MicroVM Launcher**: Launch Firecracker cloud sandboxes in under 2 seconds without opening a browser.
- **Model Endpoint Manager**: View all deployed Python microservices, inspect live endpoint URLs, and copy or rotate API keys.
- **Compute Token Meter**: Live token usage tracking with remaining compute hours.
- **Seamless Device Authentication**: Pair the desktop app to your `unideploy.in` account using standard 6-character device pairing.

---

## 🛠️ Architecture

- **Main Process (`src/main.ts`)**: Electron host managing system menus, window lifecycles, and persistent settings (`electron-store`).
- **Preload Script (`src/preload.ts`)**: Secure context bridge exposing IPC channels to the renderer.
- **Renderer Process (`src/renderer/`)**: Fast, responsive React UI bundled with Vite.

---

## 💻 Local Development

```bash
# Run both Vite dev server and Electron in watch mode
npm run dev --workspace=apps/desktop

# Or navigate to apps/desktop directly
npm run dev
```

---

## 📦 Building `.dmg` Distribution Packages

```bash
# Build TypeScript and bundle with electron-builder
npm run dist:mac --workspace=apps/desktop
```

Artifacts are output to `apps/desktop/dist/`:
- `UniDeploy-arm64.dmg` — Apple Silicon (M1, M2, M3, M4)
- `UniDeploy-x64.dmg` — Intel Mac architecture
