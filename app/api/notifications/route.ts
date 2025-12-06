import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Missing Supabase service role envs" }, { status: 500 });
  }

  try {
    const payload = await req.json();
    const { user_id, type, title, body, item_type, item_id } = payload || {};
    if (!user_id || !type) {
      return NextResponse.json({ error: "Missing user_id or type" }, { status: 400 });
    }

    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await service.from("notifications").insert({
      user_id,
      type,
      title,
      body,
      item_type: item_type ?? null,
      item_id: item_id ?? null,
      read: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
