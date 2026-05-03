import hashlib
import hmac
import json
import os
import sys
import asyncio

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import models
from api_key_auth import increment_scan_usage, verify_api_key, verify_api_key_no_quota
from payments.dodo_client import DodoClient


def make_session():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def seed_user_with_api_key(db, plan_tier="free", scans_used=0, scans_limit=5):
    user = models.User(clerk_id="firebase_123", username="test", email="test@example.com")
    db.add(user)
    db.commit()
    db.refresh(user)

    api_key = models.UserApiKey(
        user_id=user.id,
        api_key="ud_test_key",
        plan_tier=plan_tier,
        scans_used_this_month=scans_used,
        scans_limit=scans_limit,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return user, api_key


def test_verify_api_key_allows_valid_key():
    db = make_session()
    seed_user_with_api_key(db)

    context = verify_api_key_no_quota("Bearer ud_test_key", db)

    assert context.user_id > 0
    assert context.plan_tier == "free"


def test_verify_api_key_enforces_free_quota():
    db = make_session()
    seed_user_with_api_key(db, scans_used=5, scans_limit=5)

    try:
        verify_api_key("Bearer ud_test_key", db)
        assert False, "Expected quota enforcement to reject exhausted free key"
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 402
        assert exc.detail["error"] == "quota_exceeded"


def test_increment_scan_usage_updates_counter():
    db = make_session()
    _, api_key = seed_user_with_api_key(db)
    context = verify_api_key_no_quota("Bearer ud_test_key", db)

    increment_scan_usage(db, context)

    refreshed = db.query(models.UserApiKey).filter_by(id=api_key.id).first()
    assert refreshed.scans_used_this_month == 1
    assert refreshed.last_scan_at is not None


def test_dodo_webhook_updates_plan_and_limit():
    db = make_session()
    user, api_key = seed_user_with_api_key(db)
    os.environ["DODO_WEBHOOK_SECRET"] = "test_secret"
    os.environ["DODO_PRODUCT_PLAN_MAP"] = json.dumps(
        {"prod_pro": {"plan_tier": "pro", "scans_limit": 250}}
    )

    payload = {
        "type": "subscription.upgraded",
        "data": {
            "object": {
                "product_id": "prod_pro",
                "metadata": {"user_id": user.clerk_id},
            }
        },
    }
    payload_bytes = json.dumps(payload).encode("utf8")
    signature = hmac.new(
        b"test_secret",
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    handled = asyncio.run(
        DodoClient().handle_webhook(payload, signature, payload_bytes, db)
    )

    assert handled is True
    refreshed = db.query(models.UserApiKey).filter_by(id=api_key.id).first()
    assert refreshed.plan_tier == "pro"
    assert refreshed.scans_limit == 250
