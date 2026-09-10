import type { NextConfig } from "next";

/**
 * Stamped once per build and handed to both sides: the browser bakes it into
 * the page it loaded, and /api/version reports the one the server is currently
 * running. A difference between them means a deploy happened under a tab that
 * is still open.
 *
 * The commit SHA on Vercel, a timestamp locally, so `next dev` restarts do not
 * all look like the same build.
 */
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? `dev-${Date.now().toString(36)}`;

const nextConfig: NextConfig = {
  /* config options here */
  generateBuildId: () => buildId,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
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
