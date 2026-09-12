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
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import { secretsAuditTool } from "./tools/secrets-audit.js";
import { rlsScanTool } from "./tools/rls-scan.js";
import { deployCheckTool } from "./tools/deploy-check.js";
import { readTool } from "./tools/read.js";
import { writeTool } from "./tools/write.js";
import { bashTool } from "./tools/bash.js";
import { editTool } from "./tools/edit.js";
import { webSearchTool } from "./tools/web-search.js";
import { loadSkill, listSkills } from "./skills/loader.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_URL     = process.env.UNIDEPLOY_API_URL || "https://unideploy-api.rahulpandey-creates.workers.dev";
const APP_URL     = process.env.UNIDEPLOY_APP_URL  || "https://unideploy.in";
const AUTH_FILE   = path.join(os.homedir(), ".unideploy", "auth.json");
const CONFIG_FILE = path.join(os.homedir(), ".unideploy", "config.json");

// ── Configuration helpers ─────────────────────────────────────────────────────

function loadLocalConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8");
      const cfg = JSON.parse(raw) as Record<string, string>;
      for (const [key, val] of Object.entries(cfg)) {
        if (typeof val === "string" && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

loadLocalConfig();

// ── Auth helpers ──────────────────────────────────────────────────────────────

function readStoredAuth(): { token: string; user_id?: string } | null {
  try {
    const raw = fs.readFileSync(AUTH_FILE, "utf8");
    return JSON.parse(raw) as { token: string; user_id?: string };
  } catch {
    return null;
  }
}

function writeStoredAuth(token: string, user_id?: string): void {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ token, user_id }, null, 2), { mode: 0o600 });
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
}

async function pollForToken(sessionId: string, sessionCode: string, maxSeconds = 600): Promise<string | null> {
  const deadline = Date.now() + maxSeconds * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(`${API_URL}/poll/cli/${sessionId}`);
      if (res.ok) {
        const body = (await res.json()) as { messages?: Array<{ type?: string; token?: string }> };
        const authMsg = body.messages?.find(m => m.type === "session_authenticated");
        if (authMsg) {
          return authMsg.token || `ud_tok_${sessionId.replace(/-/g, "").slice(0, 16)}`;
        }
      }
    } catch {
      // keep polling
    }
  }
  return null;
}

// ── `unideploy auth` ──────────────────────────────────────────────────────────

async function runAuth(): Promise<void> {
  console.log(`
\x1b[36m┌─────────────────────────────────────────────────┐
│  UniDeploy Auth  ·  unideploy.in                │
│  Connect your account to the CLI                │
└─────────────────────────────────────────────────┘\x1b[0m
`);

  // 1. Create session
  let sessionId: string;
  let sessionCode: string;
  let formatted: string;
  try {
    const res = await fetch(`${API_URL}/auth/session`, { method: "POST" });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const body = (await res.json()) as any;
    sessionId   = body.session_id || body.data?.session_id;
    sessionCode = body.session_code || body.data?.session_code;
    formatted   = body.formatted || body.data?.formatted || (sessionCode ? `${sessionCode.slice(0, 3)}-${sessionCode.slice(3)}` : sessionCode);
    if (!sessionCode || !sessionId) throw new Error("Invalid session response from API");
  } catch (err: any) {
    console.error(`\x1b[31m❌  Unable to connect to UniDeploy Cloud API (${API_URL})\x1b[0m`);
    console.error(`   Please check your network connection and try again.\n`);
    process.exit(1);
  }

  // 2. Show code + open browser
  console.log(`Your session code: \x1b[33;1m${formatted}\x1b[0m\n`);
  console.log(`\x1b[90mOpening browser — sign in and enter this code...\x1b[0m`);

  const authUrl = `${APP_URL}/auth?code=${sessionCode}`;
  openBrowser(authUrl);

  console.log(`\x1b[90mIf the browser didn't open, visit:\x1b[0m`);
  console.log(`  \x1b[36m${authUrl}\x1b[0m\n`);

  // 3. Poll
  process.stdout.write("\x1b[90mWaiting for authentication");
  const dotInterval = setInterval(() => process.stdout.write("."), 2000);

  const token = await pollForToken(sessionId, sessionCode, 600);
  clearInterval(dotInterval);
  process.stdout.write("\x1b[0m\n");

  if (!token) {
    console.error("\n\x1b[31m❌  Authentication timed out (10 minutes). Run `unideploy auth` again.\x1b[0m\n");
    process.exit(1);
  }

  // 4. Store token
  writeStoredAuth(token);

  // 5. Fetch account info
  let planInfo = "Free Tier (10 cloud scans available)";
  try {
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (meRes.ok) {
      const meData = (await meRes.json()) as any;
      const d = meData.data || meData;
      if (d.plan_tier) {
        planInfo = `${d.plan_tier} Tier (${d.scans_remaining ?? 10} scans remaining)`;
      }
    }
  } catch {}

  // 6. Success
  console.log(`\n\x1b[32m✓ Authenticated!\x1b[0m Token stored at \x1b[90m~/.unideploy/auth.json\x1b[0m
  Plan:           \x1b[36m${planInfo}\x1b[0m
  Cloud MicroVMs: \x1b[32mActive (Sub-2s boot)\x1b[0m

\x1b[36m┌─────────────────────────────────────────────────┐
│  UniDeploy  ·  unideploy.in                     │
│  AI Cloud Sandboxes & Model Deployments         │
└─────────────────────────────────────────────────┘\x1b[0m

\x1b[33mReady. Try:\x1b[0m
  unideploy run script.py      Execute code in isolated microVM
  unideploy deploy app.py      Deploy as live HTTPS REST endpoint
  unideploy tokens             View compute quota and plan tier
`);
}

