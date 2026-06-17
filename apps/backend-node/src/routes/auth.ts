import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { redis } from "../services/redis.js";
import { dbInsert, dbSelect, dbUpdate } from "../services/insforge.js";
import { requireAuth } from "../middleware/auth.js";
import type { User, AuthSession } from "../types/index.js";

export const authRouter = Router();

function generateSessionCode(): string {
  // 6-char alphanumeric, uppercase
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// POST /auth/register
authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required", code: "INVALID_REQUEST" });
    return;
  }

  try {
    const existing = await dbSelect<User>("app_users", { email });
    if (existing.length > 0) {
      res.status(400).json({ error: "User already exists", code: "USER_EXISTS" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const userId = randomBytes(16).toString("hex");
    const now = new Date().toISOString();

    await dbInsert("app_users", {
      id: userId,
      email,
      password_hash,
      plan_tier: "Free",
      scans_remaining: 10,
      created_at: now,
    });

    const token = generateToken();
    await redis.jsonSet(`session:${token}`, { user_id: userId }, 86400); // 24h

    res.status(201).json({ data: { token, user_id: userId, plan_tier: "Free", scans_remaining: 10 } });
  } catch (err) {
    console.error("[auth/register]", err);
    res.status(500).json({ error: "Registration failed", code: "INTERNAL_ERROR" });
  }
});

// POST /auth/login
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required", code: "INVALID_REQUEST" });
    return;
  }

  try {
    const users = await dbSelect<User>("app_users", { email });
    if (!users.length) {
      res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
      return;
    }

    const user = users[0]!;
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
      return;
    }

    const token = generateToken();
    await redis.jsonSet(`session:${token}`, { user_id: user.id }, 86400); // 24h

    res.json({
      data: {
        token,
        user_id: user.id,
        plan_tier: user.plan_tier,
        scans_remaining: user.scans_remaining,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "Login failed", code: "INTERNAL_ERROR" });
  }
});

// GET /auth/me
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const users = await dbSelect<User>("app_users", { id: req.userId });
    if (!users.length) {
      res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
      return;
    }
    const user = users[0]!;
    res.json({
      data: {
        user_id: user.id,
        email: user.email,
        plan_tier: user.plan_tier,
        scans_remaining: user.scans_remaining,
      },
    });
  } catch (err) {
    console.error("[auth/me]", err);
    res.status(500).json({ error: "Failed to fetch user", code: "INTERNAL_ERROR" });
  }
});

// POST /auth/session — CLI creates a pairing code
authRouter.post("/session", async (req, res) => {
  const code = generateSessionCode();
  const sessionId = randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  const session: AuthSession = {
    session_id: sessionId,
    session_code: code,
    status: "pending",
    created_at: now,
  };

  try {
    await redis.jsonSet(`auth:${code}`, session, 600); // 10 min TTL

    // Best-effort scan record creation
    dbInsert("scans", {
      id: sessionId,
      session_id: sessionId,
      status: "pending",
      created_at: now,
    }).catch(() => {/* non-fatal */});

    res.json({
      data: {
        session_id: sessionId,
        session_code: code,
        expires_in: 600,
        formatted: `${code.slice(0, 3)}-${code.slice(3)}`,
      },
    });
  } catch (err) {
    console.error("[auth/session]", err);
    res.status(500).json({ error: "Failed to create session", code: "INTERNAL_ERROR" });
  }
});

// GET /auth/session/:code — frontend polls to check verification status
authRouter.get("/session/:code", async (req, res) => {
  const code = (req.params["code"] ?? "").toUpperCase();
  try {
    const session = await redis.jsonGet<AuthSession>(`auth:${code}`);
    if (!session) {
      res.status(404).json({ error: "Session not found or expired", code: "SESSION_NOT_FOUND" });
      return;
    }
    res.json({ data: { status: session.status, session_id: session.session_id } });
  } catch (err) {
    console.error("[auth/session/:code]", err);
    res.status(500).json({ error: "Failed to check session", code: "INTERNAL_ERROR" });
  }
});

// POST /auth/session/:code/verify — CLI verifies with its auth token
authRouter.post("/session/:code/verify", requireAuth, async (req, res) => {
  const code = (req.params["code"] ?? "").toUpperCase();
  try {
    const session = await redis.jsonGet<AuthSession>(`auth:${code}`);
    if (!session) {
      res.status(404).json({ error: "Session not found or expired", code: "SESSION_NOT_FOUND" });
      return;
    }

    const updated: AuthSession = {
      ...session,
      status: "verified",
      user_id: req.userId,
      verified_at: new Date().toISOString(),
    };

    await redis.jsonSet(`auth:${code}`, updated, 600);

    // Publish to Redis channel so the WebSocket bridge can relay to dashboard
    await redis.publish(
      `session:${session.session_id}`,
      JSON.stringify({
        type: "session_authenticated",
        sessionId: session.session_id,
        userId: req.userId,
        token: req.headers.authorization!.slice(7),
      }),
    );

    // Update scan record
    dbUpdate("scans", session.session_id, {
      status: "authenticated",
      user_id: req.userId,
    }).catch(() => {/* non-fatal */});

    res.json({ data: { session_id: session.session_id, status: "verified" } });
  } catch (err) {
    console.error("[auth/session/:code/verify]", err);
    res.status(500).json({ error: "Failed to verify session", code: "INTERNAL_ERROR" });
  }
});

// Legacy: POST /auth/verify — browser enters code (kept for CLI compat)
authRouter.post("/verify", requireAuth, async (req, res) => {
  const { session_code } = req.body as { session_code?: string };
  if (!session_code) {
    res.status(400).json({ error: "session_code is required", code: "INVALID_REQUEST" });
    return;
  }
  const code = session_code.trim().replace("-", "").toUpperCase();

  try {
    const session = await redis.jsonGet<AuthSession>(`auth:${code}`);
    if (!session) {
      res.status(404).json({ error: "Session not found or expired", code: "SESSION_NOT_FOUND" });
      return;
    }

    const updated: AuthSession = {
      ...session,
      status: "verified",
      user_id: req.userId,
      verified_at: new Date().toISOString(),
    };

    // One-time use — delete after verify
    await redis.del(`auth:${code}`);
    // Store under session_id for polling
    await redis.jsonSet(`auth_verified:${session.session_id}`, updated, 600);

    await redis.publish(
      `session:${session.session_id}`,
      JSON.stringify({
        type: "session_authenticated",
        sessionId: session.session_id,
        userId: req.userId,
        token: req.headers.authorization!.slice(7),
      }),
    );

    dbUpdate("scans", session.session_id, {
      status: "authenticated",
      user_id: req.userId,
    }).catch(() => {/* non-fatal */});

    res.json({ data: { session_id: session.session_id, status: "authenticated" } });
  } catch (err) {
    console.error("[auth/verify]", err);
    res.status(500).json({ error: "Failed to verify session", code: "INTERNAL_ERROR" });
  }
});
