/**
 * UniDeploy API Client
 *
 * Used by the Next.js dashboard to communicate with the FastAPI backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ScanResponse {
  scan_id: string;
  project_name: string;
  framework: string;
  security_grade: string;
  is_vibe_coded: boolean;
  findings: Finding[];
  auto_fixes_available: number;
  scan_duration_ms: number;
}

interface Finding {
  id: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  file?: string;
  line?: number;
  description?: string;
  auto_fixable: boolean;
  fix_type?: string;
}

interface StatusResponse {
  user_id: string;
  plan_tier: string;
  scans_remaining: number;
  last_scan: string | null;
}

class UniDeployClient {
  private baseUrl: string;
  private apiKey: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async scan(payload: {
    project_name: string;
    framework?: string;
    files?: Record<string, string>;
  }): Promise<ScanResponse> {
    return this.request<ScanResponse>("/api/v1/scan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getStatus(): Promise<StatusResponse> {
    return this.request<StatusResponse>("/api/v1/status");
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/health");
  }
}

export const apiClient = new UniDeployClient();
export type { ScanResponse, Finding, StatusResponse };
