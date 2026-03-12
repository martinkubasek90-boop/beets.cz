import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseTarget(input: string) {
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url") || "";
  const target = parseTarget(raw);
  if (!target) {
    return NextResponse.json({ error: "Neplatná URL obrázku." }, { status: 400 });
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        "User-Agent": "beets-ppc-image-proxy",
        Accept: "image/*",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Obrázek se nepodařilo načíst." }, { status: 502 });
    }

    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Načítání obrázku selhalo." }, { status: 500 });
  }
}
