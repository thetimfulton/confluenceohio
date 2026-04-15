# Confluence Ohio — SEO and Structured Data Implementation

**Artifact 12 · Prompt 12 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 02 (Site Architecture — page inventory, URL scheme), Artifact 03 (Content Strategy & SEO — keyword assignments, schema plan, OG strategy)

---

## Corrections to Upstream Artifacts

Before proceeding, two factual corrections to Artifact 03:

1. **FID → INP.** Artifact 03 §6.3 references "FID <100ms" as a Core Web Vital target. FID was deprecated and replaced by **Interaction to Next Paint (INP)** on March 12, 2024. The correct target is **INP < 200ms**. All references in this artifact use the current metric.

2. **Sitemap generation.** Artifact 03 §6.3 specifies `next-sitemap` as a third-party package. Next.js 15 App Router has built-in sitemap generation via the `sitemap.ts` file convention (or `sitemap.xml/route.ts` for dynamic sitemaps). This artifact uses the **built-in approach** — no external package needed.

3. **Schema deprecations.** In November 2025, Google deprecated support for Q&A, Practice Problem, Dataset, Sitelinks Search Box, and SpecialAnnouncement structured data types (effective January 2026). Google's March 2026 core update further reduced rich result display for FAQ, Review, and How-To schema on pages where they aren't the primary content purpose. This artifact reflects these changes — FAQPage schema is implemented on `/faq` only (its primary purpose) and not sprinkled across other pages.

---

## 1. Meta Tags — Page-by-Page Specification

### 1.1 Metadata Architecture

All meta tags are implemented via Next.js App Router's `Metadata` API. The root layout (`app/layout.tsx`) exports a base `metadata` object that child pages override via their own `generateMetadata` functions.

**Base metadata (root layout):**

```typescript
// apps/web/app/layout.tsx

import type { Metadata } from 'next';

const BASE_URL = 'https://confluenceohio.org';

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
        url: '/og/default.png',
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
      'msvalidate.01': process.env.BING_SITE_VERIFICATION || '',
    },
  },
};
```

**Title tag format:** `{Page Title} | Confluence Ohio` (via `template` in root metadata). The homepage uses the `default` title without the template suffix.

**Canonical URL strategy:** Every page declares its own canonical via the `alternates.canonical` field in `generateMetadata`. Trailing slashes are stripped (Next.js default). All canonicals point to `https://confluenceohio.org/{path}`.

### 1.2 Page-by-Page Meta Tag Assignments

Each entry specifies the exact `title`, `description`, `canonical`, `og:type`, `og:image`, and any `robots` overrides.

| Page | `<title>` (rendered) | `<meta description>` | `og:type` | `og:image` | Robots |
|---|---|---|---|---|---|
| `/` | Confluence Ohio — Rename Columbus After Its Rivers | Join the movement to rename Columbus, Ohio to Confluence — a name rooted in geography, not borrowed mythology. Sign the petition. | website | `/og/default.png` (static) | index, follow |
| `/the-case` | Why Rename Columbus? \| Confluence Ohio | 7 reasons Columbus, Ohio should consider a new name — from geography to history to branding opportunity. Read the case. | website | `/og/the-case.png` (static) | index, follow |
| `/the-case/history` | How Columbus Got Its Name: The 1812 Story \| Confluence Ohio | A tavern owner, a borrowed name, and a city that almost became "Ohio City." The real story of how Columbus was named. | article | `/og/history.png` (static) | index, follow |
| `/the-case/the-rivers` | The Confluence: Where the Scioto and Olentangy Meet \| Confluence Ohio | Two rivers meet in downtown Columbus — the geographic fact that made this city possible. Discover the confluence. | article | `/og/rivers.png` (static) | index, follow |
| `/the-case/columbus-legacy` | Who Was Christopher Columbus? \| Confluence Ohio | Columbus never set foot in North America. Here's the documented record — and what the city has already done about it. | article | `/og/columbus-legacy.png` (static) | index, follow |
| `/the-case/precedents` | Cities That Changed Their Names \| Confluence Ohio | From Cincinnati to Mumbai, cities have renamed themselves throughout history. Here's what happened. | article | `/og/precedents.png` (static) | index, follow |
| `/the-case/the-process` | How to Rename Columbus: The Legal Process \| Confluence Ohio | 22,000 signatures, a ballot measure, a simple majority. Here's exactly how Columbus can become Confluence. | article | `/og/the-process.png` (static) | index, follow |
| `/voices` | Community Voices \| Confluence Ohio | Supporters, opponents, and undecided residents share their perspectives on renaming Columbus to Confluence. | website | `/og/voices.png` (static) | index, follow |
| `/voices/share` | Share Your Perspective \| Confluence Ohio | Whether you support, oppose, or are undecided — share your perspective on renaming Columbus to Confluence, Ohio. | website | `/og/voices.png` (reuse) | noindex, follow |
| `/voices/[slug]` | "{title}" by {author} \| Confluence Ohio | {First 150 chars of body}… | article | `/og/voice/[slug]` (dynamic) | index, follow |
| `/sign` | Sign the Petition \| Confluence Ohio | Join {X} Ohioans. Add your name to rename Columbus, Ohio to Confluence. 22,000 signatures puts it on the ballot. | website | `/og/petition.png` (dynamic) | index, follow |
| `/sign/thank-you` | Thank You for Signing \| Confluence Ohio | — | — | — | noindex, nofollow |
| `/sign/verify` | Signature Verified \| Confluence Ohio | — | — | — | noindex, nofollow |
| `/sign/my-referrals` | Your Referral Impact \| Confluence Ohio | — | — | — | noindex, nofollow |
| `/sign/leaderboard` | Top Referrers \| Confluence Ohio | The top petition referrers helping the Confluence Ohio campaign reach the ballot. | website | `/og/default.png` (reuse) | index, follow |
| `/volunteer` | Volunteer \| Confluence Ohio | Join the Confluence Ohio campaign. Collect signatures, organize events, create content, and help build a movement. | website | `/og/volunteer.png` (static) | index, follow |
| `/donate` | Support the Campaign \| Confluence Ohio | Fund the campaign to rename Columbus to Confluence. Every dollar helps us reach 22,000 signatures and get on the ballot. | website | `/og/donate.png` (static) | index, follow |
| `/about` | About Confluence Ohio | Confluence Ohio is a 501(c)(4) civic organization led by Columbus residents. Meet the team and learn our mission. | website | `/og/about.png` (static) | index, follow |
| `/press` | Press & Media \| Confluence Ohio | Media kit, press releases, and coverage of the Confluence Ohio campaign. Press contact: press@confluenceohio.org. | website | `/og/press.png` (static) | index, follow |
| `/blog` | Blog \| Confluence Ohio | Campaign updates, historical deep dives, and community perspectives from the Confluence Ohio movement. | website | `/og/blog.png` (static) | index, follow |
| `/blog/[slug]` | {Post Title} \| Confluence Ohio | {Post meta_description or first 150 chars} | article | `/og/blog/[slug]` (dynamic) | index, follow |
| `/faq` | FAQ \| Confluence Ohio | Answers to common questions about renaming Columbus, Ohio to Confluence — process, cost, legality, timeline, and more. | website | `/og/faq.png` (static) | index, follow |
| `/privacy` | Privacy Policy \| Confluence Ohio | How Confluence Ohio collects, uses, and protects your personal information. | website | — (inherit default) | noindex, follow |
| `/terms` | Terms of Use \| Confluence Ohio | Terms of use for the Confluence Ohio website and petition. | website | — (inherit default) | noindex, follow |
| `/r/[code]` | — (301 redirect) | — | — | — | noindex, nofollow |

