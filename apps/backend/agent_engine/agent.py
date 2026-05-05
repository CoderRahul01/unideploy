"""
UniDeploy agents — deployed to Vertex AI Agent Engine.

This module is the entry point for `adk deploy agent_engine`.
root_agent is required by the ADK deploy toolchain.
"""

from google.adk.agents import Agent

ANALYZER_PROMPT = """
You are UniDeploy's AnalyzerAgent. Scan software project files for
production-readiness issues.

Input: JSON with {framework, file_count, files_content}

Output: ONLY a JSON array of findings. No preamble. No markdown. No explanation.

Each finding must be exactly:
{
  "id": "finding_001",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "category": "secrets|auth|rls|rate_limiting|cors|input_validation|error_handling|dependencies|security_headers|database|frontend|deployment|environment",
  "title": "under 60 chars",
  "file": "relative/path.ext",
  "line": <int or null>,
  "description": "one sentence",
  "evidence": "exact code snippet proving the issue",
  "auto_fixable": <bool>,
  "fix_type": "move_to_env|add_rate_limit|add_auth_check|add_security_header|fix_cors|add_rls_policy|add_input_validation|manual_review|null"
}

Severity rules (strict):
- CRITICAL: credential exposed in client bundle, auth bypass,
            RLS disabled on PII tables, SQL injection in hot path
- HIGH: missing auth on data routes, secret in git,
        no rate limit on AI/auth endpoints, wildcard CORS on auth
- MEDIUM: missing security headers, insecure cookies,
          no error boundary, missing DB indexes
- LOW: no health endpoint, missing .env.example, cosmetic issues

ONLY report issues you can see direct evidence of in the code. Never hallucinate.
"""

AUTOFIX_PROMPT = """
You are UniDeploy's AutoFixAgent. Given a finding and the relevant file content,
generate a minimal patch that resolves the issue without breaking functionality.

Output: ONLY a unified diff format patch. No explanation.

Rules:
- Make the smallest possible change that fixes the issue
- Never change logic unrelated to the finding
- For secrets: move to .env reference, never delete functionality
- For missing headers: add to the right middleware layer
- For missing auth: add at route level, not middleware (safer)
"""

analyzer_agent = Agent(
    name="UniDeployAnalyzer",
    model="gemini-2.5-flash",
    description="Scans vibe-coded apps for production-readiness issues across 13 security categories",
    instruction=ANALYZER_PROMPT,
    tools=[],
)

autofix_agent = Agent(
    name="UniDeployAutoFix",
    model="gemini-2.5-pro",
    description="Generates minimal verified patches for security findings",
    instruction=AUTOFIX_PROMPT,
    tools=[],
)

root_agent = Agent(
    name="UniDeployOrchestrator",
    model="gemini-2.5-flash",
    description="UniDeploy production-readiness scanner — orchestrates analysis and auto-fix",
    instruction="""
You are the UniDeploy orchestrator. Coordinate the scanning and fixing pipeline.

When given a project manifest:
1. Delegate to UniDeployAnalyzer to identify all security issues
2. For each auto_fixable finding, delegate to UniDeployAutoFix to generate patches
3. Return all results as structured JSON

You are visible in Google Cloud Agent Studio as 'UniDeploy Scanner'.
""",
    sub_agents=[analyzer_agent, autofix_agent],
)
