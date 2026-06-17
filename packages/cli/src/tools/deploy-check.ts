import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

interface Check { name: string; status: "pass" | "fail" | "warn" | "skip"; severity?: "critical" | "high" | "medium"; detail: string; fix?: string; }

const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", "__pycache__"]);
const CODE = new Set([".ts", ".tsx", ".js", ".jsx"]);
function walk(dir: string): string[] { const f: string[] = []; try { for (const e of readdirSync(dir, { withFileTypes: true })) { if (e.isDirectory() && !SKIP.has(e.name)) f.push(...walk(join(dir, e.name))); else if (e.isFile() && CODE.has(extname(e.name))) f.push(join(dir, e.name)); } } catch { /* */ } return f; }
function grep(root: string, re: RegExp): { found: boolean; file?: string; line?: number } {
  for (const file of walk(root)) { try { const c = readFileSync(file, "utf-8"); re.lastIndex = 0; const m = re.exec(c); if (m) return { found: true, file: relative(root, file), line: c.slice(0, m.index).split("\n").length }; } catch { /* */ } }
  return { found: false };
}

const schema = Type.Object({ repoPath: Type.Optional(Type.String({ description: "Project root. Defaults to cwd." })) });

export const deployCheckTool: AgentTool<typeof schema> = {
  name: "deploy_check",
  label: "Deploy check",
  description: "Pre-deployment checklist: CORS, rate limiting, HTTPS, error handling, dependencies.",
  parameters: schema,
  async execute(_id, params: Static<typeof schema>) {
    const root = resolve(process.cwd(), params.repoPath ?? ".");
    if (!existsSync(root)) throw new Error(`Not found: ${root}`);
    const checks: Check[] = [];
    const gi = join(root, ".gitignore");
    if (existsSync(gi)) { const c = readFileSync(gi, "utf-8"); checks.push(c.includes(".env") ? { name: ".env gitignored", status: "pass", detail: ".env is gitignored." } : { name: ".env gitignored", status: "fail", severity: "critical", detail: ".env NOT gitignored.", fix: 'Add ".env\n.env.*" to .gitignore' }); }
    else checks.push({ name: ".gitignore exists", status: "fail", severity: "high", detail: "No .gitignore", fix: "Create .gitignore" });
    checks.push(existsSync(join(root, ".env.example")) || existsSync(join(root, ".env.sample")) ? { name: ".env.example", status: "pass", detail: "Present." } : { name: ".env.example", status: "warn", severity: "medium", detail: "No .env.example", fix: "Create .env.example with placeholder values." });
    const cors = grep(root, /cors\([^)]*origin\s*:\s*['"]\*['"]/);
    checks.push(cors.found ? { name: "CORS not wildcard", status: "fail", severity: "high", detail: `Wildcard CORS in ${cors.file}:${cors.line}`, fix: "Set specific origin." } : { name: "CORS not wildcard", status: "pass", detail: "No wildcard CORS." });
    const rl = grep(root, /rateLimit|rate-limit|@upstash\/ratelimit/i);
    checks.push(rl.found ? { name: "Rate limiting", status: "pass", detail: `Found in ${rl.file}` } : { name: "Rate limiting", status: "fail", severity: "high", detail: "No rate limiting.", fix: "Add @upstash/ratelimit or Cloudflare WAF rules." });
    const http = grep(root, /http:\/\/(?!localhost|127\.0\.0\.1)/);
    checks.push(http.found ? { name: "No hardcoded HTTP", status: "warn", severity: "medium", detail: `http:// in ${http.file}:${http.line}`, fix: "Use https:// or env var." } : { name: "No hardcoded HTTP", status: "pass", detail: "None found." });
    const tc = grep(root, /try\s*\{/);
    checks.push(tc.found ? { name: "Error handling", status: "pass", detail: "try/catch found." } : { name: "Error handling", status: "warn", severity: "medium", detail: "No error handling.", fix: "Add try/catch, ErrorBoundary." });
    if (existsSync(join(root, "package.json"))) { try { const a = JSON.parse(execSync("npm audit --json 2>/dev/null || true", { cwd: root, encoding: "utf-8", timeout: 20_000 })); const v = (a as { metadata?: { vulnerabilities?: { critical?: number; high?: number } } })?.metadata?.vulnerabilities ?? {}; const c = v.critical ?? 0; const h = v.high ?? 0; checks.push(c > 0 ? { name: "npm audit", status: "fail", severity: "critical", detail: `${c} critical, ${h} high`, fix: "npm audit fix" } : h > 0 ? { name: "npm audit", status: "warn", severity: "high", detail: `${h} high`, fix: "npm audit fix" } : { name: "npm audit", status: "pass", detail: "No critical/high vulns." }); } catch { checks.push({ name: "npm audit", status: "skip", detail: "Could not run." }); } }
    const fails = checks.filter(c => c.status === "fail"); const warns = checks.filter(c => c.status === "warn"); const crit = fails.filter(c => c.severity === "critical").length;
    const grade = crit > 0 ? "F" : fails.length > 2 ? "D" : fails.length > 0 ? "C" : warns.length > 2 ? "C" : warns.length > 0 ? "B" : "A";
    const result = { grade, summary: `${checks.filter(c => c.status === "pass").length} pass, ${fails.length} fail, ${warns.length} warn`, checks, deploy_blocked: crit > 0 || fails.length > 2, recommendation: crit > 0 ? "🚨 DO NOT DEPLOY." : fails.length > 0 ? "⚠️  Fix before deploying." : "✅  Ready." };
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], details: result };
  },
};
