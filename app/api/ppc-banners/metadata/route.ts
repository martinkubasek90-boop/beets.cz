import { NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeUrl(input: string) {
  const raw = input.trim();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
}

function pickMeta(html: string, keys: string[]) {
  for (const key of keys) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
  }
  return null;
}

function absolutize(base: URL, value: string | null) {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url") || "";
  const parsed = normalizeUrl(target);

  if (!parsed) {
    return NextResponse.json({ error: "Neplatná URL." }, { status: 400 });
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "beets-ppc-banners-bot",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "URL se nepodařilo načíst." }, { status: 502 });
    }

    const html = await response.text();
    const title = pickMeta(html, ["og:site_name", "og:title"]) || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || parsed.hostname;
    const description = pickMeta(html, ["og:description", "description"]) || "";
    const logoCandidate =
      pickMeta(html, ["og:logo", "og:image", "twitter:image"]) ||
      html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
      null;

    return NextResponse.json({
      brandName: title,
      headline: title,
      subheadline: description,
      brandUrl: parsed.toString(),
      logoUrl: absolutize(parsed, logoCandidate),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Metadata se nepodařilo načíst." }, { status: 500 });
  }
}
