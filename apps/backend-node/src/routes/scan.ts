import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { enforceQuota } from "../middleware/quota.js";
import { redis } from "../services/redis.js";
import { dbUpdate, dbSelect } from "../services/insforge.js";
import type { ScanRecord, Finding, ScanSummary } from "../types/index.js";

const findingSchema = z.object({
  id: z.string(),
  file_path: z.string(),
  line_number: z.number().nullable(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  category: z.string(),
  title: z.string().max(500),
  description: z.string().max(5000),
  fix_hint: z.string().max(5000).default(""),
  snippet: z.string().max(2000).default(""),
  auto_fixable: z.boolean().default(false),
});

const resultsSchema = z.object({
  session_id: z.string().min(1),
  project_name: z.string().max(200).optional(),
  framework: z.string().max(100).optional(),
  files_scanned: z.number().int().min(0).optional(),
  findings: z.array(findingSchema).max(500),
  grade: z.string().max(2).optional(),
});

export const scanRouter = Router();

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

// POST /api/v1/scan — web-based scanning removed; use the CLI
scanRouter.post("/", requireAuth, enforceQuota, (_req, res) => {
  res.status(501).json({
    error: "Web-based scanning removed. Use the CLI: npx unideploy audit",
    code: "USE_CLI",
  });
});

// POST /api/v1/scan/results — CLI posts local findings to dashboard
scanRouter.post("/results", requireAuth, async (req, res) => {
  const parsed = resultsSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    res.status(400).json({ error: msg, code: "INVALID_REQUEST" });
    return;
  }

  const { session_id, project_name, framework, files_scanned, findings, grade } = parsed.data;
  const safeFindings = findings as Finding[];
  const summary = computeSummary(safeFindings);
  const now = new Date().toISOString();

  const record: ScanRecord = {
    scan_id: session_id,
    session_id,
    user_id: req.userId,
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
    // Ownership check — only the scan owner can view
    if (record.user_id && record.user_id !== req.userId) {
      res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
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
      if (record.user_id && record.user_id !== req.userId) {
        res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
        return;
      }
      res.json({ data: record });
      return;
    }

    const scans = await dbSelect<Record<string, unknown>>("scans", { id: scanId });
    if (!scans.length) {
      res.status(404).json({ error: "Report not found", code: "NOT_FOUND" });
      return;
    }
    const scan = scans[0]!;
    if (scan.user_id && scan.user_id !== req.userId) {
      res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
      return;
    }
    const findings = await dbSelect<Finding>("findings", { scan_id: scanId });
    res.json({ data: { ...scan, findings } });
  } catch (err) {
    console.error("[scan/:scanId/report]", err);
    res.status(500).json({ error: "Failed to fetch report", code: "INTERNAL_ERROR" });
  }
});

// POST /api/v1/scan/:scanId/fix — web-based fix removed; use the CLI
scanRouter.post("/:scanId/fix", requireAuth, (_req, res) => {
  res.status(501).json({
    error: "Web-based fix removed. Use the CLI: npx unideploy audit",
    code: "USE_CLI",
  });
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

  if (record.user_id && record.user_id !== req.userId) {
    res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    return;
  }

  const safeFindings = Array.isArray(updated_findings) ? updated_findings : [];
  const summary = computeSummary(safeFindings);

  record.findings = safeFindings;
  record.grade = summary.grade;
  record.total_issues = safeFindings.length;
  record.auto_fixable = summary.autoFixable;

  await redis.jsonSet(`scan:${sessionId}`, record, 7200);

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
