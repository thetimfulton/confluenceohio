import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';

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
  requireAdminFromRequest: vi.fn(
    (_req: unknown, allowedRoles?: string[]) => {
      if (!currentAdmin) return Promise.resolve(null);
      if (allowedRoles && !allowedRoles.includes(currentAdmin.role)) {
        return Promise.resolve(null);
      }
      return Promise.resolve(currentAdmin);
    },
  ),
}));

const mockVolunteer = {
  id: 'v1',
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone: '(614) 555-1234',
  neighborhood: 'Clintonville',
  roles: ['signature_collector'],
  availability: 'weekday_evenings',
  notes: 'Loves canvassing',
  status: 'active',
  signed_up_at: '2026-04-01T10:00:00Z',
  onboarded_at: null,
  created_at: '2026-04-01T10:00:00Z',
  updated_at: '2026-04-01T10:00:00Z',
};

const mockNotes = [
  {
    id: 'n1',
    volunteer_id: 'v1',
    admin_id: 'admin-uuid',
    admin_email: 'admin@confluenceohio.org',
    content: 'Completed training.',
    created_at: '2026-04-05T12:00:00Z',
  },
];

// Build a flexible chain mock
function buildChain(resolveData: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'select', 'eq', 'in', 'or', 'contains', 'gte', 'lte',
    'order', 'range', 'update', 'single', 'maybeSingle',
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // single() and maybeSingle() resolve
  chain.single = vi.fn(() =>
    Promise.resolve({ data: resolveData, error: null }),
  );
  chain.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: resolveData, error: null }),
  );
  return chain;
}

let volunteersChain: ReturnType<typeof buildChain>;
let notesChain: ReturnType<typeof buildChain>;
let signaturesChain: ReturnType<typeof buildChain>;
let updateChain: ReturnType<typeof buildChain>;

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'volunteers') return volunteersChain;
      if (table === 'volunteer_admin_notes') return notesChain;
      if (table === 'signatures') return signaturesChain;
      return buildChain();
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  url: string,
  options?: { method?: string; body?: unknown },
): NextRequest {
  const init: { method: string; body?: string; headers?: Record<string, string> } = {
    method: options?.method || 'GET',
  };
  if (options?.body) {
    init.body = JSON.stringify(options.body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const routeContext = { params: Promise.resolve({ id: 'v1' }) };

// ---------------------------------------------------------------------------
// Tests — GET
// ---------------------------------------------------------------------------

describe('GET /api/admin/volunteers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAdmin = mockAdminUser;

    volunteersChain = buildChain(mockVolunteer);
    notesChain = buildChain(null);
    // Override: notes query returns array, not single
    notesChain.order = vi.fn(() =>
      Promise.resolve({ data: mockNotes, error: null }),
    );
    signaturesChain = buildChain(null);
  });

  it('returns 401 when not authenticated', async () => {
    currentAdmin = null;
    const res = await GET(makeRequest('/api/admin/volunteers/v1'), routeContext);
    expect(res.status).toBe(401);
  });

  it('returns volunteer detail with notes and timeline', async () => {
    const res = await GET(makeRequest('/api/admin/volunteers/v1'), routeContext);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      volunteer: typeof mockVolunteer;
      notes: typeof mockNotes;
      timeline: unknown[];
    };
    expect(body.volunteer.first_name).toBe('Jane');
    expect(body.notes).toHaveLength(1);
    expect(body.timeline.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 for non-existent volunteer', async () => {
    volunteersChain.single = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
    );
    const res = await GET(makeRequest('/api/admin/volunteers/v999'), routeContext);
    expect(res.status).toBe(404);
  });

  it('masks PII for viewer', async () => {
    currentAdmin = mockViewerUser;
    const res = await GET(makeRequest('/api/admin/volunteers/v1'), routeContext);
    const body = (await res.json()) as {
      volunteer: { email: string; phone: string | null };
    };
    expect(body.volunteer.email).toContain('***');
  });
});

// ---------------------------------------------------------------------------
// Tests — PATCH
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/volunteers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAdmin = mockAdminUser;

    updateChain = buildChain({ ...mockVolunteer, status: 'onboarded' });
    // Wire up update chain: update() returns a chain that has eq/select/single
    volunteersChain = {
      ...buildChain(mockVolunteer),
      update: vi.fn(() => updateChain),
    };
  });

  it('returns 403 when viewer tries to PATCH', async () => {
    currentAdmin = mockViewerUser;
    const res = await PATCH(
      makeRequest('/api/admin/volunteers/v1', {
        method: 'PATCH',
        body: { status: 'onboarded' },
      }),
      routeContext,
    );
    expect(res.status).toBe(403);
  });

  it('updates status for admin', async () => {
    const res = await PATCH(
      makeRequest('/api/admin/volunteers/v1', {
        method: 'PATCH',
        body: { status: 'onboarded' },
      }),
      routeContext,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { volunteer: { status: string } };
    expect(body.volunteer.status).toBe('onboarded');
  });

  it('returns 422 for empty body', async () => {
    const res = await PATCH(
      makeRequest('/api/admin/volunteers/v1', {
        method: 'PATCH',
        body: {},
      }),
      routeContext,
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid role', async () => {
    const res = await PATCH(
      makeRequest('/api/admin/volunteers/v1', {
        method: 'PATCH',
        body: { roles: ['invalid_role'] },
      }),
      routeContext,
    );
    expect(res.status).toBe(422);
  });
});
