import type { NextConfig } from "next";

const embedOrigins = (process.env.KALKULACKA_EMBED_ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const frameAncestorsValue = ["'self'", ...embedOrigins].join(" ");

const nextConfig: NextConfig = {
  cacheComponents: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: '/kalkulacka',
        headers: [
          // Frame policy for external embeds (controlled by env allowlist).
          { key: 'Content-Security-Policy', value: `frame-ancestors ${frameAncestorsValue}` },
        ],
      },
      {
        source: '/kalkulacka/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors ${frameAncestorsValue}` },
        ],
      },
    ];
  },
  turbopack: {
    // Nutí Next najít kořen v tomto projektu (kvůli více lockfile v nadřazených složkách)
    root: __dirname,
  },
  outputFileTracingIncludes: {
    '/api/konvertor': ['node_modules/ffmpeg-static/**'],
    '/api/konvertor/route': ['node_modules/ffmpeg-static/**'],
    '/api/encode-mp3': ['node_modules/ffmpeg-static/**'],
    '/api/encode-mp3/route': ['node_modules/ffmpeg-static/**'],
  },
};

export default nextConfig;