### 1.3 Dynamic Metadata Implementation Pattern

For pages with dynamic data (petition count, blog posts, voice stories), the `generateMetadata` function fetches the needed data at request time and returns page-specific metadata. Artifact 11 §3.4 specifies the implementations for `/sign` and `/voices/[slug]`. The same pattern applies to `/blog/[slug]`:

```typescript
// apps/web/app/blog/[slug]/page.tsx

import type { Metadata } from 'next';
import { getBlogPost } from '@repo/core/blog';
import { notFound } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) return { title: 'Post Not Found' };

  const description =
    post.meta_description || post.excerpt || '';

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.published_at,
      authors: [post.author || 'Confluence Ohio'],
      images: [
        {
          url: `/og/blog/${slug}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      title: post.title,
      description,
      images: [`/og/blog/${slug}`],
    },
  };
}
```

### 1.4 Metadata Utility for Static Pages

Static pages (most of the site) use a helper function to reduce boilerplate:

```typescript
// packages/core/seo/build-page-metadata.ts

import type { Metadata } from 'next';

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  noIndex?: boolean;
}

export function buildPageMetadata({
  title,
  description,
  path,
  ogType = 'website',
  ogImage = '/og/default.png',
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
```

**Usage in a static page:**

```typescript
// apps/web/app/the-case/page.tsx

import { buildPageMetadata } from '@repo/core/seo/build-page-metadata';

export const metadata = buildPageMetadata({
  title: 'Why Rename Columbus?',
  description:
    '7 reasons Columbus, Ohio should consider a new name — from geography to history to branding opportunity. Read the case.',
  path: '/the-case',
  ogImage: '/og/the-case.png',
});
```

---

## 2. JSON-LD Structured Data Implementation

### 2.1 Architecture

All JSON-LD is rendered server-side via a shared `<JsonLd>` component that serializes structured data into a `<script type="application/ld+json">` tag. This component is called from page components, not from `generateMetadata` (Next.js metadata does not directly output JSON-LD; it must be rendered in the component tree).

```typescript
// packages/ui/components/json-ld.tsx

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 0),
      }}
    />
  );
}
```

### 2.2 Organization Schema (Site-Wide)

Present on every page via the root layout. This is the primary entity for the campaign — it establishes the site's identity for search engines and AI answer engines.

```typescript
// packages/core/seo/schemas/organization.ts

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://confluenceohio.org/#organization',
  name: 'Confluence Ohio',
  url: 'https://confluenceohio.org',
  logo: {
    '@type': 'ImageObject',
    url: 'https://confluenceohio.org/images/logo.png',
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
```

**Rendered in root layout:**

```tsx
// apps/web/app/layout.tsx (in the component body)

import { JsonLd } from '@repo/ui/components/json-ld';
import { organizationSchema } from '@repo/core/seo/schemas/organization';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={organizationSchema} />
        {children}
      </body>
    </html>
  );
}
```

### 2.3 BreadcrumbList Schema (All Interior Pages)

Automatically generated from the URL path. Applied to every page except the homepage.

```typescript
// packages/core/seo/schemas/breadcrumb.ts

interface BreadcrumbItem {
  name: string;
  path: string;
}

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

export function buildBreadcrumbSchema(pathname: string): object | null {
  if (pathname === '/') return null; // No breadcrumbs on homepage

  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ name: 'Home', path: '/' }];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = SEGMENT_LABELS[segment] || segment;
    items.push({ name: label, path: currentPath });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://confluenceohio.org${item.path}`,
    })),
  };
}
```

**Note on dynamic slugs:** For `/blog/[slug]` and `/voices/[slug]`, the page component passes the actual post/voice title as the final breadcrumb label, overriding the segment-based default.

### 2.4 BlogPosting Schema (`/blog/[slug]`)

```typescript
// packages/core/seo/schemas/blog-posting.ts

