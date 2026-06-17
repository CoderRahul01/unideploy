import { Router } from "express";
import { randomBytes } from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { enforceQuota } from "../middleware/quota.js";
import { redis } from "../services/redis.js";
import { dbInsert, dbUpdate, dbSelect } from "../services/insforge.js";
import { agentScan, agentFix, AgentServiceError } from "../services/agents.js";
import type { ScanRecord, Finding, ScanSummary, User } from "../types/index.js";

export const scanRouter = Router();

function modelForTier(tier: string): string {
  switch (tier) {
    case "Builder":    return "fixer";
    case "Pro":        return "fixer-pro";
    case "Enterprise": return "fixer-enterprise";
    default:           return "scanner";
  }
}

function computeSummary(findings: Finding[]): ScanSummary {
  const critical = findings.filter(f => f.severity === "critical").length;
  const high     = findings.filter(f => f.severity === "high").length;
  const medium   = findings.filter(f => f.severity === "medium").length;
  const low      = findings.filter(f => f.severity === "low").length;

  let grade = "A";
  if (critical >= 1) grade = "D";
  else if (high >= 3) grade = "C";
  else if (high >= 1 || medium >= 5) grade = "B";

  return {
    grade,
    total: findings.length,
    critical,
    high,
    medium,
    low,
    autoFixable: findings.filter(f => f.auto_fixable).length,
  };
}

// POST /api/v1/scan — queue a scan (file-manifest based, local CLI scan)
scanRouter.post("/", requireAuth, enforceQuota, async (req, res) => {
  const { project_name, framework, files, platform_hint } = req.body as {
    project_name?: string;
    framework?: string;
    files?: Record<string, string>;
    platform_hint?: string;
  };

  if (!files || typeof files !== "object") {
    res.status(400).json({ error: "files is required", code: "INVALID_REQUEST" });
    return;
  }

  const scanId = randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  const record: ScanRecord = {
    scan_id: scanId,
    session_id: scanId,
    status: "running",
    project_name: project_name ?? "unknown",
    framework: framework ?? "unknown",
    grade: null,
    total_issues: 0,
    auto_fixable: 0,
    files_scanned: Object.keys(files).length,
    findings: [],
    created_at: now,
    completed_at: null,
    error: null,
  };

  await redis.jsonSet(`scan:${scanId}`, record, 3600);

  dbInsert("scans", {
    id: scanId,
    session_id: scanId,
    status: "running",
    project_name: record.project_name,
    framework: record.framework,
    created_at: now,
  }).catch(() => {/* non-fatal */});

  // Fetch user tier for model routing
  let tier = "Free";
  try {
    const users = await dbSelect<User>("app_users", { id: req.userId });
    if (users[0]) tier = users[0].plan_tier;
  } catch {/* non-fatal */}

  // Run agent scan asynchronously
  (async () => {
    try {
      const result = await agentScan({
        project_type: framework ?? "unknown",
        files,
        platform_hint,
        user_tier: tier,
        model: modelForTier(tier),
      });

      const summary = computeSummary(result.findings);
      const completed = new Date().toISOString();

      const updated: ScanRecord = {
        ...record,
        status: "complete",
        grade: summary.grade,
        findings: result.findings,
        total_issues: result.findings.length,
        auto_fixable: summary.autoFixable,
        completed_at: completed,
      };

      await redis.jsonSet(`scan:${scanId}`, updated, 3600);

      dbUpdate("scans", scanId, {
        status: "complete",
        grade: summary.grade,
        total_issues: result.findings.length,
        auto_fixable: summary.autoFixable,
        completed_at: completed,
      }).catch(() => {/* non-fatal */});
    } catch (err) {
      const isDown = err instanceof AgentServiceError;
      const current = await redis.jsonGet<ScanRecord>(`scan:${scanId}`) ?? record;
      current.status = "failed";
      current.error = isDown ? "Agent service unavailable" : "Scan failed";
      await redis.jsonSet(`scan:${scanId}`, current, 3600);
      console.error("[scan]", err);
    }
  })();

  res.status(202).json({ data: { scan_id: scanId, status: "running", created_at: now } });
});

// POST /api/v1/scan/results — CLI posts local heuristic findings
scanRouter.post("/results", requireAuth, async (req, res) => {
  const {
    session_id,
    project_name,
    framework,
    files_scanned,
    findings,
    grade,
  } = req.body as {
    session_id?: string;
    project_name?: string;
    framework?: string;
    files_scanned?: number;
    findings?: Finding[];
    grade?: string;
  };

  if (!session_id || !findings) {
    res.status(400).json({ error: "session_id and findings are required", code: "INVALID_REQUEST" });
    return;
  }

  const safeFindings = Array.isArray(findings) ? findings : [];
  const summary = computeSummary(safeFindings);
  const now = new Date().toISOString();

  const record: ScanRecord = {
    scan_id: session_id,
    session_id,
    status: "complete",
    project_name: project_name ?? "unknown",
    framework: framework ?? "unknown",
    grade: grade ?? summary.grade,
    total_issues: safeFindings.length,
    auto_fixable: summary.autoFixable,
    files_scanned: files_scanned ?? 0,
    findings: safeFindings,
    created_at: now,
    completed_at: now,
    error: null,
  };

  await redis.jsonSet(`scan:${session_id}`, record, 7200);

  // Relay scan_complete event through WebSocket channel
  await redis.publish(
    `session:${session_id}`,
    JSON.stringify({ type: "scan_complete", ...summary, scanId: session_id }),
  ).catch(() => {/* non-fatal */});

  dbUpdate("scans", session_id, {
    status: "complete",
    grade: record.grade,
    total_issues: record.total_issues,
    auto_fixable: record.auto_fixable,
    files_scanned: record.files_scanned,
    completed_at: now,
  }).catch(() => {/* non-fatal */});

  res.status(202).json({ data: { accepted: true, session_id, grade: record.grade } });
});

