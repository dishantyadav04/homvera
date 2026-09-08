import type { NextConfig } from 'next'
import { buildApiHeaderRules } from './lib/http-headers-config'
import { withSentryConfig } from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  reactStrictMode: true,

  serverExternalPackages: ['openai', 'posthog-node'],

  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS?.split(',') ?? ['localhost']).map(s => s.trim()),

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.propcinity.in' },
      { protocol: 'https', hostname: 'pub-*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
    ],
    // Property images are uploaded once via the admin and rarely change
    // post-publish — 7 days keeps the optimized-image cache warm far longer
    // than Next's default, cutting repeat re-optimization work at the edge.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    // Explicit rather than relying on implicit content negotiation — makes
    // the intent visible in config, and gives a single place to drop AVIF
    // from if it ever causes decode-time issues on older devices.
    formats: ['image/avif', 'image/webp'],
  },

  compress: true,

  async redirects() {
    return [
      {
        source: '/terms',
        destination: '/terms-and-conditions',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: '/privacy-policy',
        permanent: true,
      },
    ]
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development'

    const cspDirectives = [
      "default-src 'self'",
      // TODO: Replace 'unsafe-inline' with nonce-based CSP post-launch
      // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
      // PostHog SDK requires unsafe-eval for session recording and feature flags.
      // blob: is needed for PostHog's worker-based session recording scripts.
      // Both us-assets.i.posthog.com and us.i.posthog.com host lazy-loaded SDK bundles.
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://us-assets.i.posthog.com https://us.i.posthog.com ${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://ingest.propcinity.in'}`,
      // Styles: self + inline (Tailwind requires this)
      "style-src 'self' 'unsafe-inline'",
      // Images: self, data URIs, R2 bucket, Supabase storage
      `img-src 'self' data: blob: ${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''} https://*.supabase.co https://*.supabase.in https://*.r2.dev https://*.r2.cloudflarestorage.com https://images.propcinity.in https://*.tile.openstreetmap.org https://cdnjs.cloudflare.com ${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://ingest.propcinity.in'} https://us.i.posthog.com https://api.qrserver.com https://www.googletagmanager.com https://www.google-analytics.com`,
      // API connections
      [
        "connect-src 'self'",
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        'https://api.openai.com',
        // PostHog ingestion host (events)
        process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://ingest.propcinity.in',
        // PostHog assets host (decide endpoint — feature flags, session recording)
        'https://us-assets.i.posthog.com',
        // PostHog UI host (toolbar, debug, project dashboard)
        'https://us.posthog.com',
        'https://overpass-api.de',
        'https://*.tile.openstreetmap.org',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        isDev ? 'ws://localhost:*' : '',
      ].filter(Boolean).join(' '),
      "font-src 'self' data:",
      `worker-src 'self' blob: ${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://ingest.propcinity.in'} https://us-assets.i.posthog.com https://us.i.posthog.com`,
      "frame-src 'self' https://www.googletagmanager.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',                value: 'DENY' },
          { key: 'X-Content-Type-Options',          value: 'nosniff' },
          { key: 'Referrer-Policy',                 value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection',               value: '1; mode=block' },
          { key: 'Permissions-Policy',              value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Content-Security-Policy',         value: cspDirectives },
          ...(!isDev ? [
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
          ] : []),
        ],
      },
      {
        source: '/admin/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      // NOTE: we intentionally do NOT apply a blanket Cache-Control rule to
      // all of /api/(.*) here anymore. Next.js appends config-level headers
      // alongside whatever a route handler sets rather than letting one
      // replace the other, so a blanket no-store rule here was silently
      // shipping a second, conflicting Cache-Control header on every public
      // route that tried to opt into caching (see lib/http-headers-config.ts
      // for the full explanation and the routes this now covers).
      ...buildApiHeaderRules(),
    ]
  },
}

export default withSentryConfig(withSerwist(nextConfig), {
  org: "propcinity",
  project: "propcinity",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  // @ts-expect-error — still respected at runtime by @sentry/nextjs 10.x;
  // the installed type defs just haven't caught up to their own docs yet.
  // (This was silently untyped before too — next.config.mjs wasn't
  // type-checked. Converting to next.config.ts is what surfaced it.)
  hideSourceMaps: true,
  telemetry: false,

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});