interface BlogPostSchemaInput {
  title: string;
  description: string;
  slug: string;
  author: string;
  publishedAt: string; // ISO 8601
  modifiedAt?: string;
  ogImageUrl: string;
}

export function buildBlogPostingSchema(input: BlogPostSchemaInput): object {
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
      ...(input.author === 'Confluence Ohio' && {
        url: 'https://confluenceohio.org',
      }),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Confluence Ohio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://confluenceohio.org/images/logo.png',
      },
    },
    image: input.ogImageUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://confluenceohio.org/blog/${input.slug}`,
    },
  };
}
```

### 2.5 Article Schema (`/voices/[slug]`)

```typescript
// packages/core/seo/schemas/article.ts

interface VoiceArticleSchemaInput {
  title: string;
  description: string;
  slug: string;
  authorName: string;
  publishedAt: string;
  ogImageUrl: string;
}

export function buildVoiceArticleSchema(input: VoiceArticleSchemaInput): object {
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
        url: 'https://confluenceohio.org/images/logo.png',
      },
    },
    image: input.ogImageUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://confluenceohio.org/voices/${input.slug}`,
    },
  };
}
```

### 2.6 FAQPage Schema (`/faq`)

**Status note:** Google's March 2026 core update reduced FAQ rich result display to pages where FAQ is the primary content purpose. Since `/faq` is a dedicated FAQ page, it qualifies. Implement the schema here but **not** on other pages that contain FAQ-style content.

```typescript
// packages/core/seo/schemas/faq-page.ts

interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaqPageSchema(items: FaqItem[]): object {
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
```

**Data source:** The FAQ content comes from Artifact 01 (Messaging Framework — 20 Q&As) and Artifact 04 (page copy for `/faq`). The schema builder accepts an array, so the page component passes the Q&A data at render time.

### 2.7 Event Schema (Campaign Events)

Applied to blog posts that describe events (community forums, rallies, house parties). The blog post CMS/MDX frontmatter includes optional event fields; when present, the page renders Event schema alongside BlogPosting schema.

```typescript
// packages/core/seo/schemas/event.ts

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

export function buildEventSchema(input: EventSchemaInput): object {
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
      url: 'https://confluenceohio.org',
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: input.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
  };
}
```

### 2.8 Schema Mapping Summary

| Schema Type | Pages | Data Source | Component |
|---|---|---|---|
| Organization | All (root layout) | Static constant | `organizationSchema` in layout |
| BreadcrumbList | All except `/` | URL path + segment labels | `buildBreadcrumbSchema()` in page |
| BlogPosting | `/blog/[slug]` | Supabase `blog_posts` or MDX frontmatter | `buildBlogPostingSchema()` in page |
| Article | `/voices/[slug]` | Supabase `voice_submissions` | `buildVoiceArticleSchema()` in page |
| FAQPage | `/faq` only | FAQ content array | `buildFaqPageSchema()` in page |
| Event | `/blog/[slug]` (when event fields present) | Blog post frontmatter | `buildEventSchema()` in page |

### 2.9 Schema Validation

**Pre-launch:** Test all JSON-LD via Google's Rich Results Test (`https://search.google.com/test/rich-results`) and Schema.org validator (`https://validator.schema.org/`).

**In CI:** Add a test that renders each page, extracts `<script type="application/ld+json">` tags, parses the JSON, and asserts:
- `@context` is `https://schema.org`
- `@type` matches expected type for the route
- Required fields are present and non-empty
- URLs are absolute (start with `https://confluenceohio.org`)

---

## 3. Technical SEO

### 3.1 Sitemap Generation

Use the Next.js App Router's built-in `sitemap.ts` file convention. No external package required.

**Static + dynamic sitemap:**

```typescript
// apps/web/app/sitemap.ts

import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getAllBlogPosts } from '@repo/core/blog';

const BASE_URL = 'https://confluenceohio.org';

// Static routes with their update frequency and priority
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/the-case', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/the-case/history', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/the-case/the-rivers', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/the-case/columbus-legacy', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/the-case/precedents', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/the-case/the-process', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/voices', changeFrequency: 'daily', priority: 0.7 },
  { path: '/sign', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/sign/leaderboard', changeFrequency: 'daily', priority: 0.3 },
  { path: '/volunteer', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/donate', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/press', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.7 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
];

// Pages excluded from sitemap: /sign/thank-you, /sign/verify,
// /sign/my-referrals, /voices/share, /r/[code], /privacy, /terms

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Static pages
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Dynamic: published blog posts (from MDX files)
  // Blog content lives in content/blog/*.mdx — read frontmatter at build time
  const blogPosts = await getAllBlogPosts(); // utility from packages/core/blog
  const blogEntries: MetadataRoute.Sitemap = blogPosts
    .filter((post) => post.status === 'published')
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  // Dynamic: approved voice submissions (from Supabase)
  const { data: voices } = await supabase
    .from('voice_submissions')
    .select('slug, approved_at')
    .eq('moderation_status', 'approved')
    .order('approved_at', { ascending: false });

  const voiceEntries: MetadataRoute.Sitemap = (voices ?? []).map((voice) => ({
    url: `${BASE_URL}/voices/${voice.slug}`,
    lastModified: new Date(voice.approved_at),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...blogEntries, ...voiceEntries];
}
```

**Scaling note:** If the site exceeds 50,000 URLs (unlikely for this campaign, but possible with high voice submission volume), use `generateSitemaps()` to split into multiple sitemaps with a sitemap index. This is a future concern — the single-file approach is correct for launch.

### 3.2 Robots.txt

