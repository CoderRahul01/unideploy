import { Sandbox } from "@e2b/code-interpreter";

// ── Types ────────────────────────────────────────────────────────────────────

export type SupportedLanguage = "python" | "js" | "javascript" | "bash";

export interface SandboxExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  results?: Array<{
    type: "image/png" | "image/svg+xml" | "text/plain" | "application/json";
    data: string; // Base64 data or string
  }>;
  durationMs: number;
  sandboxId?: string;
  error?: string;
}

export interface ExecuteOptions {
  language: SupportedLanguage;
  code: string;
  timeoutMs?: number;
}

// ── Guardrails & Security ───────────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /stratum\+tcp/i,
  /xmrig/i,
  /minerd/i,
  /cryptonight/i,
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // Fork bomb
  /rm\s+-rf\s+(\/|--no-preserve-root)/i,
  /dd\s+if=\/dev\/zero\s+of=\/dev\/[sh]da/i,
  /mkfs\./i,
];

export function validateInput(code: string): { valid: boolean; reason?: string } {
  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return { valid: false, reason: "Code or command payload is empty." };
  }

  if (code.length > 50_000) {
    return { valid: false, reason: "Code payload exceeds maximum size limit (50KB)." };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return {
        valid: false,
        reason: "Security violation: execution payload matched restricted safety policy.",
      };
    }
  }

  return { valid: true };
}

// ── In-Memory Rate Limiter ──────────────────────────────────────────────────

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 10 * 60 * 1000
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Periodic cleanup
  if (rateLimitMap.size > 2000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInSec: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetInSec: Math.ceil((record.resetAt - now) / 1000),
  };
}

// ── Orchestration Core ──────────────────────────────────────────────────────

export async function runInSandbox(options: ExecuteOptions): Promise<SandboxExecutionResult> {
  const { language, code, timeoutMs = 30_000 } = options;

  const validation = validateInput(code);
  if (!validation.valid) {
    return {
      success: false,
      stdout: "",
      stderr: validation.reason || "Validation failed",
      durationMs: 0,
      error: validation.reason,
    };
  }

  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      stdout: "",
      stderr: "E2B_API_KEY environment variable is not configured on the server.",
      durationMs: 0,
      error: "API key missing",
    };
  }

  const startTime = Date.now();
  let sbx: Sandbox | null = null;

  try {
    // Spawn isolated Firecracker microVM
    sbx = await Sandbox.create({
      apiKey,
      timeoutMs: Math.min(timeoutMs, 60_000), // Max 60s hard ceiling
    });

    const sandboxId = sbx.sandboxId;

    if (language === "bash") {
      // Run bash terminal command
      const cmdResult = await sbx.commands.run(code, {
        timeoutMs: Math.min(timeoutMs, 30_000),
      });

      const durationMs = Date.now() - startTime;
      const isSuccess = cmdResult.exitCode === 0;

      return {
        success: isSuccess,
        stdout: cmdResult.stdout || "",
        stderr: cmdResult.stderr || (isSuccess ? "" : `Process exited with code ${cmdResult.exitCode}`),
        durationMs,
        sandboxId,
      };
    } else {
      // Code execution (Python or JavaScript)
      const lang = language === "python" ? "python" : "js";
      const execution = await sbx.runCode(code, { language: lang });

      const durationMs = Date.now() - startTime;
      const stdoutPieces: string[] = [];

      if (execution.logs.stdout && execution.logs.stdout.length > 0) {
        stdoutPieces.push(execution.logs.stdout.join(""));
      }
      if (execution.text) {
        stdoutPieces.push(execution.text);
      }

      const stderrPieces: string[] = [];
      if (execution.logs.stderr && execution.logs.stderr.length > 0) {
        stderrPieces.push(execution.logs.stderr.join(""));
      }
      if (execution.error) {
        stderrPieces.push(
          `${execution.error.name}: ${execution.error.value}\n${execution.error.traceback || ""}`
        );
      }

      // Collect rich media artifacts (e.g. Matplotlib charts, SVG plots)
      const results: SandboxExecutionResult["results"] = [];
      if (execution.results && execution.results.length > 0) {
        for (const item of execution.results) {
          if (item.png) {
            results.push({ type: "image/png", data: item.png });
          } else if (item.svg) {
            results.push({ type: "image/svg+xml", data: item.svg });
          } else if (item.text) {
            results.push({ type: "text/plain", data: item.text });
          }
        }
      }

      const isSuccess = !execution.error;

      return {
        success: isSuccess,
        stdout: stdoutPieces.join("\n").trim(),
        stderr: stderrPieces.join("\n").trim(),
        results,
        durationMs,
        sandboxId,
      };
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      stdout: "",
      stderr: err?.message || String(err),
      durationMs,
      error: err?.message || "Execution failed",
    };
  } finally {
    // CRITICAL: Guaranteed cleanup to prevent credit drain
    if (sbx) {
      try {
        await sbx.kill();
      } catch (killErr) {
        console.warn("Failed to kill sandbox instance:", killErr);
      }
    }
  }
}
