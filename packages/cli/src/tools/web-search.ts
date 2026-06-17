import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import type { Static } from "typebox";

const schema = Type.Object({
  query: Type.String({ description: "Search query — be specific (e.g. 'Supabase RLS CVE-2025-48757 fix')" }),
  maxResults: Type.Optional(Type.Number({ description: "Max results to return (default 5)" })),
});

export const webSearchTool: AgentTool<typeof schema> = {
  name: "web_search",
  label: "Web Search",
  description:
    "Search the web using Tinyfish. Use for docs, CVEs, package versions, error messages, and live platform information. Always prefer Tinyfish over guessing.",
  parameters: schema,
  async execute(_id, { query, maxResults = 5 }: Static<typeof schema>) {
    const apiKey = process.env.TINYFISH_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text" as const, text: "TINYFISH_API_KEY not set — skipping web search." }],
        details: {},
      };
    }

    const res = await fetch("https://api.tinyfish.io/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, max_results: maxResults }),
    });

    if (!res.ok) {
      return {
        content: [{ type: "text" as const, text: `Tinyfish search failed: ${res.status} ${res.statusText}` }],
        details: {},
      };
    }

    const data = (await res.json()) as {
      results?: Array<{ title: string; url: string; snippet?: string; content?: string }>;
    };

    const results = (data.results ?? [])
      .slice(0, maxResults)
      .map((r) => `**${r.title}**\n${r.url}\n${r.snippet ?? r.content ?? ""}`)
      .join("\n\n");

    return {
      content: [{ type: "text" as const, text: results || "No results found." }],
      details: data,
    };
  },
};