```typescript
// apps/web/app/robots.ts

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/sign/thank-you',
          '/sign/verify',
          '/sign/my-referrals',
          '/voices/share',
          '/r/',
          '/api/',
          '/og/',
        ],
      },
    ],
    sitemap: 'https://confluenceohio.org/sitemap.xml',
  };
}
```

**Rationale for disallowed paths:**
- `/sign/thank-you`, `/sign/verify`, `/sign/my-referrals`: Post-action pages with no SEO value
- `/voices/share`: Form page, not content
- `/r/`: Referral redirect routes — would cause duplicate content issues with `/sign`
- `/api/`: API routes should not be indexed
- `/og/`: OG image generation routes — images are served via `og:image` meta tags, not as standalone pages

### 3.3 Semantic HTML Requirements

Every page must follow this heading hierarchy and landmark structure:

**Heading hierarchy:**
- Exactly one `<h1>` per page (the page title / primary heading)
- `<h2>` for major sections
- `<h3>` for subsections within an `<h2>`
- Never skip levels (no `<h1>` → `<h3>`)

**Landmark roles:**

```html
<header role="banner">         <!-- Site header with nav -->
  <nav aria-label="Main navigation">  <!-- Primary navigation -->
  </nav>
</header>

<main id="main-content">       <!-- Main content area -->
  <article>                    <!-- For blog posts and voice stories -->
    <h1>Page Title</h1>
    <section aria-labelledby="section-heading">
      <h2 id="section-heading">Section</h2>
    </section>
  </article>
</main>

<aside aria-label="Sidebar">   <!-- Sidebar content if present -->
</aside>

<footer role="contentinfo">    <!-- Site footer -->
  <nav aria-label="Footer navigation">
  </nav>
</footer>
```

**Skip link:**

```tsx
// packages/ui/components/skip-link.tsx

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-blue-700 focus:shadow-lg focus:ring-2 focus:ring-blue-500"
    >
      Skip to main content
    </a>
  );
}
```

### 3.4 Image Optimization

All images use the Next.js `<Image>` component, which provides automatic optimization:

**Configuration:**

```typescript
// apps/web/next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
```

**Image requirements:**
- All `<Image>` components must include `alt` text (enforced via `eslint-plugin-jsx-a11y`)
- Use `priority` prop on above-the-fold hero images (LCP candidates) — no more than 1–2 per page
- Use `loading="lazy"` (default) for below-fold images
- Provide explicit `width` and `height` to prevent CLS
- Decorative images use `alt=""` (empty string, not omitted)
- AVIF preferred over WebP (smaller files, wider support as of 2026)

**Static OG images:**
- Pre-generate all static OG images at 1200×630px as PNG
- Store in `public/og/` directory
- Compress via build-time optimization (Squoosh or sharp)
- Target <300KB per image (WhatsApp rendering limit)

### 3.5 Internal Linking Strategy

Every content page must link to at least two other pages on the site. The linking follows a hub-and-spoke model:

**Hub pages** (link to all spokes in their cluster):
- `/the-case` → links to all 5 sub-pages
- `/voices` → links to featured voice stories + `/voices/share`
- `/blog` → links to all published posts (paginated)

**Spoke pages** (link back to hub + cross-link to siblings):
- Each `/the-case/*` sub-page → links to parent `/the-case` + at least 1 sibling sub-page + `/sign`
- Each `/blog/[slug]` → links to relevant `/the-case/*` pages + `/sign`
- Each `/voices/[slug]` → links to `/voices` + related voices + `/sign`

**Conversion pages** (linked from everywhere):
- `/sign` is linked from every page via the persistent mobile CTA and inline petition banners
- `/donate` is linked from `/sign/thank-you` and the footer

**Implementation:**
- `<InlinePetitionBanner>` component is placed in every content page (Artifact 02 spec)
- Blog posts include contextual links to `/the-case/*` pages within body copy
- `<RelatedPosts>` and `<RelatedVoices>` components provide automated cross-linking
- Footer navigation provides site-wide links to all major sections

**Anchor text guidelines:**
- Use descriptive anchor text (not "click here")
- Vary anchor text — don't use identical text for every link to `/sign`
- Include primary keyword in anchor text where natural (e.g., "how Columbus got its name" linking to `/the-case/history`)

### 3.6 URL Canonicalization

**Rules:**
1. All pages served over HTTPS (enforced by Vercel + Cloudflare)
2. No trailing slashes (Next.js default; `/the-case/` redirects 301 to `/the-case`)
3. No `www` prefix (`www.confluenceohio.org` redirects 301 to `confluenceohio.org`)
4. Lowercase paths only (Next.js lowercases by default)
5. Every page declares `<link rel="canonical">` via `alternates.canonical` in metadata
6. Referral URLs (`/sign?ref=CONF-XXXX`) use canonical pointing to `/sign` (the query parameter is not part of the canonical)
7. Paginated pages (`/blog?page=2`) use `rel="canonical"` pointing to themselves (each page is a distinct URL)

**Redirect configuration:**

```typescript
// apps/web/next.config.ts (addition to config)

const nextConfig: NextConfig = {
  // ... image config above
  async redirects() {
    return [
      // www → non-www (belt-and-suspenders; Cloudflare handles this primarily)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.confluenceohio.org' }],
        destination: 'https://confluenceohio.org/:path*',
        permanent: true,
      },
      // Common misspellings / alternate paths
      {
        source: '/petition',
        destination: '/sign',
        permanent: true,
      },
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
      {
        source: '/debate',
        destination: '/voices',
        permanent: true,
      },
      {
        source: '/community',
        destination: '/voices',
        permanent: true,
      },
    ];
  },
};
```

### 3.7 Trailing Slash and HSTS Configuration

**HSTS header** via Cloudflare or Vercel `headers` config:

