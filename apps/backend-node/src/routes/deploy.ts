import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { agentDeploy, AgentServiceError } from "../services/agents.js";
import { dbSelect } from "../services/insforge.js";
import type { User } from "../types/index.js";

export const deployRouter = Router();

// POST /api/v1/deploy/generate — SSE stream of config files
deployRouter.post("/generate", requireAuth, async (req, res) => {
  const { files, target_platform } = req.body as {
    files?: Record<string, string>;
    target_platform?: string;
  };

  if (!files || !target_platform) {
    res.status(400).json({ error: "files and target_platform are required", code: "INVALID_REQUEST" });
    return;
  }

  let tier = "Free";
  try {
    const users = await dbSelect<User>("app_users", { id: req.userId });
    if (users[0]) tier = users[0].plan_tier;
  } catch {/* non-fatal */}

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const stream = await agentDeploy(files, target_platform, tier);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err) {
    const message =
      err instanceof AgentServiceError
        ? "Agent service unavailable"
        : "Deploy generation failed";
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  }
});
