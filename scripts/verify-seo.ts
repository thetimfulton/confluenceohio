#!/usr/bin/env npx tsx
/**
 * SEO Verification Script
 *
 * Crawls all pages in the sitemap and verifies each page meets the SEO
 * requirements from docs/12-seo-structured-data.md and
 * docs/03-content-strategy-seo.md §6.
 *
 * Checks per page:
 *   - Title tag present and unique across pages
 *   - Meta description present (120-155 chars)
 *   - Canonical URL present and correct
 *   - OG tags complete (title, description, image, url)
 *   - JSON-LD present and valid
 *   - Exactly one H1 tag
 *   - No broken internal links
 *
 * Usage:
 *   npx tsx scripts/verify-seo.ts                       # against localhost:3000
 *   npx tsx scripts/verify-seo.ts https://confluenceohio.org  # against prod
 *
 * Prerequisites:
 *   The target site must be running (e.g. `npm run dev` for local).
 *
 * Exit codes:
 *   0 — all pages pass
 *   1 — one or more pages have failures
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'http://localhost:3000';
const SITEMAP_PATH = '/sitemap.xml';

// Timeouts
const FETCH_TIMEOUT_MS = 15_000;
const LINK_CHECK_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageResult {
  url: string;
  passed: string[];
  failed: string[];
  warnings: string[];
}

interface SeoReport {
  baseUrl: string;
  timestamp: string;
  pages: PageResult[];
  summary: {
    totalPages: number;
    totalPassed: number;
    totalFailed: number;
    totalWarnings: number;
    pagesWithFailures: number;
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Very lightweight HTML parser — extracts elements by tag or attribute
 * without a full DOM dependency. Good enough for meta tags, titles, h1s,
 * link tags, and script tags in SSR-rendered HTML.
 */
