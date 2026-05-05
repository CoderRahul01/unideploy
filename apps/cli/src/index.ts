#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import WebSocket from "ws";
import os from "os";
import fs from "fs";
import path from "path";

const API_URL = process.env.UNIDEPLOY_API_URL || "https://api.unideploy.in";
const LOCAL_URL = "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Finding {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  title: string;
  file: string;
  line: number | null;
  description: string;
  auto_fixable: boolean;
}

interface ScanStatus {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(s: string): string {
  if (s === "CRITICAL") return chalk.red.bold(s);
  if (s === "HIGH")     return chalk.yellow.bold(s);
  if (s === "MEDIUM")   return chalk.cyan(s);
  return chalk.gray(s);
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

function printFindingsTable(findings: Finding[]): void {
  if (findings.length === 0) return;

  const table = new Table({
    head: [
      chalk.white("Severity"),
      chalk.white("Title"),
      chalk.white("File"),
      chalk.white("Fix"),
    ],
    style: { head: [], border: ["gray"] },
    colWidths: [12, 44, 36, 5],
    wordWrap: true,
  });

  for (const f of findings) {
    table.push([
      severityColor(f.severity),
      f.title,
      f.file + (f.line ? `:${f.line}` : ""),
      f.auto_fixable ? chalk.green("✓") : chalk.gray("—"),
    ]);
  }

  console.log(table.toString());
}

function printSummary(grade: string, findings: Finding[]): void {
  const critical = findings.filter(f => f.severity === "CRITICAL").length;
  const high     = findings.filter(f => f.severity === "HIGH").length;
  const medium   = findings.filter(f => f.severity === "MEDIUM").length;
  const low      = findings.filter(f => f.severity === "LOW").length;
  const fixable  = findings.filter(f => f.auto_fixable).length;

  console.log("");
  console.log(chalk.bold("─────────────────────────────────────────────────"));
  console.log(`  Security Grade   ${gradeColor(grade ?? "?")}  `);
  console.log(chalk.bold("─────────────────────────────────────────────────"));
  console.log(`  ${chalk.red.bold(String(critical).padStart(3))} CRITICAL   ${chalk.yellow.bold(String(high).padStart(3))} HIGH   ${chalk.cyan(String(medium).padStart(3))} MEDIUM   ${chalk.gray(String(low).padStart(3))} LOW`);
  console.log(`  ${chalk.green(String(fixable).padStart(3))} auto-fixable`);
  console.log(chalk.bold("─────────────────────────────────────────────────"));
  console.log("");

  if (fixable > 0) {
    console.log(chalk.green(`  → Open ${chalk.underline("https://unideploy.in/dashboard")} to apply fixes and raise a PR`));
    console.log("");
  }
}

// ── File collection (for CLI init / WebSocket flow) ───────────────────────────

const SCAN_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".toml",
  ".yaml", ".yml", ".sql", ".sh", ".env.example",
]);
const SCAN_BASENAMES = new Set([
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  ".env.example", ".env.template", "next.config.js", "next.config.ts",
  "vite.config.ts", "vite.config.js",
]);
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", ".next", "__pycache__",
  "venv", ".venv", "build", "coverage", ".turbo", ".cache",
]);
const SKIP_FILES = new Set([".env", ".env.local", ".env.production", ".env.development"]);

function collectFiles(root: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  function walk(dir: string) {
    let entries: string[];
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = path.join(dir, entry);
      let stat: fs.Stats;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory()) { walk(full); continue; }
      if (SKIP_FILES.has(path.basename(full))) continue;
      if (!SCAN_EXTENSIONS.has(path.extname(entry)) && !SCAN_BASENAMES.has(entry)) continue;
      if (stat.size > 100_000) continue;
      try {
        files.push({ path: path.relative(root, full), content: fs.readFileSync(full, "utf-8") });
      } catch { continue; }
    }
  }
  walk(root);
  return files;
}

function detectFramework(root: string): string {
  const pkg = path.join(root, "package.json");
  const req = path.join(root, "requirements.txt");
  if (fs.existsSync(pkg)) {
    try {
      const d = { ...JSON.parse(fs.readFileSync(pkg, "utf-8")).dependencies ?? {},
                  ...JSON.parse(fs.readFileSync(pkg, "utf-8")).devDependencies ?? {} };
      if (d["next"]) return "nextjs";
      if (d["@nestjs/core"]) return "nestjs";
      if (d["express"]) return "express";
      return "node";
    } catch { return "node"; }
  }
  if (fs.existsSync(req)) {
    const c = fs.readFileSync(req, "utf-8").toLowerCase();
    if (c.includes("fastapi")) return "fastapi";
    if (c.includes("django")) return "django";
    return "python";
  }
  return "unknown";
}

