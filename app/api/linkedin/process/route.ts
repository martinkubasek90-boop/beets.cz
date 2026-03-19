import { NextResponse } from "next/server";
import { enrichPendingLinkedInRun, processLinkedInRun } from "@/lib/linkedin-scraper";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.LINKEDIN_SCRAPER_TOKEN;
  if (!expected) return true;

  // Allow same-origin browser calls from the local UI during development.
  const origin = request.headers.get("origin") || "";
  const host = request.headers.get("host") || "";
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) {
        return true;
      }
    } catch {
      // Ignore malformed origin and fall back to bearer auth.
    }
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    runId?: string;
    mode?: "process" | "enrich_pending";
  };

  try {
    const result =
      body.mode === "enrich_pending" && body.runId
        ? await enrichPendingLinkedInRun(body.runId)
        : await processLinkedInRun(body.runId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Nepodarilo se zpracovat LinkedIn run.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
