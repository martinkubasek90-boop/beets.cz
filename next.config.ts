import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    // Nutí Next najít kořen v tomto projektu (kvůli více lockfile v nadřazených složkách)
    root: __dirname,
  },
  outputFileTracingIncludes: {
    '/api/konvertor': ['node_modules/ffmpeg-static/**'],
    '/api/konvertor/route': ['node_modules/ffmpeg-static/**'],
  },
};

export default nextConfig;