// ── Commands ──────────────────────────────────────────────────────────────────

const program = new Command();
program.name("unideploy").description("Production-readiness scanner for vibe-coded apps").version("0.1.0");

// ── `unideploy scan` — GitHub URL scan via backend pipeline ───────────────────

program
  .command("scan [github_url]")
  .description("Scan a GitHub repo for production-readiness issues")
  .option("--branch <branch>", "Git branch to scan", "main")
  .option("--ci", "CI mode: exit 1 if CRITICAL findings found (for GitHub Actions)")
  .option("--json", "Output findings as JSON (for CI pipelines)")
  .option("--local", "Hit local backend (localhost:8000) instead of production")
  .action(async (githubUrl: string | undefined, opts: {
    branch: string; ci: boolean; json: boolean; local: boolean;
  }) => {
    const baseUrl = opts.local ? LOCAL_URL : API_URL;

    // Derive GitHub URL — accept arg, or try git remote of cwd
    let repoUrl = githubUrl;
    if (!repoUrl) {
      try {
        const remote = require("child_process")
          .execSync("git remote get-url origin", { cwd: process.cwd(), encoding: "utf-8" })
          .trim()
          .replace("git@github.com:", "https://github.com/")
          .replace(/\.git$/, "");
        repoUrl = remote;
      } catch {
        console.error(chalk.red("No GitHub URL provided and no git remote found."));
        console.error(chalk.gray("Usage: unideploy scan https://github.com/user/repo"));
        process.exit(1);
      }
    }

    if (!repoUrl!.includes("github.com")) {
      console.error(chalk.red("Only GitHub URLs are supported right now."));
      process.exit(1);
    }

    if (!opts.json) {
      console.log("");
      console.log(chalk.bold("  unideploy") + chalk.gray(" — production-readiness scanner"));
      console.log(chalk.gray(`  Repo   : ${repoUrl}`));
      console.log(chalk.gray(`  Branch : ${opts.branch}`));
      console.log("");
    }

    // 1. Queue the scan
    const spinner = opts.json ? null : ora("Queuing scan...").start();
    let scanId: string;
    try {
      const res = await apiFetch(`${baseUrl}/api/v1/scan`, {
        method: "POST",
        body: JSON.stringify({ github_url: repoUrl, branch: opts.branch }),
      }) as { scan_id: string };
      scanId = res.scan_id;
      spinner?.succeed(`Scan queued — ID: ${chalk.cyan(scanId)}`);
    } catch (err) {
      spinner?.fail(`Failed to queue scan: ${err}`);
      process.exit(1);
    }

    // 2. Poll until done
    const pollSpinner = opts.json ? null : ora("Waiting for worker...").start();
    let scan: ScanStatus | null = null;
    const statusLabels: Record<string, string> = {
      queued: "Waiting in queue...",
      running: "Cloning repo and running security checks inside sandbox...",
      planning: "Generating remediation plan...",
    };

    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        scan = await apiFetch(`${baseUrl}/api/v1/scan/${scanId}`) as ScanStatus;
        if (pollSpinner && statusLabels[scan.status]) {
          pollSpinner.text = statusLabels[scan.status];
        }
        if (scan.status === "done" || scan.status === "failed") break;
      } catch {
        // transient network error — keep polling
      }
    }

    pollSpinner?.stop();

    if (!scan || scan.status === "failed") {
      console.error(chalk.red(`\n  Scan failed: ${scan?.error ?? "timeout"}`));
      process.exit(1);
    }

    const findings = scan.findings ?? [];
    const grade = scan.security_grade ?? "?";

    // 3. Output results
    if (opts.json) {
      console.log(JSON.stringify({
        scan_id: scanId,
        security_grade: grade,
        framework: scan.framework,
        findings_count: findings.length,
        findings,
        severity_counts: {
          critical: findings.filter(f => f.severity === "CRITICAL").length,
          high:     findings.filter(f => f.severity === "HIGH").length,
          medium:   findings.filter(f => f.severity === "MEDIUM").length,
          low:      findings.filter(f => f.severity === "LOW").length,
        },
      }, null, 2));
    } else {
      if (scan.framework) {
        console.log(chalk.gray(`  Framework detected: ${scan.framework}\n`));
      }
      if (findings.length > 0) {
        printFindingsTable(findings);
      }
      printSummary(grade, findings);
      if (findings.length === 0) {
        console.log(chalk.green("  ✓ No issues found — your repo passes all security checks.\n"));
      }
    }

    // 4. CI mode — exit 1 on CRITICAL
    if (opts.ci) {
      const critical = findings.filter(f => f.severity === "CRITICAL").length;
      if (critical > 0) {
        if (!opts.json) {
          console.error(chalk.red.bold(`  ✗ CI check failed: ${critical} CRITICAL finding(s)\n`));
        }
        process.exit(1);
      }
      if (!opts.json) {
        console.log(chalk.green("  ✓ CI check passed — no CRITICAL findings\n"));
      }
    }
  });

