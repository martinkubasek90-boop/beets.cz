import { NextResponse } from "next/server";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.MEMODO_ADMIN_TOKEN || process.env.MEMODO_AI_ADMIN_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

export async function GET() {
  const supabase = getMemodoServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, namespace: "memodo", sources: 0, note: "Supabase není nakonfigurované." });
  }

  const { count, error } = await supabase
    .from("bess_knowledge_sources")
    .select("id", { count: "exact", head: true })
    .eq("namespace", "memodo");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, namespace: "memodo", sources: count || 0 });
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getMemodoServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase není nakonfigurované." }, { status: 500 });
  }

  const { error } = await supabase
    .from("bess_knowledge_sources")
    .delete()
    .eq("namespace", "memodo");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, namespace: "memodo", reset: true });
}
