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
  // /system-design was the live URL before series moved under /series/.
  // Permanent so existing links and search results follow to the new hub.
  async redirects() {
    return [
      {
        source: "/system-design",
        destination: "/series/system-design",
        permanent: true,
      },
      {
        source: "/system-design/:slug*",
        destination: "/series/system-design/:slug*",
        permanent: true,
      },
    ];
  },
  // if used turbopack
  // transpilePackages: ["next-mdx-remote"],
};

export default nextConfig;
