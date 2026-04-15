import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getBlogPost, getAllSlugs, getRelatedPosts } from '@/lib/mdx';
import { mdxComponents } from '@/components/mdx';
import { ShareButtonsDynamic } from '@/components/blog/ShareButtonsDynamic';
import { AuthorBio } from '@/components/blog/AuthorBio';
import { RelatedPosts } from '@/components/blog/RelatedPosts';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { blogPostingSchema, breadcrumbSchema } from '@/lib/schema';

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

// ---------------------------------------------------------------------------
// Metadata — post-specific OG tags, JSON-LD via generateMetadata
// ---------------------------------------------------------------------------

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://confluenceohio.org';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: 'Post Not Found' };

  // Use dynamic OG image route, falling back to post-specific ogImage if set
  const ogParams = new URLSearchParams({
    type: 'blog',
    title: post.title,
    subtitle: `By ${post.author} · ${new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
  });
  const dynamicOgUrl = `/api/og?${ogParams.toString()}`;

  // Prefer post-specific ogImage if it exists and isn't a placeholder
  const ogImageUrl = post.ogImage && !post.ogImage.includes('placeholder')
    ? (post.ogImage.startsWith('/') ? `${SITE_URL}${post.ogImage}` : post.ogImage)
    : `${SITE_URL}${dynamicOgUrl}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      title: `${post.title} — Confluence Ohio`,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: 'article',
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author],
      siteName: 'Confluence Ohio',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@confluenceohio',
      title: `${post.title} — Confluence Ohio`,
      description: post.description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const relatedPosts = await getRelatedPosts(slug, post.keywords);

  return (
    <>
      <JsonLd
        data={blogPostingSchema({
          title: post.title,
          description: post.description,
          slug: post.slug,
          author: post.author,
          publishedAt: new Date(post.date).toISOString(),
          modifiedAt: new Date(post.date).toISOString(),
          ogImageUrl: post.ogImage.startsWith('/')
            ? `${SITE_URL}${post.ogImage}`
            : post.ogImage,
        })}
      />
      <JsonLd data={breadcrumbSchema(`/blog/${post.slug}`, post.title)!} />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* ─── Breadcrumb nav ─── */}
        <nav className="mb-8 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-gray-700">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/blog" className="hover:text-gray-700">
                Blog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-gray-900" aria-current="page">
              {post.title}
            </li>
          </ol>
        </nav>

        {/* ─── Article header ─── */}
        <header className="mb-8">
          <p className="mb-3 text-sm text-gray-500">
            {formatDate(post.date)} &middot; {post.readingTime}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {post.title}
          </h1>
        </header>

        {/* ─── Author ─── */}
        <div className="mb-8">
          <AuthorBio name={post.author} />
        </div>

        {/* ─── Article body ─── */}
        <article className="prose-confluence">
          <MDXRemote source={post.content} components={mdxComponents} />
        </article>

        {/* ─── Share buttons ─── */}
        <div className="mt-10 border-t border-gray-200 pt-6">
          <ShareButtonsDynamic
            title={post.title}
            slug={post.slug}
            description={post.description}
          />
        </div>

        {/* ─── Petition CTA ─── */}
        <div className="mt-10">
          <InlinePetitionBanner />
        </div>

        {/* ─── Related posts ─── */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 border-t border-gray-200 pt-10">
            <RelatedPosts posts={relatedPosts} />
          </div>
        )}
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
