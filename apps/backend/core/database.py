"""
InsForge database client.
Replaces direct SQLAlchemy/SQLite setup.
InsForge exposes PostgreSQL via agent-friendly REST API.
"""
import os
import httpx
from typing import Any

INSFORGE_BASE_URL = os.getenv("INSFORGE_BASE_URL", "https://api.insforge.dev")
INSFORGE_PROJECT_ID = os.getenv("INSFORGE_PROJECT_ID", "")
INSFORGE_API_KEY = os.getenv("INSFORGE_API_KEY", "")

HEADERS = {
    "Authorization": f"Bearer {INSFORGE_API_KEY}",
    "X-Project-ID": INSFORGE_PROJECT_ID,
    "Content-Type": "application/json",
}

async def db_insert(table: str, data: dict) -> dict:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{INSFORGE_BASE_URL}/db/{table}",
            json=data,
            headers=HEADERS
        )
        res.raise_for_status()
        return res.json()

async def db_select(table: str, filters: dict = {}) -> list:
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{INSFORGE_BASE_URL}/db/{table}",
            params=filters,
            headers=HEADERS
        )
        res.raise_for_status()
        return res.json()

async def db_update(table: str, record_id: str, data: dict) -> dict:
    async with httpx.AsyncClient() as client:
        res = await client.patch(
            f"{INSFORGE_BASE_URL}/db/{table}/{record_id}",
            json=data,
            headers=HEADERS
        )
        res.raise_for_status()
        return res.json()

async def db_delete(table: str, record_id: str) -> bool:
    async with httpx.AsyncClient() as client:
        res = await client.delete(
            f"{INSFORGE_BASE_URL}/db/{table}/{record_id}",
            headers=HEADERS
        )
        return res.status_code == 200
