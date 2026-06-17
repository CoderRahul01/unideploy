import type { Request, Response, NextFunction } from "express";
import { redis } from "../services/redis.js";
import type { SessionToken } from "../types/index.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid token", code: "UNAUTHORIZED" });
    return;
  }

  const token = auth.slice(7);
  let session: SessionToken | null;
  try {
    session = await redis.jsonGet<SessionToken>(`session:${token}`);
  } catch {
    res.status(503).json({ error: "Auth service unavailable", code: "SERVICE_UNAVAILABLE" });
    return;
  }

  if (!session?.user_id) {
    res.status(401).json({ error: "Session expired or invalid", code: "SESSION_EXPIRED" });
    return;
  }

  req.userId = session.user_id;
  next();
}
