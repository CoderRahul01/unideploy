import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

const schema = Type.Object({
  path: Type.String({ description: "File path to create or overwrite" }),
  content: Type.String({ description: "Full file content" }),
});

export const writeTool: AgentTool<typeof schema> = {
  name: "write",
  label: "Write file",
  description: "Write or create a file. Creates parent directories if needed.",
  parameters: schema,
  async execute(_id, params: Static<typeof schema>) {
    const abs = resolve(process.cwd(), params.path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, params.content, "utf-8");
    return {
      content: [{ type: "text" as const, text: `Written: ${abs}` }],
      details: { path: abs, bytes: Buffer.byteLength(params.content) },
    };
  },
};
