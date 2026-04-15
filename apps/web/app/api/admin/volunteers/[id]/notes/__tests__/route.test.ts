import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

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

const mockNote = {
  id: 'note-1',
  volunteer_id: 'v1',
  admin_id: 'admin-uuid',
  admin_email: 'admin@confluenceohio.org',
  content: 'Completed canvassing training.',
  created_at: '2026-04-10T12:00:00Z',
};

let volunteerExists = true;
let insertResult = { data: mockNote, error: null };

function buildChain(resolveData: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'eq', 'insert', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() =>
    Promise.resolve({
      data: resolveData,
      error: resolveData ? null : { code: 'PGRST116' },
    }),
  );
  return chain;
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'volunteers') {
        const chain = buildChain(volunteerExists ? { id: 'v1' } : null);
        return chain;
      }
      if (table === 'volunteer_admin_notes') {
        const chain = buildChain(null);
        chain.insert = vi.fn(() => {
          const selectChain = buildChain(null);
          selectChain.select = vi.fn(() => {
            const singleChain = buildChain(null);
            singleChain.single = vi.fn(() => Promise.resolve(insertResult));
            return singleChain;
          });
          return selectChain;
        });
        return chain;
      }
      return buildChain();
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL('/api/admin/volunteers/v1/notes', 'http://localhost:3000'),
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

const routeContext = { params: Promise.resolve({ id: 'v1' }) };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/admin/volunteers/[id]/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAdmin = mockAdminUser;
    volunteerExists = true;
    insertResult = { data: mockNote, error: null };
  });

  it('returns 403 when viewer tries to create note', async () => {
    currentAdmin = mockViewerUser;
    const res = await POST(
      makeRequest({ content: 'Test note' }),
      routeContext,
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when not authenticated', async () => {
    currentAdmin = null;
    const res = await POST(
      makeRequest({ content: 'Test note' }),
      routeContext,
    );
    expect(res.status).toBe(403);
  });

  it('creates a note successfully', async () => {
    const res = await POST(
      makeRequest({ content: 'Completed canvassing training.' }),
      routeContext,
    );
    expect(res.status).toBe(201);

    const body = (await res.json()) as { note: typeof mockNote };
    expect(body.note.content).toBe('Completed canvassing training.');
  });

  it('returns 422 for empty content', async () => {
    const res = await POST(makeRequest({ content: '' }), routeContext);
    expect(res.status).toBe(422);
  });

  it('returns 422 for content over 2000 chars', async () => {
    const res = await POST(
      makeRequest({ content: 'x'.repeat(2001) }),
      routeContext,
    );
    expect(res.status).toBe(422);
  });

  it('returns 404 for non-existent volunteer', async () => {
    volunteerExists = false;
    const res = await POST(
      makeRequest({ content: 'Note for ghost' }),
      routeContext,
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest(
      new URL('/api/admin/volunteers/v1/notes', 'http://localhost:3000'),
      {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });
});
