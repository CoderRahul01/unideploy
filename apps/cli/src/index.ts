#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import WebSocket from "ws";
import os from "os";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const API_URL = process.env.UNIDEPLOY_API_URL || "https://unideploy-api-4b25n74mbq-uc.a.run.app";
const LOCAL_URL = "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Finding {
  id: string;
  file_path: string;
  line_number: number | null;
  severity: "critical" | "high" | "medium" | "low";
  category: "secrets" | "auth" | "rls" | "cors" | "rate_limiting" |
            "input_validation" | "dependency" | "error_handling" | "other";
  title: string;
  description: string;
  fix_guideline: string;
  evidence: string;
  auto_fixable: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(s: string): string {
  if (s === "critical") return chalk.red.bold("[CRITICAL]");
  if (s === "high")     return chalk.yellow.bold("[HIGH]    ");
  if (s === "medium")   return chalk.white("[MEDIUM]  ");
  return chalk.gray("[LOW]     ");
}

function gradeColor(g: string): string {
  if (g === "A") return chalk.green.bold(g);
  if (g === "B") return chalk.greenBright.bold(g);
  if (g === "C") return chalk.yellow.bold(g);
  if (g === "D") return chalk.yellowBright.bold(g);
  return chalk.red.bold(g);
}

async function apiFetch(url: string, opts: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text);
  }
  return res.json();
}

// ── Grade calculation (mirrors backend spec) ──────────────────────────────────

function computeGrade(findings: Finding[]): "A" | "B" | "C" | "D" | "F" {
  const critical = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;
  const medium = findings.filter(f => f.severity === "medium").length;
  if (critical >= 1) return "F";
  if (high >= 3) return "D";
  if (high >= 1 || medium >= 5) return "C";
  if (medium > 0) return "B";
  return "A";
}

// ── File collection ───────────────────────────────────────────────────────────

const SCAN_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".json", ".toml",
  ".yaml", ".yml", ".sql", ".sh", ".go", ".rb", ".java", ".kt", ".rs",
]);
const SCAN_BASENAMES = new Set([
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  ".env.example", ".env.template", "next.config.js", "next.config.ts",
  "next.config.mjs", "vite.config.ts", "vite.config.js",
  ".gitignore", ".unideployignore", "requirements.txt", "Pipfile",
]);
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", ".next", "__pycache__",
  "venv", ".venv", "build", "coverage", ".turbo", ".cache", ".vercel",
  "vendor", ".adk", "site-packages", "eggs",
]);
const SKIP_FILES = new Set([".env", ".env.local", ".env.production", ".env.development"]);

function loadIgnorePatterns(root: string): string[] {
  const patterns: string[] = [];
  for (const name of [".gitignore", ".unideployignore"]) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) {
      fs.readFileSync(p, "utf-8").split("\n").forEach(line => {
        const t = line.trim();
        // Skip blank lines, comments, and glob patterns we can't safely evaluate
        if (!t || t.startsWith("#") || t.includes("*") || t.includes("?") || t.includes("{")) return;
        patterns.push(t);
      });
    }
  }
  return patterns;
}

function isIgnored(rel: string, patterns: string[]): boolean {
  const normalRel = rel.replace(/\\/g, "/");
  const parts = normalRel.split("/");
  return patterns.some(p => {
    const name = p.replace(/^\//, "").replace(/\/$/, "");
    if (!name) return false;
    // Pattern with slash: match as path prefix only
    if (name.includes("/")) {
      return normalRel === name || normalRel.startsWith(name + "/");
    }
    // Simple name: match any path segment (directory name or filename)
    return parts.includes(name);
  });
}

function collectFiles(root: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const ignorePatterns = loadIgnorePatterns(root);

  function walk(dir: string) {
    let entries: string[];
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = path.join(dir, entry);
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (isIgnored(rel, ignorePatterns)) continue;
      let stat: fs.Stats;
      try { stat = fs.statSync(full, { bigint: false }); } catch { continue; }
      // Skip symlinks — they can point to network paths that ETIMEDOUT
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) { walk(full); continue; }
      if (SKIP_FILES.has(path.basename(full))) continue;
      if (!SCAN_EXTENSIONS.has(path.extname(entry)) && !SCAN_BASENAMES.has(entry)) continue;
      if (stat.size > 100_000) continue;
      const content = safeReadFile(full);
      if (content) files.push({ path: rel, content });
    }
  }
  walk(root);
  return files;
}

