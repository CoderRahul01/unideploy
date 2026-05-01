#!/usr/bin/env node

/**
 * UniDeploy MCP Server
 *
 * Exposes UniDeploy tools to any MCP-compatible client (Cursor, Claude Code, VS Code).
 *
 * Tools:
 *   unideploy_scan   — Scan a project for production-readiness issues
 *   unideploy_fix    — Apply auto-fixes to flagged issues
 *   unideploy_status — Check plan status and scan usage
 *
 * Configuration (for Cursor / Claude Code):
 * {
 *   "mcpServers": {
 *     "unideploy": {
 *       "command": "npx",
 *       "args": ["-y", "@unideploy/mcp"],
 *       "env": { "UNIDEPLOY_API_KEY": "your_key_here" }
 *     }
 *   }
 * }
 */

// TODO: Implement with @modelcontextprotocol/sdk
// This is a placeholder entry point.

console.error("[UniDeploy MCP] Server starting...");
console.error("[UniDeploy MCP] Tools: unideploy_scan, unideploy_fix, unideploy_status");
console.error("[UniDeploy MCP] Waiting for MCP client connection...");

// Keep process alive
process.stdin.resume();
