---
name: rate-limiting
description: Add rate limiting. Load when deploy_check flags missing rate limits, or user asks about protecting endpoints.
---

# Rate Limiting

No rate limiting = attackers hammer endpoints. For AI apps = runaway LLM costs.

## Upstash Redis
npm install @upstash/ratelimit @upstash/redis

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "10 s") });

const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
const { success } = await ratelimit.limit(ip);
if (!success) return Response.json({ error: "Too many requests" }, { status: 429 });

## Env vars to add to .env.example
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

## Cloudflare WAF (free)
Security → WAF → Rate Limiting: /api/*, 100 req/min per IP, Block.

Write files using write/edit tools directly.
