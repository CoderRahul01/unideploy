#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import os from "os";
import path from "path";
import fs from "fs";

const API_URL = process.env.UNIDEPLOY_API_URL ?? "https://api.unideploy.in";

function getApiKey(): string {
  const credPath = path.join(os.homedir(), ".unideploy", "credentials.json");
  try {
    const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
    return creds.api_key ?? "";
  } catch {
    return process.env.UNIDEPLOY_API_KEY ?? "";
  }
}

function authHeaders(): Record<string, string> {
  const key = getApiKey();
  return {
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "unideploy", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scan_repo",
      description:
        "Queue a security scan of a GitHub repository. Returns a scan_id you can use with other tools to poll status and retrieve findings. The scan runs inside an isolated E2B sandbox — code never touches disk.",
      inputSchema: {
        type: "object",
        properties: {
          github_url: {
            type: "string",
            description: "Full GitHub URL, e.g. https://github.com/user/repo",
          },
          branch: {
            type: "string",
            description: "Branch to scan (default: main)",
          },
        },
        required: ["github_url"],
      },
    },
    {
      name: "get_findings",
      description:
        "Get the status and findings of a scan. Poll this until status is 'done'. Returns security grade, all findings with severity/file/line, and auto_fixable flags.",
      inputSchema: {
        type: "object",
        properties: {
          scan_id: { type: "string", description: "Scan ID from scan_repo" },
        },
        required: ["scan_id"],
      },
    },
    {
      name: "get_remediation_plan",
      description:
        "Get the AI-generated remediation plan for a completed scan. Returns per-finding steps, code examples, references, effort level, and risk-if-ignored.",
      inputSchema: {
        type: "object",
        properties: {
          scan_id: { type: "string", description: "Scan ID from scan_repo" },
        },
        required: ["scan_id"],
      },
    },
    {
      name: "apply_fixes",
      description:
        "Apply fixes for selected findings and raise a GitHub PR. Only run this when the user explicitly requests it. Returns the PR URL.",
      inputSchema: {
        type: "object",
        properties: {
          scan_id: { type: "string", description: "Scan ID from scan_repo" },
          finding_ids: {
            type: "array",
            items: { type: "string" },
            description: "Finding IDs to fix. Omit to fix all auto-fixable findings.",
          },
        },
        required: ["scan_id"],
      },
    },
    {
      name: "get_deployment_status",
      description:
        "Check the current status of a scan (queued / running / planning / done / failed) and summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          scan_id: { type: "string", description: "Scan ID from scan_repo" },
        },
        required: ["scan_id"],
      },
    },
    {
      name: "rotate_secret",
      description:
        "Get step-by-step instructions for rotating a specific leaked secret found in a scan. Does NOT automatically rotate credentials — returns a safe manual guide.",
      inputSchema: {
        type: "object",
        properties: {
          scan_id: { type: "string", description: "Scan ID from scan_repo" },
          secret_name: {
            type: "string",
            description: "Name of the secret to rotate, e.g. SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY",
          },
        },
        required: ["scan_id", "secret_name"],
      },
    },
  ],
}));

