import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { isMemodoEmailAllowed } from "@/lib/memodo-price-access";

export const runtime = "nodejs";

type Payload = {
  email?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const email = normalizeEmail(body.email || "");
  if (!email) {
    return NextResponse.json({ error: "Missing email." }, { status: 400 });
  }

  const allowed = await isMemodoEmailAllowed(email);
  if (!allowed) {
    return NextResponse.json(
      { error: "Tento e-mail není schválený pro zobrazení cen. Kontaktuj obchodní oddělení." },
      { status: 403 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const redirectBase =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://beets.cz";
  const redirectTo = `${redirectBase}/auth/confirm?next=/Memodo`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