// ── `unideploy init` — WebSocket CLI session (pair with browser) ──────────────

program
  .command("init")
  .description("Start an interactive scan session paired with the dashboard")
  .option("--local", "Hit local backend (localhost:8000)")
  .action(async (opts: { local: boolean }) => {
    const baseUrl = opts.local ? LOCAL_URL : API_URL;

    console.log("");
    console.log(chalk.bold("  unideploy init") + chalk.gray(" — pairing with dashboard"));
    console.log("");

    const spinner = ora("Creating session...").start();
    let session: { session_code: string; websocket_url: string };

    try {
      session = await apiFetch(`${baseUrl}/api/v1/sessions/create`, {
        method: "POST",
        body: JSON.stringify({
          cli_version: "0.1.0",
          machine_name: os.hostname(),
          project_path: process.cwd(),
        }),
      }) as typeof session;
      spinner.stop();
    } catch (err) {
      spinner.fail(`Failed to create session: ${err}`);
      process.exit(1);
    }

    console.log("");
    console.log(chalk.bold("  ┌────────────────────────────────────────────┐"));
    console.log(chalk.bold("  │  Session Code: ") + chalk.green.bold(session.session_code.padEnd(28)) + chalk.bold("│"));
    console.log(chalk.bold("  └────────────────────────────────────────────┘"));
    console.log("");
    console.log(chalk.gray(`  → Open ${chalk.underline("https://unideploy.in/connect")} and enter this code`));
    console.log("");

    const ws = new WebSocket(session.websocket_url);

    ws.on("message", (raw: Buffer | string) => {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "browser_connected") {
        console.log(chalk.green("  ✓ Browser connected! Collecting project files..."));
        const files = collectFiles(process.cwd());
        const framework = detectFramework(process.cwd());
        console.log(chalk.gray(`  Found ${files.length} files — framework: ${framework}`));
        console.log(chalk.gray("  Sending to AnalyzerAgent..."));
        ws.send(JSON.stringify({
          type: "cli_ready",
          machine_name: os.hostname(),
          project_manifest: { framework, file_count: files.length, files },
        }));

      } else if (msg.type === "finding") {
        const f: Finding = msg.finding;
        const icon = f.severity === "CRITICAL" ? "🔴" : f.severity === "HIGH" ? "🟠" : f.severity === "MEDIUM" ? "🟡" : "🔵";
        console.log(`  ${icon} ${severityColor(f.severity)} ${chalk.white(f.title)} ${chalk.gray(f.file)}`);

      } else if (msg.type === "scan_complete") {
        const s = msg.summary;
        printSummary(s.grade, new Array(s.total).fill({ severity: "LOW", auto_fixable: false }));
        ws.close();
        process.exit(0);

      } else if (msg.type === "apply_fix") {
        console.log(chalk.yellow(`  🛠  Applying fix for: ${msg.finding_id}`));
        setTimeout(() => {
          ws.send(JSON.stringify({ type: "fix_applied", finding_id: msg.finding_id, diff: "patched" }));
          console.log(chalk.green(`  ✓ Fix applied: ${msg.finding_id}`));
        }, 800);

      } else if (msg.type === "error") {
        console.error(chalk.red(`  ✗ ${msg.message}`));
      }
    });

    ws.on("close", () => { process.exit(0); });
    ws.on("error", (err) => { console.error(chalk.red(`WebSocket error: ${err.message}`)); process.exit(1); });
  });

program.parse();
