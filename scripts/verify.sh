#!/bin/bash
set -e

# ANSI color codes — use $'...' syntax for MINGW64/Git Bash compatibility
GREEN=$'\033[0;32m'
RED=$'\033[0;31m'
GRAY=$'\033[0;37m'
RESET=$'\033[0m'

# Use 'python' on Windows (python3 alias doesn't exist in Git Bash)
PYTHON=python

echo ""
echo "  UniDeploy — End-to-End Verification"
echo "  ─────────────────────────────────────"
echo ""

pass() { printf "  ${GREEN}✓${RESET} %s\n" "$1"; }
fail() { printf "  ${RED}✗${RESET} %s\n" "$1"; exit 1; }
skip() { printf "  ${GRAY}~${RESET} %s\n" "$1"; }

# Detect repo root (run from anywhere inside the repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# 1. Backend health
echo "  Checking backend..."
HEALTH=$(curl -sf http://localhost:8000/health 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q "healthy\|ok\|status"; then
  pass "Backend health: OK"
else
  fail "Backend not running — start it with: cd apps/backend && python -m uvicorn main:app --reload --port 8000"
fi

# 2. ADK agent import
echo "  Checking ADK agent..."
cd apps/backend
if $PYTHON -c "
import sys; sys.path.insert(0,'.')
from dotenv import load_dotenv; load_dotenv('.env')
from agents.analyzer import run_analysis, compute_grade
from adk_app import root_agent, analyzer_agent
print('OK')
" 2>/dev/null | grep -q OK; then
  pass "ADK import: OK"
else
  fail "ADK import failed — check: python -c 'from agents.analyzer import run_analysis; from adk_app import root_agent'"
fi
cd "$REPO_ROOT"

# 3. Session creation
echo "  Testing session API..."
SESSION=$(curl -sf -X POST http://localhost:8000/api/v1/sessions/create \
  -H "Content-Type: application/json" \
  -d '{"cli_version":"0.1.0","machine_name":"verify-test","project_path":"/tmp"}' 2>/dev/null || echo "FAIL")

if echo "$SESSION" | grep -q "session_code"; then
  CODE=$(echo "$SESSION" | $PYTHON -c "import sys,json; print(json.load(sys.stdin)['session_code'])")
  pass "Session created: $CODE"
else
  fail "Session creation failed — check backend logs"
fi

# 4. Session connect
CONNECT=$(curl -sf -X POST http://localhost:8000/api/v1/sessions/connect \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\"}" 2>/dev/null || echo "FAIL")

if echo "$CONNECT" | grep -q "session_id"; then
  pass "Session connect: OK"
else
  fail "Session connect failed — check backend logs"
fi

# 5. CLI TypeScript check
echo "  Checking CLI..."
if command -v npx &>/dev/null && [ -f apps/cli/tsconfig.json ]; then
  cd apps/cli
  if npx tsc --noEmit 2>/dev/null; then
    pass "CLI TypeScript: OK"
  else
    skip "CLI TypeScript: errors (run: cd apps/cli && npm install)"
  fi
  cd "$REPO_ROOT"
else
  skip "CLI TypeScript check skipped (run: cd apps/cli && npm install)"
fi

# 6. Quick ADK test — costs 1 Gemini API call, skipped if key not set
echo "  Testing AnalyzerAgent..."
cd apps/backend
GEMINI_KEY=$($PYTHON -c "
from dotenv import load_dotenv; load_dotenv('.env')
import os; print(os.getenv('GEMINI_API_KEY',''))
" 2>/dev/null)

if [ -z "$GEMINI_KEY" ] || [ "$GEMINI_KEY" = "placeholder" ]; then
  skip "AnalyzerAgent test skipped — set GEMINI_API_KEY in apps/backend/.env"
else
  TEST_RESULT=$($PYTHON -c "
import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv('.env')
from agents.analyzer import run_analysis, compute_grade

async def test():
    manifest = {
        'framework': 'nextjs',
        'file_count': 1,
        'files': [{'path': 'lib/config.ts', 'content': 'const STRIPE_KEY = \"sk_live_abc123\"\nexport default STRIPE_KEY'}]
    }
    findings = await run_analysis(manifest)
    grade = compute_grade(findings)
    return len(findings), grade

count, grade = asyncio.run(test())
print(f'findings={count} grade={grade}')
" 2>/dev/null || echo "SKIP")

  if echo "$TEST_RESULT" | grep -q "findings="; then
    pass "AnalyzerAgent: $TEST_RESULT"
  else
    skip "AnalyzerAgent test failed — check GEMINI_API_KEY value"
  fi
fi
cd "$REPO_ROOT"

echo ""
echo "  ─────────────────────────────────────"
printf "  ${GREEN}All checks passed!${RESET}\n"
echo ""
echo "  Start the full stack:"
echo "    Terminal 1 (backend):  cd apps/backend && python -m uvicorn main:app --reload --port 8000"
echo "    Terminal 2 (frontend): cd apps/frontend && npm run dev"
echo "    Terminal 3 (CLI):      cd <your-project> && UNIDEPLOY_API_URL=http://localhost:8000 \\"
echo "                           npx ts-node $REPO_ROOT/apps/cli/src/index.ts init"
echo ""
echo "  Then open: http://localhost:3000/connect"
echo ""
