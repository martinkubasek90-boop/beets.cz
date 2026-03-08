import { NextResponse } from "next/server";
import { getMemodoViewerPriceAccess } from "@/lib/memodo-price-access";

export const runtime = "nodejs";

export async function GET() {
  const access = await getMemodoViewerPriceAccess();
  return NextResponse.json({
    ok: true,
    canSeePrices: access.canSeePrices,
    email: access.email || null,
  });
}
