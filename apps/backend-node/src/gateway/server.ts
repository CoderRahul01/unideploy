import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { authRouter } from "../routes/auth.js";
import { scanRouter } from "../routes/scan.js";
import { deployRouter } from "../routes/deploy.js";
import { secretsRouter } from "../routes/secrets.js";
import { paymentsRouter } from "../routes/payments.js";
import { requireAuth } from "../middleware/auth.js";

const ALLOWED_ORIGINS = [
  "https://unideploy.in",
  "https://www.unideploy.in",
  "https://app.unideploy.in",
  ...(config.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []),
];

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", ...ALLOWED_ORIGINS],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // ── Raw body capture for webhook HMAC verification ────────────────────────
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "X-Api-Key"],
    }),
  );

  // ── Global rate limit: 100 req/min per IP ────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests", code: "RATE_LIMITED" },
    }),
  );

  // ── Auth routes: 10 req/min per IP ──────────────────────────────────────
  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth requests", code: "RATE_LIMITED" },
  });

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      version: "2.0.0",
      env: config.NODE_ENV,
    });
  });

  app.get("/", (_req, res) => {
    res.json({ service: "UniDeploy Gateway", version: "2.0.0", health: "/health" });
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use("/auth", authLimiter, authRouter);
  app.use("/api/v1/scan", scanRouter);
  app.use("/api/v1/deploy", deployRouter);
  app.use("/api/v1/secrets", secretsRouter);
  app.use("/payments", paymentsRouter);

  // ── Polling fallbacks (CLI compatibility with existing session flow) ──────
  app.get("/poll/cli/:sessionId", requireAuth, async (req, res) => {
    const { redis } = await import("../services/redis.js");
    const { sessionId } = req.params as { sessionId: string };
    const msgs = await redis.jsonGet<unknown[]>(`poll:cli:${sessionId}`) ?? [];
    await redis.del(`poll:cli:${sessionId}`);
    res.json({ messages: msgs });
  });

  app.get("/poll/browser/:sessionId", requireAuth, async (req, res) => {
    const { redis } = await import("../services/redis.js");
    const { sessionId } = req.params as { sessionId: string };
    const msgs = await redis.jsonGet<unknown[]>(`poll:browser:${sessionId}`) ?? [];
    await redis.del(`poll:browser:${sessionId}`);
    res.json({ messages: msgs, last_id: 0 });
  });

  app.post("/send/cli/:sessionId", requireAuth, express.json(), async (req, res) => {
    const { redis } = await import("../services/redis.js");
    const { sessionId } = req.params as { sessionId: string };
    const existing = await redis.jsonGet<unknown[]>(`poll:browser:${sessionId}`) ?? [];
    existing.push(req.body as unknown);
    await redis.jsonSet(`poll:browser:${sessionId}`, existing, 1800);
    res.json({ ok: true });
  });

  app.post("/send/browser/:sessionId", requireAuth, express.json(), async (req, res) => {
    const { redis } = await import("../services/redis.js");
    const { sessionId } = req.params as { sessionId: string };
    const existing = await redis.jsonGet<unknown[]>(`poll:cli:${sessionId}`) ?? [];
    existing.push(req.body as unknown);
    await redis.jsonSet(`poll:cli:${sessionId}`, existing, 1800);
    res.json({ ok: true });
  });

  // ── Scan results (CLI compat — /scans/:id/results → scan router) ───────
  app.post("/scans/:sessionId/results", async (req, res) => {
    // Merge sessionId into body for the scan router handler
    req.body = { ...req.body as object, session_id: (req.params as { sessionId: string }).sessionId };
    // Re-route to the scan results handler inline
    const { scanRouter: sr } = await import("../routes/scan.js");
    sr(Object.assign(req, { url: "/results", path: "/results" }), res, () => {
      res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
    });
  });

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
  });

  // ── Error handler ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[unhandled]", err.message);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });

  return app;
}
