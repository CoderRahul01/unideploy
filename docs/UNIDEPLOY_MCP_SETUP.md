# UniDeploy MCP (Model Context Protocol) Setup

Connect your AI coding assistants—including **Cursor**, **Claude Code**, and **Windsurf**—directly to UniDeploy's cloud sandboxes and model deployment infrastructure.

---

## 1. Prerequisites

1. An account on [unideploy.in](https://www.unideploy.in) (activate ₹0 Free Trial with 50,000 free compute tokens).
2. Your UniDeploy API token (obtained by running `unideploy auth` and inspecting `~/.unideploy/auth.json`, or from [unideploy.in/dashboard](https://www.unideploy.in/dashboard)).

---

## 2. Cursor Configuration

Add the following to your Cursor configuration (`~/.cursor/mcp.json` or `.cursor/mcp.json` in your workspace):

```json
{
  "mcpServers": {
    "unideploy": {
      "command": "npx",
      "args": ["-y", "@unideploy/mcp"],
      "env": {
        "UNIDEPLOY_API_KEY": "your_unideploy_token_here",
        "UNIDEPLOY_API_URL": "https://unideploy-api.rahulpandey-creates.workers.dev"
      }
    }
  }
}
```

---

## 3. Claude Code & Claude Desktop Configuration

For Claude Desktop on macOS, edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "unideploy": {
      "command": "npx",
      "args": ["-y", "@unideploy/mcp"],
      "env": {
        "UNIDEPLOY_API_KEY": "your_unideploy_token_here"
      }
    }
  }
}
```

---

## 4. Windsurf Configuration

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "unideploy": {
      "command": "npx",
      "args": ["-y", "@unideploy/mcp"],
      "env": {
        "UNIDEPLOY_API_KEY": "your_unideploy_token_here"
      }
    }
  }
}
```

---

## 5. Available Tools

Once connected, your AI assistant can invoke:
- `scan_repo`: Scan codebases for security and deployment readiness.
- `get_findings`: Retrieve security grades and prioritized findings.
- `get_remediation_plan`: Generate step-by-step remediation guidance.
- `apply_fixes`: Apply verified code fixes to resolve vulnerabilities.
- `get_deployment_status`: Check health and status of deployed cloud models.
- `rotate_secret`: Safe instructions for rotating compromised credentials.
