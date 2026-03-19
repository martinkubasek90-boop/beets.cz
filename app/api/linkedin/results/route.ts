import { NextResponse } from "next/server";
import { getLinkedInDashboardData, listLinkedInResults } from "@/lib/linkedin-scraper";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  try {
    if (mode === "dashboard") {
      const data = await getLinkedInDashboardData();
      return NextResponse.json({ ok: true, ...data });
    }

    const results = await listLinkedInResults({
      runId: searchParams.get("runId"),
      q: searchParams.get("q"),
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      minScore: searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined,
      contactsOnly: searchParams.get("contactsOnly") === "1",
    });

    return NextResponse.json({ ok: true, ...results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Nepodarilo se nacist LinkedIn vysledky.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
