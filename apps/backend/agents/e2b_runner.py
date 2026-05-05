"""
E2B sandbox runner for AnalyzeAgent and FixAgent.
Code NEVER writes to Cloud Run disk — everything runs inside ephemeral E2B VMs.
Only findings JSON leaves the sandbox.
"""

import asyncio
import json
import os
import textwrap
from pathlib import Path

E2B_API_KEY = os.getenv("E2B_API_KEY", "")


def _read_checker_source() -> str:
    """Read the security_checker.py source to upload into the sandbox."""
    checker_path = Path(__file__).parent.parent / "analyzer" / "security_checker.py"
    return checker_path.read_text()


def _run_analyze_sync(github_url: str, branch: str) -> dict:
    """
    Synchronous E2B scan — runs inside a thread via asyncio.to_thread.
    Clones the repo, runs security_checker.py, returns findings JSON.
    Sandbox is destroyed regardless of success or failure.
    """
    from e2b import Sandbox

    sbx = Sandbox(api_key=E2B_API_KEY or None, timeout=300)
    try:
        # 1. Clone repo inside sandbox
        result = sbx.commands.run(
            f"git clone --depth=1 --branch={branch} {github_url} /repo 2>&1",
            timeout=120,
        )
        if result.exit_code != 0:
            # Try without branch flag (default branch)
            result = sbx.commands.run(
                f"git clone --depth=1 {github_url} /repo 2>&1",
                timeout=120,
            )
        if result.exit_code != 0:
            return {
                "framework": "unknown",
                "findings": [{
                    "id": "CLONE-001",
                    "severity": "LOW",
                    "category": "environment",
                    "title": "Repository clone failed",
                    "file": ".",
                    "line": None,
                    "description": f"Could not clone repository: {result.stdout[:300]}",
                    "evidence": "",
                    "auto_fixable": False,
                    "fix_type": None,
                }],
            }

        # 2. Upload security checker
        sbx.files.write("/checker.py", _read_checker_source())

        # 3. Run checks
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


def _run_fix_sync(github_url: str, branch: str, patches: list[dict], repo_name: str) -> dict:
    """
    Synchronous E2B fix runner — clones repo, applies patches, pushes PR branch.
    Returns the branch name and commit sha for Composio to open a PR against.
    """
    from e2b import Sandbox

    sbx = Sandbox(api_key=E2B_API_KEY or None, timeout=300)
    try:
        # Clone
        sbx.commands.run(f"git clone --depth=1 {github_url} /repo 2>&1", timeout=120)

        # Configure git identity inside sandbox
        sbx.commands.run('git -C /repo config user.email "bot@unideploy.in"')
        sbx.commands.run('git -C /repo config user.name "UniDeploy Bot"')

        # Create fix branch
        fix_branch = "unideploy/security-fixes"
        sbx.commands.run(f"git -C /repo checkout -b {fix_branch}")

        applied = []
        for patch in patches:
            file_path = patch.get("file_path", "")
            new_content = patch.get("new_content", "")
            if not file_path or not new_content:
                continue
            full_path = f"/repo/{file_path}"
            sbx.files.write(full_path, new_content)
            sbx.commands.run(f"git -C /repo add {file_path}")
            applied.append(file_path)

        if not applied:
            return {"success": False, "error": "No patches were applied"}

        # Commit
        msg = f"fix: [UniDeploy] remediate {len(applied)} security finding(s)\n\nFiles changed: {', '.join(applied)}"
        result = sbx.commands.run(f'git -C /repo commit -m "{msg}"')
        if result.exit_code != 0:
            return {"success": False, "error": f"Commit failed: {result.stdout}"}

        return {
            "success": True,
            "fix_branch": fix_branch,
            "files_changed": applied,
            "commit_message": msg,
        }
    finally:
        try:
            sbx.kill()
        except Exception:
            pass


async def run_scan_in_sandbox(github_url: str, branch: str = "main") -> dict:
    """Async wrapper — runs E2B scan in a thread pool."""
    return await asyncio.to_thread(_run_analyze_sync, github_url, branch)


async def run_fix_in_sandbox(github_url: str, branch: str, patches: list[dict], repo_name: str) -> dict:
    """Async wrapper — runs E2B fix in a thread pool."""
    return await asyncio.to_thread(_run_fix_sync, github_url, branch, patches, repo_name)
