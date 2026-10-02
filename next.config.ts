import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static build (`out/`), so the demo can be hosted anywhere.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
