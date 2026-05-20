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
    if (process.env.NODE_ENV !== 'production') {
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
    }
    return [
      {
        source: '/marketing/ai-detail',
        destination: '/marketing/ai-detail/index.html',
      },
      {
        source: '/marketing/ai-detail/',
        destination: '/marketing/ai-detail/index.html',
      },
    ];
  },
};

export default nextConfig;
