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
export ANTHROPIC_API_KEY=...   # or GEMINI_API_KEY / GROQ_API_KEY
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

Model auto-detection priority: ANTHROPIC_API_KEY → GEMINI_API_KEY → GROQ_API_KEY

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
