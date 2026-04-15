import Link from 'next/link';
import type { BlogPostMeta } from '@/lib/mdx';

interface RelatedPostsProps {
  posts: BlogPostMeta[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section aria-label="Related posts">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Related Posts</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs text-gray-500">
              {formatDate(post.date)}
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900 group-hover:text-blue-600">
              {post.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              {post.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
