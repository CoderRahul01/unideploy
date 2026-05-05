/**
 * UniDeploy API Client
 * Covers both the CLI session flow and the GitHub URL scan pipeline.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Shared types ─────────────────────────────────────────────────────────────

export interface Finding {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  title: string;
  file: string;
  line: number | null;
  description: string;
  evidence: string;
  auto_fixable: boolean;
  fix_type: string | null;
}

export interface RemediationPlan {
  finding_id: string;
  summary: string;
  steps: string[];
  code_example: string | null;
  references: string[];
  effort: "low" | "medium" | "high";
  risk_if_ignored: string;
}

export interface ScanStatus {
  scan_id: string;
  status: "queued" | "running" | "planning" | "done" | "failed";
  github_url: string;
  branch: string;
  framework: string | null;
  security_grade: string | null;
  findings_count: number;
  findings: Finding[];
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScanPlan {
  scan_id: string;
  security_grade: string | null;
  findings: Finding[];
  remediation_plans: RemediationPlan[];
}

export interface FixResult {
  scan_id: string;
  pr_url: string | null;
  pr_number: number | null;
  files_changed: string[];
  patches_applied: number;
  error: string | null;
}

export interface StatusResponse {
  user_id: string;
  plan_tier: string;
  scans_remaining: number;
  last_scan: string | null;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── GitHub URL scan pipeline ──────────────────────────────────────────────────

export async function startScan(githubUrl: string, branch = "main"): Promise<{ scan_id: string; status: string }> {
  return request("/api/v1/scan", {
    method: "POST",
    body: JSON.stringify({ github_url: githubUrl, branch }),
  });
}

export async function getScanStatus(scanId: string): Promise<ScanStatus> {
  return request(`/api/v1/scan/${scanId}`);
}

export async function getScanPlan(scanId: string): Promise<ScanPlan> {
  return request(`/api/v1/scan/${scanId}/plan`);
}

export async function triggerFix(scanId: string, findingIds?: string[]): Promise<FixResult> {
  return request(`/api/v1/scan/${scanId}/fix`, {
    method: "POST",
    body: JSON.stringify({ finding_ids: findingIds ?? null }),
  });
}

// ── General ───────────────────────────────────────────────────────────────────

export async function getApiStatus(): Promise<StatusResponse> {
  return request("/api/v1/status");
}

export async function healthCheck(): Promise<{ status: string }> {
  return request("/health");
}
