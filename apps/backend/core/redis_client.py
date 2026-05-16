import os
import json
import httpx
from typing import Optional, Any, Union

class RedisClient:
    def __init__(self):
        self.url = os.getenv("UPSTASH_REDIS_REST_URL", "").rstrip("/")
        self.token = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    async def _execute(self, command: list[Any]) -> Any:
        if not self.url or not self.token:
            return None
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(self.url, json=command, headers=self.headers)
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                raise Exception(f"Redis error: {data['error']}")
            return data.get("result")

    async def get(self, key: str) -> Optional[str]:
        return await self._execute(["GET", key])

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        cmd = ["SET", key, value]
        if ex:
            cmd.extend(["EX", str(ex)])
        res = await self._execute(cmd)
        return res == "OK"

    async def delete(self, *keys: str) -> int:
        if not keys:
            return 0
        return await self._execute(["DEL", *keys])

    async def hset(self, key: str, mapping: dict) -> int:
        cmd = ["HSET", key]
        for k, v in mapping.items():
            cmd.extend([k, v])
        return await self._execute(cmd)

    async def hget(self, key: str, field: str) -> Optional[str]:
        return await self._execute(["HGET", key, field])

    async def hgetall(self, key: str) -> dict:
        res = await self._execute(["HGETALL", key])
        # Upstash HGETALL returns a flat list [k1, v1, k2, v2, ...]
        if not res or not isinstance(res, list):
            return {}
        return {res[i]: res[i+1] for i in range(0, len(res), 2)}

    async def expire(self, key: str, seconds: int) -> int:
        return await self._execute(["EXPIRE", key, str(seconds)])

    async def json_set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        return await self.set(key, json.dumps(value), ex)

    async def json_get(self, key: str) -> Optional[Any]:
        res = await self.get(key)
        if res:
            try:
                return json.loads(res)
            except json.JSONDecodeError:
                return None
        return None

# Singleton instance
redis = RedisClient()
