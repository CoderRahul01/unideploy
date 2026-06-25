import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

export const secretsRouter = Router();

// POST /api/v1/secrets/audit — removed; secrets scanning runs in the CLI
secretsRouter.post("/audit", requireAuth, (_req, res) => {
  res.status(501).json({
    error: "Web-based secrets audit removed. Use the CLI: npx unideploy audit",
    code: "USE_CLI",
  });
});

// POST /api/v1/secrets/scan — local scan result ingest (CLI posts here)
secretsRouter.post("/scan", requireAuth, async (req, res) => {
  const { findings } = req.body as { findings?: unknown[] };
  if (!Array.isArray(findings)) {
    res.status(400).json({ error: "findings must be an array", code: "INVALID_REQUEST" });
    return;
  }
  res.json({ data: { accepted: true, count: findings.length } });
});
