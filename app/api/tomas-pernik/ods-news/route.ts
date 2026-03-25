import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OdsFeedItem = {
  title: string;
  link: string;
  date: string;
  excerpt: string;
};

function decodeHtml(value: string) {
  return value
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

function extractCardItems(html: string): OdsFeedItem[] {
  const cards = Array.from(
    html.matchAll(
      /<div class="col-sm-6 col-md-4 d-flex align-items-stretch">[\s\S]*?<div class="card-body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g,
    ),
  );

  return cards
    .map((match) => {
      const block = match[1];
      const linkMatch = block.match(/<h4 class="card-title mb-0">[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>/i);
      const dateMatch = block.match(/<small>[\s\S]*?<\/i>&nbsp;\s*([\s\S]*?)\s*<\/small>/i);

      const title = linkMatch?.[2] ? decodeHtml(linkMatch[2]) : "";
      const link = linkMatch?.[1]?.trim() || "";
      const date = dateMatch?.[1] ? decodeHtml(dateMatch[1]) : "";

      return {
        title,
        link,
        date,
        excerpt: "",
      };
    })
    .filter((item) => item.title && item.link);
}

export async function GET() {
  try {
    const response = await fetch("https://www.ods.cz/novinky", {
      headers: { "User-Agent": "beets.cz Tomas Pernik importer" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: `ODS novinky failed: ${response.status}` }, { status: 502 });
    }

    const html = await response.text();
    const items = extractCardItems(html);

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ODS news import failed." },
      { status: 500 },
    );
  }
}
