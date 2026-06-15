import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // Enable instrumentation.ts (Sentry init, OpenTelemetry, etc.)
};

export default nextConfig;
