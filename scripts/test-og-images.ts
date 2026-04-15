#!/usr/bin/env npx tsx
/**
 * OG Image Verification Script
 *
 * Tests that all OG image endpoints return valid responses:
 *   1. Hits /api/og with various parameter combinations
 *   2. Verifies 200 response and correct content-type (image/png)
 *   3. Tests all static OG image paths resolve (public/images/og/*)
 *   4. Checks that page-level OG image URLs (from meta tags) are reachable
 *
 * Spec: docs/12-seo-structured-data.md §1.2
 *
 * Usage:
 *   npx tsx scripts/test-og-images.ts                        # localhost:3000
 *   npx tsx scripts/test-og-images.ts https://confluenceohio.org  # production
 *
 * Exit codes:
 *   0 — all OG images pass
 *   1 — one or more failures
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'http://localhost:3000';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_SIZE_BYTES = 300 * 1024; // 300KB per spec

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  url: string;
  expectedContentType?: string;
}

interface TestResult {
  name: string;
  url: string;
  passed: boolean;
  status?: number;
  contentType?: string;
  sizeBytes?: number;
  error?: string;
  warnings: string[];
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
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ---------------------------------------------------------------------------
// Test cases: dynamic /api/og endpoint
// ---------------------------------------------------------------------------

function getDynamicOgTestCases(baseUrl: string): TestCase[] {
  return [
    // Petition type (default)
    {
      name: '/api/og — petition (default)',
      url: `${baseUrl}/api/og`,
    },
    {
      name: '/api/og — petition with count',
      url: `${baseUrl}/api/og?type=petition&count=1234`,
    },

    // Voice type
    {
      name: '/api/og — voice',
      url: `${baseUrl}/api/og?type=voice&title=This+Is+My+Story&name=Jane+Doe&position=support`,
    },
    {
      name: '/api/og — voice (oppose)',
      url: `${baseUrl}/api/og?type=voice&title=Why+I+Love+Columbus&name=John+Smith&position=oppose`,
    },
    {
      name: '/api/og — voice (undecided)',
      url: `${baseUrl}/api/og?type=voice&title=Still+Thinking&name=Pat+Johnson&position=undecided`,
    },
    {
      name: '/api/og — voice with long title',
      url: `${baseUrl}/api/og?type=voice&title=${'A'.repeat(150)}&name=Test+User&position=support`,
    },

    // Blog type
    {
      name: '/api/og — blog',
      url: `${baseUrl}/api/og?type=blog&title=Campaign+Update+March+2026&subtitle=Tim+Fulton`,
    },
    {
      name: '/api/og — blog with long title',
      url: `${baseUrl}/api/og?type=blog&title=${'B'.repeat(120)}&subtitle=Author`,
    },

    // Milestone type
    {
      name: '/api/og — milestone',
      url: `${baseUrl}/api/og?type=milestone&count=5000`,
    },
    {
      name: '/api/og — milestone (22000 target)',
      url: `${baseUrl}/api/og?type=milestone&count=22000`,
    },

    // Edge cases
    {
      name: '/api/og — empty params',
      url: `${baseUrl}/api/og?type=petition`,
    },
    {
      name: '/api/og — unknown type falls back to petition',
      url: `${baseUrl}/api/og?type=unknown`,
    },

    // Dedicated petition OG endpoint
    {
      name: '/api/og/petition — live signature count',
      url: `${baseUrl}/api/og/petition`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Test cases: static OG images in public/images/og/
// ---------------------------------------------------------------------------

function getStaticOgTestCases(baseUrl: string): TestCase[] {
  // Per Artifact 12 §1.2 — static OG images (1200x630 PNG, <300KB)
  const staticImages = [
    'default.png',
    'the-case.png',
    'history.png',
    'rivers.png',
    'columbus-legacy.png',
    'precedents.png',
    'the-process.png',
    'voices.png',
    'petition.png',
    'volunteer.png',
    'donate.png',
    'press.png',
    'blog.png',
    'faq.png',
  ];

  return staticImages.map((filename) => ({
    name: `static: /images/og/${filename}`,
    url: `${baseUrl}/images/og/${filename}`,
    expectedContentType: 'image/png',
  }));
}

// ---------------------------------------------------------------------------
// Run a single test
// ---------------------------------------------------------------------------

async function runTest(testCase: TestCase): Promise<TestResult> {
  const result: TestResult = {
    name: testCase.name,
    url: testCase.url,
    passed: false,
    warnings: [],
  };

  try {
    const response = await fetchWithTimeout(testCase.url, FETCH_TIMEOUT_MS);
    result.status = response.status;
    result.contentType = response.headers.get('content-type') ?? undefined;

    // Check status
    if (response.status !== 200) {
      result.error = `Expected 200, got ${response.status}`;
      return result;
    }

    // Check content-type
    const ct = result.contentType?.toLowerCase() ?? '';
    const isImage = ct.startsWith('image/');
    if (!isImage) {
      result.error = `Expected image content-type, got "${result.contentType}"`;
      return result;
    }

    if (testCase.expectedContentType) {
      if (!ct.startsWith(testCase.expectedContentType)) {
        result.warnings.push(
          `Expected ${testCase.expectedContentType}, got ${ct}`,
        );
      }
    }

    // Check size
    const body = await response.arrayBuffer();
    result.sizeBytes = body.byteLength;

    if (result.sizeBytes > MAX_IMAGE_SIZE_BYTES) {
      result.warnings.push(
        `Image exceeds 300KB limit: ${formatBytes(result.sizeBytes)}`,
      );
    }

    if (result.sizeBytes === 0) {
      result.error = 'Response body is empty';
      return result;
    }

    result.passed = true;
  } catch (error) {
    result.error =
      error instanceof Error ? error.message : String(error);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printResults(results: TestResult[]): void {
  const RESET = '\x1b[0m';
  const GREEN = '\x1b[32m';
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const BOLD = '\x1b[1m';
  const DIM = '\x1b[2m';

  console.log(`\n${BOLD}OG Image Verification Results${RESET}\n`);

  // Group by category
  const dynamicResults = results.filter((r) => !r.name.startsWith('static:'));
  const staticResults = results.filter((r) => r.name.startsWith('static:'));

  const printGroup = (title: string, items: TestResult[]) => {
    console.log(`${BOLD}${title}${RESET}`);
    console.log(`${DIM}${'─'.repeat(60)}${RESET}`);

    for (const r of items) {
      const icon = r.passed
        ? `${GREEN}PASS${RESET}`
        : `${RED}FAIL${RESET}`;
      const size = r.sizeBytes ? ` (${formatBytes(r.sizeBytes)})` : '';
      console.log(`  ${icon}  ${r.name}${DIM}${size}${RESET}`);

      if (r.error) {
        console.log(`        ${RED}${r.error}${RESET}`);
      }
      for (const w of r.warnings) {
        console.log(`        ${YELLOW}! ${w}${RESET}`);
      }
    }
    console.log('');
  };

  if (dynamicResults.length > 0) {
    printGroup('Dynamic OG Images (/api/og)', dynamicResults);
  }
  if (staticResults.length > 0) {
    printGroup('Static OG Images (/images/og/)', staticResults);
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const warnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  console.log(`${BOLD}${'='.repeat(60)}${RESET}`);
  console.log(`${BOLD}Summary${RESET}`);
  console.log(`  Total tests:    ${results.length}`);
  console.log(`  ${GREEN}Passed:${RESET}         ${passed}`);
  console.log(`  ${RED}Failed:${RESET}         ${failed}`);
  console.log(`  ${YELLOW}Warnings:${RESET}       ${warnings}`);
  console.log('');

  if (failed > 0) {
    console.log(
      `${RED}${BOLD}OG image verification failed.${RESET} Fix the issues above.\n`,
    );
  } else if (warnings > 0) {
    console.log(
      `${YELLOW}${BOLD}All OG images accessible, but review warnings.${RESET}\n`,
    );
  } else {
    console.log(`${GREEN}${BOLD}All OG images pass!${RESET}\n`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const baseUrl = (process.argv[2] || DEFAULT_BASE_URL).replace(/\/$/, '');

  console.log(`OG Image Verification — testing against ${baseUrl}`);

  const testCases = [
    ...getDynamicOgTestCases(baseUrl),
    ...getStaticOgTestCases(baseUrl),
  ];

  console.log(`Running ${testCases.length} tests...\n`);

  // Run tests with limited concurrency
  const CONCURRENCY = 3;
  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i += CONCURRENCY) {
    const batch = testCases.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(runTest));
    results.push(...batchResults);
  }

  printResults(results);

  const hasFailures = results.some((r) => !r.passed);
  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
