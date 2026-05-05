"""
UniDeploy 12-rule security checker.
This file is uploaded to and executed inside an E2B sandbox — it never runs on Cloud Run.
Entry point: python security_checker.py <repo_path>
Output: JSON array of findings to stdout.
"""

import json
import os
import re
import sys
import math
from pathlib import Path

SEVERITY = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

# ── Helpers ───────────────────────────────────────────────────────────────────

def find_files(repo_path: str, exts: tuple) -> list[Path]:
    root = Path(repo_path)
    skip = {".git", "node_modules", "__pycache__", ".next", "dist", "build", ".venv", "venv"}
    results = []
    for p in root.rglob("*"):
        if any(part in skip for part in p.parts):
            continue
        if p.is_file() and p.suffix in exts:
            results.append(p)
    return results[:200]


def read(path: Path, max_bytes: int = 80_000) -> str:
    try:
        return path.read_text(errors="replace")[:max_bytes]
    except Exception:
        return ""


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    return -sum((f / len(s)) * math.log2(f / len(s)) for f in freq.values())


def detect_framework(repo_path: str) -> str:
    root = Path(repo_path)
    pkg = root / "package.json"
    req = root / "requirements.txt"
    if pkg.exists():
        text = read(pkg)
        if '"next"' in text:
            return "nextjs"
        if '"react"' in text:
            return "react"
        if '"express"' in text:
            return "express"
        if '"@nestjs/core"' in text:
            return "nestjs"
    if req.exists():
        text = read(req).lower()
        if "fastapi" in text:
            return "fastapi"
        if "django" in text:
            return "django"
        if "flask" in text:
            return "flask"
    if (root / "go.mod").exists():
        return "go"
    if (root / "pubspec.yaml").exists():
        return "flutter"
    return "unknown"


def finding(rule_id, severity, category, title, file_path, line_no, description, evidence):
    return {
        "id": rule_id,
        "severity": severity,
        "category": category,
        "title": title,
        "file": str(file_path),
        "line": line_no,
        "description": description,
        "evidence": evidence[:300] if evidence else "",
        "auto_fixable": rule_id in AUTO_FIXABLE_RULES,
        "fix_type": FIX_TYPES.get(rule_id),
    }


AUTO_FIXABLE_RULES = {
    "RLS-001", "RLS-003", "RLS-004", "SEC-001",
    "AUTH-003", "HDR-001", "SEC-002",
}

FIX_TYPES = {
    "RLS-001": "add_rls_policy",
    "RLS-003": "fix_rls_policy",
    "RLS-004": "add_rls_with_check",
    "SEC-001": "move_to_env",
    "SEC-002": "move_to_env",
    "AUTH-003": "add_auth_check",
    "HDR-001": "add_security_header",
}

# ── 12 Security Rules ─────────────────────────────────────────────────────────

def check_rls_disabled(repo_path, framework):
    """RLS-001: Supabase table without RLS enabled."""
    results = []
    sql_files = find_files(repo_path, (".sql",))
    for f in sql_files:
        content = read(f)
        tables = re.findall(r'create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)', content, re.IGNORECASE)
        for table in tables:
            if not re.search(rf'alter\s+table\s+{table}\s+enable\s+row\s+level\s+security', content, re.IGNORECASE):
                results.append(finding(
                    "RLS-001", "CRITICAL", "rls",
                    f"RLS not enabled on table `{table}`",
                    f.relative_to(repo_path), None,
                    f"Table `{table}` has no `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY` statement.",
                    f"Table definition found in {f.name} without corresponding RLS enable.",
                ))
    return results


def check_rls_no_policies(repo_path, framework):
    """RLS-002: RLS enabled but no policies defined."""
    results = []
    sql_files = find_files(repo_path, (".sql",))
    for f in sql_files:
        content = read(f)
        rls_tables = re.findall(
            r'alter\s+table\s+(\w+)\s+enable\s+row\s+level\s+security', content, re.IGNORECASE
        )
        for table in rls_tables:
            if not re.search(rf'create\s+policy\s+\S+\s+on\s+{table}', content, re.IGNORECASE):
                results.append(finding(
                    "RLS-002", "HIGH", "rls",
                    f"RLS enabled on `{table}` but no policies defined",
                    f.relative_to(repo_path), None,
                    "RLS with no policies blocks ALL access — this breaks your app.",
                    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY — no CREATE POLICY found.",
                ))
    return results


