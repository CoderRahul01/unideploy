---
name: auth
description: Audit authentication and authorization. Load when user asks about auth, session handling, route protection, or CSRF.
---

# Auth Audit

## Common vibe-coding auth bugs
1. No server-side auth check — UI checks session, API routes don't
2. Inverted auth logic — anonymous gets access, authenticated gets blocked (real 2026 breach)
3. Missing CSRF — state-changing POST with no token
4. Insecure cookies — missing httpOnly, secure, sameSite

## Find them
Read all API route files. Look for handlers without auth.getUser() or getServerSession() near the top.

## Fix (Next.js App Router)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });
}

## Fix (Express)
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  req.user = await verifyToken(token);
  next();
};

Apply fixes using edit/write directly.
