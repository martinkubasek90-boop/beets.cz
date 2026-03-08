import { NextResponse } from "next/server";
import { getMemodoViewerPriceAccess, isMemodoEmailAllowed } from "@/lib/memodo-price-access";

export const runtime = "nodejs";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET() {
  const access = await getMemodoViewerPriceAccess();
  return NextResponse.json({
    ok: true,
    canSeePrices: access.canSeePrices,
    email: access.email || null,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(body.email || "");

  if (!isEmailValid(email)) {
    return NextResponse.json({ ok: false, error: "Neplatný e-mail." }, { status: 400 });
  }

  const canSeePrices = await isMemodoEmailAllowed(email);
  const response = NextResponse.json({
    ok: true,
    canSeePrices,
    email,
  });

  response.cookies.set({
    name: "memodo_price_email",
    value: email,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