```typescript
// apps/web/next.config.ts (addition)

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

---

## 4. Performance

### 4.1 Performance Budget

| Metric | Target | Measurement Tool |
|---|---|---|
| Lighthouse Performance | ≥ 90 | Lighthouse CI in GitHub Actions |
| Lighthouse Accessibility | ≥ 95 | Lighthouse CI |
| Lighthouse Best Practices | ≥ 90 | Lighthouse CI |
| Lighthouse SEO | ≥ 95 | Lighthouse CI |
| Largest Contentful Paint (LCP) | < 2.5s | Vercel Analytics (field) + Lighthouse (lab) |
| Interaction to Next Paint (INP) | < 200ms | Vercel Analytics (field) |
| Cumulative Layout Shift (CLS) | < 0.1 | Vercel Analytics (field) + Lighthouse (lab) |
| Total page weight (initial) | < 500KB | Webpack Bundle Analyzer |
| JavaScript bundle (compressed) | < 200KB | `next build` output analysis |
| Time to First Byte (TTFB) | < 800ms | Vercel Analytics |

### 4.2 Font Optimization

The campaign uses two typefaces: **Inter** (body text, UI, form labels) and **Source Serif 4** (headings, hero text, pull quotes). Both are loaded via `next/font/google`, which self-hosts at build time, eliminates external requests, and prevents layout shift.

**Why Source Serif 4:** Source Serif and Inter share proportional DNA — both were designed systematically for screen reading, with compatible x-heights and apertures. Source Serif 4 (the latest version of Source Serif Pro) brings transitional serif authority to headlines while Inter provides neutral utility in body copy. The pairing reads as credible and civic without being cold or academic — aligned with the campaign's "neighbor who has done their homework" voice. Source Serif 4 is a variable font, so a single file covers all weights (~120KB).

```typescript
// apps/web/app/fonts.ts

import { Inter, Source_Serif_4 } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  // Variable font — single file covers all weights
});

export const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  // Variable font — covers 200–900 weights
  // Only used for headings, so preloading is worth the ~120KB cost
});
```

**Usage in root layout:**

```tsx
// apps/web/app/layout.tsx

import { inter, sourceSerif } from './fonts';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="font-sans">
        {/* ... */}
      </body>
    </html>
  );
}
```

**Tailwind config:**

```typescript
// apps/web/tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
      },
    },
  },
};

export default config;
```

**Usage in components:**

```tsx
// Headings use the serif font
<h1 className="font-heading text-4xl font-bold">
  Where the Rivers Meet
</h1>

// Body text uses the sans-serif font (default)
<p className="text-lg">
  Columbus sits at the confluence of the Scioto and Olentangy rivers...
</p>

// Pull quotes use the serif font
<blockquote className="font-heading text-2xl italic">
  "The name was chosen in a tavern in 1812."
</blockquote>
```

**Font application rules:**
- `font-heading` (Source Serif 4): H1, H2, hero headlines, pull quotes, campaign manifesto text, signature counter number
- `font-sans` (Inter): Everything else — body text, navigation, form labels, buttons, meta text, footer
- Never mix fonts within a single heading or paragraph

### 4.3 Bundle Analysis and Code Splitting

**Analysis tooling:**

```bash
# Add to package.json scripts
"analyze": "ANALYZE=true next build"
```

```typescript
// apps/web/next.config.ts (conditional analyzer)

import withBundleAnalyzer from '@next/bundle-analyzer';

const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

export default config;
```

**Code splitting strategy:**

1. **Route-based splitting** (automatic): Each page in the App Router is a separate chunk. The petition form, volunteer form, and donation page each load independently.

2. **Component-level lazy loading** for heavy components:

```typescript
// Lazy-load non-critical, JS-heavy components
import dynamic from 'next/dynamic';

// Confetti animation on thank-you page — not needed at initial paint
const ConfettiCanvas = dynamic(
  () => import('@repo/ui/components/confetti-canvas'),
  { ssr: false }
);

// Rich text editor for voice submissions — loaded on /voices/share only
const RichTextArea = dynamic(
  () => import('@repo/ui/components/rich-text-area'),
  { ssr: false, loading: () => <textarea placeholder="Share your perspective..." /> }
);

// Smarty autocomplete SDK — loaded when address field is focused
const AddressAutocomplete = dynamic(
  () => import('@repo/ui/components/address-autocomplete'),
  { ssr: false }
);
```

3. **Third-party script loading** via `next/script`:

```tsx
import Script from 'next/script';

// PostHog — defer until after hydration
<Script
  src="https://us.i.posthog.com/static/array.js"
  strategy="afterInteractive"
/>

