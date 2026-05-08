/**
 * AI fix handler — applies backend-generated patches to local files and re-scans.
 * Called by the init command WebSocket loop when an apply_fix message arrives.
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";

export interface AIPatch {
  file_path: string;
  new_content: string | null;
  change_summary: string;
}

export interface ApplyFixMessage {
  type: "apply_fix";
  findings: Array<{
    id: string;
    file_path: string;
    line_number?: number | null;
    severity: string;
    category: string;
    title: string;
    description: string;
    fix_guideline?: string;
    fix_hint?: string;
    snippet?: string;
    evidence?: string;
    auto_fixable: boolean;
  }>;
  session_id: string;
}

export interface FixResult {
  fixed_ids: string[];
  diff_summaries: string[];
  failed_ids: string[];
}

/**
 * For each finding, read the local file, call the AI patch endpoint,
 * write the patched content, then return the list of fixed finding IDs.
 */
export async function applyAIPatches(
  msg: ApplyFixMessage,
  projectRoot: string,
  apiBaseUrl: string,
): Promise<FixResult> {
  const fixed_ids: string[] = [];
  const diff_summaries: string[] = [];
  const failed_ids: string[] = [];

  console.log("");
  console.log(chalk.bold(`● UniDeploy FixAgent — patching ${msg.findings.length} issue${msg.findings.length !== 1 ? "s" : ""}...`));

  for (const finding of msg.findings) {
    const label = `${severityLabel(finding.severity)} ${finding.title.slice(0, 44)}`;
    const filePath = path.join(projectRoot, finding.file_path);

    // Read current file content
    let fileContent: string;
    try {
      fileContent = fs.readFileSync(filePath, "utf-8");
    } catch {
      console.log(`  ${chalk.gray("–")} ${label}`);
      console.log(chalk.gray(`    Could not read ${finding.file_path} — skipping`));
      failed_ids.push(finding.id);
      continue;
    }

    // Call backend AI patch endpoint
    let patch: AIPatch | null = null;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/ai/patch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding: {
            id: finding.id,
            file: finding.file_path,
            file_path: finding.file_path,
            line_number: finding.line_number,
            severity: finding.severity,
            category: finding.category,
            title: finding.title,
            description: finding.description,
            fix_guideline: finding.fix_guideline || finding.fix_hint || "",
            evidence: finding.evidence || finding.snippet || "",
          },
          file_content: fileContent,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(body);
      }
      patch = (await res.json()) as AIPatch;
    } catch (err) {
      console.log(`  ${chalk.gray("–")} ${label}`);
      console.log(chalk.gray(`    AI patch failed: ${err}`));
      failed_ids.push(finding.id);
      continue;
    }

    if (!patch.new_content) {
      console.log(`  ${chalk.gray("–")} ${label}`);
      console.log(chalk.gray(`    FixAgent: ${patch.change_summary}`));
      failed_ids.push(finding.id);
      continue;
    }

    // Back up original and write patch
    try {
      const backupPath = filePath + ".unideploy.bak";
      fs.writeFileSync(backupPath, fileContent, "utf-8");
      fs.writeFileSync(filePath, patch.new_content, "utf-8");
      console.log(`  ${chalk.green("✓")} ${label}`);
      console.log(chalk.gray(`    ${patch.change_summary}`));
      fixed_ids.push(finding.id);
      diff_summaries.push(`${finding.file_path}: ${patch.change_summary}`);
    } catch (err) {
      console.log(`  ${chalk.gray("–")} ${label}`);
      console.log(chalk.gray(`    Could not write ${finding.file_path}: ${err}`));
      failed_ids.push(finding.id);
    }
  }

  if (fixed_ids.length > 0) {
    console.log("");
    console.log(`  ${chalk.green(`✓ ${fixed_ids.length} patch${fixed_ids.length !== 1 ? "es" : ""} applied`)}`);
    console.log(chalk.gray("  Backups saved as .unideploy.bak alongside each patched file."));
    console.log(chalk.gray("  Review changes with: git diff"));
  }
  if (failed_ids.length > 0) {
    console.log(chalk.yellow(`  ⚠ ${failed_ids.length} could not be patched — manual review required`));
  }
  console.log("");

  return { fixed_ids, diff_summaries, failed_ids };
}

/**
 * Re-run heuristics on changed files and return updated finding list.
 * Imports the scanner inline to avoid circular dependencies.
 */
export async function rescanAfterFix(
  changedFilePaths: string[],
  projectRoot: string,
  existingFindings: unknown[],
  runHeuristics: (files: { path: string; content: string }[], root: string) => unknown[],
): Promise<unknown[]> {
  const changedFiles: { path: string; content: string }[] = [];
  for (const rel of changedFilePaths) {
    const full = path.join(projectRoot, rel);
    try {
      changedFiles.push({ path: rel, content: fs.readFileSync(full, "utf-8") });
    } catch { /* file may have been removed */ }
  }

  if (changedFiles.length === 0) return existingFindings;

  const newFindings = runHeuristics(changedFiles, projectRoot);
  const changedSet = new Set(changedFilePaths);

  // Replace findings for changed files with new results
  const unchanged = (existingFindings as Array<{ file_path?: string }>).filter(
    f => !changedSet.has(f.file_path ?? "")
  );

  return [...unchanged, ...newFindings];
}

function severityLabel(s: string): string {
  const n = s.toLowerCase();
  if (n === "critical") return chalk.red.bold("[CRITICAL]");
  if (n === "high")     return chalk.yellow.bold("[HIGH]    ");
  if (n === "medium")   return chalk.white("[MEDIUM]  ");
  return chalk.gray("[LOW]     ");
}
