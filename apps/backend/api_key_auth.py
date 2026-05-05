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
            models.UserApiKey.key == token,
            models.UserApiKey.is_active.is_(True),
        )
        .first()
    )
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    user = api_key.user
    return ApiKeyContext(
        api_key_id=api_key.id,
        api_key=api_key.key,
        user_id=api_key.user_id,
        auth_id=user.clerk_id if user else None,
        plan_tier=user.plan_tier if user else "free",
        scans_used_this_month=user.scans_used_this_month if user else 0,
        scans_limit=user.scans_limit if user else 5,
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

    user = record.user
    if user:
        user.scans_used_this_month += 1
        db.add(user)
    record.last_used_at = datetime.utcnow()
    db.add(record)
    db.commit()
    db.refresh(record)
    if user:
        context.scans_used_this_month = user.scans_used_this_month
    context.record = record
    return record