// ── Tool handlers ─────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  switch (name) {

    case "scan_repo": {
      const data = await apiPost<{ scan_id: string; status: string }>(
        "/api/v1/scan",
        { github_url: a.github_url, branch: a.branch ?? "main" }
      );
      return {
        content: [{
          type: "text",
          text: [
            `Scan queued successfully.`,
            ``,
            `scan_id : ${data.scan_id}`,
            `status  : ${data.status}`,
            ``,
            `Use get_findings(scan_id) to poll for results.`,
            `View live progress at: https://unideploy.in/dashboard?scan_id=${data.scan_id}`,
          ].join("\n"),
        }],
      };
    }

    case "get_findings": {
      const scan = await apiGet<any>(`/api/v1/scan/${a.scan_id}`);
      if (scan.status !== "done" && scan.status !== "failed") {
        return {
          content: [{
            type: "text",
            text: `Scan is still in progress.\n\nstatus : ${scan.status}\n\nCall get_findings again in a few seconds.`,
          }],
        };
      }
      if (scan.status === "failed") {
        return {
          content: [{ type: "text", text: `Scan failed: ${scan.error ?? "unknown error"}` }],
        };
      }
      const findings = scan.findings ?? [];
      const counts = {
        critical: findings.filter((f: any) => f.severity === "CRITICAL").length,
        high:     findings.filter((f: any) => f.severity === "HIGH").length,
        medium:   findings.filter((f: any) => f.severity === "MEDIUM").length,
        low:      findings.filter((f: any) => f.severity === "LOW").length,
        fixable:  findings.filter((f: any) => f.auto_fixable).length,
      };
      const lines = [
        `Security Grade : ${scan.security_grade ?? "?"}`,
        `Framework      : ${scan.framework ?? "unknown"}`,
        ``,
        `CRITICAL ${counts.critical}  HIGH ${counts.high}  MEDIUM ${counts.medium}  LOW ${counts.low}`,
        `Auto-fixable   : ${counts.fixable}`,
        ``,
        `Findings:`,
        ...findings.map((f: any) =>
          `  [${f.severity}] ${f.title}\n    file: ${f.file}${f.line ? `:${f.line}` : ""}\n    id: ${f.id}\n    fixable: ${f.auto_fixable}`
        ),
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    case "get_remediation_plan": {
      const plan = await apiGet<any>(`/api/v1/scan/${a.scan_id}/plan`);
      const lines: string[] = [
        `Remediation plan for scan ${a.scan_id}`,
        `Security grade: ${plan.security_grade ?? "?"}`,
        ``,
      ];
      for (const rp of plan.remediation_plans ?? []) {
        lines.push(`── Finding: ${rp.finding_id} ──`);
        lines.push(`Summary : ${rp.summary}`);
        lines.push(`Effort  : ${rp.effort}  |  Risk if ignored: ${rp.risk_if_ignored}`);
        lines.push(`Steps:`);
        for (const step of rp.steps ?? []) lines.push(`  • ${step}`);
        if (rp.code_example) {
          lines.push(`Code example:\n${rp.code_example}`);
        }
        if (rp.references?.length) {
          lines.push(`References: ${rp.references.join(", ")}`);
        }
        lines.push("");
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    case "apply_fixes": {
      const result = await apiPost<any>(`/api/v1/scan/${a.scan_id}/fix`, {
        finding_ids: a.finding_ids ?? null,
      });
      if (result.error) {
        return { content: [{ type: "text", text: `Fix failed: ${result.error}` }] };
      }
      return {
        content: [{
          type: "text",
          text: [
            `Fixes applied and PR raised.`,
            ``,
            `PR URL        : ${result.pr_url ?? "pending"}`,
            `PR number     : ${result.pr_number ?? "—"}`,
            `Patches applied: ${result.patches_applied}`,
            `Files changed : ${(result.files_changed ?? []).join(", ") || "none"}`,
          ].join("\n"),
        }],
      };
    }

    case "get_deployment_status": {
      const scan = await apiGet<any>(`/api/v1/scan/${a.scan_id}`);
      return {
        content: [{
          type: "text",
          text: [
            `Scan ID   : ${scan.scan_id}`,
            `Status    : ${scan.status}`,
            `Repo      : ${scan.github_url}`,
            `Branch    : ${scan.branch}`,
            `Framework : ${scan.framework ?? "—"}`,
            `Grade     : ${scan.security_grade ?? "—"}`,
            `Findings  : ${scan.findings_count ?? 0}`,
            `Created   : ${scan.created_at}`,
            `Completed : ${scan.completed_at ?? "—"}`,
            ...(scan.error ? [`Error     : ${scan.error}`] : []),
          ].join("\n"),
        }],
      };
    }

    case "rotate_secret": {
      const secretName = String(a.secret_name ?? "");
      const guides: Record<string, string[]> = {
        SUPABASE_SERVICE_ROLE_KEY: [
          "1. Go to your Supabase project → Project Settings → API",
          "2. Click 'Regenerate' next to the service_role key",
          "3. Update SUPABASE_SERVICE_ROLE_KEY in your .env / hosting provider",
          "4. Redeploy your backend",
          "5. Revoke the old key immediately after confirming the new one works",
        ],
        SUPABASE_ANON_KEY: [
          "1. Go to Supabase project → Project Settings → API",
          "2. Regenerate the anon key",
          "3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY in all frontends",
          "4. Redeploy frontend — anon key is public but rotation limits exposure window",
        ],
        STRIPE_SECRET_KEY: [
          "1. Go to Stripe Dashboard → Developers → API keys",
          "2. Click 'Roll key' on the secret key",
          "3. Update STRIPE_SECRET_KEY in your hosting provider's environment variables",
          "4. Redeploy backend",
          "5. Old key is automatically revoked after roll",
        ],
        OPENAI_API_KEY: [
          "1. Go to platform.openai.com → API keys",
          "2. Delete the compromised key",
          "3. Create a new key with minimum required permissions",
          "4. Update OPENAI_API_KEY in your environment",
          "5. Redeploy affected services",
        ],
        GOOGLE_CLOUD_SERVICE_ACCOUNT: [
          "1. Go to GCP Console → IAM → Service Accounts",
          "2. Select the service account and click 'Manage keys'",
          "3. Delete the compromised key",
          "4. Create a new JSON key",
          "5. Update the key file reference in your deployment",
        ],
      };

      const upperSecret = secretName.toUpperCase();
      const matchKey = Object.keys(guides).find(k => upperSecret.includes(k));
      const steps = matchKey ? guides[matchKey] : [
        `1. Identify where ${secretName} was issued (provider dashboard)`,
        `2. Revoke or regenerate the secret immediately`,
        `3. Update the secret in your environment variables / secrets manager`,
        `4. Redeploy all services that use this secret`,
        `5. Audit access logs for any suspicious usage before rotation`,
        `6. Remove the secret from source code and git history (use git-filter-repo)`,
      ];

      return {
        content: [{
          type: "text",
          text: [
            `Rotation guide for: ${secretName}`,
            `Scan: ${a.scan_id}`,
            ``,
            `IMPORTANT: Do this immediately — treat the secret as fully compromised.`,
            ``,
            ...steps,
            ``,
            `After rotation, re-run scan_repo to confirm the secret no longer appears.`,
          ].join("\n"),
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
