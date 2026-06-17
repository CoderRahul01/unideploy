import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { agentSecretsAudit, AgentServiceError } from "../services/agents.js";

export const secretsRouter = Router();

// POST /api/v1/secrets/audit — deep AI audit via agent service
secretsRouter.post("/audit", requireAuth, async (req, res) => {
  const { repoPath } = req.body as { repoPath?: string };

  try {
    const result = await agentSecretsAudit(repoPath || ".");
    res.json({ data: result });
  } catch (err) {
    if (err instanceof AgentServiceError) {
      res.status(503).json({ error: "Agent service unavailable", code: "SERVICE_UNAVAILABLE" });
    } else {
      console.error("[secrets/audit]", err);
      res.status(500).json({ error: "Audit failed", code: "INTERNAL_ERROR" });
    }
  }
});

// POST /api/v1/secrets/scan — local regex scan result ingest (CLI posts here)
secretsRouter.post("/scan", requireAuth, async (req, res) => {
  const { findings } = req.body as { findings?: unknown[] };
  if (!Array.isArray(findings)) {
    res.status(400).json({ error: "findings must be an array", code: "INVALID_REQUEST" });
    return;
  }
  // Simply acknowledge — findings are displayed client-side by the CLI
  res.json({ data: { accepted: true, count: findings.length } });
});
