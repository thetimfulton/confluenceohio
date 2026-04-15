import type { Metadata } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

// ---------------------------------------------------------------------------
// buildPageMetadata — reduces boilerplate for static pages
// ---------------------------------------------------------------------------

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  noIndex?: boolean;
}

/**
 * Builds a complete Next.js Metadata object for a static page.
 *
 * Provides title, description, canonical URL, Open Graph tags, Twitter card,
 * and robots directives from a simple input. Dynamic pages (blog/[slug],
 * voices/[slug], sign) should use generateMetadata() directly.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  ogType = 'website',
  ogImage = '/images/og/default.png',
  noIndex = false,
}: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: ogType,
      url: `${BASE_URL}${path}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}
