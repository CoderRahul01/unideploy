import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

interface Finding { file: string; line: number; severity: "critical" | "high" | "medium"; type: string; description: string; fix: string; }

const CHECKS = [
  { type: "rls_disabled",        re: /disable row level security|alter table.{0,60}disable.{0,20}rls/gi, severity: "critical" as const, description: "RLS explicitly disabled", fix: "ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;" },
  { type: "using_true",          re: /USING\s*\(\s*true\s*\)/gi, severity: "critical" as const, description: "USING(true) grants public read access to all rows", fix: "Replace with: USING (auth.uid() = user_id)" },
  { type: "service_role_client", re: /SERVICE_ROLE|service_role/g, severity: "critical" as const, description: "service_role bypasses ALL RLS — must be server-only", fix: "Move to server-only API routes, never frontend." },
];

const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", "__pycache__"]);
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".sql", ".py"]);
function walk(dir: string): string[] {
  const f: string[] = [];
  try { for (const e of readdirSync(dir, { withFileTypes: true })) { if (e.isDirectory() && !SKIP.has(e.name)) f.push(...walk(join(dir, e.name))); else if (e.isFile() && EXTS.has(extname(e.name))) f.push(join(dir, e.name)); } } catch { /* */ }
  return f;
}

const schema = Type.Object({
  repoPath: Type.Optional(Type.String({ description: "Project root. Defaults to cwd." })),
});

export const rlsScanTool: AgentTool<typeof schema> = {
  name: "rls_scan",
  label: "RLS scan",
  description: "Detect Supabase RLS misconfigs: disabled RLS, USING(true), service_role in client.",
  parameters: schema,
  async execute(_id, params: Static<typeof schema>) {
    const root = resolve(process.cwd(), params.repoPath ?? ".");
    if (!existsSync(root)) throw new Error(`Not found: ${root}`);
    const files = walk(root);
    const findings: Finding[] = [];
    let supabaseDetected = false;
    for (const file of files) {
      let content: string;
      try { content = readFileSync(file, "utf-8"); } catch { continue; }
      if (content.includes("supabase") || content.includes("createClient") || content.includes("@supabase")) supabaseDetected = true;
      const rel = relative(root, file);
      for (const { type, re, severity, description, fix } of CHECKS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(content)) !== null) {
          const line = content.slice(0, m.index).split("\n").length;
          findings.push({ file: rel, line, severity, type, description: `${description} — ${rel}:${line}`, fix });
        }
      }
    }
    if (!supabaseDetected) return { content: [{ type: "text" as const, text: "No Supabase usage detected." }], details: { supabase_detected: false, findings: [] } };
    const c = findings.filter(f => f.severity === "critical").length;
    const result = { supabase_detected: true, findings, summary: `${findings.length} RLS findings — ${c} critical`,
      recommendation: c > 0 ? "🚨 CVE-2025-48757 pattern — user data accessible to anyone via direct REST call." : "✅  No obvious RLS issues." };
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], details: result };
  },
};
