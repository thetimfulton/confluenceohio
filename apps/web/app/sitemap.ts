import type { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/service';
import { getBlogPosts } from '@/lib/mdx';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

// Static routes with update frequency and priority (Artifact 12 §3.1)
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/the-case', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/the-case/history', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/the-case/the-rivers', changeFrequency: 'monthly', priority: 0.8 },
  {
    path: '/the-case/columbus-legacy',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  { path: '/the-case/precedents', changeFrequency: 'monthly', priority: 0.8 },
  {
    path: '/the-case/the-process',
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  { path: '/voices', changeFrequency: 'daily', priority: 0.7 },
  { path: '/sign', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/volunteer', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/donate', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/press', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.7 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
];

// Excluded from sitemap: /sign/thank-you, /sign/verify/*,
// /voices/share, /r/[code], /privacy, /terms, /admin/*

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Dynamic: published blog posts from MDX files
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const blogPosts = await getBlogPosts();
    blogEntries = blogPosts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // Blog content may not exist yet
  }

  // Dynamic: approved voice submissions from Supabase
  let voiceEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceClient();
    const { data: voices } = await supabase
      .from('voice_submissions')
      .select('slug, approved_at')
      .in('moderation_status', ['approved', 'auto_approved'])
      .order('approved_at', { ascending: false });

    voiceEntries = (voices ?? []).map((voice) => ({
      url: `${BASE_URL}/voices/${voice.slug}`,
      lastModified: new Date(voice.approved_at),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
  } catch {
    // Supabase may not be configured in all environments
  }

  return [...staticEntries, ...blogEntries, ...voiceEntries];
}
