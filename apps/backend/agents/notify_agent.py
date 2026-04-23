import httpx
import os
from fastapi import WebSocket
from typing import Dict, List

_instance: "NotifyAgent | None" = None

GATEWAY_URL = os.getenv("INTERNAL_GATEWAY_URL", "http://gateway:3001")

def get_notify_agent() -> "NotifyAgent":
    global _instance
    if _instance is None:
        _instance = NotifyAgent()
    return _instance


class NotifyAgent:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, deployment_id: str):
        await websocket.accept()
        if deployment_id not in self.active_connections:
            self.active_connections[deployment_id] = []
        self.active_connections[deployment_id].append(websocket)

    def disconnect(self, websocket: WebSocket, deployment_id: str):
        if deployment_id in self.active_connections:
            self.active_connections[deployment_id].remove(websocket)

    async def broadcast_status(self, deployment_id: str, status_update: dict):
        """
        Sends a status update to local backend clients AND forwards to Gateway.
        """
        # 1. Forward to Gateway (Centralized Socket Hub)
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{GATEWAY_URL}/internal/logs",
                    json={"deploymentId": str(deployment_id), "log": str(status_update)}
                )
        except Exception as e:
            print(f"[NotifyAgent] Failed to forward to Gateway: {e}")

        # 2. Local fallback broadcast
        if deployment_id in self.active_connections:
            dead: list = []
            for connection in self.active_connections[deployment_id]:
                try:
                    await connection.send_json(status_update)
                except Exception as e:
                    print(f"[NotifyAgent] WebSocket send failed (removing stale connection): {e}")
                    dead.append(connection)
            for c in dead:
                self.active_connections[deployment_id].remove(c)

    async def notify_user(self, user_id: str, message: str, type: str = "info"):
        print(f"[NotifyAgent] [USER {user_id}] [{type.upper()}] {message}")
