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
  fix_hint: string;
  snippet: string;
  cve_ref?: string;
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

function computeRiskScore(findings: Finding[]): number {
  const critical = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;
  const medium = findings.filter(f => f.severity === "medium").length;
  const low = findings.filter(f => f.severity === "low").length;
  return Math.min(100, critical * 40 + high * 15 + medium * 5 + low * 1);
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
          fix_hint: "Move this key to an environment variable (e.g. process.env.KEY) and add the .env file to .gitignore. Rotate the key immediately.",
          snippet: snip(content, m.index),
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
        fix_hint: "Use a server-side environment variable without the NEXT_PUBLIC_ prefix and proxy through an API route.",
        snippet: snip(content, nm.index),
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
        fix_hint: "Remove or redact sensitive values from all console.log statements before deploying to production.",
        snippet: snip(content, cm.index),
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
        fix_hint: "Ensure RLS is enabled on all Supabase tables. Use authenticated sessions rather than raw anon key requests from the browser.",
        snippet: snip(content, ix),
        auto_fixable: false,
      });
    }
  }

  // 5. .env not in .gitignore (direct filesystem check — .env is excluded from content scanning)
  if (fs.existsSync(path.join(root, ".env"))) {
    const envIgnored = gitignore.split("\n").some(l => {
      const t = l.trim();
      return t === ".env" || t === ".env*";
    });
    if (!envIgnored) {
      emit({
        id: randomUUID(),
        file_path: ".env",
        line_number: 1,
        severity: "critical",
        category: "secrets",
        title: ".env file not listed in .gitignore",
        description: "Your .env file is not excluded by .gitignore. It may be committed to version control, exposing all secrets.",
        fix_hint: 'Add ".env" to your .gitignore file immediately and rotate any secrets it contains.',
        snippet: ".env file exists but is absent from .gitignore",
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
          fix_hint: `Add "ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;" to your migration and create appropriate policies.`,
          snippet: snip(content, tm.index),
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
        fix_hint: "Add authentication at the top of this route handler. Use getServerSession(), verify a JWT, or check for a Clerk session before processing the request.",
        snippet: `No auth keywords found in ${fp}`,
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
        fix_hint: "Review this authentication check. The guard should redirect or return 401 when the user is missing, not allow the request through.",
        snippet: snip(content, im.index),
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
        fix_hint: "Add rate limiting using a library like express-rate-limit, Upstash Ratelimit, or slowapi (Python). Apply limits on auth and sensitive endpoints at minimum.",
        snippet: `No rate limit keyword found in ${fp}`,
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
        description: 'CORS is configured with origin: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean) or called with no options, allowing any domain to make credentialed cross-origin requests.',
        fix_hint: "Restrict the allowed origins to your production domain(s). Use ALLOWED_ORIGINS env var to configure per-environment.",
        snippet: snip(content, m.index),
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
        fix_hint: "Add input validation using Zod (TypeScript) or Pydantic (Python) to parse and validate all incoming request bodies.",
        snippet: `No validation library import found in ${fp}`,
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
          fix_hint: "Add a headers() async function to next.config.js that returns X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, and Content-Security-Policy headers.",
          snippet: `No "headers" export found in ${fp}`,
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
        fix_hint: 'Install helmet (npm i helmet) and add "app.use(helmet())" near the top of your Express app setup.',
        snippet: `express() found but no helmet import in ${fp}`,
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
            fix_hint: `Remove "${pkgName}" from your dependencies. Use safer alternatives: JSON.parse() instead of node-serialize, Function() carefully or avoid eval(), and upgrade serialize-javascript to >=3.1.`,
            snippet: `"${pkgName}": "${version}" in ${fp}`,
            auto_fixable: false,
          });
        }
      }
    } catch { continue; }
  }

  // ── DEBUG MODE IN PRODUCTION ──────────────────────────────────────────────

  const DEBUG_FILES = [".env.example", ".env.template", ".env.sample"];
  for (const { path: fp, content } of files) {
    const base = path.basename(fp);
    if (!DEBUG_FILES.includes(base)) continue;
    const debugRe = /^(DEBUG\s*=\s*(true|1)|NODE_ENV\s*=\s*development)/m;
    const dm = debugRe.exec(content);
    if (dm) {
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: lineNum(content, dm.index),
        severity: "medium",
        category: "other",
        title: "Debug mode committed to version control",
        description: `${base} contains ${dm[0].trim()} — if this is copied to production .env, debug output and verbose logging will be enabled.`,
        fix_hint: `Set DEBUG=false and NODE_ENV=production in your production environment. Never commit debug=true to template files.`,
        snippet: snip(content, dm.index),
        auto_fixable: false,
      });
    }
  }

  // ── EXPOSED STACK TRACES ──────────────────────────────────────────────────

  for (const { path: fp, content } of files) {
    if (!IS_API_ROUTE(fp)) continue;
    const stackRe = /\.stack\b|err\.stack|error\.stack|e\.stack/;
    const resWithStackRe = /res\.(json|send|status\(\d+\)\.json)\s*\([^)]*(?:err|error|e)\b/;
    if (stackRe.test(content) && resWithStackRe.test(content)) {
      const ix = content.search(stackRe);
      emit({
        id: randomUUID(),
        file_path: fp,
        line_number: lineNum(content, ix),
        severity: "high",
        category: "error_handling",
        title: "Stack trace exposed in HTTP error response",
        description: "Error stack traces are sent in HTTP responses. This leaks internal file paths, function names, and framework versions to attackers.",
        fix_hint: "Catch errors server-side, log them internally (e.g. console.error), and return only a generic message to the client: res.status(500).json({ error: 'Internal server error' })",
        snippet: snip(content, ix),
        auto_fixable: false,
      });
    }
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
    if (opts.json) {
      const grade = computeGrade(findings);
      const riskScore = computeRiskScore(findings);
      console.log(JSON.stringify({
        project_meta: { github_url: repoUrl, scan_id: scanRes.scan_id },
        findings,
        summary: {
          total: findings.length,
          critical: findings.filter(f => f.severity === "critical").length,
          high: findings.filter(f => f.severity === "high").length,
          medium: findings.filter(f => f.severity === "medium").length,
          low: findings.filter(f => f.severity === "low").length,
          grade,
          risk_score: riskScore,
        },
      }, null, 2));
      return;
    }
    printFindingsTable(findings);
    if (opts.ci && findings.some(f => f.severity === "critical")) process.exit(1);
  });

