import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/marketing/ai-detail',
        destination: 'http://localhost:3005/marketing/ai-detail/',
      },
      {
        source: '/marketing/ai-detail/:path*',
        destination: 'http://localhost:3005/marketing/ai-detail/:path*',
      },
    ];
  },
};

export default nextConfig;
