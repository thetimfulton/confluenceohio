/**
 * JSON-LD structured data generators.
 *
 * Each function returns a plain object conforming to a Schema.org type.
 * Render with <JsonLd data={...} /> from @confluenceohio/ui/json-ld.
 *
 * Spec: docs/12-seo-structured-data.md §2
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

// ---------------------------------------------------------------------------
// Organization (site-wide, rendered in root layout)
// ---------------------------------------------------------------------------

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Confluence Ohio',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/images/logo.png`,
    width: 512,
    height: 512,
  },
  description:
    'A 501(c)(4) civic organization building a movement to rename Columbus, Ohio to Confluence, Ohio — a name rooted in geography, not borrowed mythology.',
  nonprofitStatus: 'Nonprofit501c4',
  foundingDate: '2026',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Columbus',
    addressRegion: 'OH',
    addressCountry: 'US',
  },
  areaServed: {
    '@type': 'State',
    name: 'Ohio',
    sameAs: 'https://en.wikipedia.org/wiki/Ohio',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@confluenceohio.org',
    contactType: 'customer service',
  },
  sameAs: [
    'https://www.facebook.com/confluenceohio',
    'https://x.com/confluenceohio',
    'https://www.instagram.com/confluenceohio',
  ],
} as const;

// ---------------------------------------------------------------------------
// WebPage (homepage — mainEntity points to the Organization)
// ---------------------------------------------------------------------------

export function webPageSchema(page: {
  name: string;
  description: string;
  url: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.name,
    description: page.description,
    url: page.url.startsWith('/') ? `${SITE_URL}${page.url}` : page.url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Confluence Ohio',
      url: SITE_URL,
    },
    mainEntity: { '@id': `${SITE_URL}/#organization` },
  };
}

// ---------------------------------------------------------------------------
// BreadcrumbList (all interior pages — not the homepage)
// ---------------------------------------------------------------------------

const SEGMENT_LABELS: Record<string, string> = {
  'the-case': 'The Case',
  history: 'The Naming Story',
  'the-rivers': 'The Confluence',
  'columbus-legacy': 'Who Was Columbus?',
  precedents: 'Cities That Changed Their Names',
  'the-process': 'How It Works',
  voices: 'Community Voices',
  share: 'Share Your Perspective',
  sign: 'Sign the Petition',
  'thank-you': 'Thank You',
  verify: 'Verify',
  'my-referrals': 'Your Referrals',
  leaderboard: 'Leaderboard',
  volunteer: 'Volunteer',
  donate: 'Donate',
  about: 'About',
  press: 'Press & Media',
  blog: 'Blog',
  faq: 'FAQ',
  privacy: 'Privacy Policy',
  terms: 'Terms of Use',
};

/**
 * Builds a BreadcrumbList schema from a pathname.
 *
 * Returns `null` for the homepage (no breadcrumbs needed).
 *
 * For dynamic segments (blog slug, voice slug), pass `finalLabel`
 * to override the last breadcrumb item with the actual title.
 */
export function breadcrumbSchema(
  pathname: string,
  finalLabel?: string,
): Record<string, unknown> | null {
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const items: Array<{ name: string; path: string }> = [
    { name: 'Home', path: '/' },
  ];

  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;
    const label =
      isLast && finalLabel
        ? finalLabel
        : (SEGMENT_LABELS[segment] || segment);
    items.push({ name: label, path: currentPath });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// BlogPosting (/blog/[slug])
// ---------------------------------------------------------------------------

interface BlogPostSchemaInput {
  title: string;
  description: string;
  slug: string;
  author: string;
  publishedAt: string; // ISO 8601
  modifiedAt?: string;
  ogImageUrl: string;
}

export function blogPostingSchema(
  input: BlogPostSchemaInput,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    ...(input.modifiedAt && { dateModified: input.modifiedAt }),
    author: {
      '@type': input.author === 'Confluence Ohio' ? 'Organization' : 'Person',
      name: input.author,
      ...(input.author === 'Confluence Ohio' && { url: SITE_URL }),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Confluence Ohio',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/logo.png`,
      },
    },
    image: input.ogImageUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${input.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Article (/voices/[slug])
// ---------------------------------------------------------------------------

interface VoiceArticleSchemaInput {
  title: string;
  description: string;
  slug: string;
  authorName: string;
  publishedAt: string;
  ogImageUrl: string;
}

export function voiceArticleSchema(
  input: VoiceArticleSchemaInput,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    author: {
      '@type': 'Person',
      name: input.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Confluence Ohio',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/logo.png`,
      },
    },
    image: input.ogImageUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/voices/${input.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// FAQPage (/faq)
// ---------------------------------------------------------------------------

interface FaqItem {
  question: string;
  answer: string;
}

export function faqPageSchema(
  items: FaqItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// Event (blog posts with event fields)
// ---------------------------------------------------------------------------

interface EventSchemaInput {
  name: string;
  description: string;
  startDate: string; // ISO 8601
  endDate?: string;
  venueName: string;
  addressLocality?: string;
  url: string;
  isOnline?: boolean;
}

export function eventSchema(
  input: EventSchemaInput,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.name,
    description: input.description,
    startDate: input.startDate,
    ...(input.endDate && { endDate: input.endDate }),
    location: input.isOnline
      ? {
          '@type': 'VirtualLocation',
          url: input.url,
        }
      : {
          '@type': 'Place',
          name: input.venueName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: input.addressLocality || 'Columbus',
            addressRegion: 'OH',
            addressCountry: 'US',
          },
        },
    organizer: {
      '@type': 'Organization',
      name: 'Confluence Ohio',
      url: SITE_URL,
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: input.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
  };
}
