import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

import type { AdminRole } from '@confluenceohio/db/types';

interface MockAdmin {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
  updated_at: string;
}

const mockAdminUser: MockAdmin = {
  id: 'admin-uuid',
  email: 'admin@confluenceohio.org',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockViewerUser: MockAdmin = {
  ...mockAdminUser,
  id: 'viewer-uuid',
  email: 'viewer@confluenceohio.org',
  role: 'viewer',
};

let currentAdmin: MockAdmin | null = mockAdminUser;

vi.mock('@/lib/admin/api-auth', () => ({
  requireAdminFromRequest: vi.fn(() => Promise.resolve(currentAdmin)),
}));

// Supabase mock
const mockVolunteers = [
  {
    id: 'v1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    phone: '(614) 555-1234',
    neighborhood: 'Clintonville',
    roles: ['signature_collector', 'event_organizer'],
    availability: 'weekday_evenings, weekends',
    notes: null,
    status: 'active',
    signed_up_at: '2026-04-01T10:00:00Z',
    onboarded_at: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
  {
    id: 'v2',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    phone: null,
    neighborhood: 'Short North',
    roles: ['social_amplifier'],
    availability: 'flexible',
    notes: 'Very enthusiastic',
    status: 'onboarded',
    signed_up_at: '2026-03-15T08:00:00Z',
    onboarded_at: '2026-03-20T14:00:00Z',
    created_at: '2026-03-15T08:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
];

let mockQueryResult = { data: mockVolunteers, count: 2, error: null };

function buildChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'select', 'eq', 'in', 'or', 'contains', 'gte', 'lte', 'order', 'range',
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminal: resolve with mock data
  chain.select = vi.fn(() => {
    // Return the chain but also make it thenable
    const thenable = Object.assign(
      { ...chain },
      {
        then: (resolve: (val: typeof mockQueryResult) => void) =>
          resolve(mockQueryResult),
      },
    );
    for (const m of methods) {
      (thenable as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn(() => thenable);
    }
    return thenable;
  });
  return chain;
}

const supabaseMock = { from: vi.fn(() => buildChain()) };

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => supabaseMock,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/admin/volunteers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAdmin = mockAdminUser;
    mockQueryResult = { data: mockVolunteers, count: 2, error: null };
  });

  it('returns 401 when not authenticated', async () => {
    currentAdmin = null;
    const res = await GET(makeRequest('/api/admin/volunteers'));
    expect(res.status).toBe(401);
  });

  it('returns paginated volunteer list for admin', async () => {
    const res = await GET(makeRequest('/api/admin/volunteers'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: unknown[];
      pagination: { total: number };
    };
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
  });

  it('masks PII for viewer role', async () => {
    currentAdmin = mockViewerUser;
    const res = await GET(makeRequest('/api/admin/volunteers'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: Array<{ email: string; phone: string | null }>;
    };
    // Email should be masked
    expect(body.data[0].email).not.toBe('jane@example.com');
    expect(body.data[0].email).toContain('***');
    // Phone should be masked
    expect(body.data[0].phone).not.toBe('(614) 555-1234');
  });

  it('returns 400 for invalid query params', async () => {
    const res = await GET(
      makeRequest('/api/admin/volunteers?per_page=999'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 when viewer tries CSV export', async () => {
    currentAdmin = mockViewerUser;
    const res = await GET(
      makeRequest('/api/admin/volunteers?format=csv'),
    );
    expect(res.status).toBe(403);
  });

  it('returns CSV for admin', async () => {
    const res = await GET(
      makeRequest('/api/admin/volunteers?format=csv'),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('volunteers-');
  });
});
