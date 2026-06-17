import type { Request, Response, NextFunction } from "express";
import { redis } from "../services/redis.js";
import { dbSelect } from "../services/insforge.js";
import { QUOTA_LIMITS } from "../types/index.js";
import type { User, PlanTier } from "../types/index.js";

function quotaKey(userId: string): string {
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `quota:${userId}:${ym}`;
}

function secondsUntilEndOfMonth(): number {
  const now = new Date();
  const endOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0),
  );
  return Math.ceil((endOfMonth.getTime() - now.getTime()) / 1000);
}

export async function enforceQuota(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.userId;

  let user: User | undefined;
  try {
    const rows = await dbSelect<User>("app_users", { id: userId });
    user = rows[0];
  } catch {
    // If InsForge is down, let the request through — don't block scans
    next();
    return;
  }

  if (!user) {
    res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    return;
  }

  const tier = (user.plan_tier ?? "Free") as PlanTier;
  const limit = QUOTA_LIMITS[tier] ?? QUOTA_LIMITS.Free;
  const key = quotaKey(userId);

  let count: number;
  try {
    const raw = await redis.get(key);
    count = raw ? parseInt(raw, 10) : 0;
  } catch {
    // Redis down — allow request rather than blocking all users
    next();
    return;
  }

  if (count >= limit) {
    res.status(429).json({
      error: "Scan limit reached for this month",
      code: "QUOTA_EXCEEDED",
      upgradeUrl: "https://unideploy.in/pricing",
      limit,
      used: count,
    });
    return;
  }

  // Increment before proceeding — decrement on agent failure is not worth the complexity
  try {
    const newCount = await redis.incr(key);
    if (newCount === 1) {
      // First scan this month — set TTL to end of month
      await redis.expire(key, secondsUntilEndOfMonth());
    }
  } catch {
    // Best-effort — don't block if Redis write fails
  }

  next();
}