function safeReadFile(p: string): string {
  try { return fs.readFileSync(p, "utf-8"); } catch { return ""; }
}

function safeIsFile(p: string): boolean {
  try { return fs.statSync(p, { bigint: false }).isFile(); } catch { return false; }
}

function safeIsDir(p: string): boolean {
  try { return fs.statSync(p, { bigint: false }).isDirectory(); } catch { return false; }
}

function detectFramework(root: string): string {
  // Search root and one level of subdirectories for framework files
  const searchDirs = [root];
  try {
    for (const entry of fs.readdirSync(root)) {
      if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
      const full = path.join(root, entry);
      if (safeIsDir(full)) searchDirs.push(full);
    }
  } catch { /* skip */ }

  for (const dir of searchDirs) {
    const pkg = path.join(dir, "package.json");
    if (safeIsFile(pkg)) {
      try {
        const raw = JSON.parse(safeReadFile(pkg));
        const deps = { ...raw.dependencies ?? {}, ...raw.devDependencies ?? {} };
        if (deps["next"]) return "Next.js";
        if (deps["@nestjs/core"]) return "NestJS";
        if (deps["express"]) return "Express";
        if (deps["fastify"]) return "Fastify";
        if (Object.keys(deps).length > 0) return "Node.js";
      } catch { /* try next */ }
    }
  }

  for (const dir of searchDirs) {
    const req = path.join(dir, "requirements.txt");
    const pyproj = path.join(dir, "pyproject.toml");
    try {
      if (safeIsFile(req)) {
        const c = safeReadFile(req).toLowerCase();
        if (c.includes("fastapi")) return "FastAPI";
        if (c.includes("django")) return "Django";
        if (c.includes("flask")) return "Flask";
        if (c.length > 0) return "Python";
      }
      if (safeIsFile(pyproj)) return "Python";
    } catch { /* try next */ }
  }

  return "Unknown";
}

// ── Local security heuristics ─────────────────────────────────────────────────

const SECRET_PATTERNS = [
  /stripe_live_[a-zA-Z0-9_]+/,
  /sk-proj-[a-zA-Z0-9_-]+/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/,
  /AIza[0-9A-Za-z_-]{35}/,
];
const SECRET_NAMES = ["key", "secret", "token", "password"];
const API_ROUTE_DIRS = ["pages/api", "app/api", "routes", "controllers", "routers"];
const IS_API_ROUTE = (p: string) =>
  API_ROUTE_DIRS.some(d => p.replace(/\\/g, "/").includes(d)) ||
  /\.(route|controller|router)\.(ts|js|py)$/.test(p);
const IS_ENV_FILE = (p: string) => path.basename(p) === ".env";

function snip(content: string, idx: number): string {
  const start = Math.max(0, idx - 20);
  const end = Math.min(content.length, idx + 180);
  return content.slice(start, end).replace(/\n/g, " ").trim();
}

function lineNum(content: string, idx: number): number {
  return content.slice(0, idx).split("\n").length;
}

