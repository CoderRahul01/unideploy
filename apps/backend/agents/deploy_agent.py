"""
DeployAgent — detects project stack and generates production deployment configs.
Uses Tinyfish AI to fetch live platform documentation before generating configs.
Only asks clarifying questions for things that cannot be inferred from the codebase.
"""

import json
import os
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

from google import genai
from google.genai.types import GenerateContentConfig

from services.tinyfish import TinyfishClient

logger = logging.getLogger("unideploy.deploy_agent")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
USE_VERTEX = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"


@dataclass
class StackInfo:
    frontend: str = "unknown"          # nextjs | vite | nuxt | sveltekit | static | unknown
    backend: str = "none"              # fastapi | express | nestjs | hono | django | flask | none
    db: str = "none"                   # supabase | postgres | mysql | mongodb | convex | neon | none
    runtime: str = "nodejs"           # nodejs | python | bun | deno
    inferred_targets: list[str] = field(default_factory=list)  # vercel | gcp | aws | cloudflare | railway


@dataclass
class Question:
    key: str           # used in answers dict
    question: str
    options: list[str] = field(default_factory=list)  # empty = free text
    default: Optional[str] = None


@dataclass
class ConfigFile:
    path: str           # relative path from project root
    content: str        # full file content
    description: str    # one-line description of what this file does


def _detect_stack_from_manifest(manifest: dict) -> StackInfo:
    """Infer stack from project manifest files without calling any AI."""
    files: dict[str, str] = manifest.get("files", {})
    stack = StackInfo()

    # ── Frontend detection ────────────────────────────────────────────────────
    pkg_content = files.get("package.json", "")
    if pkg_content:
        try:
            pkg = json.loads(pkg_content)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            if "next" in deps:
                stack.frontend = "nextjs"
            elif "nuxt" in deps or "@nuxt/core" in deps:
                stack.frontend = "nuxt"
            elif "@sveltejs/kit" in deps:
                stack.frontend = "sveltekit"
            elif "vite" in deps:
                stack.frontend = "vite"
            elif deps:
                stack.frontend = "nodejs"

            if "@nestjs/core" in deps:
                stack.backend = "nestjs"
            elif "express" in deps:
                stack.backend = "express"
            elif "fastify" in deps:
                stack.backend = "fastify"
            elif "hono" in deps:
                stack.backend = "hono"
        except Exception:
            pass

    # ── Python backend detection ──────────────────────────────────────────────
    for fname in ["requirements.txt", "pyproject.toml", "Pipfile"]:
        content = files.get(fname, "").lower()
        if content:
            stack.runtime = "python"
            if "fastapi" in content:
                stack.backend = "fastapi"
            elif "django" in content:
                stack.backend = "django"
            elif "flask" in content:
                stack.backend = "flask"
            break

    # ── DB detection ──────────────────────────────────────────────────────────
    all_content = " ".join(files.values()).lower()
    if "supabase" in all_content:
        stack.db = "supabase"
    elif "convex" in all_content:
        stack.db = "convex"
    elif "neon" in all_content:
        stack.db = "neon"
    elif "mongodb" in all_content or "mongoose" in all_content:
        stack.db = "mongodb"
    elif "postgres" in all_content or "pg" in all_content:
        stack.db = "postgres"
    elif "mysql" in all_content:
        stack.db = "mysql"

    # ── Infer deployment targets from existing config files ───────────────────
    if "vercel.json" in files or (stack.frontend in ("nextjs", "nuxt", "sveltekit")):
        stack.inferred_targets.append("vercel")
    if "cloudbuild.yaml" in files or any("cloud_run" in v or "gcp" in v for v in files.values()):
        stack.inferred_targets.append("gcp")
    if "railway.toml" in files or "railway.json" in files:
        stack.inferred_targets.append("railway")
    if "wrangler.toml" in files or "wrangler.json" in files:
        stack.inferred_targets.append("cloudflare")
    if any("amazonaws.com" in v for v in files.values()):
        stack.inferred_targets.append("aws")

    if not stack.inferred_targets:
        # Default: Vercel for frontend-only, Vercel + GCP for full-stack
        stack.inferred_targets = ["vercel"] if stack.backend == "none" else ["vercel", "gcp"]

    return stack


