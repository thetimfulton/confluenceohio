import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlogPostFrontmatter {
  title: string;
  slug: string;
  date: string;
  author: string;
  description: string;
  keywords: string[];
  ogImage: string;
}

export interface BlogPostMeta extends BlogPostFrontmatter {
  readingTime: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const BLOG_DIR = path.join(process.cwd(), '..', '..', 'content', 'blog');

// ---------------------------------------------------------------------------
// getBlogPosts — returns all published posts, sorted newest-first
// ---------------------------------------------------------------------------

export async function getBlogPosts(): Promise<BlogPostMeta[]> {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));

  const posts: BlogPostMeta[] = files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
      const { data, content } = matter(raw);
      const fm = data as BlogPostFrontmatter;
      const stats = readingTime(content);

      return {
        ...fm,
        readingTime: stats.text,
      };
    })
    // Only include posts with publishedAt <= now
    .filter((post) => new Date(post.date) <= new Date());

  // Sort newest-first
  posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return posts;
}

// ---------------------------------------------------------------------------
// getBlogPost — returns a single post by slug (content + frontmatter)
// ---------------------------------------------------------------------------

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  if (!fs.existsSync(BLOG_DIR)) return null;

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));

  for (const filename of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
    const { data, content } = matter(raw);
    const fm = data as BlogPostFrontmatter;

    if (fm.slug === slug) {
      const stats = readingTime(content);
      return {
        ...fm,
        readingTime: stats.text,
        content,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// getAllSlugs — for generateStaticParams
// ---------------------------------------------------------------------------

export async function getAllSlugs(): Promise<string[]> {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));

  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
    const { data } = matter(raw);
    return (data as BlogPostFrontmatter).slug;
  });
}

// ---------------------------------------------------------------------------
// getRelatedPosts — returns up to 3 posts sharing keywords with the given post
// ---------------------------------------------------------------------------

export async function getRelatedPosts(
  currentSlug: string,
  keywords: string[],
  limit = 3,
): Promise<BlogPostMeta[]> {
  const allPosts = await getBlogPosts();
  const other = allPosts.filter((p) => p.slug !== currentSlug);

  // Score by number of shared keywords
  const scored = other.map((post) => {
    const shared = post.keywords.filter((k) =>
      keywords.some(
        (ck) => ck.toLowerCase() === k.toLowerCase(),
      ),
    ).length;
    return { post, shared };
  });

  scored.sort((a, b) => b.shared - a.shared);

  // If not enough keyword matches, fill with most recent posts
  return scored.slice(0, limit).map((s) => s.post);
}
