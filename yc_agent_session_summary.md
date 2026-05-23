# YC Summer 2026: AI Coding Agent Session 

**Project:** UniDeploy (Production-Readiness Security Scanner for Vibe-Coded Apps)
**Agent Used:** Google DeepMind Advanced Agentic Coding (Antigravity IDE)

### The Challenge
We initially built UniDeploy using a standard architecture: a CLI that performed a fast, shallow static scan locally and pushed results to a web dashboard. However, we realized that for complex AI-generated codebases, static regex rules were insufficient. We needed deep, dynamic context analysis using an LLM, but uploading entire codebases to our backend was slow, breached privacy limits, and hit payload caps.

### The Agentic Solution
I worked with my AI agent to completely overhaul the system into a modern **Claude Code / Cursor-style interactive agent paradigm**, using LangGraph and the Model Context Protocol (MCP) over a persistent WebSocket tunnel.

### How the AI Agent Helped (Step-by-Step)
1. **Architectural Pivot:** The agent and I discussed the limitations of local static scans. The agent proposed a radical shift: instead of compressing and uploading the codebase, the CLI would act as a *local MCP Server*. 
2. **CLI Scaffolding (Phase 1):** The agent autonomously installed the `@modelcontextprotocol/sdk` into our Node.js CLI, built a custom `WebSocketClientTransport`, and wired it to our existing backend WebSocket connection so the CLI could securely expose `list_files` and `read_file` tools.
3. **LangGraph Backend Migration (Phase 2):** The agent completely rewrote our FastAPI backend to use **LangGraph**. It implemented an asynchronous `LocalMCPClient` proxy in Python that allowed the LangGraph `ResearchAgent` to ping the CLI over the active WebSocket, dynamically explore the local filesystem, and ingest critical codebase context without ever requiring a bulk upload.
4. **Context-Aware Remediation (Phase 3):** Leveraging Gemini's massive context window, the agent rewrote our `PlanningAgent` to generate a highly specific, codebase-aware `skill.md` playbook. It then implemented real-time streaming to push this markdown artifact directly to the user's terminal UI, just like Windsurf or Cursor.
5. **Dashboard Sync (Phase 4):** Finally, the agent wired the LangGraph final state into our InsForge (PostgreSQL) database, syncing the `skill.md` and historical scan results so non-technical founders could monitor pipeline security regressions on the web dashboard.

### Why I'm Proud of This Session
The AI agent didn't just write boilerplate code; it successfully orchestrated a highly complex distributed systems problem. It built a cross-language (TypeScript CLI + Python FastAPI) asynchronous RPC tunnel over WebSockets, fully integrating the cutting-edge Model Context Protocol (MCP) with LangGraph. It acted as a true senior engineer, debating architectural tradeoffs (Upload vs. MCP) and executing the entire migration flawlessly across the stack.
