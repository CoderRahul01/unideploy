// ── User & Auth ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password_hash: string;
  plan_tier: PlanTier;
  scans_remaining: number;
  created_at: string;
}

export type PlanTier = "Free" | "Builder" | "Pro" | "Enterprise";

export interface SessionToken {
  user_id: string;
}

export interface AuthSession {
  session_id: string;
  session_code: string;
  status: "pending" | "verified";
  created_at: string;
  user_id?: string;
  verified_at?: string;
  token?: string;
}

// ── Scan ──────────────────────────────────────────────────────────────────────

export interface Finding {
  id: string;
  file_path: string;
  line_number: number | null;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  fix_hint: string;
  snippet: string;
  auto_fixable: boolean;
}

export interface ScanRecord {
  scan_id: string;
  session_id: string;
  user_id?: string;
  status: "pending" | "running" | "complete" | "failed";
  project_name: string;
  framework: string;
  grade: string | null;
  total_issues: number;
  auto_fixable: number;
  files_scanned: number;
  findings: Finding[];
  created_at: string;
  completed_at: string | null;
  error: string | null;
}

// ── WebSocket message types (discriminated unions) ────────────────────────────

export type WsServerMessage =
  | { type: "scan_started";   scanId: string; timestamp: string }
  | { type: "scan_progress";  scanId: string; stage: string; pct: number }
  | { type: "scan_complete";  scanId: string; grade: string; findingsCount: number; summary: ScanSummary }
  | { type: "fix_requested";  scanId: string; findingId: string }
  | { type: "fix_complete";   scanId: string; findingId: string; diff: string; confidence: number }
  | { type: "grade_update";   scanId: string; grade: string }
  | { type: "finding";        finding: Finding }
  | { type: "session_authenticated"; sessionId: string; token: string; userId: string }
  | { type: "browser_connected"; sessionId: string }
  | { type: "payment_required"; message: string }
  | { type: "error";          message: string; code?: string }
  | { type: "rescan_done";    grade: string; totalIssues: number; fixedIds: string[]; findings: Finding[] }
  | { type: "pipeline_progress"; agent: string }
  | { type: "fix_started";    findingIds: string[]; count: number }
  | { type: "apply_fix";      findings: Finding[]; sessionId: string };

export type WsClientMessage =
  | { type: "connect"; role: "cli" | "browser"; token: string }
  | { type: "scan_progress"; scanId: string; stage: string; pct: number }
  | { type: "apply_fix"; findingId?: string; findingIds?: string[] }
  | { type: "cli_ready"; projectManifest: Record<string, unknown> }
  | { type: "fix_applied"; findings: Finding[] };

// ── Agent service ─────────────────────────────────────────────────────────────

export interface AgentScanRequest {
  project_type: string;
  files: Record<string, string>;
  platform_hint?: string;
  user_tier: string;
  model: string;
}

export interface AgentScanResponse {
  grade: string;
  findings: Finding[];
  summary: string;
  platform_detected: string;
  scan_time_ms: number;
}

export interface AgentFixRequest {
  finding: Finding;
  file_content: string;
  project_type: string;
  user_tier: string;
  model: string;
}

export interface AgentFixResponse {
  diff: string;
  confidence: number;
  test_result: string | null;
  explanation: string;
}

// ── Quota ─────────────────────────────────────────────────────────────────────

export interface QuotaLimits {
  Free: number;
  Builder: number;
  Pro: number;
  Enterprise: number;
}

export const QUOTA_LIMITS: QuotaLimits = {
  Free: 10,
  Builder: 50,
  Pro: 200,
  Enterprise: 1000,
};

// ── Scan summary ──────────────────────────────────────────────────────────────

export interface ScanSummary {
  grade: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  autoFixable: number;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export type BillingCycle = "monthly" | "annual";

export interface TierConfig {
  monthly_scans: number;
  annual_scans: number;
}

export const TIER_CONFIG: Record<string, TierConfig> = {
  Builder:    { monthly_scans: 50,   annual_scans: 600 },
  Pro:        { monthly_scans: 200,  annual_scans: 2400 },
  Enterprise: { monthly_scans: 1000, annual_scans: 12000 },
};
