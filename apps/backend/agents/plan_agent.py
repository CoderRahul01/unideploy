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

PLAN_PROMPT = """You are UniDeploy's PlanAgent. Given a list of security findings from a code scan,
generate a detailed remediation plan for each finding.

Input: JSON array of findings with fields: id, severity, category, title, file, line, description, evidence

Output: ONLY a JSON array of remediation plans. No preamble. No explanation.

Each plan object:
{{
  "finding_id": "<id from input>",
  "summary": "one sentence: what to fix",
  "steps": ["step 1", "step 2", ...],
  "code_example": "minimal code snippet showing the fix (or null)",
  "references": ["url1", "url2"],
  "effort": "low|medium|high",
  "risk_if_ignored": "one sentence describing the real-world impact"
}}

Rules:
- steps must be concrete and actionable (not "review the code")
- code_example should be real, framework-specific code
- references must be real docs URLs (Supabase, Next.js, OWASP, etc.)
- effort = low (< 30min), medium (30min-2h), high (> 2h)
- Never hallucinate — only reference techniques you are certain of

Findings:
{findings_json}

<reference_docs>
{reference_docs}
</reference_docs>
"""


def _run_plan_sync(findings: list[dict], reference_docs: str = "") -> list[dict]:
    if USE_VERTEX:
        client = genai.Client(vertexai=True, project=GOOGLE_CLOUD_PROJECT, location="us-central1")
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = PLAN_PROMPT.format(
        findings_json=json.dumps(findings, indent=2),
        reference_docs=reference_docs
    )
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )
    text = response.text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    plans = json.loads(text.strip())
    finding_ids = {f["id"] for f in findings}
    return [p for p in plans if p.get("finding_id") in finding_ids]


async def generate_remediation_plan(findings: list[dict]) -> list[dict]:
    """Generate per-finding remediation plans using Gemini."""
    if not findings:
        return []
    
    reference_docs = ""
    tinyfish = TinyfishClient()
    
    try:
        # Fetch live remediation context for each finding (top 3)
        tasks = []
        for f in findings[:5]: # Cap at 5 for performance
            q = f"{f.get('category')} {f.get('title')} security remediation"
            tasks.append(tinyfish.search_and_fetch_top(q))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        docs = []
        for res in results:
            if isinstance(res, str) and res:
                docs.append(res[:2000]) # First 2KB
        
        reference_docs = "\n\n".join(docs)
        
        return await asyncio.to_thread(_run_plan_sync, findings, reference_docs)
    except Exception as e:
        return [{
            "finding_id": f["id"],
            "summary": f"Remediate: {f['title']}",
            "steps": ["Review the finding evidence", "Apply the appropriate fix for your framework"],
            "code_example": None,
            "references": [],
            "effort": "medium",
            "risk_if_ignored": f["description"],
        } for f in findings]