def _get_clarifying_questions(stack: StackInfo, answers: dict) -> list[Question]:
    """Return only questions that cannot be inferred from the codebase."""
    questions: list[Question] = []

    if "gcp" in stack.inferred_targets and "gcp_project_id" not in answers:
        questions.append(Question(
            key="gcp_project_id",
            question="What is your Google Cloud project ID?",
            options=[],
        ))

    if len(stack.inferred_targets) > 1 and "targets" not in answers:
        questions.append(Question(
            key="targets",
            question=f"Detected multiple deployment targets ({', '.join(stack.inferred_targets)}). Which would you like configs for?",
            options=stack.inferred_targets + ["all"],
            default="all",
        ))

    if stack.db in ("supabase", "postgres", "neon") and "db_region" not in answers:
        questions.append(Question(
            key="db_region",
            question="Which region is your database in? (used to co-locate compute)",
            options=["us-east-1", "eu-west-1", "ap-southeast-1", "us-central1"],
            default="us-east-1",
        ))

    return questions


def _build_gemini_client():
    if USE_VERTEX:
        return genai.Client(vertexai=True, project=GOOGLE_CLOUD_PROJECT, location="us-central1")
    return genai.Client(api_key=GEMINI_API_KEY)


def _generate_configs_sync(
    stack: StackInfo,
    platform_context: dict[str, str],
    answers: dict,
    manifest: dict,
) -> list[ConfigFile]:
    """Call Gemini to generate deployment config files."""
    targets = answers.get("targets", "all")
    active_targets = stack.inferred_targets if targets == "all" else [t.strip() for t in targets.split(",")]

    context_sections = "\n\n".join(
        f"=== {platform.upper()} DOCUMENTATION ===\n{content[:4000]}"
        for platform, content in platform_context.items()
        if content
    )

    prompt = f"""You are UniDeploy's DeployAgent. Generate production-ready deployment configuration files.

PROJECT STACK:
- Frontend: {stack.frontend}
- Backend: {stack.backend}
- Database: {stack.db}
- Runtime: {stack.runtime}
- Target platforms: {', '.join(active_targets)}

USER ANSWERS:
{json.dumps(answers, indent=2)}

LIVE PLATFORM DOCUMENTATION (fetched now):
{context_sections or "No external docs fetched — use best-practice defaults."}

SAMPLE PROJECT FILES (for context):
{json.dumps({k: v[:500] for k, v in list(manifest.get("files", {}).items())[:10]}, indent=2)}

Generate ONLY the config files needed for the detected stack and targets. Output a JSON array:
[
  {{
    "path": "vercel.json",
    "content": "...",
    "description": "Vercel deployment config"
  }},
  ...
]

Rules:
- Only generate files for the active deployment targets
- Use environment variable placeholders (e.g. ${{GCP_PROJECT_ID}}) for secrets
- For vercel.json: include buildCommand, framework, regions, and any required rewrites
- For Cloud Run: generate cloudbuild.yaml with correct build + deploy steps
- For Railway: generate railway.toml
- For GitHub Actions: generate .github/workflows/deploy.yml
- Keep configs minimal — only what is required for the detected stack
- Never hardcode secrets, API keys, or project-specific values
- Output ONLY the JSON array, no markdown fences, no explanations
"""

    client = _build_gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=prompt,
        config=GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,
        ),
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0]

    raw = json.loads(text.strip())
    return [
        ConfigFile(
            path=item["path"],
            content=item["content"],
            description=item.get("description", ""),
        )
        for item in raw
    ]


