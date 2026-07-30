import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.freepik.com/**",
      },
    ],
  },
  experimental: {
    // Client-side router cache: how long a prefetched/visited route stays fresh
    // before a navigation re-fetches it. `static` matches the 5m ISR window.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  // if used turbopack
  // transpilePackages: ["next-mdx-remote"],
};

export default nextConfig;
