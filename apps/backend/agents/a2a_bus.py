"""
A2A (Agent-to-Agent) message bus — lightweight JSON-RPC 2.0 pub/sub.
Follows the A2A protocol spec (a2a-protocol.org) without external dependencies.
Each agent gets its own asyncio.Queue; the bus routes messages by agent name.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import AsyncIterator, Callable, Awaitable, Optional
from uuid import uuid4

logger = logging.getLogger("unideploy.a2a")


@dataclass
class A2AMessage:
    jsonrpc: str = "2.0"
    id: str = field(default_factory=lambda: str(uuid4()))
    method: str = "agent/invoke"
    params: dict = field(default_factory=dict)
    # params shape: { from_agent, to_agent, task, payload, context_id, reply_to_id }


@dataclass
class A2AReply:
    jsonrpc: str = "2.0"
    id: str = ""          # matches the request id
    result: Optional[dict] = None
    error: Optional[dict] = None


AgentHandler = Callable[[A2AMessage], Awaitable[Optional[dict]]]


class A2ABus:
    """
    Per-process singleton message bus.
    Agents call register() at startup; orchestrators call publish() or request().
    """

    def __init__(self):
        self._queues: dict[str, asyncio.Queue] = {}
        self._handlers: dict[str, AgentHandler] = {}
        self._pending: dict[str, asyncio.Future] = {}

    def register(self, agent_name: str, handler: AgentHandler) -> None:
        """Register an agent handler. Called once at startup."""
        self._queues[agent_name] = asyncio.Queue(maxsize=256)
        self._handlers[agent_name] = handler
        logger.info(f"A2A: registered agent '{agent_name}'")

    async def publish(self, msg: A2AMessage) -> None:
        """Fire-and-forget: put a message in the target agent's queue."""
        to = msg.params.get("to_agent", "")
        queue = self._queues.get(to)
        if queue is None:
            logger.warning(f"A2A: unknown agent '{to}' — dropping message {msg.id}")
            return
        await queue.put(msg)
        logger.debug(f"A2A: {msg.params.get('from_agent')} → {to} [{msg.params.get('task')}]")

    async def request(self, msg: A2AMessage, timeout: float = 60.0) -> dict:
        """
        Send a message and wait for a reply.
        The target handler must return a result dict.
        Raises TimeoutError if no reply within timeout seconds.
        """
        loop = asyncio.get_event_loop()
        future: asyncio.Future = loop.create_future()
        self._pending[msg.id] = future

        await self.publish(msg)

        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            self._pending.pop(msg.id, None)
            raise TimeoutError(f"A2A request to '{msg.params.get('to_agent')}' timed out after {timeout}s")

    async def _resolve_pending(self, request_id: str, result: dict) -> None:
        future = self._pending.pop(request_id, None)
        if future and not future.done():
            future.set_result(result)

    async def run_agent(self, agent_name: str) -> None:
        """
        Consume messages for an agent and invoke its handler.
        Run this as a background asyncio task for each registered agent.
        """
        queue = self._queues.get(agent_name)
        handler = self._handlers.get(agent_name)
        if not queue or not handler:
            logger.error(f"A2A: cannot run unregistered agent '{agent_name}'")
            return

        logger.info(f"A2A: agent '{agent_name}' started")
        while True:
            msg: A2AMessage = await queue.get()
            try:
                result = await handler(msg)
                reply_to = msg.params.get("reply_to_id")
                if reply_to and result is not None:
                    await self._resolve_pending(reply_to, result)
                elif result is not None:
                    await self._resolve_pending(msg.id, result)
            except Exception as e:
                logger.error(f"A2A: agent '{agent_name}' error handling {msg.id}: {e}")
                await self._resolve_pending(msg.id, {"error": str(e)})
            finally:
                queue.task_done()


# Process-wide singleton
_bus: Optional[A2ABus] = None


def get_bus() -> A2ABus:
    global _bus
    if _bus is None:
        _bus = A2ABus()
    return _bus
