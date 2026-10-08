# UniDeploy Model Context Protocol Server (`apps/mcp`)

**Model Context Protocol (MCP) Server for Cursor, Claude Code & AI Coding Agents**

[![MCP](https://img.shields.io/badge/MCP-Protocol%201.0.0-purple.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

The official Model Context Protocol (MCP) server for [unideploy.in](https://www.unideploy.in). Connect autonomous coding agents, Cursor, Claude Code, and Windsurf directly to UniDeploy's cloud sandboxes and deployment platform.

---

## ⚡ Key Capabilities

- **Execute Sandboxed Code**: Run AI-generated Python scripts inside quarantined E2B Firecracker microVMs without exposing local developer filesystems.
- **Repository Readiness Scans**: Trigger full security and deployment readiness scans on GitHub repositories or local manifests.
- **Automated Fix Generation**: Request verified patches and remediation plans for detected vulnerabilities.
- **Model Deployment**: Instruct your AI assistant to deploy Python microservices directly from your editor.

---

## 🚀 Setup & Configuration

### 1. Cursor Integration
Add to your project or global `~/.cursor/mcp.json`:

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

### 2. Claude Desktop Integration
Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

## 🛠️ Available MCP Tools

| Tool | Description |
|---|---|
| `scan_repo` | Queue an analysis scan of a public or private GitHub repository |
| `get_findings` | Retrieve severity-ranked findings from an active or completed scan |
| `get_remediation_plan` | Get an AI-generated remediation plan for detected issues |
| `apply_fixes` | Generate verified patch code or open a pull request |
| `get_deployment_status` | Retrieve status, metrics, and health of a deployed model endpoint |
| `rotate_secret` | Provide secure, step-by-step guidance to rotate exposed credentials |

---

## 💻 Local Development

```bash
# Navigate to MCP package
cd apps/mcp

# Run in development mode
npm run dev

# Build production bundle
npm run build
```