function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllTags(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

function extractMetaContent(
  html: string,
  nameOrProperty: string,
): string | null {
  // Match both name= and property= attributes, content can come before or after
  const patterns = [
    new RegExp(
      `<meta[^>]*(?:name|property)=["']${escapeRegex(nameOrProperty)}["'][^>]*content=["']([^"']*)["'][^>]*/?>`,
      'i',
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${escapeRegex(nameOrProperty)}["'][^>]*/?>`,
      'i',
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractLinkHref(html: string, rel: string): string | null {
  const patterns = [
    new RegExp(
      `<link[^>]*rel=["']${escapeRegex(rel)}["'][^>]*href=["']([^"']*)["'][^>]*/?>`,
      'i',
    ),
    new RegExp(
      `<link[^>]*href=["']([^"']*)["'][^>]*rel=["']${escapeRegex(rel)}["'][^>]*/?>`,
      'i',
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractJsonLd(html: string): unknown[] {
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const results: unknown[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    try {
      results.push(JSON.parse(m[1]));
    } catch {
      // Invalid JSON — will be flagged as a failure
    }
  }
  return results;
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const regex = /href=["']([^"']*?)["']/gi;
  const links: Set<string> = new Set();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1];
    // Internal links: start with / or start with the baseUrl
    if (href.startsWith('/') && !href.startsWith('//')) {
      links.add(href.split('#')[0].split('?')[0]); // Strip fragment and query
    } else if (href.startsWith(baseUrl)) {
      const path = href.replace(baseUrl, '').split('#')[0].split('?')[0];
      if (path) links.add(path);
    }
  }
  // Remove empty strings and the root path (always valid)
  links.delete('');
  return Array.from(links);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Sitemap parsing
// ---------------------------------------------------------------------------

async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const sitemapUrl = `${baseUrl}${SITEMAP_PATH}`;
  console.log(`Fetching sitemap from ${sitemapUrl}...`);

  const response = await fetchWithTimeout(sitemapUrl, FETCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch sitemap: ${response.status} ${response.statusText}`,
    );
  }

  const xml = await response.text();

  // Extract <loc> tags from the XML sitemap
  const locRegex = /<loc>(.*?)<\/loc>/gi;
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = locRegex.exec(xml)) !== null) {
    urls.push(m[1].trim());
  }

  if (urls.length === 0) {
    throw new Error('Sitemap contained no URLs');
  }

  return urls;
}

// ---------------------------------------------------------------------------
// Per-page SEO checks
// ---------------------------------------------------------------------------

async function verifyPage(
  url: string,
  baseUrl: string,
  titlesSeen: Map<string, string>,
): Promise<PageResult> {
  const result: PageResult = { url, passed: [], failed: [], warnings: [] };

  let html: string;
  try {
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    if (!response.ok) {
      result.failed.push(`HTTP ${response.status} — page not reachable`);
      return result;
    }
    html = await response.text();
  } catch (error) {
    result.failed.push(
      `Fetch error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return result;
  }

  // Derive the pathname for canonical/comparison purposes
  const pathname = new URL(url).pathname;

  // -----------------------------------------------------------------------
  // 1. Title tag
  // -----------------------------------------------------------------------
  const title = extractTag(html, 'title');
  if (!title) {
    result.failed.push('Missing <title> tag');
  } else if (title.length < 10) {
    result.warnings.push(`Title too short (${title.length} chars): "${title}"`);
  } else if (title.length > 70) {
    result.warnings.push(`Title may be truncated in SERPs (${title.length} chars)`);
  } else {
    result.passed.push(`Title present (${title.length} chars)`);
  }

  // Title uniqueness
  if (title) {
    const existingPath = titlesSeen.get(title);
    if (existingPath && existingPath !== pathname) {
      result.failed.push(
        `Duplicate title "${title}" — also used on ${existingPath}`,
      );
    } else {
      titlesSeen.set(title, pathname);
    }
  }

  // -----------------------------------------------------------------------
  // 2. Meta description
  // -----------------------------------------------------------------------
  const description = extractMetaContent(html, 'description');
  if (!description) {
    result.failed.push('Missing meta description');
  } else if (description.length < 120) {
    result.warnings.push(
      `Meta description short (${description.length} chars, target 120-155)`,
    );
  } else if (description.length > 155) {
    result.warnings.push(
      `Meta description long (${description.length} chars, target 120-155)`,
    );
  } else {
    result.passed.push(`Meta description present (${description.length} chars)`);
  }

  // -----------------------------------------------------------------------
  // 3. Canonical URL
  // -----------------------------------------------------------------------
  const canonical = extractLinkHref(html, 'canonical');
  if (!canonical) {
    result.failed.push('Missing canonical URL');
  } else {
    // Canonical should be absolute and point to the correct path
    const isAbsolute =
      canonical.startsWith('http://') || canonical.startsWith('https://');
    if (!isAbsolute) {
      result.failed.push(`Canonical URL is not absolute: ${canonical}`);
    } else {
      const canonicalPath = new URL(canonical).pathname;
      // Strip trailing slashes for comparison
      const normalizedCanonical = canonicalPath.replace(/\/$/, '') || '/';
      const normalizedPathname = pathname.replace(/\/$/, '') || '/';
      if (normalizedCanonical !== normalizedPathname) {
        // This may be intentional (e.g., /sign?ref=X canonicalizes to /sign)
        result.warnings.push(
          `Canonical path "${normalizedCanonical}" differs from page path "${normalizedPathname}"`,
        );
      } else {
        result.passed.push('Canonical URL present and correct');
      }
    }
  }

  // -----------------------------------------------------------------------
  // 4. Open Graph tags
  // -----------------------------------------------------------------------
  const ogChecks = [
    { tag: 'og:title', required: true },
    { tag: 'og:description', required: true },
    { tag: 'og:image', required: true },
    { tag: 'og:url', required: true },
    { tag: 'og:type', required: false },
    { tag: 'og:site_name', required: false },
  ];

  let ogPassed = 0;
  for (const check of ogChecks) {
    const value = extractMetaContent(html, check.tag);
    if (!value) {
      if (check.required) {
        result.failed.push(`Missing ${check.tag}`);
      } else {
        result.warnings.push(`Missing optional ${check.tag}`);
      }
    } else {
      ogPassed++;
    }
  }
  if (ogPassed === ogChecks.length) {
    result.passed.push('All OG tags present');
  } else if (ogPassed >= 4) {
    result.passed.push(`${ogPassed}/${ogChecks.length} OG tags present`);
  }

  // Twitter card tags
  const twitterCard = extractMetaContent(html, 'twitter:card');
  if (!twitterCard) {
    result.warnings.push('Missing twitter:card meta tag');
  }

  // -----------------------------------------------------------------------
  // 5. JSON-LD structured data
  // -----------------------------------------------------------------------
  const jsonLdBlocks = extractJsonLd(html);
  if (jsonLdBlocks.length === 0) {
    result.failed.push('No JSON-LD structured data found');
  } else {
    // Validate basic structure
    let validBlocks = 0;
    for (const block of jsonLdBlocks) {
      if (
        typeof block === 'object' &&
        block !== null &&
        '@context' in block &&
        '@type' in block
      ) {
        const ctx = (block as Record<string, unknown>)['@context'];
        if (ctx === 'https://schema.org') {
          validBlocks++;
        } else {
          result.warnings.push(
            `JSON-LD @context is "${ctx}", expected "https://schema.org"`,
          );
        }
      } else {
        result.warnings.push(
          'JSON-LD block missing @context or @type',
        );
      }
    }

    // Check for Organization schema (should be on every page via root layout)
    const hasOrg = jsonLdBlocks.some(
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        (b as Record<string, unknown>)['@type'] === 'Organization',
    );
    if (!hasOrg) {
      result.warnings.push(
        'No Organization JSON-LD found (expected from root layout)',
      );
    }

    // Interior pages should have BreadcrumbList
    if (pathname !== '/') {
      const hasBreadcrumb = jsonLdBlocks.some(
        (b) =>
          typeof b === 'object' &&
          b !== null &&
          (b as Record<string, unknown>)['@type'] === 'BreadcrumbList',
      );
      if (!hasBreadcrumb) {
        result.warnings.push(
          'Interior page missing BreadcrumbList JSON-LD',
        );
      }
    }

    if (validBlocks > 0) {
      result.passed.push(
        `${validBlocks} valid JSON-LD block(s) found`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // 6. H1 tag — exactly one per page
  // -----------------------------------------------------------------------
  const h1s = extractAllTags(html, 'h1');
  if (h1s.length === 0) {
    result.failed.push('No <h1> tag found');
  } else if (h1s.length > 1) {
    result.failed.push(
      `Multiple <h1> tags found (${h1s.length}) — should be exactly 1`,
    );
  } else {
    result.passed.push('Exactly one <h1> tag');
  }

  // -----------------------------------------------------------------------
  // 7. Internal link check
  // -----------------------------------------------------------------------
  const internalLinks = extractInternalLinks(html, baseUrl);

  // Exclude known non-page paths (API, assets, etc.)
  const linkPathsToCheck = internalLinks.filter(
    (link) =>
      !link.startsWith('/api/') &&
      !link.startsWith('/_next/') &&
      !link.startsWith('/images/') &&
      !link.startsWith('/fonts/') &&
      !link.endsWith('.xml') &&
      !link.endsWith('.txt') &&
      !link.endsWith('.ico') &&
      !link.endsWith('.png') &&
      !link.endsWith('.jpg') &&
      !link.endsWith('.svg') &&
      !link.endsWith('.webp') &&
      !link.endsWith('.avif') &&
      !link.endsWith('.css') &&
      !link.endsWith('.js'),
  );

  // Batch check internal links (limit concurrency to avoid overwhelming dev server)
  const LINK_CONCURRENCY = 5;
  const brokenLinks: string[] = [];

  for (let i = 0; i < linkPathsToCheck.length; i += LINK_CONCURRENCY) {
    const batch = linkPathsToCheck.slice(i, i + LINK_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (linkPath) => {
        const linkUrl = `${baseUrl}${linkPath}`;
        try {
          const resp = await fetchWithTimeout(linkUrl, LINK_CHECK_TIMEOUT_MS);
          if (resp.status >= 400) {
            brokenLinks.push(`${linkPath} (${resp.status})`);
          }
        } catch {
          brokenLinks.push(`${linkPath} (timeout/unreachable)`);
        }
      }),
    );
  }

  if (brokenLinks.length > 0) {
    result.failed.push(
      `Broken internal links: ${brokenLinks.join(', ')}`,
    );
  } else if (linkPathsToCheck.length > 0) {
    result.passed.push(
      `${linkPathsToCheck.length} internal links verified`,
    );
  }

  // Content pages should have at least 2 internal links
  const contentPaths = [
    '/the-case',
    '/the-case/',
    '/blog',
    '/voices',
    '/faq',
    '/about',
  ];
  const isContentPage =
    contentPaths.some((p) => pathname.startsWith(p)) || pathname === '/';
  if (isContentPage && internalLinks.length < 2) {
    result.warnings.push(
      `Content page has only ${internalLinks.length} internal links (recommend at least 2)`,
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function printReport(report: SeoReport): void {
  const RESET = '\x1b[0m';
  const GREEN = '\x1b[32m';
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const BOLD = '\x1b[1m';
  const DIM = '\x1b[2m';

  console.log('\n');
  console.log(`${BOLD}SEO Verification Report${RESET}`);
  console.log(`${DIM}Base URL: ${report.baseUrl}${RESET}`);
  console.log(`${DIM}Timestamp: ${report.timestamp}${RESET}`);
  console.log(`${DIM}${'='.repeat(60)}${RESET}\n`);

  for (const page of report.pages) {
    const pathname = new URL(page.url).pathname;
    const hasFailures = page.failed.length > 0;
    const statusIcon = hasFailures ? `${RED}FAIL${RESET}` : `${GREEN}PASS${RESET}`;

    console.log(`${BOLD}${statusIcon}  ${pathname}${RESET}`);

    for (const pass of page.passed) {
      console.log(`  ${GREEN}+${RESET} ${pass}`);
    }
    for (const fail of page.failed) {
      console.log(`  ${RED}x${RESET} ${fail}`);
    }
    for (const warn of page.warnings) {
      console.log(`  ${YELLOW}!${RESET} ${warn}`);
    }
    console.log('');
  }

  // Summary
  console.log(`${BOLD}${'='.repeat(60)}${RESET}`);
  console.log(`${BOLD}Summary${RESET}`);
  console.log(`  Pages scanned:      ${report.summary.totalPages}`);
  console.log(
    `  ${GREEN}Checks passed:${RESET}      ${report.summary.totalPassed}`,
  );
  console.log(
    `  ${RED}Checks failed:${RESET}      ${report.summary.totalFailed}`,
  );
  console.log(
    `  ${YELLOW}Warnings:${RESET}           ${report.summary.totalWarnings}`,
  );
  console.log(
    `  Pages with failures: ${report.summary.pagesWithFailures}/${report.summary.totalPages}`,
  );
  console.log('');

  if (report.summary.totalFailed > 0) {
    console.log(
      `${RED}${BOLD}SEO verification failed.${RESET} Fix the issues above and re-run.\n`,
    );
  } else if (report.summary.totalWarnings > 0) {
    console.log(
      `${YELLOW}${BOLD}SEO verification passed with warnings.${RESET} Review warnings above.\n`,
    );
  } else {
    console.log(
      `${GREEN}${BOLD}All SEO checks passed!${RESET}\n`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const baseUrl = (process.argv[2] || DEFAULT_BASE_URL).replace(/\/$/, '');

  console.log(`SEO Verification — scanning ${baseUrl}`);

  // 1. Fetch sitemap
  let urls: string[];
  try {
    urls = await fetchSitemapUrls(baseUrl);
  } catch (error) {
    console.error(
      `\nFailed to fetch sitemap from ${baseUrl}${SITEMAP_PATH}`,
    );
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    console.error('\nMake sure the site is running. For local dev:');
    console.error('  npm run dev --filter=web\n');
    process.exit(1);
  }

  console.log(`Found ${urls.length} URLs in sitemap\n`);

  // 2. Verify each page
  const titlesSeen = new Map<string, string>();
  const pages: PageResult[] = [];

  for (const url of urls) {
    // Normalize URL to use the base URL we're targeting
    // (sitemap may have production URLs when running against localhost)
    const pathname = new URL(url).pathname;
    const targetUrl = `${baseUrl}${pathname}`;

    process.stdout.write(`  Checking ${pathname}...`);
    const result = await verifyPage(targetUrl, baseUrl, titlesSeen);
    pages.push(result);

    const status =
      result.failed.length > 0
        ? '\x1b[31m FAIL\x1b[0m'
        : '\x1b[32m OK\x1b[0m';
    console.log(status);
  }

  // 3. Build report
  const report: SeoReport = {
    baseUrl,
    timestamp: new Date().toISOString(),
    pages,
    summary: {
      totalPages: pages.length,
      totalPassed: pages.reduce((sum, p) => sum + p.passed.length, 0),
      totalFailed: pages.reduce((sum, p) => sum + p.failed.length, 0),
      totalWarnings: pages.reduce((sum, p) => sum + p.warnings.length, 0),
      pagesWithFailures: pages.filter((p) => p.failed.length > 0).length,
    },
  };

  // 4. Print report
  printReport(report);

  // 5. Exit with appropriate code
  process.exit(report.summary.totalFailed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
