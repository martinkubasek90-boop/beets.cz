import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable component caching to allow dynamic routes (e.g., blog detail) to fetch data at runtime.
  cacheComponents: false,
};

export default nextConfig;
