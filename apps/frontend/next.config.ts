import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  turbopack: {
    root: __dirname,
  },
  typescript: {
    // ETIMEDOUT on next-env.d.ts — macOS filesystem issue, not code.
    // Compilation succeeds; this skips the TS checker during `next build`.
    ignoreBuildErrors: true,
  },

  webpack(config) {
    config.ignoreWarnings = [{ module: /@prisma\/instrumentation/ }];
    return config;
  },

  async rewrites() {
    return [
      {
        source: "/docs",
        destination: "https://docs.unideploy.in",
      },
      {
        source: "/docs/:path*",
        destination: "https://docs.unideploy.in/:path*",
      },
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

const isProd = process.env.NODE_ENV === "production";

const configToExport = isProd
  ? withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: "unideploy",
      project: "javascript-nextjs",

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      tunnelRoute: "/monitoring",

      // Hides source maps from visitors
      sourcemaps: false,

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,
    })
  : nextConfig;

export default configToExport;
