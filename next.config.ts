import type { NextConfig } from "next";

const allowedDevOrigins: string[] = [];
if (process.env.REPLIT_DEV_DOMAIN) {
  allowedDevOrigins.push(process.env.REPLIT_DEV_DOMAIN);
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
};

export default nextConfig;
