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
    if (process.env.USE_VITE_DEV_SERVER === 'true') {
      return [
        {
          source: '/marketing/ai-detail',
          destination: 'http://localhost:3005/marketing/ai-detail/',
        },
        {
          source: '/marketing/ai-detail/:path*',
          destination: 'http://localhost:3005/marketing/ai-detail/:path*',
        },
        {
          source: '/marketing/report',
          destination: 'http://localhost:3006/marketing/report/',
        },
        {
          source: '/marketing/report/:path*',
          destination: 'http://localhost:3006/marketing/report/:path*',
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
      {
        source: '/marketing/report',
        destination: '/marketing/report/index.html',
      },
      {
        source: '/marketing/report/',
        destination: '/marketing/report/index.html',
      },
    ];
  },
};

export default nextConfig;
