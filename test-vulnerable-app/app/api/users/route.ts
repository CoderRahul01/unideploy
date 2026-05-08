import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // TODO: add auth check
  try {
    const users = await fetch("https://abcdefghij.supabase.co/rest/v1/users").then(r => r.json());
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // console.log /* removed by unideploy fix */("Creating user with token:", body.token);
  // console.log /* removed by unideploy fix */("User password:", body.password);
  return NextResponse.json({ created: true, id: Math.random() });
}