// Cloudflare Turnstile — load only on pages with forms
// (petition, volunteer, voices/share)
<Script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  strategy="lazyOnload"
/>
```

### 4.4 Edge Caching Strategy

| Route Type | Caching Strategy | Cache-Control |
|---|---|---|
| Static pages (`/the-case/*`, `/about`, `/faq`, etc.) | ISR with long revalidation | `s-maxage=86400, stale-while-revalidate=604800` |
| Homepage (`/`) | ISR, short revalidation (signature counter) | `s-maxage=60, stale-while-revalidate=300` |
| Petition page (`/sign`) | ISR, short revalidation | `s-maxage=60, stale-while-revalidate=300` |
| Blog index (`/blog`) | ISR | `s-maxage=3600, stale-while-revalidate=86400` |
| Blog posts (`/blog/[slug]`) | ISR | `s-maxage=3600, stale-while-revalidate=86400` |
| Voice stories (`/voices/[slug]`) | ISR | `s-maxage=3600, stale-while-revalidate=86400` |
| Dynamic OG images (`/og/*`) | Edge-cached per Artifact 11 §3.5 | Varies: 5min (petition), 1hr (voice), 24hr (blog) |
| API routes (`/api/*`) | No cache | `no-store` |
| Static assets (`/images/*`, fonts, CSS, JS) | Immutable | `public, max-age=31536000, immutable` |

**Implementation via Next.js route segment config:**

```typescript
// apps/web/app/the-case/history/page.tsx
export const revalidate = 86400; // Revalidate once per day

// apps/web/app/page.tsx (homepage)
export const revalidate = 60; // Revalidate every minute

// apps/web/app/sign/page.tsx
export const revalidate = 60;
```

### 4.5 Streaming SSR and Suspense

Use React Suspense boundaries to stream non-critical content while showing the main page shell immediately:

```tsx
// apps/web/app/page.tsx (homepage)

import { Suspense } from 'react';

export default function HomePage() {
  return (
    <main id="main-content">
      {/* Critical: renders immediately */}
      <HeroSection />
      <ThirtySecondCase />

      {/* Non-critical: streams in after initial paint */}
      <Suspense fallback={<SignatureCounterSkeleton />}>
        <SignatureCounter />
      </Suspense>

      <Suspense fallback={<RecentSignersSkeleton />}>
        <RecentSignersFeed />
      </Suspense>

      <ArgumentCards />

      <Suspense fallback={<FeaturedVoiceSkeleton />}>
        <FeaturedVoice />
      </Suspense>

      <Suspense fallback={null}>
        <LatestBlogPost />
      </Suspense>

      <EmailSignupInline />
    </main>
  );
}
```

**Skeleton components** should match the final layout dimensions exactly to prevent CLS. Each skeleton uses CSS animation (no JS) for a shimmer effect.

### 4.6 Lighthouse CI Configuration

```yaml
# .lighthouserc.yml

ci:
  collect:
    url:
      - https://confluenceohio.org/
      - https://confluenceohio.org/sign
      - https://confluenceohio.org/the-case
      - https://confluenceohio.org/the-case/history
      - https://confluenceohio.org/the-case/the-rivers
      - https://confluenceohio.org/voices
      - https://confluenceohio.org/blog
      - https://confluenceohio.org/faq
      - https://confluenceohio.org/volunteer
      - https://confluenceohio.org/donate
    numberOfRuns: 3
    settings:
      preset: desktop
      chromeFlags: '--no-sandbox'
  assert:
    assertions:
      categories:performance:
        - error
        - minScore: 0.9
      categories:accessibility:
        - error
        - minScore: 0.95
      categories:best-practices:
        - error
        - minScore: 0.9
      categories:seo:
        - error
        - minScore: 0.95
      # Core Web Vitals
      largest-contentful-paint:
        - warn
        - maxNumericValue: 2500
      cumulative-layout-shift:
        - error
        - maxNumericValue: 0.1
      interactive:
        - warn
        - maxNumericValue: 3800
  upload:
    target: temporary-public-storage
```

**GitHub Actions integration:**

```yaml
# .github/workflows/lighthouse.yml

name: Lighthouse CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: .lighthouserc.yml
          uploadArtifacts: true
```

---

## Claude Code Handoff

### Handoff Prompt 1: SEO Utility Components and Meta Tag Infrastructure

```
You are implementing the SEO infrastructure for the Confluence Ohio campaign site. Read these artifacts for context:
- docs/12-seo-structured-data.md (this artifact — full spec)
- docs/03-content-strategy-seo.md (keyword assignments, schema plan)
- docs/02-site-architecture.md (page inventory, URL scheme)
- docs/11-social-sharing-referral-tracking.md (OG image implementations — §3)

Implement the following files:

1. `packages/core/seo/build-page-metadata.ts` — Metadata utility per §1.4. Accepts title, description, path, ogType, ogImage, noIndex. Returns a Next.js Metadata object with openGraph, twitter, alternates.canonical, and robots fields.

2. `packages/ui/components/json-ld.tsx` — JSON-LD rendering component per §2.1. Accepts a data object, renders it as <script type="application/ld+json">.

3. `packages/ui/components/skip-link.tsx` — Skip-to-content link per §3.3. Visually hidden, visible on focus, links to #main-content. Use Tailwind sr-only and focus:not-sr-only classes.

4. Update `apps/web/app/layout.tsx`:
   - Import and apply both fonts via next/font/google per §4.2: Inter (--font-inter) for body and Source Serif 4 (--font-heading) for headings. Both variable fonts, swap display.
   - Apply both CSS variable classes to <html>: `${inter.variable} ${sourceSerif.variable}`
   - Set the base metadata per §1.1 (metadataBase, default title with template, description, openGraph defaults, twitter defaults, robots, google verification, bing verification)
   - Render the Organization JSON-LD schema per §2.2
   - Render the SkipLink component

5. Apply `buildPageMetadata()` to ALL static pages listed in §1.2. Each page's metadata should match the exact title, description, path, ogType, ogImage, and robots values from the table. Pages to update:
   /the-case, /the-case/history, /the-case/the-rivers, /the-case/columbus-legacy, /the-case/precedents, /the-case/the-process, /voices, /voices/share (noIndex), /sign, /volunteer, /donate, /about, /press, /blog, /faq, /privacy (noIndex), /terms (noIndex)

All code should be TypeScript strict mode. Write unit tests for buildPageMetadata in packages/core/seo/__tests__/build-page-metadata.test.ts.
```

### Handoff Prompt 2: JSON-LD Schema Builders

```
You are implementing structured data (JSON-LD) for the Confluence Ohio campaign site. Read Artifact 12 §2.1–§2.9 for the full specification.

Implement:

