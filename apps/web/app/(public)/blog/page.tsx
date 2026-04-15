import Link from 'next/link';
import { getBlogPosts } from '@/lib/mdx';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

// ---------------------------------------------------------------------------
// ISR — revalidate every 60s for new blog posts (Artifact 14 §2.4)
// ---------------------------------------------------------------------------

export const revalidate = 60;

// ---------------------------------------------------------------------------
// SEO — Artifact 12 §1.2
// ---------------------------------------------------------------------------

export const metadata = buildPageMetadata({
  title: 'Blog',
  description:
    'Campaign updates, historical deep dives, and community perspectives from the Confluence Ohio movement.',
  path: '/blog',
  ogImage: '/images/og/blog.png',
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSTS_PER_PAGE = 9;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const allPosts = await getBlogPosts();
  const totalPages = Math.max(1, Math.ceil(allPosts.length / POSTS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);

  const start = (page - 1) * POSTS_PER_PAGE;
  const posts = allPosts.slice(start, start + POSTS_PER_PAGE);

  // Featured post (first post on first page only)
  const featured = page === 1 && posts.length > 0 ? posts[0] : null;
  const gridPosts = page === 1 ? posts.slice(1) : posts;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema('/blog')!} />
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Blog
      </h1>
      <p className="mb-10 text-lg text-gray-600">
        Campaign updates, historical context, and community perspectives.
      </p>

      {/* ─── Featured post (page 1 only) ─── */}
      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group mb-10 block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8"
        >
          <p className="text-sm text-gray-500">
            {formatDate(featured.date)} &middot; {featured.readingTime}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 group-hover:text-blue-600 sm:text-3xl">
            {featured.title}
          </h2>
          <p className="mt-3 text-base text-gray-600">
            {featured.description}
          </p>
          <p className="mt-4 text-sm font-semibold text-blue-600">
            Read more &rarr;
          </p>
        </Link>
      )}

      {/* ─── Post grid ─── */}
      {gridPosts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gridPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="text-xs text-gray-500">
                {formatDate(post.date)} &middot; {post.readingTime}
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900 group-hover:text-blue-600">
                {post.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                {post.description}
              </p>
              <p className="mt-3 text-sm font-semibold text-blue-600">
                Read more &rarr;
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* ─── Empty state ─── */}
      {allPosts.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-base text-gray-600">
            No posts yet. Check back soon for campaign updates.
          </p>
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <nav
          className="mt-10 flex items-center justify-center gap-4"
          aria-label="Blog pagination"
        >
          {page > 1 && (
            <Link
              href={page === 2 ? '/blog' : `/blog?page=${page - 1}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              &larr; Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/blog?page=${page + 1}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Next &rarr;
            </Link>
          )}
        </nav>
      )}

      {/* ─── Petition CTA ─── */}
      <div className="mt-12">
        <InlinePetitionBanner />
      </div>
    </main>
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
