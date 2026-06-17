---
name: deploy
description: Full pre-deployment check. Load when user wants to deploy or asks if app is production-ready.
---

# Pre-Deployment Checklist

## Run all three
secrets_audit({ repoPath: "." })
rls_scan({ repoPath: "." })
deploy_check({ repoPath: "." })

## Block conditions
- Any critical secret finding
- service_role in client code
- USING(true) RLS policy
- .env not gitignored
- Critical npm vulnerabilities

## After all scans: apply all fixable issues using read/edit/write directly
Leave a summary of what was fixed and what still needs manual action.
