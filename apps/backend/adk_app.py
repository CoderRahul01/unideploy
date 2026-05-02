"""
UniDeploy ADK Application — deployed to Gemini Enterprise Agent Runtime.

Deploy command:
  adk deploy agent_engine \\
    --project=$GOOGLE_CLOUD_PROJECT \\
    --region=us-central1 \\
    --display_name="UniDeploy Scanner" \\
    .

After deployment, the agent appears in:
  console.cloud.google.com -> Vertex AI -> Agent Builder -> Agents
"""

from google.adk.agents import Agent

# ── AnalyzerAgent ─────────────────────────────────────────────────────────────

ANALYZER_PROMPT = """
You are UniDeploy's AnalyzerAgent. Scan software project files for
production-readiness issues.

Input: JSON with {framework, files: [{path, content}]}

Output: ONLY a JSON array of findings. No preamble. No explanation.

Each finding:
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

ONLY report issues you can see evidence of. Never hallucinate.
"""

analyzer_agent = Agent(
    name="UniDeployAnalyzer",
    model="gemini-2.5-flash",
    description="Scans vibe-coded app projects for production-readiness issues across 13 categories",
    instruction=ANALYZER_PROMPT,
    tools=[],
)

# ── AutoFixAgent ──────────────────────────────────────────────────────────────

AUTOFIX_PROMPT = """
You are UniDeploy's AutoFixAgent. Given a finding and the relevant file content,
generate a minimal patch that resolves the issue without breaking existing functionality.

Output: ONLY a unified diff format patch. No explanation.

Rules:
- Make the smallest possible change that fixes the issue
- Never change logic that is not related to the finding
- For secrets: move to .env reference, never delete functionality
- For missing headers: add to the right middleware layer
- For missing auth: add at route level, not middleware (safer)
"""

autofix_agent = Agent(
    name="UniDeployAutoFix",
    model="gemini-2.5-pro",
    description="Generates verified patches for production-readiness issues found by AnalyzerAgent",
    instruction=AUTOFIX_PROMPT,
    tools=[],
)

# ── Root agent (orchestrator — visible in Agent Studio) ───────────────────────

root_agent = Agent(
    name="UniDeployOrchestrator",
    model="gemini-2.5-flash",
    description="UniDeploy production-readiness scanner — orchestrates analysis and auto-fix agents",
    instruction="""
You are the UniDeploy orchestrator. You coordinate the scanning and fixing pipeline.

When given a project manifest:
1. Delegate to UniDeployAnalyzer to scan for issues
2. For each auto_fixable finding, delegate to UniDeployAutoFix
3. Return the complete results

You are visible in Google Cloud Agent Studio as 'UniDeploy Scanner'.
""",
    sub_agents=[analyzer_agent, autofix_agent],
)