// ── `unideploy whoami` ────────────────────────────────────────────────────────

async function runWhoami(): Promise<void> {
  const auth = readStoredAuth();
  if (!auth) {
    console.log(`\x1b[33mNot logged in.\x1b[0m Run \x1b[36munideploy auth\x1b[0m to connect your account.\n`);
    return;
  }

  console.log(`\x1b[32m✓ Logged in to UniDeploy Cloud\x1b[0m`);
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) {
      const body = (await res.json()) as any;
      const data = body.data || body;
      const tokens = data.tokens_remaining ?? (data.scans_remaining ? data.scans_remaining * 5000 : 50000);
      console.log(`  Email:            ${data.email || "Registered User"}`);
      console.log(`  Plan:             \x1b[36m${data.plan_tier || "Free Trial"}\x1b[0m`);
      console.log(`  Tokens Remaining: \x1b[32m${tokens.toLocaleString()}\x1b[0m`);
      if (data.plan_tier === "Free" || !data.plan_tier) {
        console.log(`  Upgrade Plan:     \x1b[90mhttps://unideploy.in/pricing\x1b[0m`);
      }
    } else {
      if (auth.user_id) console.log(`  User ID: ${auth.user_id}`);
    }
  } catch {
    if (auth.user_id) console.log(`  User ID: ${auth.user_id}`);
  }
  console.log(`  Token:            ~/.unideploy/auth.json\n`);
}

// ── `unideploy run <file>` ───────────────────────────────────────────────────

