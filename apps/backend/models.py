"""
UniDeploy database models.

Schema reference only — actual tables managed by InsForge CLI.

Data model for the production-readiness scanner:
- Users with API keys and plan tiers
- Projects (linked to GitHub repos)
- Scans with findings
- Findings with severity and auto-fix status
- ScanSessions for real-time CLI↔browser pairing
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime
import enum
import uuid

Base = declarative_base()


class PlanTier(str, enum.Enum):
    FREE = "free"
    INDIE = "indie"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"


class Severity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True)
    username = Column(String)
    email = Column(String, unique=True, index=True)
    plan_tier = Column(String, default=PlanTier.FREE.value)
    scans_used_this_month = Column(Integer, default=0)
    scans_limit = Column(Integer, default=5)  # Free tier default
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    api_keys = relationship("UserApiKey", back_populates="user")
    projects = relationship("Project", back_populates="owner")


class UserApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)  # Format: ud_xxxxxxxxxxxx
    user_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    git_url = Column(String, nullable=True)
    framework = Column(String, nullable=True)  # nextjs-14, fastapi, django, express, etc.
    is_vibe_coded = Column(Boolean, default=False)
    security_grade = Column(String, default="?")  # A, B, C, D, F, or ? (unscanned)
    last_scan_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="projects")
    scans = relationship("Scan", back_populates="project")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String, unique=True, index=True)  # UUID
    project_id = Column(Integer, ForeignKey("projects.id"))
    security_grade = Column(String)
    total_findings = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    auto_fixes_available = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    status = Column(String, default="running")  # running, completed, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="scans")
    findings = relationship("Finding", back_populates="scan")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(String, unique=True, index=True)  # UUID
    scan_id = Column(Integer, ForeignKey("scans.id"))
    category = Column(String)  # secrets, auth, rls, input_validation, etc.
    severity = Column(String)  # CRITICAL, HIGH, MEDIUM, LOW
    title = Column(String)
    description = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    line_number = Column(Integer, nullable=True)
    evidence = Column(String, nullable=True)  # The actual code snippet
    auto_fixable = Column(Boolean, default=False)
    fix_type = Column(String, nullable=True)  # move_to_env, add_middleware, etc.
    status = Column(String, default="open")  # open, fixed, dismissed, false_positive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    scan = relationship("Scan", back_populates="findings")


class ScanSession(Base):
    """Tracks a live CLI↔browser pairing session (skyping-style)"""
    __tablename__ = "scan_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(7), unique=True, nullable=False)  # "ABC-DEF" format
    status = Column(
        Enum("pending", "cli_connected", "browser_connected", 
             "scanning", "complete", "expired", name="session_status"),
        default="pending"
    )
    machine_name = Column(String(100), nullable=True)
    project_path = Column(String(500), nullable=True)  # local path on CLI machine
    project_manifest = Column(JSONB, nullable=True)    # framework, file tree, etc.
    scan_result = Column(JSONB, nullable=True)         # findings appended here
    security_grade = Column(String(1), nullable=True)  # A/B/C/D/F
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    cli_connected_at = Column(DateTime, nullable=True)
    browser_connected_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime)  # created_at + 10 minutes