class DeployAgent:
    def __init__(self):
        self._tinyfish = TinyfishClient()

    def detect_stack(self, manifest: dict) -> StackInfo:
        return _detect_stack_from_manifest(manifest)

    def get_clarifying_questions(self, stack: StackInfo, answers: dict = {}) -> list[Question]:
        return _get_clarifying_questions(stack, answers)

    async def fetch_platform_context(self, stack: StackInfo) -> dict[str, str]:
        """Fetch live docs for each target platform via Tinyfish."""
        queries: dict[str, str] = {}

        if "vercel" in stack.inferred_targets:
            if stack.frontend == "nextjs":
                queries["vercel"] = "vercel.json nextjs deployment config 2025"
            else:
                queries["vercel"] = f"vercel.json {stack.frontend} deployment configuration"

        if "gcp" in stack.inferred_targets:
            if stack.backend in ("fastapi", "flask", "django"):
                queries["gcp"] = f"google cloud run {stack.backend} cloudbuild.yaml deploy 2025"
            else:
                queries["gcp"] = "google cloud run nodejs cloudbuild.yaml deploy"

        if "railway" in stack.inferred_targets:
            queries["railway"] = f"railway.toml {stack.frontend} {stack.backend} deployment"

        if "cloudflare" in stack.inferred_targets:
            queries["cloudflare"] = f"wrangler.toml cloudflare workers {stack.frontend}"

        if "aws" in stack.inferred_targets:
            queries["aws"] = f"aws {stack.backend} ecs fargate deployment github actions"

        context: dict[str, str] = {}
        tasks = [
            self._tinyfish.search_and_fetch_top(q)
            for q in queries.values()
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for platform, result in zip(queries.keys(), results):
            context[platform] = result if isinstance(result, str) else ""

        return context

    async def chat(
        self,
        session_id: str,
        manifest: dict | None,   # only on first turn
        history: list[dict],     # [{question, answer}, ...]
    ) -> dict:
        """
        Agentic deployment conversation loop.
        Analyse project manifest and history to gather exactly what is needed.
        """
        system_prompt = """You are a deployment configuration expert. Analyse the project manifest
and conversation history. Your job: gather exactly what you need to
generate correct deployment configs. Rules:
- Infer from manifest without asking: framework, package manager,
  monorepo layout, existing config files (vercel.json, cloudbuild.yaml,
  railway.toml, wrangler.toml)
- Ask ONLY what you cannot infer: target platform (if ambiguous),
  GCP project ID (if Cloud Run chosen), DB region (if managed Postgres)
- Ask ONE question per turn. Never ask two things at once.
- When you have: target platform, env var list, build command, output
  directory — return action=generate immediately.
- Be direct. No filler. No "Great choice!" responses.
Output JSON only: {action, question?, field?, reasoning}"""

        prompt = f"""Conversation history:
{json.dumps(history, indent=2)}

"""
        if manifest:
            # First turn: include manifest context
            files = manifest.get("files", {})
            prompt += f"Project Manifest (subset):\n{json.dumps({k: v[:500] for k, v in list(files.items())[:15]}, indent=2)}"

        client = _build_gemini_client()
        response = client.models.generate_content(
            model="gemini-2.0-flash", # Use faster model for chat
            contents=prompt,
            config=GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )

        try:
            return json.loads(response.text.strip())
        except Exception as e:
            logger.error(f"Deploy chat parse error: {e} | Text: {response.text}")
            return {"action": "clarify", "question": "Could you please rephrase that?"}

    async def generate_configs(
        self,
        manifest: dict,
        stack: StackInfo,
        answers: dict,
    ) -> list[ConfigFile]:
        """Fetch platform docs then call Gemini to generate config files."""
        platform_context = await self.fetch_platform_context(stack)
        return await asyncio.to_thread(
            _generate_configs_sync, stack, platform_context, answers, manifest
        )
