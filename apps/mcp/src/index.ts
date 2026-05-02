#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import os from "os";
import path from "path";
import fs from "fs";

const API_URL = process.env.UNIDEPLOY_API_URL ?? "https://api.unideploy.in";

function getApiKey(): string {
  const credPath = path.join(os.homedir(), ".unideploy", "credentials.json");
  try {
    const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
    return creds.api_key ?? "";
  } catch {
    return process.env.UNIDEPLOY_API_KEY ?? "";
  }
}

const server = new Server(
  { name: "unideploy", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "unideploy_scan",
      description:
        "Scan the current project for production-readiness issues. Returns a session code to enter at the dashboard, which then streams findings with severity levels (CRITICAL/HIGH/MEDIUM/LOW), file paths, line numbers, and auto-fix availability.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: {
            type: "string",
            description: "Absolute path to project directory. Defaults to current working directory.",
          },
        },
        required: [],
      },
    },
    {
      name: "unideploy_status",
      description: "Check UniDeploy connection status, plan tier, and scans remaining this month.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "unideploy_fix",
      description:
        "Apply auto-fixes for specific finding IDs. Only works for findings where auto_fixable is true.",
      inputSchema: {
        type: "object",
        properties: {
          finding_ids: {
            type: "array",
            items: { type: "string" },
            description: "List of finding IDs to fix (from unideploy_scan output)",
          },
          session_id: {
            type: "string",
            description: "Session ID from a previous scan",
          },
        },
        required: ["finding_ids", "session_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  if (request.params.name === "unideploy_status") {
    const res = await fetch(`${API_URL}/api/v1/status`, { headers });
    const data = await res.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  if (request.params.name === "unideploy_scan") {
    const projectPath = (request.params.arguments as any)?.project_path ?? process.cwd();
    const res = await fetch(`${API_URL}/api/v1/sessions/create`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        cli_version: "0.1.0-mcp",
        machine_name: os.hostname(),
        project_path: projectPath,
      }),
    });
    const session = await res.json() as any;
    return {
      content: [{
        type: "text",
        text:
          `Scan session created.\n\n` +
          `Session Code: ${session.session_code}\n` +
          `Open https://unideploy.in/connect and enter this code to start the scan.\n\n` +
          `Session ID: ${session.session_id}\n` +
          `(Save the session ID if you want to call unideploy_fix later.)`,
      }],
    };
  }

  if (request.params.name === "unideploy_fix") {
    const args = request.params.arguments as any;
    return {
      content: [{
        type: "text",
        text:
          `Fix request for findings: ${args.finding_ids.join(", ")}\n\n` +
          `Apply fixes in the dashboard:\n` +
          `https://unideploy.in/dashboard?session_id=${args.session_id}`,
      }],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
