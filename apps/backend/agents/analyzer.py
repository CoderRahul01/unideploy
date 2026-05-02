"""
Analyzer agent wrapper — used by the WebSocket bridge (websockets.py).
Imports the ADK agent from adk_app.py and provides a streaming interface.
"""

import json
import os
import uuid
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai.types import Content, Part

# Import the agent defined in adk_app.py (one level up from agents/)
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from adk_app import analyzer_agent


async def run_analysis(project_manifest: dict) -> list[dict]:
    """
    Run AnalyzerAgent on a project manifest.
    Returns list of finding dicts.
    Called by run_agent_pipeline() in websockets.py.
    """
    files_text = ""
    for f in project_manifest.get("files", [])[:60]:
        path = f.get("path", "")
        content = f.get("content", "")
        if content:
            files_text += f"\n\n--- FILE: {path} ---\n{content[:4000]}"

    prompt = json.dumps({
        "framework": project_manifest.get("framework", "unknown"),
        "file_count": project_manifest.get("file_count", 0),
        "files_content": files_text,
    })

    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name="unideploy",
        user_id="system",
        session_id=str(uuid.uuid4()),
    )

    runner = Runner(
        agent=analyzer_agent,
        app_name="unideploy",
        session_service=session_service,
    )

    response_text = ""
    async for event in runner.run_async(
        user_id="system",
        session_id=session.id,
        new_message=Content(parts=[Part(text=prompt)], role="user"),
    ):
        if event.is_final_response():
            response_text = event.response.text
            break

    try:
        text = response_text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        findings = json.loads(text.strip())
        for i, f in enumerate(findings):
            if not f.get("id"):
                f["id"] = f"finding_{i + 1:03d}"
        return findings
    except Exception as e:
        return [{
            "id": "parse_error",
            "severity": "LOW",
            "category": "environment",
            "title": "Agent response parse error",
            "file": "unknown",
            "line": None,
            "description": f"Could not parse agent response: {str(e)[:100]}",
            "evidence": response_text[:300] if response_text else "empty",
            "auto_fixable": False,
            "fix_type": None,
        }]


def compute_grade(findings: list[dict]) -> str:
    critical = sum(1 for f in findings if f.get("severity") == "CRITICAL")
    high = sum(1 for f in findings if f.get("severity") == "HIGH")
    if critical >= 3:
        return "F"
    if critical >= 1:
        return "D"
    if high >= 5:
        return "D"
    if high >= 3:
        return "C"
    if high >= 1:
        return "B"
    return "A"
