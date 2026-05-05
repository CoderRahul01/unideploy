"""
InsForge database client — REST-based, no ORM needed.
Headers are built per-request so env vars are always fresh.
"""
import os
import logging
import httpx

logger = logging.getLogger("unideploy.db")

INSFORGE_BASE_URL = os.getenv("INSFORGE_BASE_URL", "https://api.insforge.dev")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {os.getenv('INSFORGE_API_KEY', '')}",
        "X-Project-ID": os.getenv("INSFORGE_PROJECT_ID", ""),
        "Content-Type": "application/json",
    }


async def db_insert(table: str, data: dict) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"{INSFORGE_BASE_URL}/db/{table}",
            json=data,
            headers=_headers(),
        )
        res.raise_for_status()
        return res.json()


async def db_select(table: str, filters: dict = {}) -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            f"{INSFORGE_BASE_URL}/db/{table}",
            params=filters,
            headers=_headers(),
        )
        res.raise_for_status()
        return res.json()


async def db_update(table: str, record_id: str, data: dict) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.patch(
            f"{INSFORGE_BASE_URL}/db/{table}/{record_id}",
            json=data,
            headers=_headers(),
        )
        res.raise_for_status()
        return res.json()


async def db_delete(table: str, record_id: str) -> bool:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.delete(
            f"{INSFORGE_BASE_URL}/db/{table}/{record_id}",
            headers=_headers(),
        )
        return res.status_code == 200
