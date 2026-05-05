"""
E2B sandbox runner — AnalyzeAgent and FixAgent.

E2B is OPTIONAL. When E2B_API_KEY is not set:
  - Analysis: fetches files via GitHub API → runs security_checker in-process
  - Fix:       returns a structured patch for the caller to apply manually
"""

import asyncio
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger("unideploy.e2b")

E2B_API_KEY = os.getenv("E2B_API_KEY", "")
E2B_ENABLED = bool(E2B_API_KEY)


def _read_checker_source() -> str:
    checker_path = Path(__file__).parent.parent / "analyzer" / "security_checker.py"
    return checker_path.read_text()


# ── E2B paths ─────────────────────────────────────────────────────────────────

def _run_analyze_e2b(github_url: str, branch: str) -> dict:
    from e2b import Sandbox

    sbx = Sandbox(api_key=E2B_API_KEY, timeout=300)
    try:
        result = sbx.commands.run(
            f"git clone --depth=1 --branch={branch} {github_url} /repo 2>&1",
            timeout=120,
        )
        if result.exit_code != 0:
            result = sbx.commands.run(
                f"git clone --depth=1 {github_url} /repo 2>&1", timeout=120
            )
        if result.exit_code != 0:
            return {"framework": "unknown", "findings": [{
                "id": "CLONE-001", "severity": "LOW", "category": "environment",
                "title": "Repository clone failed", "file": ".", "line": None,
                "description": result.stdout[:300], "evidence": "",
                "auto_fixable": False, "fix_type": None,
            }]}

        sbx.files.write("/checker.py", _read_checker_source())
        result = sbx.commands.run("python /checker.py /repo", timeout=120)
        if result.exit_code != 0:
            return {"framework": "unknown", "findings": []}

        return json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        return {"framework": "unknown", "findings": []}
    finally:
        try:
            sbx.kill()
        except Exception:
            pass


def _run_fix_e2b(github_url: str, branch: str, patches: list[dict], repo_name: str) -> dict:
    from e2b import Sandbox

    sbx = Sandbox(api_key=E2B_API_KEY, timeout=300)
    try:
        sbx.commands.run(f"git clone --depth=1 {github_url} /repo 2>&1", timeout=120)
        sbx.commands.run('git -C /repo config user.email "bot@unideploy.in"')
        sbx.commands.run('git -C /repo config user.name "UniDeploy Bot"')

        fix_branch = "unideploy/security-fixes"
        sbx.commands.run(f"git -C /repo checkout -b {fix_branch}")

        applied = []
        for patch in patches:
            fp = patch.get("file_path", "")
            content = patch.get("new_content", "")
            if not fp or not content:
                continue
            sbx.files.write(f"/repo/{fp}", content)
            sbx.commands.run(f"git -C /repo add {fp}")
            applied.append(fp)

        if not applied:
            return {"success": False, "error": "No patches applied"}

        msg = f"fix: [UniDeploy] remediate {len(applied)} security finding(s)"
        result = sbx.commands.run(f'git -C /repo commit -m "{msg}"')
        if result.exit_code != 0:
            return {"success": False, "error": f"Commit failed: {result.stdout}"}

        return {"success": True, "fix_branch": fix_branch, "files_changed": applied}
    finally:
        try:
            sbx.kill()
        except Exception:
            pass


# ── Fallback paths (no E2B) ───────────────────────────────────────────────────

def _fetch_github_files(github_url: str, branch: str) -> tuple[str, list[dict]]:
    """
    Fetch repo files via GitHub API (no sandbox needed for public repos).
    Returns (framework_hint, [{path, content}, ...])
    """
    import httpx

    # Parse owner/repo from URL
    parts = github_url.rstrip("/").split("/")
    if len(parts) < 2:
        return "unknown", []
    owner, repo = parts[-2], parts[-1].replace(".git", "")

    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.getenv("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # Get file tree
    try:
        resp = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
            headers=headers, timeout=15,
        )
        if resp.status_code != 200:
            return "unknown", []

        tree = resp.json().get("tree", [])
        SCAN_EXTS = {".ts", ".tsx", ".js", ".jsx", ".py", ".sql", ".json", ".yaml", ".yml", ".toml", ".sh"}
        SKIP_DIRS = {"node_modules", ".git", "dist", ".next", "__pycache__", "venv", ".venv", "build"}

        files = []
        for item in tree:
            if item["type"] != "blob":
                continue
            path = item["path"]
            if any(part in SKIP_DIRS for part in path.split("/")):
                continue
            ext = Path(path).suffix
            if ext not in SCAN_EXTS and Path(path).name not in {"Dockerfile", ".env.example"}:
                continue
            if item.get("size", 0) > 80_000:
                continue
            files.append(path)

        # Fetch content for each file (limit to 80 files)
        collected = []
        for path in files[:80]:
            try:
                r = httpx.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}",
                    headers=headers, timeout=10,
                )
                if r.status_code == 200:
                    import base64
                    data = r.json()
                    content = base64.b64decode(data.get("content", "")).decode("utf-8", errors="replace")
                    collected.append({"path": path, "content": content})
            except Exception:
                continue

        return "unknown", collected
    except Exception as e:
        logger.warning("GitHub API fetch failed: %s", e)
        return "unknown", []


def _run_analyze_local(github_url: str, branch: str) -> dict:
    """Run security_checker in-process on files fetched via GitHub API."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from analyzer.security_checker import run_checks
    import tempfile, shutil

    _, files = _fetch_github_files(github_url, branch)
    if not files:
        return {"framework": "unknown", "findings": [{
            "id": "FETCH-001", "severity": "LOW", "category": "environment",
            "title": "Could not fetch repository files",
            "file": ".", "line": None,
            "description": "Set GITHUB_TOKEN env var for private repos or use E2B for full analysis.",
            "evidence": "", "auto_fixable": False, "fix_type": None,
        }]}

    # Write files to a temp dir so security_checker can read them
    tmpdir = tempfile.mkdtemp()
    try:
        for f in files:
            dest = Path(tmpdir) / f["path"]
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(f["content"], errors="replace")
        return run_checks(tmpdir)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _run_fix_local(patches: list[dict]) -> dict:
    """Return patches as-is — caller (FixAgent) handles PR via Composio."""
    applied = [p["file_path"] for p in patches if p.get("file_path") and p.get("new_content")]
    return {
        "success": bool(applied),
        "fix_branch": "unideploy/security-fixes",
        "files_changed": applied,
        "patches": patches,
        "note": "E2B not configured — patches generated but not committed. Use FixAgent to apply.",
    }


# ── Async public API ──────────────────────────────────────────────────────────

async def run_scan_in_sandbox(github_url: str, branch: str = "main") -> dict:
    if E2B_ENABLED:
        logger.info("Scanning via E2B sandbox: %s", github_url)
        return await asyncio.to_thread(_run_analyze_e2b, github_url, branch)
    else:
        logger.info("E2B not configured — scanning via GitHub API + local checker: %s", github_url)
        return await asyncio.to_thread(_run_analyze_local, github_url, branch)


async def run_fix_in_sandbox(
    github_url: str,
    branch: str,
    patches: list[dict],
    repo_name: str,
) -> dict:
    if E2B_ENABLED:
        logger.info("Applying fixes via E2B sandbox: %s", github_url)
        return await asyncio.to_thread(_run_fix_e2b, github_url, branch, patches, repo_name)
    else:
        logger.info("E2B not configured — returning patches without committing")
        return _run_fix_local(patches)
