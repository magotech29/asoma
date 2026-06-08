import type { NextConfig } from "next";

const allowedDevOrigins: string[] = [];
if (process.env.REPLIT_DEV_DOMAIN) {
  allowedDevOrigins.push(process.env.REPLIT_DEV_DOMAIN);
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