// GET /api/v1/scan/:scanId — poll status
scanRouter.get("/:scanId", requireAuth, async (req, res) => {
  const { scanId } = req.params as { scanId: string };
  try {
    const record = await redis.jsonGet<ScanRecord>(`scan:${scanId}`);
    if (!record) {
      res.status(404).json({ error: "Scan not found", code: "NOT_FOUND" });
      return;
    }
    res.json({ data: record });
  } catch (err) {
    console.error("[scan/:scanId]", err);
    res.status(500).json({ error: "Failed to fetch scan", code: "INTERNAL_ERROR" });
  }
});

// GET /api/v1/scan/:scanId/report — full report for dashboard
scanRouter.get("/:scanId/report", requireAuth, async (req, res) => {
  const { scanId } = req.params as { scanId: string };
  try {
    const record = await redis.jsonGet<ScanRecord>(`scan:${scanId}`);
    if (record) {
      res.json({ data: record });
      return;
    }

    // Fallback to InsForge
    const scans = await dbSelect<Record<string, unknown>>("scans", { id: scanId });
    if (!scans.length) {
      res.status(404).json({ error: "Report not found", code: "NOT_FOUND" });
      return;
    }
    const findings = await dbSelect<Finding>("findings", { scan_id: scanId });
    res.json({ data: { ...scans[0], findings } });
  } catch (err) {
    console.error("[scan/:scanId/report]", err);
    res.status(500).json({ error: "Failed to fetch report", code: "INTERNAL_ERROR" });
  }
});

// POST /api/v1/scan/:scanId/fix — trigger AI fix for findings
scanRouter.post("/:scanId/fix", requireAuth, async (req, res) => {
  const { scanId } = req.params as { scanId: string };
  const { finding_id, file_content } = req.body as {
    finding_id?: string;
    file_content?: string;
  };

  if (!finding_id || !file_content) {
    res.status(400).json({ error: "finding_id and file_content are required", code: "INVALID_REQUEST" });
    return;
  }

  const record = await redis.jsonGet<ScanRecord>(`scan:${scanId}`);
  if (!record) {
    res.status(404).json({ error: "Scan not found", code: "NOT_FOUND" });
    return;
  }

  const finding = record.findings.find(f => f.id === finding_id);
  if (!finding) {
    res.status(404).json({ error: "Finding not found", code: "NOT_FOUND" });
    return;
  }

  let tier = "Free";
  try {
    const users = await dbSelect<User>("app_users", { id: req.userId });
    if (users[0]) tier = users[0].plan_tier;
  } catch {/* non-fatal */}

  try {
    const result = await agentFix({
      finding,
      file_content,
      project_type: record.framework,
      user_tier: tier,
      model: modelForTier(tier),
    });

    res.json({ data: result });
  } catch (err) {
    if (err instanceof AgentServiceError) {
      res.status(503).json({ error: "Agent service unavailable", code: "SERVICE_UNAVAILABLE" });
    } else {
      console.error("[scan/:scanId/fix]", err);
      res.status(500).json({ error: "Fix generation failed", code: "INTERNAL_ERROR" });
    }
  }
});

// POST /api/v1/scan/:sessionId/fix-complete — CLI reports fix results
scanRouter.post("/:sessionId/fix-complete", requireAuth, async (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  const { fixed_ids, updated_findings } = req.body as {
    fixed_ids?: string[];
    updated_findings?: Finding[];
  };

  const record = await redis.jsonGet<ScanRecord>(`scan:${sessionId}`);
  if (!record) {
    res.status(404).json({ error: "Session not found", code: "NOT_FOUND" });
    return;
  }

  const safeFindings = Array.isArray(updated_findings) ? updated_findings : [];
  const summary = computeSummary(safeFindings);

  record.findings = safeFindings;
  record.grade = summary.grade;
  record.total_issues = safeFindings.length;
  record.auto_fixable = summary.autoFixable;

  await redis.jsonSet(`scan:${sessionId}`, record, 7200);

  // Relay rescan_done to browser via WS channel
  await redis.publish(
    `session:${sessionId}`,
    JSON.stringify({
      type: "rescan_done",
      grade: summary.grade,
      totalIssues: safeFindings.length,
      fixedIds: fixed_ids ?? [],
      findings: safeFindings,
    }),
  ).catch(() => {/* non-fatal */});

  res.json({ data: { ok: true, grade: summary.grade, total_issues: safeFindings.length } });
});
