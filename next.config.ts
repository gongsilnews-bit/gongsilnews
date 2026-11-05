import type { NextConfig } from "next";

/** 공실뉴스부동산 소개 페이지들 — "" = 첫 화면 */
const SITE_PAGES = ['', '/pricing', '/benefits', '/guide', '/resources', '/community'];

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800, // 7 days edge cache
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // 공실마케팅 소개 사이트 주소 /studio → /marketing (2026-10-28 사장님). 앱 연결 화면 /studio/connect · /studio/callback 은 그대로
  async redirects() {
    return [
      { source: '/studio', destination: '/marketing', permanent: false },
      { source: '/studio/:path((?!connect|callback).*)', destination: '/marketing/:path', permanent: false },
      // 공실마케팅 소개 → 공실뉴스부동산 PRO 소개 (/newsrealty) 로 합침 (2026-11-04 사장님). 도구(/marketing/report·ai-detail·studio·studyhtml)는 그대로
      ...SITE_PAGES.map((x) => ({ source: `/marketing${x}`, destination: `/newsrealty${x}`, permanent: false })),
      { source: '/marketing/feature/:slug', destination: '/newsrealty/feature/:slug', permanent: false },
      { source: '/marketing/guide/:id', destination: '/newsrealty/guide/:id', permanent: false },
      { source: '/marketing/apply', destination: '/newsrealty/pro-apply', permanent: false },
      // 짧은 주소 /pro → 소개의 "PRO가 되면" 부분
      { source: '/pro', destination: '/newsrealty#pro', permanent: false }, // 비교표가 메인 맨 아래로 (2026-11-05)
    ];
  },
  async rewrites() {
    return { beforeFiles: SITE_REWRITES, afterFiles: toolRewrites() };
  },
};

/* /newsrealty 주소로 예전 공실마케팅 소개 화면(app/marketing/(site))을 보인다 — 화면 코드는 그 자리 그대로 (2026-11-04)
   (main)/newsrealty 의 옛 페이지보다 먼저 (beforeFiles). /newsrealty/apply(무료 가입 신청)는 옛 페이지 그대로 */
const SITE_REWRITES = [
  ...SITE_PAGES.map((x) => ({ source: `/newsrealty${x}`, destination: `/marketing${x}` })),
  { source: '/newsrealty/feature/:slug', destination: '/marketing/feature/:slug' },
  { source: '/newsrealty/guide/:id', destination: '/marketing/guide/:id' },
  { source: '/newsrealty/pro-apply', destination: '/marketing/apply' },
];

function toolRewrites() {
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
        {
          source: '/marketing/studio',
          destination: 'http://localhost:3009/marketing/studio/',
        },
        {
          source: '/marketing/studio/:path*',
          destination: 'http://localhost:3009/marketing/studio/:path*',
        },
        {
          source: '/marketing/studyhtml',
          destination: 'http://localhost:3010/marketing/studyhtml/',
        },
        {
          source: '/marketing/studyhtml/:path*',
          destination: 'http://localhost:3010/marketing/studyhtml/:path*',
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
      {
        source: '/marketing/studio',
        destination: '/marketing/studio/index.html',
      },
      {
        source: '/marketing/studio/',
        destination: '/marketing/studio/index.html',
      },
      {
        source: '/marketing/studyhtml',
        destination: '/marketing/studyhtml/index.html',
      },
      {
        source: '/marketing/studyhtml/',
        destination: '/marketing/studyhtml/index.html',
      },
    ];
}

export default nextConfig;
