import { NextResponse } from "next/server";
import {
  getTomasPernikNewsContent,
  saveTomasPernikNewsContent,
} from "@/lib/tomas-pernik-news";

export const runtime = "nodejs";

export async function GET() {
  try {
    const content = await getTomasPernikNewsContent();
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load news content." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { content?: unknown };
    const content = await saveTomasPernikNewsContent((payload.content || { items: [] }) as never);
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save news content." },
      { status: 500 },
    );
  }
}
