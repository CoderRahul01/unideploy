import asyncio
import uuid
from typing import Dict, Any, List

class LocalMCPClient:
    def __init__(self, session_id: str):
        from routers.sessions import _sessions
        self.session_id = session_id
        self.session = None
        for code, s in _sessions.items():
            if s["session_id"] == session_id:
                self.session = s
                break
        
        if self.session and "mcp_pending_requests" not in self.session:
            self.session["mcp_pending_requests"] = {}

    async def _send_request(self, method: str, params: Dict[str, Any] = None) -> Any:
        if not self.session or not self.session.get("cli_ws"):
            raise Exception("CLI WebSocket is not connected or session invalid.")

        request_id = str(uuid.uuid4())
        future = asyncio.get_running_loop().create_future()
        self.session["mcp_pending_requests"][request_id] = future

        mcp_req = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params or {}
        }
        
        # Note: the CLI transport expects standard MCP JSON-RPC messages if enveloped properly
        # In mcp-transport.ts we check if msg.type == 'mcp_request' or msg.jsonrpc == '2.0'.
        # We'll just send it enveloped to match our backend convention.
        await self.session["cli_ws"].send_json({
            "type": "mcp_request",
            "payload": mcp_req
        })

        try:
            # Wait up to 30s for the CLI to respond
            response = await asyncio.wait_for(future, timeout=30.0)
            if "error" in response:
                raise Exception(f"MCP Error: {response['error']}")
            return response.get("result")
        finally:
            if request_id in self.session["mcp_pending_requests"]:
                del self.session["mcp_pending_requests"][request_id]

    async def list_files(self, directory: str = ".") -> List[str]:
        # The MCP tool name we registered is "list_files", so we send a call tool request
        res = await self._send_request("tools/call", {
            "name": "list_files",
            "arguments": {"directory": directory}
        })
        
        content = res.get("content", [])
        if content and content[0].get("type") == "text":
            text = content[0].get("text", "")
            return [f for f in text.split("\n") if f.strip()]
        return []

    async def read_file(self, file_path: str) -> str:
        res = await self._send_request("tools/call", {
            "name": "read_file",
            "arguments": {"filePath": file_path}
        })
        
        content = res.get("content", [])
        if content and content[0].get("type") == "text":
            return content[0].get("text", "")
        return ""
