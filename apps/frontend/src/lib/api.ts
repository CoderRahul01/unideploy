/**
 * UniDeploy API Client
 * Covers both the CLI session flow and the GitHub URL scan pipeline.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  security_grade: SecurityGrade | null;
  findings_count: number;
  findings: Finding[];
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export type SecurityGrade = "A" | "B" | "C" | "D" | "F";

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

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("unideploy_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = { 
    "Content-Type": "application/json", 
    ...getAuthHeaders(),
    ...(opts.headers ?? {}) 
  };
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
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

// ── CLI-first session flow ────────────────────────────────────────────────────

export interface AuthSession {
  session_id: string;
  session_code: string;
  expires_in: number;
  websocket_url: string;
}

export interface VerifyResult {
  session_id: string;
  status: string;
}

export interface ScanReport {
  session_id: string;
  project_name: string;
  framework: string;
  scanned_at: string;
  files_scanned: number;
  total_issues: number;
  auto_fixable: number;
  grade: "A" | "B" | "C" | "D" | "F";
  findings: ReportFinding[];
}

export interface ReportFinding {
  id: string;
  file_path: string;
  line_number: number | null;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  fix_guideline: string;
  evidence: string;
  auto_fixable: boolean;
}

export async function verifySession(session_code: string): Promise<VerifyResult> {
  return request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ session_code }),
  });
}

export async function getScanReport(sessionId: string): Promise<ScanReport> {
  return request(`/scans/${sessionId}/report`);
}

// ── General ───────────────────────────────────────────────────────────────────

export async function getApiStatus(): Promise<StatusResponse> {
  return request("/api/v1/status");
}

export async function healthCheck(): Promise<{ status: string }> {
  return request("/health");
}

// ── Auth & Payments ───────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user_id: string;
  email?: string;
  plan_tier: string;
  scans_remaining: number;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await request<{ data: AuthResponse }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const user = res.data;
  localStorage.setItem("unideploy_token", user.token);
  return user;
}

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const res = await request<{ data: AuthResponse }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const user = res.data;
  localStorage.setItem("unideploy_token", user.token);
  return user;
}

export async function getCurrentUser(): Promise<AuthResponse> {
  const res = await request<{ data: AuthResponse }>("/auth/me");
  return res.data;
}

export function logoutUser() {
  localStorage.removeItem("unideploy_token");
}

export async function createCheckoutSession(tier: string, annual = false): Promise<{ checkout_url: string }> {
  return request("/payments/checkout", {
    method: "POST",
    body: JSON.stringify({ tier, billing: annual ? "annual" : "monthly" }),
  });
}

// ── Secrets Audit ─────────────────────────────────────────────────────────────

export interface SecretsFinding {
  id?: string;
  file: string;
  line?: number | null;
  type: string;
  provider?: string;
  severity: "critical" | "high" | "medium" | "low";
  masked_value?: string;
  fingerprint?: string;
  description: string;
  fix: string;
}

export interface SecretsAuditResponse {
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  findings: SecretsFinding[];
  scanned_files: number;
  recommendation: string;
}

export async function runSecretsAudit(repoPath?: string): Promise<SecretsAuditResponse> {
  const res = await request<{ data: SecretsAuditResponse }>("/api/v1/secrets/audit", {
    method: "POST",
    body: JSON.stringify({ repoPath }),
  });
  return res.data;
}
