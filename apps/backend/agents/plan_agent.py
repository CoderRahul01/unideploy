"""
PlanAgent — generates a structured remediation plan for each finding.
Runs pure Gemini reasoning on findings JSON (no sandbox needed).
"""

import json
import os
import asyncio
from google import genai
from google.genai.types import GenerateContentConfig
from services.tinyfish import TinyfishClient

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
USE_VERTEX = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"

PLAN_PROMPT = """You are UniDeploy's Planning Agent. Based on the Research Context from the codebase and the security findings,
generate a highly specific `skill.md` document that contains exact, concrete steps to fix the vulnerabilities.

Research Context:
{research_context}

Findings:
{findings_json}

Output the plan as a single Markdown document formatted as a "skill.md" playbook.
It MUST contain:
1. # Executive Summary (What we are fixing and why)
2. # Action Plan (Checklist of files to touch and what to change)
3. # Code Snippets (Exact drops-in replacements to fix the vulnerabilities without breaking the business logic)
4. # Verification Steps (How the user or agent can test the fix)

Do NOT wrap the output in a markdown code block (like ```markdown), just output the raw markdown text directly.
"""


def _run_plan_sync(research_context: str, findings: list[dict]) -> str:
    if USE_VERTEX:
        client = genai.Client(vertexai=True, project=GOOGLE_CLOUD_PROJECT, location="us-central1")
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = PLAN_PROMPT.format(
        research_context=research_context,
        findings_json=json.dumps(findings, indent=2)
    )
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=GenerateContentConfig(
            temperature=0.2,
        ),
    )
    
    text = response.text.strip()
    if text.startswith("```markdown"):
        text = text[11:]
        if text.endswith("```"):
            text = text[:-3]
    return text.strip()


async def generate_skill_md(research_context: str, findings: list[dict]) -> str:
    """Generate a single skill.md document using Gemini."""
    if not findings:
        return "# No findings to fix.\n"
    
    try:
        return await asyncio.to_thread(_run_plan_sync, research_context, findings)
    except Exception as e:
        return f"# Error generating skill.md\n\n{str(e)}"
