export class AgentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentServiceError";
  }
}

const CLI_MESSAGE = "Scanning is CLI-only. Run: npx unideploy audit";

export async function agentScan(): Promise<never> {
  throw new AgentServiceError(CLI_MESSAGE);
}

export async function agentFix(): Promise<never> {
  throw new AgentServiceError(CLI_MESSAGE);
}

export async function agentDeploy(): Promise<never> {
  throw new AgentServiceError(CLI_MESSAGE);
}

export async function agentSecretsAudit(): Promise<never> {
  throw new AgentServiceError(CLI_MESSAGE);
}

export async function agentHealth(): Promise<{ status: string; models_available: boolean; e2b_available: boolean }> {
  return { status: "cli-based", models_available: true, e2b_available: false };
}
