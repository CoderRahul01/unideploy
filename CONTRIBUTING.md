# Contributing to UniDeploy

First off, thank you for considering contributing to UniDeploy! 🚀

UniDeploy is an **AI Cloud Sandbox & Model Deployment Platform** built for developers, data scientists, and AI agents. We welcome issues, documentation improvements, and pull requests from everyone.

---

## 🏗️ Monorepo Structure

UniDeploy uses npm workspaces. The codebase is organized as follows:

```
unideploy/
├── apps/
│   ├── frontend/         # Next.js 16 web platform, sandbox studio & dashboard (Vercel)
│   ├── worker/           # Cloudflare Worker edge gateway, AI proxy & D1/KV storage
│   ├── desktop/          # Native macOS desktop app (.dmg) built with Electron + Vite
│   └── mcp/              # Model Context Protocol (MCP) server for Claude Code & Cursor
│
├── packages/
│   ├── cli/              # @unideploy/cli — published as 'unideploy' on npm
│   ├── ai/               # Unified multi-provider LLM engine (@earendil-works/pi-ai)
│   └── agent/            # Stateful agent harness with streaming (@earendil-works/pi-agent-core)
│
├── docs/                 # Platform architecture, specifications, and deployment guides
├── product.md            # Master product specification document
└── LICENSE.md            # PolyForm Noncommercial 1.0.0 license
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: `>= 22.19.0`
- **npm**: `>= 10.0.0`
- **Git**

### Installation

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/CoderRahul01/unideploy.git
   cd unideploy
   ```

2. Install dependencies across all monorepo workspaces:
   ```bash
   npm install
   ```

3. Verify the build and typechecks:
   ```bash
   npm run check
   ```

---

## 💻 Workspace Development

### CLI (`packages/cli`)
```bash
# Run CLI directly using tsx
npm run dev

# Run targeted CLI typechecks
npm run typecheck:cli

# Build production bundle
npm run build --workspace=packages/cli
```

### Web Platform (`apps/frontend`)
```bash
# Start Next.js development server with Turbopack
npm run dev:frontend
```
Open [http://localhost:3000](http://localhost:3000) to view the web studio and marketplace.

### Edge API Gateway (`apps/worker`)
```bash
# Start local Cloudflare Worker with Wrangler
npm run dev:worker

# Run targeted Worker typechecks
npm run typecheck:worker
```

### macOS Desktop App (`apps/desktop`)
```bash
# Launch Electron + Vite development window
npm run dev:desktop

# Build macOS .dmg distribution bundles
npm run build:desktop
```

---

## 📐 7EDGE Code Standards

To keep the codebase maintainable, fast, and reliable, all contributions must respect our core engineering standards:

1. **TypeScript Strict Mode**: Zero `any` types permitted. Explicitly type all return values, parameters, and API responses.
2. **British English**: All user-facing strings, comments, and documentation must use British English spelling (e.g. *optimised*, *visualisation*, *prioritise*, *behaviour*).
3. **Actionable Error Messaging**: Error messages must clearly state what went wrong and provide the next step or command to resolve it.
4. **Git Discipline**:
   - Never push directly to `main`.
   - Create feature or bugfix branches (e.g. `feat/new-template`, `fix/cli-token-refresh`).
   - Open a pull request and ensure CI passes.

---

## 🧪 Validating Your Changes

Before submitting a pull request, run the complete verification suite locally:

```bash
# Must exit with code 0
npm run check
```

---

## 🤝 Community & Support

Have questions or need guidance?
- Open a GitHub Discussion or Issue.
- Reach out to the maintainers at [support@unideploy.in](mailto:support@unideploy.in).
