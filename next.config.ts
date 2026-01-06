import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  // Enable React compiler for automatic optimizations
  experimental: {
    optimizePackageImports: ['react-icons', '@fortawesome/react-fontawesome', '@fortawesome/free-solid-svg-icons'],
  },

  // Image optimization configuration
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000, // 1 year cache
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.statically.io',
        pathname: '/gh/flarialmc/**',
      },
      {
        protocol: 'https',
        hostname: 'marketplace.flarial.xyz',
        pathname: '/api/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; connect-src 'self' https://1klcjc8um5aq.flarial.xyz https://cloudflareinsights.com https://github.com https://api.github.com https://raw.githubusercontent.com; img-src 'self' data: blob: https://cdn.statically.io https://marketplace.flarial.xyz;",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;