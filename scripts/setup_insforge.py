#!/usr/bin/env python3
"""
InsForge table setup for UniDeploy.
Run once to create the scans and findings tables.

Usage:
  export INSFORGE_API_KEY=your_key
  export INSFORGE_PROJECT_ID=your_project_id
  python3 scripts/setup_insforge.py
"""

import os, sys, json, asyncio
try:
    import httpx
except ImportError:
    print("Installing httpx...")
    os.system(f"{sys.executable} -m pip install httpx -q")
    import httpx

BASE_URL  = os.getenv("INSFORGE_BASE_URL", "https://api.insforge.dev")
API_KEY   = os.getenv("INSFORGE_API_KEY", "")
PROJECT   = os.getenv("INSFORGE_PROJECT_ID", "")

if not API_KEY or not PROJECT:
    print("ERROR: Set INSFORGE_API_KEY and INSFORGE_PROJECT_ID environment variables.")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "X-Project-ID":  PROJECT,
    "Content-Type":  "application/json",
}

# ── Table schemas ─────────────────────────────────────────────────────────────

# Both tables are defined as the backend expects them.
# InsForge columns: name, type, required, unique, default

SCANS_SCHEMA = {
    "name": "scans",
    "columns": [
        {"name": "id",            "type": "text",     "primary_key": True},
        {"name": "session_id",    "type": "text",     "required": True},
        {"name": "project_name",  "type": "text"},
        {"name": "framework",     "type": "text"},
        {"name": "status",        "type": "text",     "default": "pending"},
        {"name": "grade",         "type": "text"},
        {"name": "total_issues",  "type": "integer",  "default": 0},
        {"name": "auto_fixable",  "type": "integer",  "default": 0},
        {"name": "files_scanned", "type": "integer",  "default": 0},
        {"name": "created_at",    "type": "text"},
        {"name": "completed_at",  "type": "text"},
    ],
}

FINDINGS_SCHEMA = {
    "name": "findings",
    "columns": [
        {"name": "id",            "type": "text",     "primary_key": True},
        {"name": "scan_id",       "type": "text",     "required": True},
        {"name": "file_path",     "type": "text"},
        {"name": "line_number",   "type": "integer"},
        {"name": "severity",      "type": "text"},
        {"name": "category",      "type": "text"},
        {"name": "title",         "type": "text"},
        {"name": "description",   "type": "text"},
        {"name": "fix_guideline", "type": "text"},
        {"name": "evidence",      "type": "text"},
        {"name": "auto_fixable",  "type": "boolean",  "default": False},
        {"name": "created_at",    "type": "text"},
    ],
}


async def create_table(client: httpx.AsyncClient, schema: dict) -> bool:
    name = schema["name"]
    # Try InsForge table creation endpoint
    for endpoint in [f"/tables", f"/schema/tables", f"/db/tables"]:
        try:
            r = await client.post(f"{BASE_URL}{endpoint}", json=schema, headers=HEADERS)
            if r.status_code in (200, 201):
                print(f"  ✓ Created table '{name}' via {endpoint}")
                return True
            elif r.status_code == 409:
                print(f"  ✓ Table '{name}' already exists")
                return True
        except Exception:
            continue

    # If API creation fails, fall back to test insert to trigger auto-create
    try:
        test_row = {"id": "__setup_test__", "session_id": "__test__", "status": "test",
                    "created_at": "2026-01-01T00:00:00"}
        if name == "findings":
            test_row = {"id": "__setup_test__", "scan_id": "__test__",
                        "severity": "low", "title": "test", "created_at": "2026-01-01T00:00:00"}

        r = await client.post(f"{BASE_URL}/db/{name}", json=test_row, headers=HEADERS)
        if r.status_code in (200, 201):
            # Clean up test row
            await client.delete(f"{BASE_URL}/db/{name}/__setup_test__", headers=HEADERS)
            print(f"  ✓ Table '{name}' auto-created on first insert")
            return True
        else:
            print(f"  ✗ Table '{name}' creation failed: {r.status_code} {r.text[:120]}")
            return False
    except Exception as e:
        print(f"  ✗ Table '{name}' creation error: {e}")
        return False


async def main():
    print(f"\nConnecting to InsForge project: {PROJECT}")
    print(f"Base URL: {BASE_URL}\n")

    async with httpx.AsyncClient(timeout=15) as client:
        # Verify credentials
        try:
            r = await client.get(f"{BASE_URL}/health", headers=HEADERS)
        except Exception as e:
            print(f"Could not reach InsForge: {e}")
            print_sql_fallback()
            return

        print("Setting up tables...")
        ok1 = await create_table(client, SCANS_SCHEMA)
        ok2 = await create_table(client, FINDINGS_SCHEMA)

    if ok1 and ok2:
        print("\n✓ InsForge is ready. Both tables exist.")
        print("  Backend will now persist scans and findings to InsForge.\n")
    else:
        print("\nAuto-setup incomplete. Use the SQL Editor fallback below.")
        print_sql_fallback()


def print_sql_fallback():
    print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SQL FALLBACK — paste in InsForge SQL Editor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS scans (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    project_name  TEXT,
    framework     TEXT,
    status        TEXT DEFAULT 'pending',
    grade         TEXT,
    total_issues  INTEGER DEFAULT 0,
    auto_fixable  INTEGER DEFAULT 0,
    files_scanned INTEGER DEFAULT 0,
    created_at    TEXT,
    completed_at  TEXT
);

CREATE TABLE IF NOT EXISTS findings (
    id            TEXT PRIMARY KEY,
    scan_id       TEXT NOT NULL,
    file_path     TEXT,
    line_number   INTEGER,
    severity      TEXT,
    category      TEXT,
    title         TEXT,
    description   TEXT,
    fix_guideline TEXT,
    evidence      TEXT,
    auto_fixable  BOOLEAN DEFAULT false,
    created_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_scans_session_id ON scans(session_id);
CREATE INDEX IF NOT EXISTS idx_findings_scan_id  ON findings(scan_id);
""")


if __name__ == "__main__":
    asyncio.run(main())