function runHeuristics(
  files: { path: string; content: string }[],
  root: string,
  onProgress?: (found: Finding) => void
): Finding[] {
  const findings: Finding[] = [];
  const gitignore = (() => {
    try { return fs.readFileSync(path.join(root, ".gitignore"), "utf-8"); }
    catch { return ""; }
  })();

  function emit(f: Finding) {
    findings.push(f);
    onProgress?.(f);
  }

  const fileMap = new Map(files.map(f => [f.path.replace(/\\/g, "/"), f.content]));

  // ── SECRETS ──────────────────────────────────────────────────────────────

  // 1. Hardcoded API keys
  for (const { path: fp, content } of files) {
    for (const pat of SECRET_PATTERNS) {
      const m = pat.exec(content);
      if (m) {
        emit({
          id: randomUUID(),
          file_path: fp,
          line_number: lineNum(content, m.index),
          severity: "critical",
          category: "secrets",
          title: "Hardcoded API key in source",
          description: `A live API key matching the pattern ${pat.source.slice(0, 20)}... was found in source code. This will be exposed in version control.`,
          fix_guideline: "Move this key to an environment variable (e.g. process.env.KEY) and add the .env file to .gitignore. Rotate the key immediately.",
          evidence: snip(content, m.index),
          auto_fixable: false,
        });
      }
    }

    // 2. NEXT_PUBLIC_ env vars with sensitive names
    const nextPublicRe = /NEXT_PUBLIC_\w*(key|secret|token|password)\w*\s*=\s*["'][^"']+["']/gi;
    let nm: RegExpExecArray | null;
    while ((nm = nextPublicRe.exec(content)) !== null) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: lineNum(content, nm.index),
        severity: "critical",
        category: "secrets",
        title: "Sensitive value exposed via NEXT_PUBLIC_",
        description: "NEXT_PUBLIC_ variables are bundled into client-side code and visible to all users.",
        fix_guideline: "Use a server-side environment variable without the NEXT_PUBLIC_ prefix and proxy through an API route.",
        evidence: snip(content, nm.index),
        auto_fixable: false,
      });
    }

    // 3. console.log with sensitive names
    const consoleRe = /console\.log\s*\([^)]*(?:key|token|secret|password)[^)]*\)/gi;
    let cm: RegExpExecArray | null;
    while ((cm = consoleRe.exec(content)) !== null) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: lineNum(content, cm.index),
        severity: "medium",
        category: "secrets",
        title: "Sensitive data logged to console",
        description: "console.log statements containing key/token/secret/password values may leak credentials to logs.",
        fix_guideline: "Remove or redact sensitive values from all console.log statements before deploying to production.",
        evidence: snip(content, cm.index),
        auto_fixable: true,
      });
    }

    // 4. Supabase anon key in client-side fetch
    if (/fetch\s*\(/.test(content) && /anon[_\-]?key/i.test(content)) {
      const ix = content.search(/anon[_\-]?key/i);
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: lineNum(content, ix),
        severity: "high",
        category: "rls",
        title: "Supabase anon key used in client-side fetch",
        description: "Using the anon key directly in browser fetch() bypasses Row Level Security if RLS is not enabled on all tables.",
        fix_guideline: "Ensure RLS is enabled on all Supabase tables. Use authenticated sessions rather than raw anon key requests from the browser.",
        evidence: snip(content, ix),
        auto_fixable: false,
      });
    }
  }

  // 5. .env not in .gitignore
  for (const { path: fp } of files) {
    if (IS_ENV_FILE(fp) && !gitignore.split("\n").some(l => l.trim() === ".env")) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: 1,
        severity: "critical",
        category: "secrets",
        title: ".env file not listed in .gitignore",
        description: "Your .env file is not excluded by .gitignore. It may be committed to version control, exposing all secrets.",
        fix_guideline: 'Add ".env" to your .gitignore file immediately and rotate any secrets it contains.',
        evidence: ".env file exists but is absent from .gitignore",
        auto_fixable: true,
      });
    }
  }

  // ── RLS ──────────────────────────────────────────────────────────────────

  for (const { path: fp, content } of files) {
    const isSchema = fp.replace(/\\/g, "/").includes("supabase/") &&
                     (fp.endsWith(".sql") || fp.includes("migration"));
    if (!isSchema) continue;

    const createTableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?["'\`]?(\w+)["'\`]?\s*\(/gi;
    let tm: RegExpExecArray | null;
    while ((tm = createTableRe.exec(content)) !== null) {
      const tableName = tm[1];
      const afterCreate = content.slice(tm.index, tm.index + 3000);
      if (!/enable\s+row\s+level\s+security/i.test(afterCreate)) {
        emit({
          id: randomUUID(),
          file_path: fp,
          line_number: lineNum(content, tm.index),
          severity: "high",
          category: "rls",
          title: `RLS disabled on table "${tableName}"`,
          description: `Table "${tableName}" does not have Row Level Security enabled. Anyone with the anon key can read/write all rows.`,
          fix_guideline: `Add "ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;" to your migration and create appropriate policies.`,
          evidence: snip(content, tm.index),
          auto_fixable: false,
        });
      }
    }
  }

  // ── AUTH ─────────────────────────────────────────────────────────────────

  const AUTH_KEYWORDS = ["session", "token", "auth", "user", "clerk", "supabase.auth", "getServerSession", "currentUser"];

  for (const { path: fp, content } of files) {
    if (!IS_API_ROUTE(fp)) continue;

    const hasAuth = AUTH_KEYWORDS.some(kw => content.includes(kw));
    if (!hasAuth) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: null,
        severity: "high",
        category: "auth",
        title: "API route missing authentication check",
        description: "This API route does not appear to check for a session, token, or user. Unauthenticated callers may be able to access it.",
        fix_guideline: "Add authentication at the top of this route handler. Use getServerSession(), verify a JWT, or check for a Clerk session before processing the request.",
        evidence: `No auth keywords found in ${fp}`,
        auto_fixable: false,
      });
    }

    // Inverted auth: if(!user) { ... allow ...
    const invertedRe = /if\s*\(\s*!user\s*\)[\s\S]{0,200}(return|allow|next\(\))/i;
    const im = invertedRe.exec(content);
    if (im) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: lineNum(content, im.index),
        severity: "high",
        category: "auth",
        title: "Inverted authentication check",
        description: 'Pattern "if(!user) { ... allow }" detected. This may grant access to unauthenticated users instead of denying it.',
        fix_guideline: "Review this authentication check. The guard should redirect or return 401 when the user is missing, not allow the request through.",
        evidence: snip(content, im.index),
        auto_fixable: false,
      });
    }
  }

  // ── RATE LIMITING ─────────────────────────────────────────────────────────

  const RATE_LIMIT_KEYWORDS = ["rateLimit", "slowDown", "limiter", "upstash", "rate-limit", "express-rate-limit"];
  const EXPRESS_FASTAPI_ROUTE = (p: string) => {
    const rel = p.replace(/\\/g, "/");
    return rel.includes("routes/") || rel.includes("routers/") || rel.includes("route.ts") || rel.includes("route.js");
  };

  for (const { path: fp, content } of files) {
    if (!EXPRESS_FASTAPI_ROUTE(fp) || !IS_API_ROUTE(fp)) continue;
    const hasRL = RATE_LIMIT_KEYWORDS.some(kw => content.includes(kw));
    if (!hasRL) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: null,
        severity: "high",
        category: "rate_limiting",
        title: "No rate limiting on API route",
        description: "This route file does not import any rate limiting middleware. Without rate limits, the endpoint is vulnerable to abuse and DoS attacks.",
        fix_guideline: "Add rate limiting using a library like express-rate-limit, Upstash Ratelimit, or slowapi (Python). Apply limits on auth and sensitive endpoints at minimum.",
        evidence: `No rate limit keyword found in ${fp}`,
        auto_fixable: false,
      });
    }
  }

  // ── CORS ─────────────────────────────────────────────────────────────────

  const CORS_WILDCARD = /origin\s*:\s*["']\*["']|cors\s*\(\s*\)/;
  for (const { path: fp, content } of files) {
    const m = CORS_WILDCARD.exec(content);
    if (m) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: lineNum(content, m.index),
        severity: "medium",
        category: "cors",
        title: "Permissive CORS configuration",
        description: 'CORS is configured with origin: "*" or called with no options, allowing any domain to make credentialed cross-origin requests.',
        fix_guideline: "Restrict the allowed origins to your production domain(s). Use ALLOWED_ORIGINS env var to configure per-environment.",
        evidence: snip(content, m.index),
        auto_fixable: true,
      });
    }
  }

  // ── INPUT VALIDATION ──────────────────────────────────────────────────────

  const VALIDATION_KEYWORDS = ["zod", "joi", "yup", "pydantic", "ajv", "superstruct", "valibot"];
  for (const { path: fp, content } of files) {
    if (!IS_API_ROUTE(fp)) continue;
    const hasValidation = VALIDATION_KEYWORDS.some(kw => content.toLowerCase().includes(kw));
    if (!hasValidation) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: null,
        severity: "medium",
        category: "input_validation",
        title: "API route missing input validation",
        description: "No schema validation library (Zod, Joi, Pydantic, etc.) was found in this route. Unvalidated input can lead to unexpected behaviour or injection attacks.",
        fix_guideline: "Add input validation using Zod (TypeScript) or Pydantic (Python) to parse and validate all incoming request bodies.",
        evidence: `No validation library import found in ${fp}`,
        auto_fixable: false,
      });
    }
  }

  // ── SECURITY HEADERS ──────────────────────────────────────────────────────

  // next.config.js missing headers() export
  for (const { path: fp, content } of files) {
    const base = path.basename(fp);
    if (/next\.config\.(js|ts|mjs)/.test(base)) {
      if (!content.includes("headers")) {
        emit({
          id: randomUUID(),
          file_path: fp,
          line_number: null,
          severity: "medium",
          category: "other",
          title: "Missing security headers configuration",
          description: "next.config.js does not export a headers() function. Security headers like X-Frame-Options, CSP, and HSTS are not set.",
          fix_guideline: "Add a headers() async function to next.config.js that returns X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, and Content-Security-Policy headers.",
          evidence: `No "headers" export found in ${fp}`,
          auto_fixable: true,
        });
      }
    }
  }

  // Express app missing helmet
  for (const { path: fp, content } of files) {
    const isMainApp = ["app.js", "app.ts", "server.js", "server.ts", "index.js", "index.ts"].includes(path.basename(fp));
    if (isMainApp && content.includes("express") && !content.includes("helmet")) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: null,
        severity: "medium",
        category: "other",
        title: "Express app missing helmet security headers",
        description: "helmet() middleware is not imported or used. Without it, Express does not set essential security headers.",
        fix_guideline: 'Install helmet (npm i helmet) and add "app.use(helmet())" near the top of your Express app setup.',
        evidence: `express() found but no helmet import in ${fp}`,
        auto_fixable: true,
      });
    }
  }

  // ── DEPENDENCIES ──────────────────────────────────────────────────────────

  const HIGH_RISK_PACKAGES: Record<string, (v: string) => boolean> = {
    "node-serialize": () => true,
    "eval": () => true,
    "serialize-javascript": (v) => {
      const minor = parseFloat(v.replace(/[^0-9.]/g, ""));
      return minor < 3.1;
    },
  };

  for (const { path: fp, content } of files) {
    if (path.basename(fp) !== "package.json") continue;
    try {
      const pkg = JSON.parse(content);
      const allDeps = { ...pkg.dependencies ?? {}, ...pkg.devDependencies ?? {} };
      for (const [pkgName, checkFn] of Object.entries(HIGH_RISK_PACKAGES)) {
        const version = allDeps[pkgName];
        if (version && checkFn(String(version))) {
          emit({
            id: randomUUID(),
            file_path: fp,
            line_number: null,
            severity: "high",
            category: "dependency",
            title: `High-risk dependency: ${pkgName}`,
            description: `The package "${pkgName}" (version ${version}) is known to have serious security vulnerabilities including potential code execution.`,
            fix_guideline: `Remove "${pkgName}" from your dependencies. Use safer alternatives: JSON.parse() instead of node-serialize, Function() carefully or avoid eval(), and upgrade serialize-javascript to >=3.1.`,
            evidence: `"${pkgName}": "${version}" in ${fp}`,
            auto_fixable: false,
          });
        }
      }
    } catch { continue; }
  }

  return findings;
}

