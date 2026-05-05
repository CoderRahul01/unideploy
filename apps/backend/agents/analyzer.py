"""
Analyzer agent — used by the WebSocket bridge (websockets.py).

Routes to Vertex AI Agent Engine when AGENT_ENGINE_RESOURCE_NAME is set,
falls back to local ADK runner otherwise (useful for local dev).
"""

import json
import os
import uuid
import asyncio
import logging

logger = logging.getLogger("unideploy.analyzer")

AGENT_ENGINE_RESOURCE = os.getenv("AGENT_ENGINE_RESOURCE_NAME", "")
GCP_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "manifest-design-484007-m8")
GCP_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")


def _build_prompt(project_manifest: dict) -> str:
    files_text = ""
    for f in project_manifest.get("files", [])[:60]:
        p = f.get("path", "")
        c = f.get("content", "")
        if c:
            files_text += f"\n\n--- FILE: {p} ---\n{c[:4000]}"
    return json.dumps({
        "framework": project_manifest.get("framework", "unknown"),
        "file_count": project_manifest.get("file_count", 0),
        "files_content": files_text,
    })


def _parse_findings(text: str) -> list[dict]:
    text = text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    findings = json.loads(text.strip())
    for i, f in enumerate(findings):
        if not f.get("id"):
            f["id"] = f"finding_{i + 1:03d}"
    return findings


async def _run_via_agent_engine(prompt: str) -> list[dict]:
    """Call the deployed Vertex AI Agent Engine resource."""
    import vertexai
    from vertexai.preview import reasoning_engines

    vertexai.init(project=GCP_PROJECT, location=GCP_LOCATION)

    def _query():
        app = reasoning_engines.ReasoningEngine(AGENT_ENGINE_RESOURCE)
        return app.query(input=prompt)

    response = await asyncio.to_thread(_query)
    return _parse_findings(str(response))


async def _run_local(prompt: str) -> list[dict]:
    """Run the ADK agent locally (dev / fallback mode)."""
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from adk_app import analyzer_agent

    from google.adk.sessions import InMemorySessionService
    from google.adk.runners import Runner
    from google.genai.types import Content, Part

    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name="unideploy",
        user_id="system",
        session_id=str(uuid.uuid4()),
    )
    runner = Runner(agent=analyzer_agent, app_name="unideploy", session_service=session_service)

    response_text = ""
    async for event in runner.run_async(
        user_id="system",
        session_id=session.id,
        new_message=Content(parts=[Part(text=prompt)], role="user"),
    ):
        if event.is_final_response():
            response_text = event.response.text
            break

    return _parse_findings(response_text)


async def run_analysis(project_manifest: dict) -> list[dict]:
    """
    Run AnalyzerAgent on a project manifest.
    Returns list of finding dicts.
    """
    prompt = _build_prompt(project_manifest)
    try:
        if AGENT_ENGINE_RESOURCE:
            logger.info("Running analysis via Agent Engine: %s", AGENT_ENGINE_RESOURCE)
            return await _run_via_agent_engine(prompt)
        else:
            logger.info("Running analysis via local ADK runner")
            return await _run_local(prompt)
    except Exception as e:
        logger.error("Analyzer error: %s", e)
        return [{
            "id": "analyzer_error",
            "severity": "LOW",
            "category": "environment",
            "title": "Analyzer agent error",
            "file": "unknown",
            "line": None,
            "description": f"Analysis failed: {str(e)[:120]}",
            "evidence": "",
            "auto_fixable": False,
            "fix_type": None,
        }]


def compute_grade(findings: list[dict]) -> str:
    critical = sum(1 for f in findings if f.get("severity") == "CRITICAL")
    high     = sum(1 for f in findings if f.get("severity") == "HIGH")
    if critical >= 3: return "F"
    if critical >= 1: return "D"
    if high >= 5:     return "D"
    if high >= 3:     return "C"
    if high >= 1:     return "B"
    return "A"