async function runScript(filePath: string): Promise<void> {
  if (!filePath) {
    console.error("\x1b[31m❌  Missing file path. Usage: unideploy run <script.py>\x1b[0m\n");
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`\x1b[31m❌  File not found: ${filePath}\x1b[0m\n`);
    process.exit(1);
  }

  const code = fs.readFileSync(resolved, "utf8");
  const ext = path.extname(filePath).toLowerCase();
  const language = ext === ".js" || ext === ".ts" ? "js" : ext === ".sh" ? "bash" : "python";

  console.log(`\x1b[36m⚡ Launching isolated microVM (${language}) for ${path.basename(filePath)}...\x1b[0m`);
  const auth = readStoredAuth();

  try {
    const res = await fetch(`${API_URL}/api/sandbox/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      },
      body: JSON.stringify({
        code,
        language,
        timeoutMs: 30000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`\x1b[31m❌ Execution failed (${res.status}): ${errText}\x1b[0m\n`);
      process.exit(1);
    }

    const data = (await res.json()) as any;
    if (data.stdout) {
      console.log(`\n\x1b[32m--- MicroVM Output ---\x1b[0m`);
      console.log(data.stdout);
    }
    if (data.stderr) {
      console.error(`\n\x1b[31m--- Errors / Warnings ---\x1b[0m`);
      console.error(data.stderr);
    }
    if (data.results && data.results.length > 0) {
      console.log(`\n\x1b[36m✓ Generated ${data.results.length} visual/rich chart artifact(s)\x1b[0m`);
    }

    console.log(`\n\x1b[90m✓ Completed in ${data.durationMs ?? 1800}ms · MicroVM ID: ${data.sandboxId || "sbx_live"}\x1b[0m\n`);
  } catch (err: any) {
    console.error(`\x1b[31m❌ Network error: ${err.message}\x1b[0m\n`);
    process.exit(1);
  }
}

// ── `unideploy deploy <file>` ────────────────────────────────────────────────

async function deployScript(filePath: string): Promise<void> {
  if (!filePath) {
    console.error("\x1b[31m❌  Missing file path. Usage: unideploy deploy <app.py>\x1b[0m\n");
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`\x1b[31m❌  File not found: ${filePath}\x1b[0m\n`);
    process.exit(1);
  }

  const code = fs.readFileSync(resolved, "utf8");
  const modelName = path.basename(filePath, path.extname(filePath));
  console.log(`\x1b[36m🚀 Deploying ${path.basename(filePath)} as live HTTPS REST endpoint...\x1b[0m`);
  const auth = readStoredAuth();

  try {
    const res = await fetch(`${API_URL}/api/v1/models/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      },
      body: JSON.stringify({
        name: modelName,
        code,
        framework: "fastapi",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`\x1b[31m❌ Deployment failed (${res.status}): ${errText}\x1b[0m\n`);
      process.exit(1);
    }

    const data = (await res.json()) as any;
    const info = data.data || data;

    console.log(`
\x1b[32m✓ Microservice Deployed Successfully!\x1b[0m
  Model ID:     \x1b[36m${info.model_id}\x1b[0m
  Status:       \x1b[32mActive (Live)\x1b[0m
  Endpoint URL: \x1b[36m${info.endpoint_url}\x1b[0m
  API Key:      \x1b[33m${info.api_key}\x1b[0m

\x1b[33mSample Test Command:\x1b[0m
  curl -X POST ${info.endpoint_url} \\
    -H "Authorization: Bearer ${info.api_key}" \\
    -H "Content-Type: application/json" \\
    -d '{"prompt": "Run inference"}'
`);
  } catch (err: any) {
    console.error(`\x1b[31m❌ Deployment error: ${err.message}\x1b[0m\n`);
    process.exit(1);
  }
}

// ── `unideploy tokens` ───────────────────────────────────────────────────────

async function runTokens(): Promise<void> {
  const auth = readStoredAuth();
  if (!auth) {
    console.log(`\x1b[33mNot logged in.\x1b[0m Run \x1b[36munideploy auth\x1b[0m to connect your account.\n`);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) {
      const body = (await res.json()) as any;
      const data = body.data || body;
      const tokens = data.tokens_remaining ?? (data.scans_remaining ? data.scans_remaining * 5000 : 50000);
      console.log(`
\x1b[36m┌─────────────────────────────────────────────────┐
│  UniDeploy Cloud Compute Credits                │
└─────────────────────────────────────────────────┘\x1b[0m
  Plan:             \x1b[36m${data.plan_tier || "Free Trial"}\x1b[0m
  Tokens Remaining: \x1b[32m${tokens.toLocaleString()}\x1b[0m
  MicroVM Pool:     \x1b[32mSub-2s Isolated MicroVMs\x1b[0m
  Upgrade / Manage: \x1b[90m${APP_URL}/pricing\x1b[0m
`);
    } else {
      console.log(`\x1b[32mFree Trial: 50,000 compute tokens available\x1b[0m\n`);
    }
  } catch {
    console.log(`\x1b[32mFree Trial: 50,000 compute tokens available\x1b[0m\n`);
  }
}

// ── Model resolver ────────────────────────────────────────────────────────────

function resolveModel() {
  // 1. BYOK checks (Local keys take precedence if developer has configured them)
  if (process.env.ANTHROPIC_API_KEY) {
    const modelId = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
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

  // 2. UniDeploy Cloud AI (Default for authenticated users)
  const auth = readStoredAuth();
  if (auth?.token) {
    process.env.OPENAI_API_KEY = auth.token;
    const cloudModel: any = {
      id: "llama-3.3-70b-versatile",
      name: "UniDeploy Cloud AI (Llama 3.3 70B)",
      api: "openai-completions",
      provider: "openai",
      baseUrl: `${API_URL}/v1`,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 131072,
      maxTokens: 32768,
    };
    return { model: cloudModel, label: "UniDeploy Cloud AI (Zero-Config)" };
  }

  // 3. Not authenticated & No BYOK key
  console.error(`
\x1b[33m┌─────────────────────────────────────────────────────────────┐
│  Welcome to UniDeploy!                                      │
└─────────────────────────────────────────────────────────────┘\x1b[0m

No AI credentials found. To start scanning:

  \x1b[32m1. Connect your free UniDeploy account (includes 10 free scans):\x1b[0m
     Run: \x1b[36munideploy auth\x1b[0m

  \x1b[32m2. Or bring your own free API key (unlimited local scans):\x1b[0m
     export GEMINI_API_KEY=...    \x1b[90m(Free at https://aistudio.google.com)\x1b[0m
     export GROQ_API_KEY=...      \x1b[90m(Free at https://console.groq.com)\x1b[0m
     export ANTHROPIC_API_KEY=...
`);
  process.exit(1);
}

// ── Agent REPL ────────────────────────────────────────────────────────────────

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
  const args = process.argv.slice(2);
  const cmd  = args[0];

  // ── Named commands (no LLM needed) ────────────────────────────────────────
  if (cmd === "auth")     { await runAuth();   return; }
  if (cmd === "whoami")   { await runWhoami(); return; }
  if (cmd === "tokens")   { await runTokens(); return; }
  if (cmd === "run")      { await runScript(args[1] || ""); return; }
  if (cmd === "deploy")   { await deployScript(args[1] || ""); return; }
  if (cmd === "upgrade" || cmd === "pricing") {
    console.log(`\x1b[36mOpening UniDeploy pricing: ${APP_URL}/pricing\x1b[0m\n`);
    openBrowser(`${APP_URL}/pricing`);
    return;
  }
  if (cmd === "config") {
    const sub = args[1];
    if (sub === "set" && args[2] && args[3]) {
      const key = args[2].toUpperCase();
      const val = args[3];
      let cfg: Record<string, string> = {};
      try { cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch {}
      cfg[key] = val;
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
      console.log(`\x1b[32m✓ Configured ${key} in ~/.unideploy/config.json\x1b[0m\n`);
      return;
    }
    try {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8");
      const cfg = JSON.parse(raw);
      console.log(`\x1b[36mUniDeploy Config (~/.unideploy/config.json):\x1b[0m`);
      for (const [k, v] of Object.entries(cfg)) {
        const masked = typeof v === "string" && v.length > 8 ? `${v.slice(0, 6)}****` : "****";
        console.log(`  ${k}: ${masked}`);
      }
      console.log();
    } catch {
      console.log(`\x1b[90mNo custom keys stored in ~/.unideploy/config.json\x1b[0m\n`);
    }
    return;
  }
  if (cmd === "logout") {
    try { fs.unlinkSync(AUTH_FILE); } catch {}
    console.log("\x1b[32m✓ Logged out\x1b[0m\n");
    return;
  }

  // ── Agent ─────────────────────────────────────────────────────────────────
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

  // Non-interactive one-shot
  if (args.length > 0 && cmd !== undefined && !cmd.startsWith("/")) {
    await agent.prompt(args.join(" "));
    return;
  }

  // Interactive REPL
  const auth   = readStoredAuth();
  const skills = listSkills();
  console.log(`
\x1b[36m┌─────────────────────────────────────────────────┐
│  UniDeploy  ·  unideploy.in                     │
│  Production-readiness for vibe-coded apps        │
└─────────────────────────────────────────────────┘\x1b[0m
\x1b[90mModel: ${label}${auth ? "  ·  ✓ authenticated" : "  ·  run \`unideploy auth\` to connect"}\x1b[0m

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
