import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const manifest = {
    id: "/Memodo",
    name: "Memodo",
    short_name: "Memodo",
    description: "Mobilní katalog a poptávky pro zákazníky Memodo.",
    start_url: "/Memodo/akce",
    scope: "/Memodo/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#FFE500",
    orientation: "portrait",
    lang: "cs",
    icons: [
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

