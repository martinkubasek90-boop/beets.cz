import { NextResponse } from "next/server";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";

export const runtime = "nodejs";

type Payload = {
  emails?: string[];
};

function isAuthorized(request: Request) {
  const expected = process.env.MEMODO_ADMIN_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const supabase = getMemodoServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase credentials." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("memodo_price_allowlist")
    .select("email,is_active")
    .eq("is_active", true)
    .order("email", { ascending: true })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    emails: (data || []).map((row) => row.email as string),
  });
}

export async function PUT(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getMemodoServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase credentials." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as Payload;
  const normalized = Array.from(
    new Set((body.emails || []).map((item) => normalizeEmail(item)).filter(Boolean)),
  );

  const rows = normalized.map((email) => ({
    email,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("memodo_price_allowlist").upsert(rows, {
      onConflict: "email",
    });
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("memodo_price_allowlist")
    .select("email")
    .eq("is_active", true)
    .limit(10000);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const current = new Set(normalized);
  const toDisable = (existingRows || [])
    .map((row) => String(row.email))
    .filter((email) => !current.has(email));

  if (toDisable.length > 0) {
    const { error: disableError } = await supabase
      .from("memodo_price_allowlist")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("email", toDisable);
    if (disableError) {
      return NextResponse.json({ error: disableError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: normalized.length });
}
