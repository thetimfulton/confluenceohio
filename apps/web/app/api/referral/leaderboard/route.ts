import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// GET /api/referral/leaderboard — Public referral leaderboard (Artifact 11 §4.3)
//
// Returns top N referrers who opted in to the leaderboard.
// Shows first name + last initial only (never full name or address).
// Cached for 5 minutes.
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  firstName: string;
  lastInitial: string;
  referralCount: number;
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '25', 10) || 25, 1), 100);

  const supabase = createServiceClient();

  // Query top referrers who opted in to the leaderboard
  // Uses the signatures table joined to itself via referred_by_code
  const { data, error } = await supabase.rpc('get_referral_leaderboard', {
    p_limit: limit,
  });

  if (error) {
    // If the RPC doesn't exist, fall back to a direct query
    if (error.code === '42883') {
      return await fallbackLeaderboardQuery(supabase, limit);
    }

    console.error('[Leaderboard] RPC error:', error);
    return NextResponse.json(
      { error: 'Failed to load leaderboard' },
      { status: 500 },
    );
  }

  const entries: LeaderboardEntry[] = (data ?? []).map(
    (row: { first_name: string; last_initial: string; referral_count: number }) => ({
      firstName: row.first_name,
      lastInitial: row.last_initial,
      referralCount: row.referral_count,
    }),
  );

  return NextResponse.json(
    { leaderboard: entries },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    },
  );
}

/**
 * Fallback when the RPC function isn't deployed yet.
 * Runs the leaderboard query directly.
 */
async function fallbackLeaderboardQuery(
  supabase: ReturnType<typeof createServiceClient>,
  limit: number,
) {
  // Get all signers who opted in and have at least one referral
  const { data: signers, error: signersError } = await supabase
    .from('signatures')
    .select('id, first_name, last_name, referral_code')
    .eq('leaderboard_opt_in', true)
    .is('deleted_at', null);

  if (signersError) {
    console.error('[Leaderboard] Fallback query error:', signersError);
    return NextResponse.json(
      { error: 'Failed to load leaderboard' },
      { status: 500 },
    );
  }

  if (!signers || signers.length === 0) {
    return NextResponse.json(
      { leaderboard: [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    );
  }

  // Count referrals for each opted-in signer
  const entries: LeaderboardEntry[] = [];

  for (const signer of signers) {
    const { count } = await supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by_code', signer.referral_code)
      .is('deleted_at', null);

    if ((count ?? 0) > 0) {
      entries.push({
        firstName: signer.first_name,
        lastInitial: signer.last_name ? signer.last_name.charAt(0).toUpperCase() : '',
        referralCount: count ?? 0,
      });
    }
  }

  // Sort descending by referral count and take top N
  entries.sort((a, b) => b.referralCount - a.referralCount);
  const topEntries = entries.slice(0, limit);

  return NextResponse.json(
    { leaderboard: topEntries },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    },
  );
}
