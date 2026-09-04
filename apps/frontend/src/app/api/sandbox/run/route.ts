import { NextRequest, NextResponse } from "next/server";
import { runInSandbox, checkRateLimit, SupportedLanguage } from "@/lib/sandbox/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      "127.0.0.1";

    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    // Authenticated keys get higher rate limits (100 req/10m), anonymous gets 30 req/10m
    const maxRequests = apiKey ? 100 : 30;
    const rateLimit = checkRateLimit(`sbx:${apiKey || ip}`, maxRequests);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please wait before running more sandboxes or configure an API key.",
          remaining: 0,
          resetInSec: rateLimit.resetInSec,
        },
        {
          status: 429,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Retry-After": String(rateLimit.resetInSec),
          },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { language = "python", code, timeoutMs = 30_000 } = body;

    const validLangs: SupportedLanguage[] = ["python", "js", "javascript", "bash"];
    if (!validLangs.includes(language as SupportedLanguage)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported runtime: '${language}'. Supported runtimes: ${validLangs.join(", ")}`,
        },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const result = await runInSandbox({
      language: language as SupportedLanguage,
      code,
      timeoutMs: Number(timeoutMs) || 30_000,
    });

    return NextResponse.json(
      {
        ...result,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetInSec: rateLimit.resetInSec,
        },
      },
      {
        status: result.success ? 200 : 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "X-Sandbox-Duration-Ms": String(result.durationMs),
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error executing sandbox.",
      },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
