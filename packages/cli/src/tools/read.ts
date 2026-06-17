import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

const schema = Type.Object({
  path: Type.String({ description: "Path to read (relative to cwd or absolute)" }),
});

export const readTool: AgentTool<typeof schema> = {
  name: "read",
  label: "Read file",
  description: "Read a file. Always read before editing to understand full context.",
  parameters: schema,
  async execute(_id, params: Static<typeof schema>) {
    const abs = resolve(process.cwd(), params.path);
    const content = await readFile(abs, "utf-8");
    return {
      content: [{ type: "text" as const, text: content }],
      details: { path: abs, lines: content.split("\n").length },
    };
  },
};
