import { exportLinkedInResultsCsv } from "@/lib/linkedin-scraper";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const csv = await exportLinkedInResultsCsv({
    runId: searchParams.get("runId"),
    q: searchParams.get("q"),
    minScore: searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined,
    contactsOnly: searchParams.get("contactsOnly") === "1",
  });

  const filename = `linkedin-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