def check_rls_using_true(repo_path, framework):
    """RLS-003: RLS policy with USING (true) — allows all rows."""
    results = []
    for f in find_files(repo_path, (".sql",)):
        content = read(f)
        for i, line in enumerate(content.splitlines(), 1):
            if re.search(r'using\s*\(\s*true\s*\)', line, re.IGNORECASE):
                results.append(finding(
                    "RLS-003", "CRITICAL", "rls",
                    "RLS policy USING (true) exposes all rows",
                    f.relative_to(repo_path), i,
                    "USING (true) grants access to every row regardless of the requesting user.",
                    line.strip(),
                ))
    return results


def check_rls_missing_with_check(repo_path, framework):
    """RLS-004: UPDATE policy missing WITH CHECK clause."""
    results = []
    for f in find_files(repo_path, (".sql",)):
        content = read(f)
        for m in re.finditer(
            r'create\s+policy\s+\S+\s+on\s+\S+\s+for\s+update.*?;',
            content, re.IGNORECASE | re.DOTALL
        ):
            block = m.group(0)
            if "with check" not in block.lower():
                line_no = content[:m.start()].count("\n") + 1
                results.append(finding(
                    "RLS-004", "HIGH", "rls",
                    "UPDATE policy missing WITH CHECK clause",
                    f.relative_to(repo_path), line_no,
                    "Without WITH CHECK, users can UPDATE rows to values they shouldn't own.",
                    block[:200].strip(),
                ))
    return results


def check_service_role_in_client(repo_path, framework):
    """SEC-001: service_role key referenced in client-side code."""
    results = []
    client_dirs = {"components", "pages", "app", "src", "public", "hooks", "context"}
    code_exts = (".ts", ".tsx", ".js", ".jsx")
    for f in find_files(repo_path, code_exts):
        parts = set(p.lower() for p in f.parts)
        if not parts.intersection(client_dirs):
            continue
        content = read(f)
        for i, line in enumerate(content.splitlines(), 1):
            if "service_role" in line.lower() and not line.strip().startswith("//"):
                results.append(finding(
                    "SEC-001", "CRITICAL", "secrets",
                    "service_role key in client-side file",
                    f.relative_to(repo_path), i,
                    "service_role bypasses RLS — it must NEVER appear in browser-executed code.",
                    line.strip(),
                ))
    return results


def check_hardcoded_secrets(repo_path, framework):
    """SEC-002: Hardcoded API keys / secrets."""
    results = []
    secret_patterns = [
        (r'sk-[A-Za-z0-9]{20,}', "OpenAI secret key"),
        (r'pk_live_[A-Za-z0-9]{20,}', "Stripe live publishable key"),
        (r'sk_live_[A-Za-z0-9]{20,}', "Stripe live secret key"),
        (r'rk_live_[A-Za-z0-9]{20,}', "Stripe restricted key"),
        (r'whsec_[A-Za-z0-9]{20,}', "Stripe webhook secret"),
        (r'AKIA[0-9A-Z]{16}', "AWS access key ID"),
        (r'AIzaSy[0-9A-Za-z\-_]{33}', "Google API key"),
        (r'ghp_[A-Za-z0-9]{36}', "GitHub personal access token"),
        (r'ghs_[A-Za-z0-9]{36}', "GitHub app secret"),
    ]
    skip_files = {".env", ".env.example", ".env.template", ".gitignore"}
    code_exts = (".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rb")
    for f in find_files(repo_path, code_exts):
        if f.name in skip_files:
            continue
        content = read(f)
        for pattern, label in secret_patterns:
            for m in re.finditer(pattern, content):
                line_no = content[:m.start()].count("\n") + 1
                val = m.group(0)
                if shannon_entropy(val) > 3.5:
                    results.append(finding(
                        "SEC-002", "CRITICAL", "secrets",
                        f"{label} hardcoded in source file",
                        f.relative_to(repo_path), line_no,
                        "Hardcoded secret will be committed to git and may be exposed in build output.",
                        val[:12] + "..." + val[-4:],
                    ))
    return results


