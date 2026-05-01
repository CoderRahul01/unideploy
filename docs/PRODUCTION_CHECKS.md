# UniDeploy Production-Readiness Check Categories

Every project scanned by UniDeploy is evaluated across 13 categories. Rules are framework-specific — a Next.js app gets different checks than a Django app.

## Vibe-Coded Detection

Before checking production-readiness, AnalyzerAgent fingerprints the project.

**Hard signals (almost certain AI-generated):**
- `.bolt/`, `.lovable/`, `.v0/`, `.replit/`, `CLAUDE.md` directories present
- Supabase `anon_key` used directly in client-side code
- No test files anywhere in the project
- Git history has 1–3 commits with generic messages
- `package.json` has no `test` script or `"test": "echo no tests"`

**Soft signals (likely):**
- All components in one file (e.g., `App.tsx` with 800+ lines)
- No error boundaries, no loading states, no 404 pages
- All API routes do the same thing (no shared middleware)
- Very high comment-to-code ratio

## Framework Detection

```
detect_framework(project_root):
  if package.json:
    if "next" in deps → Next.js
    if "react" without "next" → Vite React / CRA
    if "vue" → Vue / Nuxt
    if "svelte" → SvelteKit
    if "@nestjs/core" → NestJS
    if "express" → Express
  if requirements.txt or pyproject.toml:
    if "fastapi" → FastAPI
    if "django" → Django
    if "flask" → Flask
  if go.mod → Go
  if Cargo.toml → Rust
```

---

## The 13 Categories

### 1. Secrets & Credentials
**Severity:** CRITICAL (live keys), HIGH (.env committed), MEDIUM (real values in .env.example)

- Hardcoded API keys, tokens, passwords in source files
- `.env` committed to git (check git history)
- Supabase `anon_key` / `service_role_key` in client bundle
- `NEXT_PUBLIC_` vars containing secrets
- Stripe, OpenAI, AWS keys in non-.env files

### 2. Authentication & Session Management
**Severity:** CRITICAL (missing auth on data routes), HIGH (insecure cookies/JWTs)

- Every API route has auth check before data access
- JWT signatures actually verified, not just decoded
- Session cookies: httpOnly, Secure, SameSite=Strict
- Password storage: bcrypt/argon2 minimum

### 3. Authorization & Access Control (RLS)
**Severity:** CRITICAL (missing RLS, IDOR)

- Supabase RLS enabled on every table with user data
- RLS policies use `auth.uid()` not just `true`
- `service_role` key never used client-side
- API endpoints with `/{id}` parameter check ownership

### 4. Input Validation & Injection
**Severity:** CRITICAL (SQL injection), HIGH (XSS, missing validation)

- No raw SQL string concatenation
- No `dangerouslySetInnerHTML` / `v-html` with user content
- Server-side validation exists (Pydantic, Zod, Joi)
- File upload MIME type + size validation

### 5. Rate Limiting & Abuse Prevention
**Severity:** HIGH (missing on auth/AI endpoints)

- Auth endpoints have per-IP rate limiting
- AI/expensive operation endpoints have per-user rate limiting
- Circuit breaker for external API calls

### 6. CORS, CSRF, and Request Validation
**Severity:** HIGH (wildcard CORS on auth endpoints, missing CSRF)

- `Access-Control-Allow-Origin` is not `*` on authenticated endpoints
- CSRF tokens or SameSite=Strict cookies for mutations
- GET routes don't modify state

### 7. Error Handling & Information Disclosure
**Severity:** HIGH (stack traces, DEBUG mode)

- No raw stack traces returned to client
- Global error boundary in React
- `DEBUG = False` in production
- Custom 404/500 pages

### 8. Dependency Security
**Severity:** CRITICAL (RCE CVEs), HIGH (data disclosure CVEs)

- Known CVEs in installed packages (`npm audit`, `pip audit`)
- Lock file present and committed
- No wildcard versions (`"*"`, `"latest"`)

### 9. Environment & Configuration Hardening
**Severity:** HIGH (no env validation, debug mode)

- `.env.example` with placeholder values
- Required env vars validated at startup (fail fast)
- `NODE_ENV=production` in deployment
- DB connection uses SSL

### 10. Security Headers
**Severity:** HIGH (missing CSP, HSTS)

- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff
- Referrer-Policy

### 11. Database & Data Layer
**Severity:** HIGH (no indexes on FKs, no pagination)

- Indexes on FK/query columns
- Pagination on list endpoints
- N+1 query patterns
- Connection pooling configured

### 12. Frontend Security
**Severity:** CRITICAL (secrets in bundle), HIGH (tokens in localStorage)

- No API keys in client-side bundle
- Auth tokens NOT in localStorage (use httpOnly cookies)
- No `dangerouslySetInnerHTML` with user data
- External scripts have SRI hashes

### 13. Deployment & Infrastructure Readiness
**Severity:** HIGH (no health check, running as root)

- `/health` endpoint exists
- Graceful shutdown handling (SIGTERM/SIGINT)
- Dockerfile: non-root user, minimal base image
- Error tracking (Sentry/PostHog) configured

---

## Auto-Fix Coverage

| Finding | Auto-fixable? | Fix Type |
|---|---|---|
| Secret in source file | ✅ YES | Move to .env + .gitignore |
| Missing security headers (Next.js) | ✅ YES | Add to next.config.js |
| Wildcard CORS | ✅ YES (with user input) | Replace with explicit origin |
| Missing RLS policy | ✅ YES | Generate SQL policy |
| `dangerouslySetInnerHTML` | ✅ YES | Replace with sanitized render |
| Missing rate limiting | ✅ YES | Add framework-specific middleware |
| Insecure cookie flags | ✅ YES | Add httpOnly, Secure, SameSite |
| Missing health endpoint | ✅ YES | Add /health route |
| Missing error boundary | ✅ YES | Add error.tsx |
| Auth middleware missing | ⚠️ REVIEW | Add auth check (verify logic) |
| Missing pagination | 💡 SUGGESTION | Business logic change |
| N+1 query | 💡 SUGGESTION | Requires data model understanding |
