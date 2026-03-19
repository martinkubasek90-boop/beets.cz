import { NextResponse } from "next/server";
import { deleteLinkedInRun } from "@/lib/linkedin-scraper";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { runId?: string };
  const runId = body.runId?.trim();

  if (!runId) {
    return NextResponse.json({ ok: false, error: "Chybi runId." }, { status: 400 });
  }

  try {
    await deleteLinkedInRun(runId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Nepodarilo se smazat run.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
