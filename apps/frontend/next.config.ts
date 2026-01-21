import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BRAIN_URL || "http://127.0.0.1:8000"}/:path*`,
      },
      {
        source: "/socket/:path*",
        destination: `${process.env.GATEWAY_URL || "http://127.0.0.1:3001"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
