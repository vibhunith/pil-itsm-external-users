import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack never infers a parent dir as root
  // (e.g. when a stray lockfile exists higher up in the filesystem).
  turbopack: {
    root: __dirname,
  },
  // Allow external image domains for SharePoint-hosted images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yodatechnologies055.sharepoint.com',
      },
    ],
  },
  // Increase body size limit for file uploads (40MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '45mb',
    },
  },
};

export default nextConfig;
