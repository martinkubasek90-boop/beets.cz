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
        src: "/memodo-icon-blue-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/memodo-icon-blue-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/memodo-apple-touch-icon-v2.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
