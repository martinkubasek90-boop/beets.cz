import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    // Nutí Next najít kořen v tomto projektu (kvůli více lockfile v nadřazených složkách)
    root: __dirname,
  },
};

export default nextConfig;
