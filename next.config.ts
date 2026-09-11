import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Emit out/grow/index.html rather than out/grow.html, so the route resolves
  // on any static host without relying on extension-stripping rewrites.
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "cursor.com",
    "*.cursor.com",
    "cursor.sh",
    "*.cursor.sh",
  ],
};

export default nextConfig;
