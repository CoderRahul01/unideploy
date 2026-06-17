import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

const schema = Type.Object({
  path: Type.String({ description: "File to edit" }),
  old_str: Type.String({ description: "Exact string to replace (must appear exactly once)" }),
  new_str: Type.String({ description: "Replacement string" }),
});

export const editTool: AgentTool<typeof schema> = {
  name: "edit",
  label: "Edit file",
  description: "Replace an exact string in a file surgically. Read the file first to get exact content.",
  parameters: schema,
  async execute(_id, params: Static<typeof schema>) {
    const abs = resolve(process.cwd(), params.path);
    const content = await readFile(abs, "utf-8");
    const count = content.split(params.old_str).length - 1;
    if (count === 0) throw new Error(`String not found in ${params.path}`);
    if (count > 1) throw new Error(`String appears ${count} times — be more specific`);
    await writeFile(abs, content.replace(params.old_str, params.new_str), "utf-8");
    return {
      content: [{ type: "text" as const, text: `Edited: ${params.path}` }],
      details: { path: abs },
    };
  },
};
