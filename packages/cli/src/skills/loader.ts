import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getSearchPaths(): string[] {
  return [
    resolve(__dirname, "../../../..", "skills"),
    join(process.cwd(), ".pi", "skills"),
    join(process.cwd(), ".agents", "skills"),
    join(process.cwd(), "skills"),
  ];
}

export async function loadSkill(name: string): Promise<string | null> {
  for (const dir of getSearchPaths()) {
    const md = join(dir, name, "SKILL.md");
    if (existsSync(md)) return readFileSync(md, "utf-8");
    const direct = join(dir, `${name}.md`);
    if (existsSync(direct)) return readFileSync(direct, "utf-8");
  }
  return null;
}

export function listSkills(): string[] {
  const found = new Set<string>();
  for (const dir of getSearchPaths()) {
    if (!existsSync(dir)) continue;
    try { for (const e of readdirSync(dir, { withFileTypes: true })) { if (e.isDirectory() && existsSync(join(dir, e.name, "SKILL.md"))) found.add(e.name); } } catch { /* */ }
  }
  return [...found].sort();
}