1. `packages/core/seo/schemas/organization.ts` — Organization schema constant per §2.2. Includes @id, name, url, logo (ImageObject), description, nonprofitStatus (Nonprofit501c4), foundingDate, address, areaServed (Ohio), contactPoint, sameAs.

2. `packages/core/seo/schemas/breadcrumb.ts` — BreadcrumbList generator per §2.3. Exports buildBreadcrumbSchema(pathname: string) that reads URL segments, maps them to labels via SEGMENT_LABELS, and returns the BreadcrumbList schema. Returns null for '/'. Accept an optional override label for the final segment (for dynamic routes with titles).

3. `packages/core/seo/schemas/blog-posting.ts` — BlogPosting schema builder per §2.4. Accepts title, description, slug, author, publishedAt, modifiedAt, ogImageUrl. Author type is Organization when name is "Confluence Ohio", otherwise Person.

4. `packages/core/seo/schemas/article.ts` — Article schema builder per §2.5 for voice stories. Accepts title, description, slug, authorName, publishedAt, ogImageUrl.

5. `packages/core/seo/schemas/faq-page.ts` — FAQPage schema builder per §2.6. Accepts array of {question, answer} objects.

6. `packages/core/seo/schemas/event.ts` — Event schema builder per §2.7. Accepts name, description, startDate, endDate, venueName, addressLocality, url, isOnline. Returns VirtualLocation or Place based on isOnline flag.

7. `packages/core/seo/schemas/index.ts` — Barrel export for all schema builders.

Write comprehensive unit tests in packages/core/seo/schemas/__tests__/ for each builder. Tests should verify:
- @context is "https://schema.org"
- @type matches expected type
- All required fields are present
- URLs are absolute
- Breadcrumb positions are sequential starting at 1
- Organization author type logic works correctly
- Event location type switches between VirtualLocation and Place
```

### Handoff Prompt 3: Sitemap and Robots.txt

```
You are implementing sitemap and robots.txt generation for the Confluence Ohio site using Next.js App Router built-in file conventions. Read Artifact 12 §3.1–§3.2.

Implement:

