# UniDeploy — Agent Workspace Context

Production-readiness agent for vibe-coded apps. Brand: UniDeploy / UniDeploy.in

## Architecture (Pi agent harness monorepo)

UniDeploy's CLI uses Pi's `Agent` class from `@earendil-works/pi-agent-core` (MIT).
UniDeploy tools are `AgentTool` instances passed into the Agent's initial state.
Model resolution is handled by `@earendil-works/pi-ai`'s `getModel()`.

```
packages/
  cli/              @unideploy/cli — the core product
    src/
      cli.ts        entrypoint: creates Agent, readline REPL, model auto-detection
      tools/        UniDeploy tools (AgentTool from pi-agent-core)
        read.ts          read file
        write.ts         write/create file
        edit.ts          surgical string replacement (old_str → new_str)
        bash.ts          shell command execution with safety blocklist
        secrets-audit.ts   15 regex patterns + entropy + 11 ignore files
        rls-scan.ts        Supabase RLS / CVE-2025-48757 detection
        deploy-check.ts    pre-deploy production checklist
      skills/
        loader.ts   skill loader — searches skills/ dirs for SKILL.md files

apps/
  frontend/         Next.js dashboard (Vercel)
  backend-node/     Express gateway (port 3001)

skills/             scan knowledge as markdown (loaded via /skill: command)
  secrets/, secrets-1claw/, rls/, auth/, rate-limiting/, deploy/

docs/               Mintlify docs — DO NOT MODIFY

.pi/                Pi project config
```

## Quick start

```bash
export ANTHROPIC_API_KEY=...   # or GEMINI_API_KEY / GROQ_API_KEY / HF_TOKEN / NVIDIA_API_KEY
npx tsx packages/cli/src/cli.ts                           # interactive REPL
npx tsx packages/cli/src/cli.ts "scan this project"       # one-shot mode
npx tsx packages/cli/src/cli.ts "scan for secrets"        # secrets only
```

## How it works

`cli.ts` creates a Pi `Agent` with UniDeploy tools and a system prompt:
```typescript
import { Agent } from "@earendil-works/pi-agent-core";
import { getModel } from "@earendil-works/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: SYSTEM_PROMPT,
    model: getModel("anthropic", "claude-sonnet-4-20250514"),
    tools: [readTool, writeTool, editTool, bashTool, secretsAuditTool, rlsScanTool, deployCheckTool],
  },
});

// One-shot mode
await agent.prompt("scan this project for secrets");

// Interactive REPL
rl.on("line", async (line) => {
  await agent.prompt(line);
});
```

Model auto-detection priority: ANTHROPIC_API_KEY → GEMINI_API_KEY → GROQ_API_KEY → HF_TOKEN (or HUGGINGFACE_API_KEY) → NVIDIA_API_KEY

Configurable model overrides via: `ANTHROPIC_MODEL`, `GEMINI_MODEL`, `GROQ_MODEL`, `HF_MODEL`/`HUGGINGFACE_MODEL`, `NVIDIA_MODEL` environment variables.

## Tool API (AgentTool from @earendil-works/pi-agent-core)

```typescript
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

const schema = Type.Object({
  path: Type.String({ description: "Path to read" }),
});

export const myTool: AgentTool<typeof schema> = {
  name: "tool_name",
  label: "Human Label",
  description: "...",
  parameters: schema,
  async execute(_id, params: Static<typeof schema>) {
    const result = { ... };
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }], details: result };
  },
};
```

## Code standards (7EDGE)

- TypeScript strict mode — no `any`
- British English in user-facing strings
- Secrets: mask as `first6chars****`, never log plaintext values
- No direct push to main — PRs required

## Desktop App (apps/desktop/)

Electron Mac app — wraps the Pi agent + tools in a native `.dmg` installer.
Distribution: GitHub Releases → "Download for Mac" button on landing page.

```
apps/desktop/
  src/
    main.ts       Electron main process — spawns CLI subprocess, handles IPC
    preload.ts    contextBridge: window.uni.agent / scan / settings
    renderer/     Vite + React UI (NOT Next.js)
      App.tsx     sidebar nav: Scan | Settings
      components/
        ChatPane.tsx    streaming agent chat with quick-scan buttons
        Settings.tsx    API key storage via electron-store
      styles/globals.css  cream palette matching unideploy.in
```

Dev:  `npm run dev:desktop`
Build `.dmg`: `npm run dist:mac`

IPC handlers in main.ts:
- `agent:prompt` — spawns `npx tsx packages/cli/src/cli.ts <prompt>`, streams stdout/stderr to renderer via `agent:chunk` / `agent:tool` / `agent:done` events
- `scan:run` — same as above with scan-specific prompt + cwd
- `settings:get` / `settings:set` — electron-store; keys written to `process.env` on save so model resolution picks them up without restart

## Web Search (Tinyfish)

`webSearchTool` in `packages/cli/src/tools/web-search.ts`

Priority web search provider for the agent. Requires `TINYFISH_API_KEY`.
Endpoint: `POST https://api.tinyfish.io/search`
Used whenever the agent needs live docs, CVE details, package versions, or error message lookup.
Falls back gracefully (returns info message) if key is not set.