// ── `unideploy init` — CLI-first local scan ───────────────────────────────────

program
  .command("init")
  .description("Scan local project and pair with UniDeploy dashboard")
  .option("--local", "Hit local backend (localhost:8000)")
  .option("--json", "Output results as JSON (skips interactive mode)")
  .option("--ci", "CI mode: exit 1 if CRITICAL findings")
  .action(async (opts: { local: boolean; json: boolean; ci: boolean }) => {
    const baseUrl = opts.local ? LOCAL_URL : API_URL;
    const cwd = process.cwd();
    const projectName = path.basename(cwd);
    const scanStart = Date.now();

    // ── JSON / CI mode — offline local scan, no session needed ────────────
    if (opts.json || opts.ci) {
      const framework = detectFramework(cwd);
      const files = collectFiles(cwd);
      const allFindings = runHeuristics(files, cwd);
      const grade = computeGrade(allFindings);
      const riskScore = computeRiskScore(allFindings);
      const scanDurationMs = Date.now() - scanStart;
      if (opts.json) {
        console.log(JSON.stringify({
          project_meta: { framework, file_count: files.length, scan_duration_ms: scanDurationMs },
          findings: allFindings,
          summary: {
            total: allFindings.length,
            critical: allFindings.filter(f => f.severity === "critical").length,
            high: allFindings.filter(f => f.severity === "high").length,
            medium: allFindings.filter(f => f.severity === "medium").length,
            low: allFindings.filter(f => f.severity === "low").length,
            grade,
            risk_score: riskScore,
          },
        }, null, 2));
      } else {
        printFindingsTable(allFindings);
        console.log(`\nGrade: ${grade}  |  Risk Score: ${riskScore}/100  |  ${allFindings.length} issues`);
      }
      if (opts.ci && allFindings.some(f => f.severity === "critical")) process.exit(1);
      process.exit(0);
    }

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
          const riskScore = computeRiskScore(allFindings);
          const autoFixable = allFindings.filter(f => f.auto_fixable).length;

          console.log("");
          console.log(
            `  Grade: ${gradeColor(grade)}  |  Risk Score: ${riskScore}/100  |  ${allFindings.length} issues  |  ${autoFixable} auto-fixable`
          );
          console.log("");
          console.log(chalk.green("  ✓ Dashboard ready → https://unideploy.in/dashboard"));
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
            risk_score: riskScore,
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

          // ── Step 6: Save state for `unideploy fix` ─────────────────────────
          try {
            const stateDir = path.join(os.homedir(), ".unideploy");
            if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
            fs.writeFileSync(path.join(stateDir, "last-scan.json"), JSON.stringify({
              session_id: session.session_id,
              project_root: cwd,
              grade,
              scanned_at: new Date().toISOString(),
              findings: allFindings,
            }, null, 2));
          } catch { /* best-effort */ }

          if (autoFixable > 0) {
            console.log(chalk.gray(`  Run 'npx unideploy fix' to apply ${autoFixable} auto-fixes`));
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

// ── Fix engine — applies auto-fixable findings locally ───────────────────────

function applyFix(finding: Finding, projectRoot: string): { applied: boolean; message: string } {
  const fullPath = path.join(projectRoot, finding.file_path);
  let content: string;
  try { content = fs.readFileSync(fullPath, "utf-8"); } catch {
    return { applied: false, message: `Could not read ${finding.file_path}` };
  }

  // ── CORS wildcard ─────────────────────────────────────────────────────────
  if (finding.category === "cors") {
    const fixed = content
      .replace(/origin\s*:\s*["']\*["']/g,
        `origin: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean)`)
      .replace(/cors\s*\(\s*\)/g,
        `cors({ origin: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean) })`);
    if (fixed !== content) {
      try {
        fs.writeFileSync(fullPath, fixed, "utf-8");
        return { applied: true, message: `Restricted CORS origin to ALLOWED_ORIGINS env var in ${finding.file_path}` };
      } catch { return { applied: false, message: `Could not write ${finding.file_path}` }; }
    }
    return { applied: false, message: `CORS pattern not found in ${finding.file_path} — may already be fixed` };
  }

  // ── Missing security headers (Next.js config) ─────────────────────────────
  if (finding.category === "other" && finding.title.toLowerCase().includes("security headers")) {
    const headersBlock = `
async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },`;
    if (content.includes("headers()")) {
      return { applied: false, message: `Security headers already present in ${finding.file_path}` };
    }
    // Insert before closing brace of the config object
    const fixed = content.replace(
      /^(const nextConfig[^=]+=\s*\{)([\s\S]*?)(\}\s*;?\s*export default)/m,
      (_m, open, body, close) => `${open}${body}${headersBlock}\n${close}`
    );
    if (fixed !== content) {
      try {
        fs.writeFileSync(fullPath, fixed, "utf-8");
        return { applied: true, message: `Added security headers to ${finding.file_path}` };
      } catch { return { applied: false, message: `Could not write ${finding.file_path}` }; }
    }
    return { applied: false, message: `Could not locate config object in ${finding.file_path}` };
  }

  // ── console.log with sensitive data ──────────────────────────────────────
  if (finding.category === "secrets" && finding.title.toLowerCase().includes("logged")) {
    const line = finding.line_number;
    if (!line) return { applied: false, message: "No line number to target" };
    const lines = content.split("\n");
    const idx = line - 1;
    if (lines[idx]?.includes("console.log")) {
      lines[idx] = lines[idx].replace(/console\.log/, "// console.log /* removed by unideploy fix */");
      try {
        fs.writeFileSync(fullPath, lines.join("\n"), "utf-8");
        return { applied: true, message: `Disabled console.log at ${finding.file_path}:${line}` };
      } catch { return { applied: false, message: `Could not write ${finding.file_path}` }; }
    }
  }

  return { applied: false, message: `No auto-fix rule for category "${finding.category}"` };
}

// ── `unideploy fix` — apply auto-fixable findings ────────────────────────────

program
  .command("fix")
  .description("Apply auto-fixable findings from last scan")
  .option("--dry-run", "Show what would change without writing files")
  .action(async (opts: { dryRun: boolean }) => {
    const stateFile = path.join(os.homedir(), ".unideploy", "last-scan.json");

    let state: { session_id: string; project_root: string; grade: string; findings: Finding[] };
    try {
      state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    } catch {
      console.log(chalk.red("  ✗ No scan found. Run 'npx unideploy init' first."));
      process.exit(1);
    }

    const fixable = state.findings.filter(f => f.auto_fixable);
    if (fixable.length === 0) {
      console.log(chalk.green("  ✓ No auto-fixable issues from last scan."));
      process.exit(0);
    }

    console.log("");
    console.log(chalk.bold(`● UniDeploy Fix — ${fixable.length} auto-fixable issue${fixable.length > 1 ? "s" : ""}`));
    console.log(chalk.gray(`  Project: ${state.project_root}`));
    if (opts.dryRun) console.log(chalk.yellow("  (dry run — no files will be modified)"));
    console.log("");

    let applied = 0;
    let skipped = 0;

    for (const finding of fixable) {
      const label = `${severityColor(finding.severity)} ${finding.title.slice(0, 40).padEnd(40)} ${chalk.gray(finding.file_path)}`;
      if (opts.dryRun) {
        console.log(`  ${label}`);
        console.log(chalk.gray(`    Would apply: ${finding.fix_hint.slice(0, 80)}`));
        console.log("");
        continue;
      }
      const result = applyFix(finding, state.project_root);
      if (result.applied) {
        console.log(`  ${chalk.green("✓")} ${label}`);
        console.log(chalk.gray(`    ${result.message}`));
        applied++;
      } else {
        console.log(`  ${chalk.gray("–")} ${label}`);
        console.log(chalk.gray(`    Skipped: ${result.message}`));
        skipped++;
      }
      console.log("");
    }

    if (!opts.dryRun) {
      console.log(`  ${chalk.green(`✓ ${applied} fix${applied !== 1 ? "es" : ""} applied`)}, ${skipped} skipped`);
      if (applied > 0) {
        console.log(chalk.gray("  Review the changes, then commit: git diff"));
      }
    }
    console.log("");
    process.exit(0);
  });

program.parse();
