import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's dev server treats 127.0.0.1 and localhost as different origins
  // and blocks cross-origin asset/HMR requests by default. Since this app
  // gets accessed via both interchangeably, allow both explicitly.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
    ],
  },
};

export default nextConfig;