// ── `unideploy scan` — legacy GitHub URL scan ─────────────────────────────────

const program = new Command();
program.name("unideploy").description("Production-readiness scanner for vibe-coded apps").version("0.2.0");

interface LegacyScanStatus {
  scan_id: string;
  status: string;
  github_url: string;
  branch: string;
  framework: string | null;
  security_grade: string | null;
  findings_count: number;
  findings: Finding[];
  error: string | null;
  completed_at: string | null;
}

function printFindingsTable(findings: Finding[]): void {
  if (findings.length === 0) return;
  const table = new Table({
    head: [chalk.white("Severity"), chalk.white("Title"), chalk.white("File"), chalk.white("Fix")],
    style: { head: [], border: ["gray"] },
    colWidths: [12, 44, 36, 5],
    wordWrap: true,
  });
  for (const f of findings) {
    table.push([
      severityColor(f.severity).trim(),
      f.title,
      f.file_path + (f.line_number ? `:${f.line_number}` : ""),
      f.auto_fixable ? chalk.green("✓") : chalk.gray("—"),
    ]);
  }
  console.log(table.toString());
}

program
  .command("scan [github_url]")
  .description("Scan a GitHub repo for production-readiness issues (legacy GitHub flow)")
  .option("--branch <branch>", "Git branch to scan", "main")
  .option("--ci", "CI mode: exit 1 if CRITICAL findings")
  .option("--json", "Output findings as JSON")
  .option("--local", "Hit local backend")
  .action(async (githubUrl: string | undefined, opts: {
    branch: string; ci: boolean; json: boolean; local: boolean;
  }) => {
    const baseUrl = opts.local ? LOCAL_URL : API_URL;
    let repoUrl = githubUrl;
    if (!repoUrl) {
      try {
        repoUrl = require("child_process")
          .execSync("git remote get-url origin", { cwd: process.cwd(), encoding: "utf-8" })
          .trim().replace("git@github.com:", "https://github.com/").replace(/\.git$/, "");
      } catch {
        console.error(chalk.red("No GitHub URL provided and no git remote found."));
        process.exit(1);
      }
    }

    const scanRes = await apiFetch(`${baseUrl}/api/v1/scan`, {
      method: "POST",
      body: JSON.stringify({ github_url: repoUrl, branch: opts.branch }),
    }) as { scan_id: string };

    let scan: LegacyScanStatus | null = null;
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));
      scan = await apiFetch(`${baseUrl}/api/v1/scan/${scanRes.scan_id}`) as LegacyScanStatus;
      if (scan.status === "done" || scan.status === "failed") break;
    }
    if (!scan || scan.status !== "done") {
      console.error(chalk.red(`Scan failed: ${scan?.error ?? "timeout"}`));
      process.exit(1);
    }
    const findings = scan.findings ?? [];
    if (opts.json) { console.log(JSON.stringify({ scan_id: scanRes.scan_id, findings }, null, 2)); return; }
    printFindingsTable(findings);
    if (opts.ci && findings.some(f => f.severity === "critical")) process.exit(1);
  });

