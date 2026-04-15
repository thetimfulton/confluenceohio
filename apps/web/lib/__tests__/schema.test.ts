import { describe, it, expect } from 'vitest';
import {
  organizationSchema,
  webPageSchema,
  breadcrumbSchema,
  blogPostingSchema,
  voiceArticleSchema,
  faqPageSchema,
  eventSchema,
} from '../schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert the object is valid JSON and return parsed result. */
function assertValidJson(data: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(data);
  expect(() => JSON.parse(json)).not.toThrow();
  return JSON.parse(json) as Record<string, unknown>;
}

/** Assert required Schema.org fields. */
function assertSchemaBase(
  data: Record<string, unknown>,
  expectedType: string,
) {
  expect(data['@context']).toBe('https://schema.org');
  expect(data['@type']).toBe(expectedType);
}

/** Assert no undefined or null values anywhere in the tree. */
function assertNoNullishValues(obj: unknown, path = ''): void {
  if (obj === null || obj === undefined) {
    throw new Error(`Found ${obj} at ${path || 'root'}`);
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => assertNoNullishValues(item, `${path}[${i}]`));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      assertNoNullishValues(value, `${path}.${key}`);
    }
  }
}

/** Assert all URLs in the object are absolute. */
function collectUrls(obj: unknown, urls: string[] = []): string[] {
  if (typeof obj === 'string' && obj.startsWith('http')) {
    urls.push(obj);
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectUrls(item, urls));
  } else if (typeof obj === 'object' && obj !== null) {
    Object.values(obj).forEach((value) => collectUrls(value, urls));
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Organization Schema
// ---------------------------------------------------------------------------

describe('organizationSchema', () => {
  it('is valid JSON with correct @context and @type', () => {
    const data = assertValidJson(organizationSchema as unknown as Record<string, unknown>);
    assertSchemaBase(data, 'Organization');
  });

  it('has no undefined or null values', () => {
    assertNoNullishValues(organizationSchema);
  });

  it('matches campaign details', () => {
    expect(organizationSchema.name).toBe('Confluence Ohio');
    expect(organizationSchema.nonprofitStatus).toBe('Nonprofit501c4');
    expect(organizationSchema.foundingDate).toBe('2026');
  });

  it('has an @id for cross-reference', () => {
    expect(organizationSchema['@id']).toContain('/#organization');
  });

  it('includes social profiles', () => {
    expect(organizationSchema.sameAs.length).toBeGreaterThanOrEqual(1);
  });

  it('has absolute URLs', () => {
    const urls = collectUrls(organizationSchema);
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//);
    }
  });
});

// ---------------------------------------------------------------------------
// WebPage Schema
// ---------------------------------------------------------------------------

describe('webPageSchema', () => {
  it('produces valid JSON with @context and @type', () => {
    const data = assertValidJson(
      webPageSchema({
        name: 'Confluence Ohio',
        description: 'Test description',
        url: '/',
      }),
    );
    assertSchemaBase(data, 'WebPage');
  });

  it('converts relative URLs to absolute', () => {
    const data = webPageSchema({
      name: 'Test',
      description: 'Desc',
      url: '/about',
    });
    expect(data.url).toMatch(/^https?:\/\//);
  });

  it('references the Organization as mainEntity', () => {
    const data = webPageSchema({
      name: 'Home',
      description: 'Desc',
      url: '/',
    });
    expect(data.mainEntity).toEqual({ '@id': expect.stringContaining('/#organization') });
  });
});

// ---------------------------------------------------------------------------
// BreadcrumbList Schema
// ---------------------------------------------------------------------------

describe('breadcrumbSchema', () => {
  it('returns null for the homepage', () => {
    expect(breadcrumbSchema('/')).toBeNull();
  });

  it('produces valid JSON for a simple path', () => {
    const data = assertValidJson(breadcrumbSchema('/about')!);
    assertSchemaBase(data, 'BreadcrumbList');
  });

  it('generates correct items for a nested path', () => {
    const data = breadcrumbSchema('/the-case/history')!;
    const items = data.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3); // Home, The Case, The Naming Story
    expect(items[0].position).toBe(1);
    expect(items[0].name).toBe('Home');
    expect(items[1].name).toBe('The Case');
    expect(items[2].name).toBe('The Naming Story');
  });

  it('uses the finalLabel override for the last item', () => {
    const data = breadcrumbSchema('/blog/my-post', 'My Custom Title')!;
    const items = data.itemListElement as Array<Record<string, unknown>>;
    const lastItem = items[items.length - 1];
    expect(lastItem.name).toBe('My Custom Title');
  });

  it('has absolute URLs for all items', () => {
    const data = breadcrumbSchema('/the-case/the-rivers')!;
    const urls = collectUrls(data);
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//);
    }
  });

  it('has no undefined or null values', () => {
    const data = breadcrumbSchema('/the-case/precedents')!;
    assertNoNullishValues(data);
  });
});

// ---------------------------------------------------------------------------
// BlogPosting Schema
// ---------------------------------------------------------------------------

