// ---------------------------------------------------------------------------
// Admin Invite API — apps/web/app/api/admin/invite/route.ts
// ---------------------------------------------------------------------------
// POST: Invite a new admin user via Supabase Auth magic link.
//
// 1. Creates Supabase Auth user with inviteUserByEmail()
// 2. Inserts row into admin_users table with assigned role
// 3. Rolls back auth user if admin_users insert fails
//
// Requires full admin role. See Artifact 15 §10.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'moderator', 'viewer']),
});

export async function POST(request: NextRequest) {
  const admin = await requireAdminFromRequest(request, ['admin']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { email, role } = parsed.data;

  const supabase = createServiceClient();

  // Check if admin user already exists with this email
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'An admin user with this email already exists' },
      { status: 409 },
    );
  }

  // Create Supabase Auth user via invite
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { data: authData, error: authError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: { admin_role: role },
      redirectTo: `${siteUrl}/admin/login`,
    });

  if (authError || !authData.user) {
    console.error('[Admin/Invite] Auth invite error:', authError);
    return NextResponse.json(
      { error: authError?.message ?? 'Failed to create auth user' },
      { status: 500 },
    );
  }

  const userId = authData.user.id;

  // Insert into admin_users table
  const { error: insertError } = await supabase.from('admin_users').insert({
    id: userId,
    email,
    role,
  });

  if (insertError) {
    console.error('[Admin/Invite] admin_users insert error:', insertError);

    // Rollback: delete the auth user we just created
    await supabase.auth.admin.deleteUser(userId);

    return NextResponse.json(
      { error: 'Failed to create admin user record' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    user: { id: userId, email, role },
  });
}
