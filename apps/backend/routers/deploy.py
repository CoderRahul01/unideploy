"""
Deploy endpoints — stack detection, clarifying questions, config generation (SSE stream).
Used by `unideploy deploy` and `unideploy run`.
"""

import json
import asyncio
import logging
from typing import AsyncGenerator, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.deploy_agent import DeployAgent, StackInfo
from core.posthog import posthog_client
from core.redis_client import redis

logger = logging.getLogger("unideploy.deploy")

router = APIRouter(prefix="/api/v1/deploy", tags=["deploy"])
_agent = DeployAgent()


class PlanRequest(BaseModel):
    manifest: dict


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    manifest: Optional[dict] = None
    message: Optional[str] = None
    history: Optional[list[dict]] = None


class GenerateRequest(BaseModel):
    manifest: dict
    stack: dict          # StackInfo serialised
    answers: dict = {}


@router.post("/chat")
async def deploy_chat(req: ChatRequest):
    """
    Agentic deployment conversation loop.
    Maintains history in Redis (deploy_chat:{session_id}).
    """
    session_id = req.session_id or str(uuid4())
    
    # Load history from Redis if not provided in request
    history = req.history
    if history is None:
        history = await redis.json_get(f"deploy_chat:{session_id}") or []

    # Call agent
    res = await _agent.chat(session_id, req.manifest, history)
    
    # Save history to Redis (30 min TTL)
    await redis.json_set(f"deploy_chat:{session_id}", history, ex=1800)

    res["session_id"] = session_id
    return res


class StackResponse(BaseModel):
    frontend: str
    backend: str
    db: str
    runtime: str
    inferred_targets: list[str]


class QuestionResponse(BaseModel):
    key: str
    question: str
    options: list[str]
    default: str | None


class PlanResponse(BaseModel):
    stack: StackResponse
    questions: list[QuestionResponse]


@router.post("/plan", response_model=PlanResponse)
async def plan(req: PlanRequest):
    """
    Detect stack from project manifest and return clarifying questions.
    Called first by the CLI; user answers are passed to /generate.
    """
    try:
        stack = _agent.detect_stack(req.manifest)
        questions = _agent.get_clarifying_questions(stack)

        if posthog_client:
            posthog_client.capture("cli", "deploy_plan_requested", {
                "frontend": stack.frontend,
                "backend": stack.backend,
                "db": stack.db,
                "runtime": stack.runtime,
                "questions_count": len(questions),
            })

        return PlanResponse(
            stack=StackResponse(
                frontend=stack.frontend,
                backend=stack.backend,
                db=stack.db,
                runtime=stack.runtime,
                inferred_targets=stack.inferred_targets,
            ),
            questions=[
                QuestionResponse(
                    key=q.key,
                    question=q.question,
                    options=q.options,
                    default=q.default,
                )
                for q in questions
            ],
        )
    except Exception as e:
        logger.error(f"Deploy plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _stream_configs(manifest: dict, stack_dict: dict, answers: dict) -> AsyncGenerator[str, None]:
    """Generate config files and stream each as an SSE event."""
    stack = StackInfo(
        frontend=stack_dict.get("frontend", "unknown"),
        backend=stack_dict.get("backend", "none"),
        db=stack_dict.get("db", "none"),
        runtime=stack_dict.get("runtime", "nodejs"),
        inferred_targets=stack_dict.get("inferred_targets", []),
    )

    yield _sse({"type": "status", "message": f"Detected: {stack.frontend} + {stack.backend} + {stack.db}"})
    yield _sse({"type": "status", "message": "Fetching live platform documentation..."})

    try:
        platform_context = await _agent.fetch_platform_context(stack)
        docs_fetched = [k for k, v in platform_context.items() if v]
        if docs_fetched:
            yield _sse({"type": "status", "message": f"Docs fetched for: {', '.join(docs_fetched)}"})
        else:
            yield _sse({"type": "status", "message": "Using built-in defaults (Tinyfish not configured)"})
    except Exception:
        platform_context = {}

    yield _sse({"type": "status", "message": "Generating config files..."})

    try:
        from agents.deploy_agent import _generate_configs_sync
        configs = await asyncio.to_thread(
            _generate_configs_sync, stack, platform_context, answers, manifest
        )
    except Exception as e:
        yield _sse({"type": "error", "message": f"Config generation failed: {e}"})
        return

    for config in configs:
        yield _sse({
            "type": "config_file",
            "path": config.path,
            "content": config.content,
            "description": config.description,
        })
        await asyncio.sleep(0.05)

    yield _sse({"type": "complete", "files_generated": len(configs)})


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.post("/generate")
async def generate(req: GenerateRequest):
    """
    Generate deployment config files and stream them as SSE.
    CLI writes each received config_file event to disk.
    """
    if posthog_client:
        posthog_client.capture("cli", "deploy_generate_started", {
            "frontend": req.stack.get("frontend"),
            "backend": req.stack.get("backend"),
            "db": req.stack.get("db"),
            "answers_provided": len(req.answers),
        })

    return StreamingResponse(
        _stream_configs(req.manifest, req.stack, req.answers),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
