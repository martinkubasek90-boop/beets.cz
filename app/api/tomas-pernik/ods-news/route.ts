import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OdsFeedItem = {
  title: string;
  link: string;
  date: string;
  excerpt: string;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeXml(match[1]) : "";
}

export async function GET() {
  try {
    const response = await fetch("https://www.ods.cz/rss", {
      headers: { "User-Agent": "beets.cz Tomas Pernik importer" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: `ODS RSS failed: ${response.status}` }, { status: 502 });
    }

    const xml = await response.text();
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
      .map((match) => match[1])
      .map((block): OdsFeedItem => ({
        title: readTag(block, "title"),
        link: readTag(block, "link"),
        date: readTag(block, "pubDate"),
        excerpt: readTag(block, "description"),
      }))
      .filter((item) => item.title && item.link)
      .slice(0, 10);

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ODS RSS import failed." },
      { status: 500 },
    );
  }
}
