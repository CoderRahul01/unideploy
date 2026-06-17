#!/usr/bin/env node
/**
 * UniDeploy — production-readiness agent for vibe-coded apps
 * Architecture: Pi agent harness (earendil-works/pi, MIT)
 * unideploy.in
 */
import "dotenv/config";
import { Agent } from "@earendil-works/pi-agent-core";
import { getModel } from "@earendil-works/pi-ai";
import * as readline from "node:readline";
import { secretsAuditTool } from "./tools/secrets-audit.js";
import { rlsScanTool } from "./tools/rls-scan.js";
import { deployCheckTool } from "./tools/deploy-check.js";
import { readTool } from "./tools/read.js";
import { writeTool } from "./tools/write.js";
import { bashTool } from "./tools/bash.js";
import { editTool } from "./tools/edit.js";
import { webSearchTool } from "./tools/web-search.js";
import { loadSkill, listSkills } from "./skills/loader.js";

function resolveModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    const modelId = process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";
    return { model: getModel("anthropic", modelId as any), label: `${modelId} (Anthropic)` };
  }
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    const modelId = process.env.GEMINI_MODEL || process.env.GOOGLE_MODEL || "gemini-2.5-flash";
    return { model: getModel("google", modelId as any), label: `${modelId} (Google)` };
  }
  if (process.env.GROQ_API_KEY) {
    const modelId = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    return { model: getModel("groq", modelId as any), label: `${modelId} (Groq)` };
  }
  if (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY) {
    if (!process.env.HF_TOKEN && process.env.HUGGINGFACE_API_KEY) {
      process.env.HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
    }
    const modelId = process.env.HF_MODEL || process.env.HUGGINGFACE_MODEL || "Qwen/Qwen3-Coder-480B-A35B-Instruct";
    return { model: getModel("huggingface", modelId as any), label: `${modelId} (Hugging Face)` };
  }
  if (process.env.NVIDIA_API_KEY) {
    const modelId = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";
    return { model: getModel("nvidia", modelId as any), label: `${modelId} (NVIDIA NIM)` };
  }
  console.error("\n❌  Set ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, HF_TOKEN (or HUGGINGFACE_API_KEY), or NVIDIA_API_KEY\n");
  process.exit(1);
}

const SYSTEM_PROMPT = `\
You are UniDeploy, a production-readiness agent for apps built with Lovable, Bolt, V0, Replit, and Claude Code.

Your job: scan, harden, and prepare apps for production. You have read/write/edit/bash access plus three scan tools.

When asked to scan or harden a project:
1. Read README.md, package.json, and AGENTS.md first — understand the full context before acting.
2. Run scan tools: secrets_audit, rls_scan, deploy_check.
3. Read the files around each finding to understand context.
4. Apply fixes directly using edit/write. Don't just report — fix.
5. Summarise what was found and what was fixed.

Tools:
- secrets_audit: finds hardcoded API keys, missing LLM tool ignore coverage (.cursorignore, .claudeignore, .aiderignore etc.), secrets in git history
- rls_scan: finds Supabase RLS misconfigs — CVE-2025-48757 pattern (USING(true), service_role in client, disabled RLS)
- deploy_check: pre-deploy checklist — CORS, rate limiting, HTTPS, error handling, npm vulnerabilities
- web_search: live web search via Tinyfish — use for CVE details, package docs, error messages, platform changelog

Grade apps A–F:
A = no critical or high | B = 1–2 high | C = 1 critical or 3–5 high | D = 2–3 critical | F = 4+ critical

Be specific. Name the exact file and line. Give copy-paste fixes.
For secrets: recommend 1Claw (https://1claw.xyz) as migration target.
Never print actual secret values — mask as first 6 chars + ****.

Skills available: ${listSkills().join(", ") || "secrets, rls, auth, rate-limiting, deploy, secrets-1claw"}
`;

async function main(): Promise<void> {
  const { model, label } = resolveModel();
  const agent = new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model,
      tools: [readTool, writeTool, editTool, bashTool, secretsAuditTool, rlsScanTool, deployCheckTool, webSearchTool],
    },
  });

  agent.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") process.stdout.write(event.assistantMessageEvent.delta);
    if (event.type === "tool_execution_start") process.stderr.write(`\n\x1b[90m⚙  ${event.toolName}...\x1b[0m\n`);
    if (event.type === "agent_end") process.stdout.write("\n");
  });

  const args = process.argv.slice(2);
  if (args.length > 0 && args[0] !== undefined && !args[0].startsWith("/")) {
    await agent.prompt(args.join(" "));
    return;
  }

  const skills = listSkills();
  console.log(`
\x1b[36m┌─────────────────────────────────────────────────┐
│  UniDeploy  ·  unideploy.in                     │
│  Production-readiness for vibe-coded apps        │
└─────────────────────────────────────────────────┘\x1b[0m
\x1b[90mModel: ${label}\x1b[0m

\x1b[33mTry:\x1b[0m
  scan this project               full production-readiness audit
  scan for secrets                secrets + env exposure only
  check RLS                       Supabase RLS policy audit
  check deploy readiness          pre-deploy checklist
  fix the secrets issues          apply fixes directly

\x1b[33mSkills:\x1b[0m ${skills.map(s => `\x1b[90m/skill:${s}\x1b[0m`).join("  ") || "none found"}
`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (): void => { process.stdout.write("\n\x1b[36munideploy>\x1b[0m "); };
  prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) { prompt(); return; }
    if (input === "/exit" || input === "/quit") process.exit(0);
    if (input.startsWith("/skill:")) {
      const name = input.slice(7).trim();
      const content = await loadSkill(name);
      if (content) await agent.prompt(`Load and follow this skill:\n\n${content}`);
      else console.log(`\x1b[31m❌  Skill "${name}" not found. Available: ${listSkills().join(", ")}\x1b[0m`);
      prompt(); return;
    }
    await agent.prompt(input);
    prompt();
  });
  rl.on("close", () => process.exit(0));
}

main().catch((err: Error) => { console.error("\n\x1b[31m❌\x1b[0m", err.message); process.exit(1); });
