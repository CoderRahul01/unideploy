import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

const PATTERNS = [
  { provider: "Anthropic",        re: /sk-ant-[a-zA-Z0-9\-_]{40,}/g,                severity: "critical" },
  { provider: "OpenAI (project)", re: /sk-proj-[a-zA-Z0-9\-_]{40,}/g,               severity: "critical" },
  { provider: "OpenAI",           re: /sk-[a-zA-Z0-9]{48}/g,                          severity: "critical" },
  { provider: "Stripe live",      re: /sk_live_[a-zA-Z0-9]{24,}/g,                   severity: "critical" },
  { provider: "Stripe rkey",      re: /rk_live_[a-zA-Z0-9]{24,}/g,                   severity: "critical" },
  { provider: "AWS access key",   re: /AKIA[A-Z0-9]{16}/g,                            severity: "critical" },
  { provider: "Supabase JWT",     re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9\-_]{40,}/g, severity: "critical" },
  { provider: "Private key PEM",  re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g,     severity: "critical" },
  { provider: "GitHub PAT",       re: /ghp_[a-zA-Z0-9]{36}/g,                        severity: "high" },
  { provider: "GitHub OAuth",     re: /gho_[a-zA-Z0-9]{36}/g,                        severity: "high" },
  { provider: "GitHub App",       re: /ghs_[a-zA-Z0-9]{36}/g,                        severity: "high" },
  { provider: "Google API key",   re: /AIza[a-zA-Z0-9\-_]{35}/g,                     severity: "high" },
  { provider: "Slack bot",        re: /xoxb-[a-zA-Z0-9\-]{50,}/g,                    severity: "high" },
  { provider: "Stripe test",      re: /sk_test_[a-zA-Z0-9]{24,}/g,                   severity: "medium" },
] as const;

const IGNORE_FILES = [
  { file: ".gitignore",            tool: "git" },
  { file: ".dockerignore",         tool: "Docker" },
  { file: ".cursorignore",         tool: "Cursor" },
  { file: ".cursorindexingignore", tool: "Cursor indexer" },
  { file: ".claudeignore",         tool: "Claude Code" },
  { file: ".aiderignore",          tool: "Aider" },
  { file: ".codeiumignore",        tool: "Codeium/Windsurf" },
  { file: ".continueignore",       tool: "Continue" },
  { file: ".clineignore",          tool: "Cline" },
  { file: ".geminiignore",         tool: "Gemini Code Assist" },
  { file: ".copilotignore",        tool: "GitHub Copilot" },
];

const MUST_COVER = [".env", ".env.*", "*.pem", "*.key", "secrets/"];
const SCAN_EXTS = new Set([".env", ".js", ".ts", ".jsx", ".tsx", ".py", ".json", ".yml", ".yaml", ".toml", ".sh"]);
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", "__pycache__", ".venv"]);

const mask = (v: string) => v.slice(0, 6) + "****";
const fp = (v: string) => createHash("sha256").update(v).digest("hex").slice(0, 16);
function entropy(s: string): number {
  const f: Record<string, number> = {};
  for (const c of s) f[c] = (f[c] ?? 0) + 1;
  return Object.values(f).reduce((e, n) => { const p = n / s.length; return e - p * Math.log2(p); }, 0);
}
function walk(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && !SKIP.has(e.name)) files.push(...walk(join(dir, e.name)));
      else if (e.isFile() && (SCAN_EXTS.has(extname(e.name)) || e.name.startsWith(".env"))) files.push(join(dir, e.name));
    }
  } catch { /* skip */ }
  return files;
}

interface Finding {
  file: string; line?: number; severity: "critical" | "high" | "medium" | "low";
  type: string; provider?: string; masked_value?: string; fingerprint?: string;
  description: string; fix: string;
}

const schema = Type.Object({
  repoPath: Type.Optional(Type.String({ description: "Project root to scan. Defaults to cwd." })),
});

export const secretsAuditTool: AgentTool<typeof schema> = {
  name: "secrets_audit",
  label: "Secrets audit",
  description: "Scan for hardcoded API keys, LLM tool ignore gaps, and git history leaks. Plaintext values never returned.",
  parameters: schema,
  async execute(_id, params: Static<typeof schema>) {
    const root = resolve(process.cwd(), params.repoPath ?? ".");
    if (!existsSync(root)) throw new Error(`Not found: ${root}`);
    const findings: Finding[] = [];

    for (const { file, tool } of IGNORE_FILES) {
      const p = join(root, file);
      if (!existsSync(p)) {
        findings.push({ file, severity: "high", type: "ignore_missing",
          description: `${file} missing — ${tool} may read .env files into model context.`,
          fix: `Create ${file}:\n.env\n.env.*\n*.pem\n*.key\nsecrets/` });
      } else {
        const content = readFileSync(p, "utf-8");
        const missing = MUST_COVER.filter(pat => !content.includes(pat.replace(".*", "")));
        if (missing.length > 0) findings.push({ file, severity: "medium", type: "ignore_incomplete",
          description: `${file} missing: ${missing.join(", ")}`, fix: `Add to ${file}:\n${missing.join("\n")}` });
      }
    }

    for (const file of walk(root)) {
      let content: string;
      try { content = readFileSync(file, "utf-8"); } catch { continue; }
      const rel = relative(root, file);
      for (const { provider, re, severity } of PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(content)) !== null) {
          const line = content.slice(0, m.index).split("\n").length;
          findings.push({ file: rel, line, severity, type: "hardcoded_secret", provider,
            masked_value: mask(m[0]), fingerprint: fp(m[0]),
            description: `${provider} key hardcoded in ${rel}:${line}`,
            fix: "Move to .env, then migrate to 1Claw: https://1claw.xyz" });
        }
      }
      if (basename(file).startsWith(".env")) {
        readFileSync(file, "utf-8").split("\n").forEach((line, i) => {
          const m = line.match(/^[A-Z_]+=["']?([^"'\s]{20,})["']?/);
          if (m) {
            const val = m[1];
            const known = PATTERNS.some(p => { p.re.lastIndex = 0; return p.re.test(val ?? ""); });
            if (!known && entropy(val ?? "") >= 4.0) findings.push({ file: rel, line: i + 1, severity: "medium",
              type: "high_entropy_value", masked_value: mask(val ?? ""), fingerprint: fp(val ?? ""),
              description: `High-entropy value in ${rel}:${i + 1} (unknown provider)`,
              fix: "Verify it's a secret, then migrate to 1Claw" });
          }
        });
      }
    }

    try {
      const out = execSync(`git -C "${root}" log --oneline --all -- "*.env" 2>/dev/null | head -3`, { encoding: "utf-8", timeout: 5000 }).trim();
      if (out) findings.push({ file: "git history", severity: "critical", type: "secrets_in_history",
        description: ".env committed to git history — recoverable even if removed.",
        fix: "Rotate ALL keys.\ngit filter-repo --path .env --invert-paths" });
    } catch { /* no git */ }

    const c = findings.filter(f => f.severity === "critical").length;
    const h = findings.filter(f => f.severity === "high").length;
    const grade = c >= 4 ? "F" : c >= 2 ? "D" : c >= 1 ? "C" : h >= 3 ? "C" : h >= 1 ? "B" : "A";
    const result = { grade, summary: `${findings.length} findings — ${c} critical, ${h} high`,
      scanned_files: walk(root).length, findings,
      recommendation: c > 0 ? "🚨 Block deployment. Rotate keys. Run /skill:secrets-1claw for vault migration."
        : h > 0 ? "⚠️  Fix ignore coverage gaps." : "✅  Secrets posture looks clean." };
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], details: result };
  },
};
