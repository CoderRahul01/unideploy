/**
 * Deploy command handler — detects stack, asks minimal questions,
 * streams AI-generated deployment config files from the backend.
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import chalk from "chalk";

export interface StackInfo {
  frontend: string;
  backend: string;
  db: string;
  runtime: string;
  inferred_targets: string[];
}

export interface Question {
  key: string;
  question: string;
  options: string[];
  default: string | null;
}

interface ConfigFileEvent {
  type: "config_file";
  path: string;
  content: string;
  description: string;
}

interface StatusEvent {
  type: "status";
  message: string;
}

interface CompleteEvent {
  type: "complete";
  files_generated: number;
}

interface ErrorEvent {
  type: "error";
  message: string;
}

type SSEEvent = ConfigFileEvent | StatusEvent | CompleteEvent | ErrorEvent;

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function askQuestion(rl: readline.Interface, q: Question): Promise<string> {
  const optionStr = q.options.length > 0 ? ` (${q.options.join(" / ")})` : "";
  const defaultStr = q.default ? ` [${q.default}]` : "";
  const answer = await prompt(rl, `  ${chalk.white(q.question)}${optionStr}${defaultStr}: `);
  return answer.trim() || q.default || "";
}

export async function runDeploy(options: {
  local: boolean;
  dryRun: boolean;
  platform?: string;
  manifest: dict;
  apiBaseUrl: string;
}): Promise<void> {
  const { manifest, apiBaseUrl, dryRun, platform } = options;

  console.log("");
  console.log(chalk.bold("● UniDeploy DeployAgent"));
  console.log("");

  // ── Step 1: Get stack + questions from backend ────────────────────────────

  let stackInfo: StackInfo;
  let questions: Question[];

  try {
    const planRes = await fetch(`${apiBaseUrl}/api/v1/deploy/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manifest }),
    });
    if (!planRes.ok) throw new Error(await planRes.text());
    const plan = await planRes.json() as { stack: StackInfo; questions: Question[] };
    stackInfo = plan.stack;
    questions = plan.questions;
  } catch (err) {
    console.error(chalk.red(`  ✗ Could not reach deploy API: ${err}`));
    process.exit(1);
  }

  // Override target if --platform flag provided
  if (platform) {
    stackInfo.inferred_targets = [platform];
    questions = questions.filter(q => q.key !== "targets");
  }

  // ── Step 2: Print detected stack ─────────────────────────────────────────

  const stackDisplay = [stackInfo.frontend, stackInfo.backend, stackInfo.db]
    .filter(s => s && s !== "none" && s !== "unknown")
    .join(" + ");
  const targetsDisplay = stackInfo.inferred_targets.join(", ");

  console.log(chalk.gray(`  Detected: ${stackDisplay || "generic"} → ${targetsDisplay}`));
  console.log("");

  // ── Step 3: Ask clarifying questions (only those from backend) ────────────

  const answers: Record<string, string> = {};

  if (questions.length > 0) {
    console.log(chalk.white("  A few quick questions:"));
    console.log("");

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      for (const q of questions) {
        answers[q.key] = await askQuestion(rl, q);
      }
    } finally {
      rl.close();
    }
    console.log("");
  }

  // ── Step 4: Stream config generation via SSE ──────────────────────────────

  const generatedFiles: { path: string; description: string }[] = [];

  try {
    const genRes = await fetch(`${apiBaseUrl}/api/v1/deploy/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manifest,
        stack: stackInfo,
        answers,
      }),
    });

    if (!genRes.ok || !genRes.body) {
      throw new Error(await genRes.text().catch(() => `HTTP ${genRes.status}`));
    }

    const reader = genRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let event: SSEEvent;
        try {
          event = JSON.parse(line.slice(6));
        } catch { continue; }

        if (event.type === "status") {
          console.log(chalk.gray(`  ${event.message}`));
        } else if (event.type === "config_file") {
          if (dryRun) {
            console.log("");
            console.log(`  ${chalk.green("→")} ${chalk.white(event.path)} ${chalk.gray(`— ${event.description}`)}`);
            console.log(chalk.gray("─".repeat(60)));
            console.log(chalk.gray(event.content.split("\n").map(l => "  " + l).join("\n")));
          } else {
            const fullPath = path.join(process.cwd(), event.path);
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, event.content, "utf-8");
            console.log(`  ${chalk.green("✓")} ${chalk.white(event.path)} ${chalk.gray(`— ${event.description}`)}`);
            generatedFiles.push({ path: event.path, description: event.description });
          }
        } else if (event.type === "error") {
          console.error(chalk.red(`  ✗ ${event.message}`));
        } else if (event.type === "complete") {
          // handled below
        }
      }
    }
  } catch (err) {
    console.error(chalk.red(`  ✗ Config generation failed: ${err}`));
    process.exit(1);
  }

  // ── Step 5: Summary ──────────────────────────────────────────────────────

  console.log("");
  if (dryRun) {
    console.log(chalk.yellow("  (dry run — no files written)"));
  } else if (generatedFiles.length > 0) {
    console.log(`  ${chalk.green(`✓ ${generatedFiles.length} config file${generatedFiles.length !== 1 ? "s" : ""} generated`)}`);
    console.log(chalk.gray("  Review and commit:"));
    console.log(chalk.gray(`    git add ${generatedFiles.map(f => f.path).join(" ")}`));
    console.log(chalk.gray("    git commit -m 'chore: add deployment configs'"));
  } else {
    console.log(chalk.yellow("  No config files were generated."));
  }
  console.log("");
}

// Workaround: TypeScript `dict` type alias used in parameter types above
type dict = Record<string, unknown>;
