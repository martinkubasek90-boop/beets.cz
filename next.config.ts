import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    // Nutí Next najít kořen v tomto projektu (kvůli více lockfile v nadřazených složkách)
    root: __dirname,
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/konvertor': ['node_modules/ffmpeg-static/ffmpeg'],
    },
  },
};

export default nextConfig;
