import { config } from "../config.js";
import type {
  AgentScanRequest,
  AgentScanResponse,
  AgentFixRequest,
  AgentFixResponse,
} from "../types/index.js";

const SCAN_TIMEOUT_MS = 120_000;
const FIX_TIMEOUT_MS = 60_000;
const DEPLOY_TIMEOUT_MS = 30_000;

async function callAgent<Req, Res>(
  path: string,
  body: Req,
  timeoutMs: number,
): Promise<Res> {
  const url = `${config.AGENT_SERVICE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new AgentServiceError(`Agent service unavailable: ${(err as Error).message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new AgentServiceError(`Agent service error ${res.status}: ${text}`);
  }
  return res.json() as Promise<Res>;
}

export class AgentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentServiceError";
  }
}

export async function agentScan(req: AgentScanRequest): Promise<AgentScanResponse> {
  return callAgent<AgentScanRequest, AgentScanResponse>("/scan", req, SCAN_TIMEOUT_MS);
}

export async function agentFix(req: AgentFixRequest): Promise<AgentFixResponse> {
  return callAgent<AgentFixRequest, AgentFixResponse>("/fix", req, FIX_TIMEOUT_MS);
}

export async function agentDeploy(
  files: Record<string, string>,
  targetPlatform: string,
  userTier: string,
): Promise<ReadableStream> {
  const url = `${config.AGENT_SERVICE_URL}/deploy`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files, target_platform: targetPlatform, user_tier: userTier }),
      signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
    });
  } catch (err) {
    throw new AgentServiceError(`Agent service unavailable: ${(err as Error).message}`);
  }
  if (!res.ok || !res.body) {
    throw new AgentServiceError(`Deploy agent error: HTTP ${res.status}`);
  }
  return res.body;
}

export async function agentSecretsAudit(
  repoPath: string,
): Promise<unknown> {
  return callAgent("/secrets/audit", { repoPath }, FIX_TIMEOUT_MS);
}

export async function agentHealth(): Promise<{ status: string; models_available: boolean; e2b_available: boolean }> {
  try {
    const res = await fetch(`${config.AGENT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { status: "unhealthy", models_available: false, e2b_available: false };
    return res.json() as Promise<{ status: string; models_available: boolean; e2b_available: boolean }>;
  } catch {
    return { status: "unreachable", models_available: false, e2b_available: false };
  }
}
