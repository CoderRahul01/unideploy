import { execSync } from "node:child_process";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

const BLOCKED = ["rm -rf /", "sudo rm -rf", "mkfs", ":(){:|:&};:"];

const schema = Type.Object({
  command: Type.String({ description: "Shell command to run" }),
  cwd: Type.Optional(Type.String({ description: "Working directory" })),
  timeout: Type.Optional(Type.Number({ description: "Timeout seconds (default: 30)" })),
});

export const bashTool: AgentTool<typeof schema> = {
  name: "bash",
  label: "Run command",
  description: "Run a shell command. For git, npm, grep, file listings.",
  parameters: schema,
  async execute(_id, params: Static<typeof schema>, signal) {
    for (const b of BLOCKED) if (params.command.includes(b)) throw new Error(`Blocked: ${b}`);
    if (signal?.aborted) throw new Error("aborted");
    try {
      const out = execSync(params.command, {
        cwd: params.cwd ?? process.cwd(),
        encoding: "utf-8",
        timeout: (params.timeout ?? 30) * 1000,
        maxBuffer: 5 * 1024 * 1024,
      });
      return { content: [{ type: "text" as const, text: out.trim() || "(no output)" }], details: { exit: 0 } };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      const out = [e.stdout, e.stderr, e.message].filter(Boolean).join("\n").trim();
      return { content: [{ type: "text" as const, text: out || "Command failed" }], details: { exit: 1 } };
    }
  },
};
