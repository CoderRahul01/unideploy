"""
Tinyfish AI client — web search and fetch for live platform documentation.
Used by DeployAgent to get up-to-date deployment configs for each platform.
Requires TINYFISH_API_KEY environment variable.
"""

import os
import asyncio
import logging
from dataclasses import dataclass
from typing import Optional

import httpx

logger = logging.getLogger("unideploy.tinyfish")

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY", "")
TINYFISH_BASE = "https://api.tinyfish.ai"


@dataclass
class SearchResult:
    url: str
    title: str
    snippet: str


class TinyfishClient:
    def __init__(self, api_key: str = TINYFISH_API_KEY):
        self.api_key = api_key
        self._headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    def _is_configured(self) -> bool:
        return bool(self.api_key)

    async def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        """Search for documentation pages matching the query."""
        if not self._is_configured():
            logger.warning("TINYFISH_API_KEY not set — skipping web search")
            return []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{TINYFISH_BASE}/search",
                    params={"q": query, "limit": limit},
                    headers=self._headers,
                )
                resp.raise_for_status()
                data = resp.json()
                results = data.get("results") or data.get("items") or []
                return [
                    SearchResult(
                        url=r.get("url", ""),
                        title=r.get("title", ""),
                        snippet=r.get("snippet") or r.get("description", ""),
                    )
                    for r in results
                ]
        except Exception as e:
            logger.warning(f"Tinyfish search failed for '{query}': {e}")
            return []

    async def fetch(self, url: str) -> str:
        """Fetch a page and return its markdown content."""
        if not self._is_configured():
            return ""
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    f"{TINYFISH_BASE}/fetch",
                    params={"url": url},
                    headers=self._headers,
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("content") or data.get("markdown") or data.get("text") or ""
        except Exception as e:
            logger.warning(f"Tinyfish fetch failed for '{url}': {e}")
            return ""

    async def search_and_fetch_top(self, query: str) -> str:
        """Search + fetch the top result. Returns page content or empty string."""
        results = await self.search(query, limit=1)
        if not results:
            return ""
        return await self.fetch(results[0].url)
