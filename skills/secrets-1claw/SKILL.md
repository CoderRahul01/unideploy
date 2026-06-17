---
name: secrets-1claw
description: Migrate secrets to 1Claw self-custodial vault. Load when user wants to move secrets out of .env, or after secrets_audit finds critical findings.
---

# 1Claw Secrets Migration

Plaintext secrets never touch UniDeploy servers. All 1Claw API calls from CLI on user's machine.

## Steps
1. Run secrets_audit({ repoPath: "." }) first
2. Classify: STRIPE_* → api-keys/stripe, OPENAI_* → api-keys/openai, DATABASE_URL → database/primary, everything else → misc/{name}
3. Show migration plan to user, ask to confirm
4. Add .env.local.bak to ALL ignore files FIRST (.gitignore, .cursorignore, .claudeignore, .dockerignore)
5. Generate .env.1claw with reference values: STRIPE_KEY=1claw://vaults/myapp-prod/api-keys/stripe
6. Rename .env → .env.local.bak
7. If secrets in git history: produce SECRETS_ROTATION.md with rotation URLs — do NOT rewrite history automatically

## Constraints
Never automate destructive history rewrites. Always back up before mutating. If $CI is set, dry-run only.
