import type { NextConfig } from "next";

// Set by the GitHub Pages workflow (e.g. "/Pigment-case-study"). Unset locally.
const pagesBasePath = process.env.PAGES_BASE_PATH;
const isPagesExport = pagesBasePath !== undefined;

const nextConfig: NextConfig = {
  devIndicators: false,
  // PPR / Cache Components aren't supported in static export mode.
  cacheComponents: !isPagesExport,
  partialPrefetching: !isPagesExport,
  ...(isPagesExport && {
    output: "export",
    basePath: pagesBasePath,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
