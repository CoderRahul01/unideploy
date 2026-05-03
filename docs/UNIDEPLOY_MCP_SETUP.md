# UniDeploy MCP Setup

Use this MCP server configuration with Claude Code or Cursor:

```json
{
  "mcpServers": {
    "unideploy": {
      "command": "npx",
      "args": ["-y", "@unideploy/mcp"],
      "env": { "UNIDEPLOY_API_KEY": "your_key_here" }
    }
  }
}
```

Cursor rules file: `.cursor/rules/unideploy.mdc`

Claude Code snippet: see `docs/CLAUDE_UNIDEPLOY.md`
