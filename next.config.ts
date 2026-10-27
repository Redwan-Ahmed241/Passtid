import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async redirects() {
    // The booking page used to live at /console.
    return [{ source: "/console", destination: "/booking", permanent: true }];
  },
  turbopack: {
    // A stray package-lock.json higher up the tree would otherwise be picked as the root.
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