def check_browser_client_in_server(repo_path, framework):
    """AUTH-001: createBrowserClient used in Next.js server component."""
    if framework not in ("nextjs",):
        return []
    results = []
    app_dir = Path(repo_path) / "app"
    src_app = Path(repo_path) / "src" / "app"
    dirs = [d for d in [app_dir, src_app] if d.exists()]
    for d in dirs:
        for f in d.rglob("*.ts*"):
            content = read(f)
            if "createBrowserClient" in content and '"use client"' not in content:
                for i, line in enumerate(content.splitlines(), 1):
                    if "createBrowserClient" in line:
                        results.append(finding(
                            "AUTH-001", "HIGH", "auth",
                            "createBrowserClient used in server component",
                            f.relative_to(repo_path), i,
                            "Server components must use createServerClient — browser client exposes tokens.",
                            line.strip(),
                        ))
    return results


def check_inverted_auth(repo_path, framework):
    """AUTH-002: Inverted auth guard (if user → 401, if !user → allow)."""
    results = []
    patterns = [
        r'if\s*\(\s*(?:session|user|auth)\s*\)\s*(?:throw|return\s+(?:null|undefined|4[0-9][0-9]))',
        r'if\s*\(\s*!(?:session|user|auth)\s*\)\s*return\s+(?:data|result|response)',
    ]
    for f in find_files(repo_path, (".ts", ".tsx", ".js", ".jsx", ".py")):
        content = read(f)
        for i, line in enumerate(content.splitlines(), 1):
            for pat in patterns:
                if re.search(pat, line, re.IGNORECASE):
                    results.append(finding(
                        "AUTH-002", "CRITICAL", "auth",
                        "Inverted auth guard — blocks authenticated users",
                        f.relative_to(repo_path), i,
                        "Guard logic is reversed: authenticated users are rejected, unauthenticated allowed.",
                        line.strip(),
                    ))
    return results


def check_missing_auth_on_routes(repo_path, framework):
    """AUTH-003: API routes returning data without auth check."""
    results = []
    if framework == "nextjs":
        api_dirs = [
            Path(repo_path) / "src" / "app" / "api",
            Path(repo_path) / "app" / "api",
            Path(repo_path) / "pages" / "api",
        ]
        for api_dir in api_dirs:
            if not api_dir.exists():
                continue
            for f in api_dir.rglob("route.ts*"):
                content = read(f)
                has_auth = any(kw in content for kw in [
                    "getServerSession", "auth()", "currentUser", "clerk", "session",
                    "verifyToken", "authenticate", "requireAuth",
                ])
                has_data_return = bool(re.search(
                    r'(prisma|supabase|db|pool|query|select|findMany|findFirst)',
                    content, re.IGNORECASE
                ))
                if has_data_return and not has_auth:
                    results.append(finding(
                        "AUTH-003", "HIGH", "auth",
                        "API route returns data without auth check",
                        f.relative_to(repo_path), None,
                        "This route queries the database but has no authentication guard.",
                        f.name,
                    ))
    return results


def check_frontend_only_paywall(repo_path, framework):
    """PAY-001: Stripe checkout present but no server-side webhook handler."""
    results = []
    has_stripe_checkout = False
    has_webhook = False
    code_files = find_files(repo_path, (".ts", ".tsx", ".js", ".jsx", ".py"))
    for f in code_files:
        content = read(f)
        if "stripe" in content.lower() and ("checkout" in content.lower() or "createCheckout" in content):
            has_stripe_checkout = True
        if "webhook" in f.name.lower() or ("stripe" in content.lower() and "webhook" in content.lower()):
            has_webhook = True
    if has_stripe_checkout and not has_webhook:
        results.append(finding(
            "PAY-001", "HIGH", "auth",
            "Stripe checkout without server-side webhook handler",
            ".", None,
            "Payment success is only tracked client-side — users can bypass payment by skipping the redirect.",
            "Stripe checkout detected; no webhook handler found.",
        ))
    return results


