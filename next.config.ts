import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
