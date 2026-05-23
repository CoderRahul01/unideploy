import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

export function createMCPServer(workspaceRoot: string) {
  const server = new Server(
    {
      name: "unideploy-local-context",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 1. List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_files",
          description: "List all files in the current workspace, respecting .gitignore.",
          inputSchema: {
            type: "object",
            properties: {
              directory: {
                type: "string",
                description: "Optional relative directory to list. Defaults to the workspace root.",
              },
            },
          },
        },
        {
          name: "read_file",
          description: "Read the full text content of a file in the workspace.",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description: "The path to the file relative to the workspace root.",
              },
            },
            required: ["filePath"],
          },
        },
      ],
    };
  });

  // 2. Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "list_files") {
      const dirArg = (args?.directory as string) || ".";
      const fullPath = path.resolve(workspaceRoot, dirArg);
      
      // Ensure we don't escape the workspace
      if (!fullPath.startsWith(path.resolve(workspaceRoot))) {
        return {
          content: [{ type: "text", text: "Error: Directory traversal is not allowed." }],
          isError: true,
        };
      }

      try {
        // Very simple implementation for now. You'd want to use the ignore pattern logic from index.ts.
        // For brevity, we'll read recursively up to a depth, or just let the backend use it smartly.
        const files: string[] = [];
        const walk = (dir: string) => {
          const list = fs.readdirSync(dir);
          for (const file of list) {
            if (file === "node_modules" || file === ".git" || file === ".next") continue;
            const absolutePath = path.join(dir, file);
            const stat = fs.statSync(absolutePath);
            if (stat.isDirectory()) {
              walk(absolutePath);
            } else {
              files.push(path.relative(workspaceRoot, absolutePath));
            }
          }
        };
        walk(fullPath);
        return {
          content: [{ type: "text", text: files.join("\n") }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error listing files: ${err.message}` }],
          isError: true,
        };
      }
    }

    if (name === "read_file") {
      const filePath = args?.filePath as string;
      if (!filePath) {
        return { content: [{ type: "text", text: "Missing filePath argument" }], isError: true };
      }

      const fullPath = path.resolve(workspaceRoot, filePath);
      
      // Ensure we don't escape the workspace
      if (!fullPath.startsWith(path.resolve(workspaceRoot))) {
        return {
          content: [{ type: "text", text: "Error: Directory traversal is not allowed." }],
          isError: true,
        };
      }

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        return {
          content: [{ type: "text", text: content }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error reading file: ${err.message}` }],
          isError: true,
        };
      }
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  return server;
}
