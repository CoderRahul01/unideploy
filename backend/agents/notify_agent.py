from fastapi import WebSocket
from typing import Dict, List

class NotifyAgent:
    def __init__(self):
        # Map deployment_id to a list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, deployment_id: str):
        await websocket.accept()
        if deployment_id not in self.active_connections:
            self.active_connections[deployment_id] = []
        self.active_connections[deployment_id].append(websocket)
        print(f"[NotifyAgent] WebSocket connected for deployment: {deployment_id}")

    def disconnect(self, websocket: WebSocket, deployment_id: str):
        if deployment_id in self.active_connections:
            self.active_connections[deployment_id].remove(websocket)
            if not self.active_connections[deployment_id]:
                del self.active_connections[deployment_id]
        print(f"[NotifyAgent] WebSocket disconnected: {deployment_id}")

    async def broadcast_status(self, deployment_id: str, status_update: dict):
        """
        Sends a status update to all connected clients for a deployment.
        """
        if deployment_id in self.active_connections:
            print(f"[NotifyAgent] Broadcasting status to {len(self.active_connections[deployment_id])} clients for {deployment_id}")
            for connection in self.active_connections[deployment_id]:
                try:
                    await connection.send_json(status_update)
                except Exception as e:
                    print(f"[NotifyAgent] Error broadcasting to connection: {e}")
        else:
            print(f"[NotifyAgent] No active connections for {deployment_id}, update dropped: {status_update['status']}")

    async def notify_user(self, user_id: str, message: str, type: str = "info"):
        """
        Generic user notification (could be extended to Email/Slack/Push).
        """
        print(f"[NotifyAgent] [USER {user_id}] [{type.upper()}] {message}")
        # In the future, this could trigger a push notification or email via Azure Communication Services.
