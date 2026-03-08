import { NextResponse } from "next/server";
import { getMemodoViewerPriceAccess } from "@/lib/memodo-price-access";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";

export const runtime = "nodejs";

type InquiryRow = {
  id: number;
  created_at: string;
  email: string;
  contact_name: string;
  company: string | null;
  phone: string | null;
  product_interest: string | null;
  message: string;
  estimated_quantity: number | null;
  product_id: string | null;
  battery_id: string | null;
  hubspot_contact_id: string | null;
  hubspot_deal_id: string | null;
};

export async function GET(request: Request) {
  const access = await getMemodoViewerPriceAccess();
  if (!access.email) {
    return NextResponse.json({ ok: false, error: "Chybí e-mail identita." }, { status: 401 });
  }

  const supabase = getMemodoServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, email: access.email, total: 0, items: [] });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "30")));
  const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

  const query = supabase
    .from("memodo_inquiries")
    .select(
      "id,created_at,email,contact_name,company,phone,product_interest,message,estimated_quantity,product_id,battery_id,hubspot_contact_id,hubspot_deal_id",
      { count: "exact" },
    )
    .eq("email", access.email)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "Nepodařilo se načíst historii poptávek." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email: access.email,
    total: count || 0,
    items: (data || []) as InquiryRow[],
  });
}

export async function DELETE() {
  const access = await getMemodoViewerPriceAccess();
  if (!access.email) {
    return NextResponse.json({ ok: false, error: "Chybí e-mail identita." }, { status: 401 });
  }

  const supabase = getMemodoServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, email: access.email, deleted: 0 });
  }

  const { error, count } = await supabase
    .from("memodo_inquiries")
    .delete({ count: "exact" })
    .eq("email", access.email);

  if (error) {
    return NextResponse.json({ ok: false, error: "Nepodařilo se vymazat historii." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: access.email, deleted: count || 0 });
}
