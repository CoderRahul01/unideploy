# vulnerable-demo-app

This application is intentionally misconfigured for security demonstration purposes. **Do not deploy.**

It is used to demonstrate UniDeploy's scanner — run:

```bash
npx unideploy init --json
```

Expected findings:
- CRITICAL: Hardcoded API key in `lib/db.ts`
- HIGH: Supabase anon key used in client-side fetch (`lib/db.ts`)
- HIGH: API route missing authentication check (`app/api/users/route.ts`)
- HIGH: Stack trace exposed in HTTP error response (`app/api/users/route.ts`)
- HIGH: High-risk dependency `node-serialize` (`package.json`)
- HIGH: RLS disabled on tables `users`, `posts`, `payments` (`supabase/migrations/001_init.sql`)
- MEDIUM: Sensitive data logged to console (`app/api/users/route.ts`)
- MEDIUM: Permissive CORS configuration (`app/api/webhook/route.ts`)
- MEDIUM: Missing security headers (`next.config.js`)
- MEDIUM: Debug mode committed to version control (`.env.example`)
- MEDIUM: API route missing input validation (`app/api/users/route.ts`, `app/api/webhook/route.ts`)
- LOW: `.env` file not listed in `.gitignore`
