"""
InsForge database client — /api/database/records/{table}
"""
import os
import logging
import httpx

logger = logging.getLogger("unideploy.db")


def _base() -> str:
    return os.getenv("INSFORGE_BASE_URL", "").rstrip("/") + "/api/database/records"


def _headers() -> dict:
    key = os.getenv("INSFORGE_API_KEY", "")
    project_id = os.getenv("INSFORGE_PROJECT_ID", "")
    return {
        "Authorization": f"Bearer {key}",
        "X-Project-ID": project_id,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def db_insert(table: str, data: dict) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"{_base()}/{table}",
            json=[data],
            headers=_headers(),
        )
        res.raise_for_status()
        rows = res.json()
        return rows[0] if isinstance(rows, list) and rows else {}


async def db_select(table: str, filters: dict = {}) -> list:
    params = {k: f"eq.{v}" for k, v in filters.items()}
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            f"{_base()}/{table}",
            params=params,
            headers=_headers(),
        )
        res.raise_for_status()
        return res.json()


async def db_update(table: str, record_id: str, data: dict) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.patch(
            f"{_base()}/{table}",
            params={"id": f"eq.{record_id}"},
            json=data,
            headers=_headers(),
        )
        res.raise_for_status()
        rows = res.json()
        return rows[0] if isinstance(rows, list) and rows else {}


async def db_delete(table: str, record_id: str) -> bool:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.delete(
            f"{_base()}/{table}",
            params={"id": f"eq.{record_id}"},
            headers=_headers(),
        )
        return res.status_code in (200, 204)