1. `apps/web/app/sitemap.ts` — Dynamic sitemap per §3.1. Exports a default async function returning MetadataRoute.Sitemap. Includes:
   - All static routes from STATIC_ROUTES array with their changeFrequency and priority values (exact values in spec)
   - Dynamic blog posts from MDX files via `getAllBlogPosts()` from `@repo/core/blog` (status=published), using publishedAt/updatedAt for lastModified
   - Dynamic voice submissions from Supabase voice_submissions table (moderation_status=approved), using approved_at for lastModified
   - Does NOT include: /sign/thank-you, /sign/verify, /sign/my-referrals, /voices/share, /r/*, /privacy, /terms

2. `apps/web/app/robots.ts` — Robots.txt per §3.2. Exports a default function returning MetadataRoute.Robots. Disallow: /sign/thank-you, /sign/verify, /sign/my-referrals, /voices/share, /r/, /api/, /og/. Include sitemap URL.

3. URL redirect configuration in `apps/web/next.config.ts` — Add the redirects per §3.6:
   - /petition → /sign (301)
   - /the-case/rivers → /the-case/the-rivers (301)
   - /the-case/process → /the-case/the-process (301)
   - /debate → /voices (301)
   - /community → /voices (301)

4. Security and cache headers in `apps/web/next.config.ts` per §3.7:
   - HSTS: max-age=63072000; includeSubDomains; preload
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - Referrer-Policy: strict-origin-when-cross-origin

Write an integration test that:
- Verifies /sitemap.xml returns valid XML with all expected static URLs
- Verifies /robots.txt contains the correct disallow rules and sitemap reference
- Verifies all redirect paths return 301 status codes
```

### Handoff Prompt 4: Performance Configuration

```
You are implementing performance optimization for the Confluence Ohio site. Read Artifact 12 §4.1–§4.6.

Implement:

1. Font configuration in `apps/web/app/fonts.ts` per §4.2:
   - Import Inter from next/font/google as a variable font (--font-inter, swap display, latin subset)
   - Import Source_Serif_4 from next/font/google as a variable font (--font-heading, swap display, latin subset)
   - Export both font objects

2. Tailwind font config in `apps/web/tailwind.config.ts` per §4.2:
   - Extend fontFamily.sans to use var(--font-inter) with system-ui fallback
   - Add fontFamily.heading using var(--font-heading) with Georgia serif fallback
   - Apply font-heading to all H1, H2 elements, pull quotes, and hero headlines

3. Bundle analyzer integration per §4.3:
   - Install @next/bundle-analyzer
   - Conditional activation via ANALYZE=true environment variable
   - Add "analyze" script to package.json

4. Next.js Image configuration in `apps/web/next.config.ts` per §3.4:
   - formats: ['image/avif', 'image/webp']
   - deviceSizes and imageSizes arrays as specified
   - 30-day minimum cache TTL
   - Remote pattern for Supabase storage

5. Route segment caching via revalidate exports per §4.4:
   - Static pages: revalidate = 86400 (daily)
   - Homepage and /sign: revalidate = 60
   - Blog index: revalidate = 3600
   - Blog posts and voice stories: revalidate = 3600

6. Suspense boundaries on the homepage per §4.5:
   - Wrap SignatureCounter, RecentSignersFeed, FeaturedVoice, LatestBlogPost in Suspense with skeleton fallbacks
   - Create skeleton components (SignatureCounterSkeleton, RecentSignersSkeleton, FeaturedVoiceSkeleton) that match final dimensions to prevent CLS

7. Lighthouse CI configuration:
   - `.lighthouserc.yml` per §4.6 (10 URLs, 3 runs, performance ≥0.9, accessibility ≥0.95, best-practices ≥0.9, seo ≥0.95)
   - `.github/workflows/lighthouse.yml` per §4.6 (runs on PR to main and push to main)

8. Third-party script loading per §4.3:
   - PostHog: afterInteractive strategy
   - Cloudflare Turnstile: lazyOnload strategy, only on form pages

Ensure all lazy-loaded components have proper loading fallbacks and that ssr: false is used only where truly needed (confetti, rich text editor, address autocomplete).
```

### Handoff Prompt 5: JSON-LD Integration Tests and Schema Validation

```
You are adding integration tests to validate structured data across the Confluence Ohio site. Read Artifact 12 §2.9.

Implement:

1. `apps/web/__tests__/json-ld-validation.test.ts` — Test suite that:
   - Fetches HTML from every key page: /, /the-case, /the-case/history, /the-case/the-rivers, /the-case/columbus-legacy, /the-case/precedents, /the-case/the-process, /voices, /sign, /volunteer, /donate, /about, /press, /blog, /faq
   - Extracts all <script type="application/ld+json"> tags from the HTML
   - Parses the JSON and validates:
     a. Every page has Organization schema (from root layout)
     b. All interior pages have BreadcrumbList schema
     c. @context is "https://schema.org" on all schemas
     d. @type matches expected type for the route (per §2.8 mapping table)
     e. All URL values start with "https://confluenceohio.org"
     f. BreadcrumbList positions are sequential starting at 1
     g. Organization schema includes name, url, logo, nonprofitStatus
   - For /faq specifically: validates FAQPage schema has at least 15 Question items (from Artifact 01)

2. `apps/web/__tests__/meta-tags-validation.test.ts` — Test suite that:
   - Fetches HTML from every indexable page
   - Validates presence and non-emptiness of: <title>, meta description, canonical URL, og:title, og:description, og:image, og:url, og:type, twitter:card, twitter:site
   - Validates canonical URLs are absolute and use https
   - Validates og:image URLs return 200
   - For noindex pages (/sign/thank-you, /sign/verify, /privacy, /terms): validates robots meta contains "noindex"

3. `apps/web/__tests__/sitemap-validation.test.ts` — Test suite that:
   - Fetches /sitemap.xml
   - Validates it's well-formed XML
   - Validates all static pages from §3.1 STATIC_ROUTES are present
   - Validates no disallowed pages appear (/sign/thank-you, /sign/verify, /r/, /api/, /og/)
   - Validates all URLs are absolute and use https

Use the project's existing test framework. Run against the dev server. Include in CI pipeline.
```

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **Display / heading font.** ✅ **Source Serif 4** added as the display/heading font. Used for H1, H2, hero headlines, pull quotes, and the signature counter number. Inter remains the body/UI font. Both loaded via `next/font/google` as variable fonts. Total additional font weight: ~120KB. See §4.2 for full configuration.

2. **Google Search Console.** ✅ `confluenceohio.org` is already verified in GSC. The `GOOGLE_SITE_VERIFICATION` env var will be populated from Tim's GSC account during deployment (Prompt 16).

3. **Bing Webmaster Tools.** ✅ Included. Bing verification meta tag added to base metadata via `verification.other['msvalidate.01']` (§1.1). The `BING_SITE_VERIFICATION` env var is added to the deployment checklist. Bing Webmaster Tools also feeds DuckDuckGo and Yahoo search results.

4. **`press@confluenceohio.org`.** ✅ Added to the **Prompt 16 deployment checklist** as a pre-launch email configuration item. The meta description for `/press` retains this address.

5. **Blog content source.** ✅ **MDX for launch.** Blog posts live in `content/blog/*.mdx` with frontmatter (title, slug, meta_description, author, publishedAt, updatedAt, status, ogImage). The sitemap reads MDX frontmatter via `getAllBlogPosts()` from `@repo/core/blog`. The Supabase `blog_posts` table remains in the schema (Artifact 05) for a potential Phase 2 CMS migration but is not used at launch. Voice submissions remain in Supabase.

---

## Technical Notes and Design Decisions

1. **Why built-in sitemap over `next-sitemap`.** The `next-sitemap` package was designed for the Pages Router era. Next.js App Router's `sitemap.ts` convention is more idiomatic, runs at request time (supporting dynamic data without a build step), and has zero external dependencies. It also integrates with Next.js caching (`revalidate`) automatically.

2. **Why INP instead of FID.** Google replaced FID with INP as a Core Web Vital on March 12, 2024. INP measures responsiveness across all interactions (not just the first), with a "good" threshold of <200ms. Since the campaign site is content-heavy with few complex interactions, INP should be easily achievable. The petition form's Smarty autocomplete is the riskiest interaction — test it specifically.

3. **Why AVIF before WebP in image formats.** AVIF produces 20–50% smaller files than WebP at equivalent quality. Browser support is now >95% globally. Listing AVIF first means the `<Image>` component serves AVIF where supported and falls back to WebP for the remainder.

4. **Why noindex on `/voices/share`.** The submission form page has no content value for search engines. Indexing it would dilute the site's crawl budget and could confuse searchers expecting to read perspectives (they should land on `/voices`).

5. **Why Lighthouse ≥95 for accessibility and SEO.** The project instructions specify ≥90 for all metrics. We raise the bar for accessibility (WCAG 2.1 AA is a hard requirement) and SEO (the entire campaign depends on organic visibility). Performance at ≥90 allows headroom for real-world variation (third-party scripts, cold starts).

6. **Schema and AI citation.** Google's Gemini-powered AI Mode uses structured data to verify entity relationships and assess source credibility. Accurate Organization schema (with `nonprofitStatus`, `areaServed`, `sameAs`) increases the probability that AI answer engines cite confluenceohio.org when synthesizing answers about Columbus renaming — even when no traditional rich result is displayed.
