import { NextResponse } from "next/server";
import { TEMPLATES } from "@/lib/sandbox/templates";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      service: "UniDeploy Sandbox Marketplace",
      provider: "UniDeploy Isolated MicroVMs",
      templates: TEMPLATES,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