def check_missing_security_headers(repo_path, framework):
    """HDR-001: Missing Content-Security-Policy and HSTS headers."""
    results = []
    header_files = []
    if framework == "nextjs":
        for name in ["next.config.ts", "next.config.js", "middleware.ts", "middleware.js"]:
            for base in [Path(repo_path), Path(repo_path) / "src"]:
                p = base / name
                if p.exists():
                    header_files.append(p)
    for f in header_files:
        content = read(f)
        if "Content-Security-Policy" not in content:
            results.append(finding(
                "HDR-001", "MEDIUM", "security_headers",
                "Content-Security-Policy header missing",
                f.relative_to(repo_path), None,
                "CSP prevents XSS attacks by controlling which scripts can execute.",
                f.name,
            ))
        if "Strict-Transport-Security" not in content:
            results.append(finding(
                "HDR-002", "MEDIUM", "security_headers",
                "HSTS header missing",
                f.relative_to(repo_path), None,
                "HSTS forces HTTPS and prevents protocol downgrade attacks.",
                f.name,
            ))
    return results


def check_anon_key_in_url(repo_path, framework):
    """SEC-003: Supabase anon key used directly in fetch/axios URL."""
    results = []
    for f in find_files(repo_path, (".ts", ".tsx", ".js", ".jsx")):
        content = read(f)
        for i, line in enumerate(content.splitlines(), 1):
            if re.search(r'(fetch|axios)\s*\(.*supabase.*eyJ', line):
                results.append(finding(
                    "SEC-003", "HIGH", "secrets",
                    "Supabase anon JWT embedded in request URL",
                    f.relative_to(repo_path), i,
                    "JWT tokens in URLs appear in server logs and browser history.",
                    line.strip()[:150],
                ))
    return results


def check_bola_risk(repo_path, framework):
    """BOLA-001: API routes returning data without user_id filter."""
    results = []
    if framework == "nextjs":
        api_dirs = [
            Path(repo_path) / "src" / "app" / "api",
            Path(repo_path) / "app" / "api",
        ]
        for api_dir in api_dirs:
            if not api_dir.exists():
                continue
            for f in api_dir.rglob("route.ts*"):
                content = read(f)
                has_db = re.search(
                    r'(prisma|supabase|db|select|findMany|findFirst)',
                    content, re.IGNORECASE
                )
                has_user_filter = re.search(
                    r'(userId|user_id|ownerId|owner_id|eq.*user)',
                    content, re.IGNORECASE
                )
                if has_db and not has_user_filter:
                    results.append(finding(
                        "BOLA-001", "HIGH", "database",
                        "Possible BOLA — data query without user_id filter",
                        f.relative_to(repo_path), None,
                        "Without a user_id WHERE clause, any authenticated user can read all records.",
                        f.name,
                    ))
    return results


# ── Runner ────────────────────────────────────────────────────────────────────

CHECKS = [
    check_rls_disabled,
    check_rls_no_policies,
    check_rls_using_true,
    check_rls_missing_with_check,
    check_service_role_in_client,
    check_hardcoded_secrets,
    check_browser_client_in_server,
    check_inverted_auth,
    check_missing_auth_on_routes,
    check_frontend_only_paywall,
    check_missing_security_headers,
    check_anon_key_in_url,
    check_bola_risk,
]


def run_checks(repo_path: str) -> dict:
    framework = detect_framework(repo_path)
    findings = []
    for check in CHECKS:
        try:
            findings.extend(check(repo_path, framework))
        except Exception as e:
            findings.append({
                "id": f"ERR-{check.__name__}",
                "severity": "LOW",
                "category": "environment",
                "title": f"Checker error: {check.__name__}",
                "file": ".",
                "line": None,
                "description": str(e),
                "evidence": "",
                "auto_fixable": False,
                "fix_type": None,
            })
    seen = set()
    deduped = []
    for f in findings:
        key = (f["id"], f["file"], f.get("line"))
        if key not in seen:
            seen.add(key)
            deduped.append(f)
    deduped.sort(key=lambda x: SEVERITY.get(x["severity"], 0), reverse=True)
    return {"framework": framework, "findings": deduped}


if __name__ == "__main__":
    repo = sys.argv[1] if len(sys.argv) > 1 else "."
    result = run_checks(repo)
    print(json.dumps(result))
