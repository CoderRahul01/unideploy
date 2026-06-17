---
name: cors
description: Detect wildcard CORS origins, missing preflight handling, and insecure cross-origin configurations.
---

# CORS Configuration Audit

Use this skill when:
- Checking if CORS is properly configured
- User mentions "CORS", "cross-origin", or "preflight"
- API returns `Access-Control-Allow-Origin: *`

## What this checks

1. **Wildcard origins** — `Access-Control-Allow-Origin: *` allows any site to make requests
2. **Missing preflight handling** — OPTIONS requests not handled, breaking CORS for non-simple requests
3. **Credentials with wildcard** — `credentials: true` with `origin: *` is invalid and dangerous
4. **Over-permissive methods** — allowing DELETE/PUT when only GET/POST are needed
5. **Missing headers restriction** — allowing all headers instead of a specific set

## How to detect (patterns, file paths, code signatures)

### Dangerous patterns

| Pattern | File types | Severity |
|---------|-----------|----------|
| `origin: '*'` or `origin: "*"` | `.ts`, `.js`, `.py` | **High** |
| `Access-Control-Allow-Origin: *` | `.ts`, `.js`, config | **High** |
| `credentials: true` + `origin: '*'` | `.ts`, `.js` | **Critical** |
| No CORS config at all on public API | any | **Medium** |

### Where to look

- `src/middleware.ts` (Next.js middleware)
- `next.config.ts` / `next.config.js` (headers config)
- `vercel.json` (Vercel headers)
- `server.ts` / `app.ts` (Express CORS middleware)
- `wrangler.toml` (Cloudflare Workers)
- Any file importing `cors` package

## Severity grading

| Finding | Severity |
|---------|----------|
| Credentials + wildcard origin | **Critical** |
| Wildcard origin on authenticated API | **High** |
| Wildcard origin on public-only API | **Medium** |
| Missing preflight (OPTIONS) handler | **Medium** |
| Over-permissive methods | **Low** |

## How to fix (step by step)

### Express

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Next.js (middleware.ts)

```typescript
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = ['https://yourdomain.com'];

  if (origin && allowed.includes(origin)) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }
}
```

### Vercel (vercel.json)

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://yourdomain.com" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

## Example findings format (JSON)

```json
{
  "findings": [
    {
      "file": "server.ts",
      "line": 12,
      "severity": "high",
      "type": "wildcard_cors",
      "description": "CORS origin set to '*' — any website can make authenticated requests to your API",
      "fix": "Replace with your actual domain: cors({ origin: 'https://yourdomain.com' })"
    }
  ]
}
```
