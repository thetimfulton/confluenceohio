import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { fontBody, fontHeading } from './fonts';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { organizationSchema } from '@/lib/schema';
import { AnnouncerProvider } from '@confluenceohio/ui/a11y';
import { AnalyticsProvider } from './providers';
import { PostHogPageView } from '@/components/analytics/posthog-pageview';
import { GA4ConsentLoader } from '@/components/analytics/ga4-consent';
import { CookieBanner } from '@/components/analytics/cookie-banner';
import { bootstrapFeatureFlags } from '@/lib/analytics/feature-flags-server';
import './globals.css';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Confluence Ohio — Rename Columbus After Its Rivers',
    template: '%s | Confluence Ohio',
  },
  description:
    'Join the movement to rename Columbus, Ohio to Confluence — a name rooted in geography, not borrowed mythology. Sign the petition.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Confluence Ohio',
    title: 'Confluence Ohio — Rename Columbus After Its Rivers',
    description:
      'Columbus sits at the confluence of the Scioto and Olentangy rivers. The rivers made the city. Now the city can take their name.',
    images: [
      {
        url: '/images/og/default.png',
        width: 1200,
        height: 630,
        alt: 'Confluence Ohio — where the Scioto and Olentangy rivers meet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@confluenceohio',
    creator: '@confluenceohio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      'msvalidate.01': process.env.BING_SITE_VERIFICATION ?? '',
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side feature flag bootstrapping (Artifact 13 §5.2).
  // Read or generate a PostHog distinct_id, evaluate all flags server-side,
  // and inject them into the page so the client never flickers between variants.
  const cookieStore = await cookies();
  const { distinctId, flags } = await bootstrapFeatureFlags(cookieStore);

  return (
    <html lang="en" className={`${fontBody.variable} ${fontHeading.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PH_FLAGS__=${JSON.stringify(flags)};window.__PH_DISTINCT_ID__="${distinctId}";`,
          }}
        />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <JsonLd data={organizationSchema} />
        <AnalyticsProvider>
          <AnnouncerProvider>
            <PostHogPageView />
            {children}
          </AnnouncerProvider>
        </AnalyticsProvider>

        {/* Vercel — zero config, auto-tracks pageviews + Web Vitals */}
        <Analytics />
        <SpeedInsights />

        {/* GA4 — consent-gated, loads only after user grants analytics consent */}
        <GA4ConsentLoader />
        <CookieBanner />
      </body>
    </html>
  );
}
