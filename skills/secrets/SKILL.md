---
name: secrets
description: Scan for exposed API keys, hardcoded secrets, and LLM tool ignore coverage gaps. Load when user asks about secrets, .env files, or security posture.
---

# Secrets Audit

## Run
secrets_audit({ repoPath: "." })

## What it checks
1. Hardcoded keys — Anthropic, OpenAI, Stripe, AWS, GitHub, Supabase JWTs, PEM keys
2. LLM ignore coverage — .gitignore, .cursorignore, .claudeignore, .aiderignore, .dockerignore, .geminiignore (11 files)
3. Git history — .env committed and later removed (still recoverable)
4. Entropy scan — unknown secrets by Shannon entropy ≥ 4.0

## After scanning
For each critical finding: name the file and line, name the provider, give the rotation URL, apply the fix using edit/write where possible. Offer /skill:secrets-1claw for vault migration.
Never print actual values — mask as first 6 chars + ****.
