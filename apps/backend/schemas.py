"""
UniDeploy API schemas (Pydantic models for request/response validation).
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Scan Request/Response ────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    project_name: str
    framework: Optional[str] = None
    file_tree: Optional[List[str]] = None
    files: Optional[dict] = None
    package_json: Optional[dict] = None
    requirements_txt: Optional[str] = None
    git_remote: Optional[str] = None


class FindingResponse(BaseModel):
    id: str
    category: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    title: str
    file: Optional[str] = None
    line: Optional[int] = None
    description: Optional[str] = None
    auto_fixable: bool = False
    fix_type: Optional[str] = None


class ScanResponse(BaseModel):
    scan_id: str
    project_name: str
    framework: str
    security_grade: str  # A, B, C, D, F
    is_vibe_coded: bool
    findings: List[FindingResponse]
    auto_fixes_available: int
    scan_duration_ms: int


# ── Fix Request/Response ─────────────────────────────────────────────────────

class FixRequest(BaseModel):
    scan_id: str
    finding_ids: List[str]
    files: Optional[dict] = None


class PatchResponse(BaseModel):
    finding_id: str
    file: str
    diff: str
    verified: bool = False


class FixResponse(BaseModel):
    patches: List[PatchResponse]


# ── Status ───────────────────────────────────────────────────────────────────

class StatusResponse(BaseModel):
    user_id: str
    plan_tier: str
    scans_remaining: int
    last_scan: Optional[datetime] = None


# ── Project ──────────────────────────────────────────────────────────────────

class ProjectResponse(BaseModel):
    id: int
    name: str
    framework: Optional[str] = None
    security_grade: str
    is_vibe_coded: bool
    last_scan_at: Optional[datetime] = None
    git_url: Optional[str] = None

    class Config:
        from_attributes = True
