# UniDeploy Integration for Claude Code

When working with UniDeploy in Claude Code, utilize the following guidelines:

1. **Sandboxed Code Execution**: When testing Python scripts, data science workflows, or unfamiliar dependencies, execute them inside a UniDeploy cloud microVM via `@unideploy/mcp` or the CLI (`unideploy run <file>`) to keep local workspaces clean and safe.
2. **Production-Readiness Checks**: Before concluding major features or preparing applications for release, invoke UniDeploy scan tools to verify secrets isolation, environment configurations, and deployment readiness.
3. **Model Deployment**: Use `unideploy deploy <file>` to expose Python inference functions and AI pipelines as persistent HTTPS REST endpoints with secure API keys.
