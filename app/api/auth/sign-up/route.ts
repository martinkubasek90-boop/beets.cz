import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password, persona } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Missing email or password" },
      { status: 400 }
    );
  }

  const role = persona === "beatmaker" ? "creator" : persona === "rapper" ? "mc" : null;

  const supabase = await createServerClient();

  // Standardní sign-up: Supabase pošle potvrzovací e-mail
  // a nedovolí přihlášení, dokud uživatel nepotvrdí adresu.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: role ? { role } : undefined,
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
      }/auth/confirm`,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 400 }
    );
  }

  // Nepřihlašujeme automaticky – čekáme na potvrzení e-mailu.
  return NextResponse.json({ success: true });
}
