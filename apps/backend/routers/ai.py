"""
AI utility endpoints — used by the CLI to generate patches locally.
CLI reads files → sends content here → Gemini generates patch → CLI applies.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from agents.fix_agent import generate_patch_for_cli
from core.posthog import posthog_client

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


class PatchRequest(BaseModel):
    finding: dict
    file_content: str


class PatchResponse(BaseModel):
    file_path: str
    new_content: Optional[str] = None
    change_summary: str


@router.post("/patch", response_model=PatchResponse)
async def generate_patch(req: PatchRequest):
    """
    CLI calls this with a finding dict and the raw file content.
    Returns an AI-generated patch (new_content) ready to write to disk.
    Returns 422 if FixAgent cannot produce a safe patch.
    """
    try:
        result = await generate_patch_for_cli(req.finding, req.file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Patch generation failed: {e}")

    if not result or not result.get("new_content"):
        raise HTTPException(
            status_code=422,
            detail="FixAgent could not generate a safe patch for this finding. Manual remediation required.",
        )

    if posthog_client:
        posthog_client.capture("cli", "ai_patch_requested", {
            "severity": req.finding.get("severity"),
            "category": req.finding.get("category"),
            "auto_fixable": req.finding.get("auto_fixable"),
        })

    return PatchResponse(
        file_path=result["file_path"],
        new_content=result["new_content"],
        change_summary=result.get("change_summary", ""),
    )


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Handles natural language queries from the conversational CLI.
    """
    from agents.chat_agent import answer_chat_query
    try:
        reply = await answer_chat_query(req.message, req.session_id)
        return ChatResponse(response=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent prompt query failed: {e}")
