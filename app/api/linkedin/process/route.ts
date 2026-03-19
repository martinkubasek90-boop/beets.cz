import { NextResponse } from "next/server";
import { processLinkedInRun } from "@/lib/linkedin-scraper";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.LINKEDIN_SCRAPER_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { runId?: string };

  try {
    const result = await processLinkedInRun(body.runId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Nepodarilo se zpracovat LinkedIn run.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