describe('blogPostingSchema', () => {
  const input = {
    title: 'Why Confluence?',
    description: 'A compelling argument for renaming.',
    slug: 'why-confluence',
    author: 'Confluence Ohio',
    publishedAt: '2026-03-15T12:00:00Z',
    modifiedAt: '2026-03-16T12:00:00Z',
    ogImageUrl: 'https://confluenceohio.org/images/og/blog/why.png',
  };

  it('produces valid JSON with correct @type', () => {
    const data = assertValidJson(blogPostingSchema(input));
    assertSchemaBase(data, 'BlogPosting');
  });

  it('has no undefined or null values', () => {
    assertNoNullishValues(blogPostingSchema(input));
  });

  it('includes dateModified when provided', () => {
    const data = blogPostingSchema(input);
    expect(data.dateModified).toBe(input.modifiedAt);
  });

  it('omits dateModified when not provided', () => {
    const { modifiedAt, ...withoutModified } = input;
    const data = blogPostingSchema(withoutModified);
    expect(data).not.toHaveProperty('dateModified');
  });

  it('uses Organization type for Confluence Ohio author', () => {
    const data = blogPostingSchema(input);
    const author = data.author as Record<string, unknown>;
    expect(author['@type']).toBe('Organization');
    expect(author.url).toBeDefined();
  });

  it('uses Person type for named authors', () => {
    const data = blogPostingSchema({ ...input, author: 'Jane Smith' });
    const author = data.author as Record<string, unknown>;
    expect(author['@type']).toBe('Person');
    expect(author).not.toHaveProperty('url');
  });

  it('includes publisher with logo', () => {
    const data = blogPostingSchema(input);
    const publisher = data.publisher as Record<string, unknown>;
    expect(publisher.name).toBe('Confluence Ohio');
    expect(publisher.logo).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Voice Article Schema
// ---------------------------------------------------------------------------

describe('voiceArticleSchema', () => {
  const input = {
    title: 'My Perspective on Renaming',
    description: 'A resident shares their thoughts.',
    slug: 'my-perspective',
    authorName: 'Jane Doe',
    publishedAt: '2026-04-01T10:00:00Z',
    ogImageUrl: 'https://confluenceohio.org/api/og?type=voice',
  };

  it('produces valid JSON with @type Article', () => {
    const data = assertValidJson(voiceArticleSchema(input));
    assertSchemaBase(data, 'Article');
  });

  it('has no undefined or null values', () => {
    assertNoNullishValues(voiceArticleSchema(input));
  });

  it('sets author as Person', () => {
    const data = voiceArticleSchema(input);
    const author = data.author as Record<string, unknown>;
    expect(author['@type']).toBe('Person');
    expect(author.name).toBe('Jane Doe');
  });

  it('has absolute URLs', () => {
    const data = voiceArticleSchema(input);
    const urls = collectUrls(data);
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//);
    }
  });
});

// ---------------------------------------------------------------------------
// FAQPage Schema
// ---------------------------------------------------------------------------

describe('faqPageSchema', () => {
  const items = [
    { question: 'What is Confluence Ohio?', answer: 'A civic organization.' },
    { question: 'How many signatures?', answer: 'About 22,000.' },
  ];

  it('produces valid JSON with @type FAQPage', () => {
    const data = assertValidJson(faqPageSchema(items));
    assertSchemaBase(data, 'FAQPage');
  });

  it('has no undefined or null values', () => {
    assertNoNullishValues(faqPageSchema(items));
  });

  it('maps all questions correctly', () => {
    const data = faqPageSchema(items);
    const mainEntity = data.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity).toHaveLength(2);
    expect(mainEntity[0]['@type']).toBe('Question');
    expect(mainEntity[0].name).toBe('What is Confluence Ohio?');
    const answer = mainEntity[0].acceptedAnswer as Record<string, unknown>;
    expect(answer['@type']).toBe('Answer');
    expect(answer.text).toBe('A civic organization.');
  });
});

// ---------------------------------------------------------------------------
// Event Schema
// ---------------------------------------------------------------------------

describe('eventSchema', () => {
  it('produces valid JSON for an in-person event', () => {
    const data = assertValidJson(
      eventSchema({
        name: 'Town Hall',
        description: 'Community discussion.',
        startDate: '2026-05-01T18:00:00-04:00',
        venueName: 'North Market',
        url: 'https://confluenceohio.org/events/town-hall',
      }),
    );
    assertSchemaBase(data, 'Event');
    const location = data.location as Record<string, unknown>;
    expect(location['@type']).toBe('Place');
    expect(data.eventAttendanceMode).toContain('OfflineEventAttendanceMode');
  });

  it('produces valid JSON for an online event', () => {
    const data = eventSchema({
      name: 'Virtual Q&A',
      description: 'Online session.',
      startDate: '2026-05-10T19:00:00-04:00',
      venueName: 'Zoom',
      url: 'https://zoom.us/j/123',
      isOnline: true,
    });
    const location = data.location as Record<string, unknown>;
    expect(location['@type']).toBe('VirtualLocation');
    expect(data.eventAttendanceMode).toContain('OnlineEventAttendanceMode');
  });

  it('has no undefined or null values', () => {
    assertNoNullishValues(
      eventSchema({
        name: 'Event',
        description: 'Desc',
        startDate: '2026-06-01T10:00:00Z',
        venueName: 'Venue',
        url: 'https://confluenceohio.org',
      }),
    );
  });

  it('includes endDate when provided', () => {
    const data = eventSchema({
      name: 'Event',
      description: 'Desc',
      startDate: '2026-06-01T10:00:00Z',
      endDate: '2026-06-01T12:00:00Z',
      venueName: 'Venue',
      url: 'https://confluenceohio.org',
    });
    expect(data.endDate).toBe('2026-06-01T12:00:00Z');
  });
});