// ── `unideploy init` — CLI-first local scan ───────────────────────────────────

program
  .command("init")
  .description("Scan local project and pair with UniDeploy dashboard")
  .option("--local", "Hit local backend (localhost:8000)")
  .action(async (opts: { local: boolean }) => {
    const baseUrl = opts.local ? LOCAL_URL : API_URL;
    const cwd = process.cwd();
    const projectName = path.basename(cwd);

    // ── Step 1: Create session ─────────────────────────────────────────────

    let session: { session_id: string; session_code: string; websocket_url: string };
    try {
      session = await apiFetch(`${baseUrl}/auth/session`, {
        method: "POST",
      }) as typeof session;
    } catch (err) {
      console.error(chalk.red(`Failed to create session: ${err}`));
      process.exit(1);
    }

    const code = session.session_code;
    const formatted = `${code.slice(0, 3)}-${code.slice(3)}`;
    const framework = detectFramework(cwd);

    // ── Step 2: Print terminal output ─────────────────────────────────────

    console.log("");
    console.log(chalk.bold("● UniDeploy agent running"));

    // Collect files to get count
    const files = collectFiles(cwd);

    console.log(chalk.gray(`  Framework: ${framework} detected`));
    console.log(chalk.gray(`  Scanning ${files.length} files...`));
    if (files.length === 0) {
      console.log(chalk.yellow(`  ⚠ No scannable files found in ${cwd}`));
      console.log(chalk.gray(`    Scans: .ts .tsx .js .jsx .mjs .py .json .yaml .toml .go .rb .java .kt .rs`));
      console.log(chalk.gray(`    Make sure you're running this from your project root.`));
    }
    console.log("");
    console.log(chalk.white(`  Your session code: `) + chalk.green.bold(formatted));
    console.log(chalk.gray(`  Open https://unideploy.in/connect and enter this code.`));
    console.log("");

    // ── Step 3: Connect WebSocket and wait for session_authenticated ───────

    const wsUrl = session.websocket_url.replace(/^https?:\/\//, (m) =>
      m.startsWith("https") ? "wss://" : "ws://"
    );

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      let authenticated = false;

      ws.on("open", () => {
        // Connection established — just wait
      });

      ws.on("message", async (raw: Buffer | string) => {
        let msg: { type: string; [k: string]: unknown };
        try { msg = JSON.parse(raw.toString()); }
        catch { return; }

        if (msg.type === "session_authenticated") {
          authenticated = true;

          // ── Step 4: Run local scan ────────────────────────────────────────

          console.log(chalk.green("  ✓ Authenticated — scanning..."));
          console.log("");

          const findings: Finding[] = [];
          let scannedCount = 0;

          const onFinding = (f: Finding) => {
            const col = severityColor(f.severity);
            const loc = f.file_path + (f.line_number ? `:${f.line_number}` : "");
            console.log(`  ${col} ${chalk.white(f.title.padEnd(36).slice(0, 36))} ${chalk.gray(loc)}`);
            findings.push(f);
          };

          // Run heuristics and stream progress via WebSocket
          const allFindings = runHeuristics(files, cwd, onFinding);
          scannedCount = files.length;

          ws.send(JSON.stringify({
            type: "scan_progress",
            files_scanned: scannedCount,
            total_files: files.length,
          }));

          const grade = computeGrade(allFindings);
          const autoFixable = allFindings.filter(f => f.auto_fixable).length;

          console.log("");
          console.log(
            `  Grade: ${gradeColor(grade)}  |  ${allFindings.length} issues  |  ${autoFixable} auto-fixable`
          );
          console.log("");
          console.log(chalk.green("  ✓ Dashboard ready → https://unideploy.in/dashboard"));
          if (autoFixable > 0) {
            console.log(chalk.gray(`  Run 'unideploy fix' to apply ${autoFixable} auto-fixes`));
          }
          console.log("");

          // ── Step 5: POST findings to backend ───────────────────────────────

          const payload = {
            session_id: session.session_id,
            project_name: projectName,
            framework,
            scanned_at: new Date().toISOString(),
            files_scanned: scannedCount,
            total_issues: allFindings.length,
            auto_fixable: autoFixable,
            grade,
            findings: allFindings,
          };

          try {
            await apiFetch(`${baseUrl}/scans/${session.session_id}/results`, {
              method: "POST",
              body: JSON.stringify(payload),
            });
          } catch (err) {
            console.error(chalk.yellow(`  Warning: could not send results to backend: ${err}`));
          }

          ws.close();
          resolve();
        }
      });

      ws.on("error", (err) => {
        if (!authenticated) reject(err);
      });

      ws.on("close", () => {
        if (!authenticated) {
          reject(new Error("WebSocket closed before authentication"));
        }
      });

      // Timeout after 10 minutes (session expiry)
      setTimeout(() => {
        if (!authenticated) {
          ws.close();
          reject(new Error("Session timed out — code expired after 10 minutes"));
        }
      }, 600_000);
    }).catch(err => {
      console.error(chalk.red(`\n  ✗ ${err.message}`));
      process.exit(1);
    });

    process.exit(0);
  });

// ── `unideploy fix` — apply auto-fixable findings ────────────────────────────

program
  .command("fix")
  .description("Apply auto-fixable findings from last scan")
  .option("--local", "Hit local backend")
  .action(async (_opts: { local: boolean }) => {
    console.log(chalk.yellow("  Auto-fix via 'unideploy fix' requires the UniDeploy Indie plan."));
    console.log(chalk.gray("  → Use the 'Fix with AI' button in the dashboard to apply fixes."));
    console.log(chalk.gray("  → https://unideploy.in/dashboard"));
  });

program.parse();
