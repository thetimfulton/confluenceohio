import path from 'node:path';
import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Monorepo: tell Next.js the workspace root so it finds the right lockfile
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),

  // Turborepo: transpile workspace packages
  transpilePackages: [
    '@confluenceohio/core',
    '@confluenceohio/db',
    '@confluenceohio/email',
    '@confluenceohio/verification',
    '@confluenceohio/ui',
  ],

  // Security headers (supplemented by vercel.json)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.posthog.com https://www.googletagmanager.com https://secure.actblue.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co https://*.posthog.com https://www.google-analytics.com https://challenges.cloudflare.com https://api.smarty.com wss://*.supabase.co",
              "frame-src https://challenges.cloudflare.com https://secure.actblue.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://secure.actblue.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', '@confluenceohio/ui'],
  },

  // PostHog reverse proxy — avoids ad blocker interference (~15–25% more events)
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },

  // Trailing slash removal (Artifact 12 §3.6)
  trailingSlash: false,

  // Redirects — www → apex + common alternate paths (Artifact 12 §3.6)
  async redirects() {
    return [
      // www → non-www (belt-and-suspenders; Cloudflare handles this primarily)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.confluenceohio.org' }],
        destination: 'https://confluenceohio.org/:path*',
        permanent: true,
      },
      // Common alternate paths → canonical destinations
      {
        source: '/petition',
        destination: '/sign',
        permanent: true,
      },
      {
        source: '/stories',
        destination: '/voices',
        permanent: true,
      },
      {
        source: '/community',
        destination: '/voices',
        permanent: true,
      },
      {
        source: '/debate',
        destination: '/voices',
        permanent: true,
      },
      {
        source: '/how',
        destination: '/the-case/the-process',
        permanent: true,
      },
      {
        source: '/contribute',
        destination: '/donate',
        permanent: true,
      },
      {
        source: '/join',
        destination: '/volunteer',
        permanent: true,
      },
      // Path typo corrections (missing "the-" prefix)
      {
        source: '/the-case/rivers',
        destination: '/the-case/the-rivers',
        permanent: true,
      },
      {
        source: '/the-case/process',
        destination: '/the-case/the-process',
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
