from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db


@dataclass
class ApiKeyContext:
    api_key_id: int
    api_key: str
    user_id: int
    auth_id: Optional[str]
    plan_tier: str
    scans_used_this_month: int
    scans_limit: int
    record: models.UserApiKey


def _extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    return token.strip()


def _build_api_key_context(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> ApiKeyContext:
    token = _extract_bearer_token(authorization)

    api_key = (
        db.query(models.UserApiKey)
        .filter(
            models.UserApiKey.api_key == token,
            models.UserApiKey.is_active.is_(True),
        )
        .first()
    )
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return ApiKeyContext(
        api_key_id=api_key.id,
        api_key=api_key.api_key,
        user_id=api_key.user_id,
        auth_id=api_key.user.clerk_id if api_key.user else None,
        plan_tier=api_key.plan_tier,
        scans_used_this_month=api_key.scans_used_this_month,
        scans_limit=api_key.scans_limit,
        record=api_key,
    )


def verify_api_key(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> ApiKeyContext:
    context = _build_api_key_context(authorization, db)
    if (
        context.plan_tier == "free"
        and context.scans_used_this_month >= context.scans_limit
    ):
        raise HTTPException(
            status_code=402,
            detail={
                "error": "quota_exceeded",
                "upgrade_url": "https://unideploy.in/pricing",
            },
        )
    return context


def verify_api_key_no_quota(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> ApiKeyContext:
    return _build_api_key_context(authorization, db)


def require_paid_plan(context: ApiKeyContext) -> None:
    if context.plan_tier == "free":
        raise HTTPException(status_code=403, detail="AutoFix requires a paid plan.")


def increment_scan_usage(db: Session, context: ApiKeyContext) -> models.UserApiKey:
    record = (
        db.query(models.UserApiKey)
        .filter(models.UserApiKey.id == context.api_key_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=401, detail="Invalid API key")

    record.scans_used_this_month += 1
    record.last_scan_at = datetime.utcnow()
    db.add(record)
    db.commit()
    db.refresh(record)
    context.scans_used_this_month = record.scans_used_this_month
    context.record = record
    return record
