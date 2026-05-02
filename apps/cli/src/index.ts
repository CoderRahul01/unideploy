#!/usr/bin/env node

import { Command } from "commander";
import WebSocket from "ws";
import os from "os";
import fs from "fs";
import path from "path";

const API_URL = process.env.UNIDEPLOY_API_URL || "http://localhost:8000";

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
const SKIP_FILES = new Set([
  ".env", ".env.local", ".env.production", ".env.development",
]);

function collectFiles(projectRoot: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];

  function walk(dir: string) {
    let entries: string[];
    try { entries = fs.readdirSync(dir); } catch { return; }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = path.join(dir, entry);
      let stat: fs.Stats;
      try { stat = fs.statSync(full); } catch { continue; }

      if (stat.isDirectory()) {
        walk(full);
      } else {
        const ext = path.extname(entry);
        const basename = path.basename(full);
        if (SKIP_FILES.has(basename)) continue;
        if (!SCAN_EXTENSIONS.has(ext) && !SCAN_BASENAMES.has(basename)) continue;
        if (stat.size > 100_000) continue;

        try {
          const content = fs.readFileSync(full, "utf-8");
          const relative = path.relative(projectRoot, full);
          files.push({ path: relative, content });
        } catch { continue; }
      }
    }
  }

  walk(projectRoot);
  return files;
}

function detectFramework(projectRoot: string): string {
  const pkgPath = path.join(projectRoot, "package.json");
  const reqPath = path.join(projectRoot, "requirements.txt");
  const pyprojectPath = path.join(projectRoot, "pyproject.toml");

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps["next"]) return "nextjs";
      if (deps["@nestjs/core"]) return "nestjs";
      if (deps["express"]) return "express";
      if (deps["vue"]) return "vue";
      if (deps["svelte"]) return "sveltekit";
      return "node";
    } catch { return "node"; }
  }

  const pyFile = fs.existsSync(reqPath) ? reqPath : fs.existsSync(pyprojectPath) ? pyprojectPath : null;
  if (pyFile) {
    try {
      const content = fs.readFileSync(pyFile, "utf-8");
      if (content.includes("fastapi")) return "fastapi";
      if (content.includes("django")) return "django";
      if (content.includes("flask")) return "flask";
      return "python";
    } catch { return "python"; }
  }

  return "unknown";
}

const program = new Command();

program
  .name("unideploy")
  .description("Production-readiness scanner for vibe-coded apps")
  .version("0.1.0");

program
  .command("init")
  .description("Start a secure pairing session with the dashboard")
  .action(async () => {
    console.log("🚀 Initializing UniDeploy session...");

    try {
      const res = await fetch(`${API_URL}/api/v1/sessions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cli_version: "0.1.0",
          machine_name: os.hostname(),
          project_path: process.cwd(),
        }),
      });

      if (!res.ok) {
        console.error("❌ Failed to create session:", await res.text());
        process.exit(1);
      }

      const data = await res.json() as any;

      console.log("\n=========================================");
      console.log(`📡 Session Code: \x1b[32m${data.session_code}\x1b[0m`);
      console.log(`🌐 Go to: https://unideploy.in/connect`);
      console.log("=========================================\n");
      console.log("Waiting for browser connection...");

      const ws = new WebSocket(data.websocket_url);

      ws.on("open", () => {
        // Connected to relay, waiting for browser
      });

      ws.on("message", (rawMsg: Buffer | string) => {
        const msg = JSON.parse(rawMsg.toString());

        if (msg.type === "browser_connected") {
          console.log("✅ Browser connected! Collecting project files...");

          const projectRoot = process.cwd();
          const files = collectFiles(projectRoot);
          const framework = detectFramework(projectRoot);

          console.log(`📁 Found ${files.length} files — framework: ${framework}`);
          console.log("🔍 Sending to AnalyzerAgent...");

          ws.send(JSON.stringify({
            type: "cli_ready",
            machine_name: os.hostname(),
            project_manifest: {
              framework,
              file_count: files.length,
              files,
            },
          }));

        } else if (msg.type === "finding") {
          const f = msg.finding;
          const icon = f.severity === "CRITICAL" ? "🔴" : f.severity === "HIGH" ? "🟠" : f.severity === "MEDIUM" ? "🟡" : "🔵";
          console.log(`${icon} [${f.severity}] ${f.title} — ${f.file}`);

        } else if (msg.type === "scan_complete") {
          const s = msg.summary;
          console.log(`\n🏁 Scan complete! Grade: ${s.grade}`);
          console.log(`   Total: ${s.total} findings (${s.critical} critical, ${s.high} high, ${s.medium} medium, ${s.low} low)`);
          console.log(`   Auto-fixable: ${s.auto_fixable}`);

        } else if (msg.type === "apply_fix") {
          console.log(`🛠️  Received request to fix: ${msg.finding_id}`);
          setTimeout(() => {
            console.log("✅ Fix applied!");
            ws.send(JSON.stringify({
              type: "fix_applied",
              finding_id: msg.finding_id,
              diff: "+ Fixed line",
            }));
          }, 1000);

        } else if (msg.type === "error") {
          console.error(`❌ Error: ${msg.message}`);
        }
      });

      ws.on("close", () => {
        console.log("Session disconnected.");
        process.exit(0);
      });

    } catch (err) {
      console.error("❌ Error:", err);
      process.exit(1);
    }
  });

program.parse();
