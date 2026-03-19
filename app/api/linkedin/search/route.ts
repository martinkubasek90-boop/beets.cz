import { NextResponse } from "next/server";
import { createLinkedInRun, type LinkedInSearchPayload } from "@/lib/linkedin-scraper";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LinkedInSearchPayload;

  try {
    const run = await createLinkedInRun(body);
    return NextResponse.json({ ok: true, run });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Nepodarilo se zalozit scrape run.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
