"""
AI utility endpoints — used by the CLI to generate patches locally.
CLI reads files → sends content here → Gemini generates patch → CLI applies.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from agents.fix_agent import generate_patch_for_cli

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

    return PatchResponse(
        file_path=result["file_path"],
        new_content=result["new_content"],
        change_summary=result.get("change_summary", ""),
    )
