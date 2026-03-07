import { NextResponse } from "next/server";
import { getMemodoProductById } from "@/lib/memodo-catalog";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const product = await getMemodoProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, product });
}
