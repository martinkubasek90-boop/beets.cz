import { NextResponse } from "next/server";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";

export const runtime = "nodejs";

type EventPayload = {
  event?: string;
  params?: Record<string, string | number | boolean | null>;
};

export async function POST(request: Request) {
  const supabase = getMemodoServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const body = (await request.json().catch(() => ({}))) as EventPayload;
  const event = body.event?.trim();
  if (!event) {
    return NextResponse.json({ error: "Missing event name." }, { status: 400 });
  }

  const payload = body.params && typeof body.params === "object" ? body.params : {};

  const { error } = await supabase.from("memodo_events").insert({
    event_name: event,
    payload,
    created_at: new Date().toISOString(),
  });

  if (error) {
    // Graceful mode: if table is not present yet, app should still work.
    return NextResponse.json({ ok: true, persisted: false, warning: error.message });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
