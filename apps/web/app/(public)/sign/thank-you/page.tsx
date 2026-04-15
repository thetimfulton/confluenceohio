import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SignatureCounterDynamic } from '@/components/petition/SignatureCounterDynamic';
import { RecentSigners } from '@/components/petition/RecentSigners';
import type { PublicRecentSigner } from '@confluenceohio/db/types';
import { ThankYouClient } from './thank-you-client';

// ---------------------------------------------------------------------------
// Metadata — noindex (personal page), OG tags for sharing (Artifact 06 §4)
// OG title/description intentionally differ from page title for social sharing.
// ---------------------------------------------------------------------------

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://confluenceohio.org';

export const metadata: Metadata = {
  title: 'Thank You for Signing',
  description:
    'You signed the petition to rename Columbus to Confluence, Ohio. Share with friends to help us reach 22,000 signatures.',
  alternates: { canonical: '/sign/thank-you' },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'I just signed the Confluence Ohio petition!',
    description:
      'Join me — add your name to rename Columbus to Confluence, Ohio. 22,000 signatures puts the question on the ballot.',
    url: `${SITE_URL}/sign`,
    images: [
      {
        url: '/images/og/petition-share.png',
        width: 1200,
        height: 630,
        alt: 'Confluence Ohio — Sign the Petition',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'I just signed the Confluence Ohio petition!',
    description:
      'Join me — add your name to rename Columbus to Confluence, Ohio.',
    images: ['/images/og/petition-share.png'],
  },
};

// ---------------------------------------------------------------------------
// Data fetching (same as /sign page)
// ---------------------------------------------------------------------------

async function getSignatureCount(): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('campaign_metrics')
      .select('value')
      .eq('metric', 'signature_count')
      .maybeSingle();
    return data?.value ?? 0;
  } catch {
    return 0;
  }
}

async function getRecentSigners(): Promise<PublicRecentSigner[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.rpc('get_recent_signers', {
      p_limit: 10,
    });
    return (data as PublicRecentSigner[]) ?? [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; ref?: string }>;
}) {
  const params = await searchParams;
  const signatureNumber = params.n ? parseInt(params.n, 10) : null;
  const referralCode = params.ref ?? null;

  const [signatureCount, recentSigners] = await Promise.all([
    getSignatureCount(),
    getRecentSigners(),
  ]);

  return (
    <main className="pb-20 md:pb-0">
      {/* ─── Hero + share + CTAs (client component) ─── */}
      <ThankYouClient
        signatureNumber={signatureNumber}
        referralCode={referralCode}
      />

      {/* ─── Social proof (§4.2) ─── */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
          <SignatureCounterDynamic initialCount={signatureCount} />

          <div className="mt-6">
            <RecentSigners initialSigners={recentSigners} />
          </div>
        </div>
      </section>
    </main>
  );
}
