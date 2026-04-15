/**
 * Seed script for local development.
 * Creates 10 sample signatures and 3 voice submissions.
 *
 * Usage: SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... npx tsx seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function sha256(input: string): string {
  return createHash('sha256').update(input.toLowerCase().trim()).digest('hex');
}

async function seed() {
  console.log('Seeding database...');

  // ---- Sample Signatures ----
  const sampleSignatures = [
    { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@example.com', city: 'Clintonville', address: '123 High St' },
    { first_name: 'Marcus', last_name: 'Williams', email: 'marcus.w@example.com', city: 'Franklinton', address: '456 Sullivant Ave' },
    { first_name: 'Priya', last_name: 'Patel', email: 'priya.p@example.com', city: 'Dublin', address: '789 Dublin Rd' },
    { first_name: 'James', last_name: "O'Brien", email: 'james.ob@example.com', city: 'German Village', address: '101 Mohawk St' },
    { first_name: 'Amina', last_name: 'Hassan', email: 'amina.h@example.com', city: 'Northland', address: '202 Morse Rd' },
    { first_name: 'Tom', last_name: 'Kowalski', email: 'tom.k@example.com', city: 'Upper Arlington', address: '303 Tremont Rd' },
    { first_name: 'Jasmine', last_name: 'Wright', email: 'jasmine.w@example.com', city: 'Clintonville', address: '404 Indianola Ave' },
    { first_name: 'David', last_name: 'Rivera', email: 'david.r@example.com', city: 'Westerville', address: '505 State St' },
    { first_name: 'Chen', last_name: 'Wei', email: 'chen.w@example.com', city: 'Dublin', address: '606 Sawmill Rd' },
    { first_name: 'Maria', last_name: 'Santos', email: 'maria.s@example.com', city: 'Franklinton', address: '707 W Broad St' },
  ];

  for (let i = 0; i < sampleSignatures.length; i++) {
    const sig = sampleSignatures[i];
    const referralCode = 'CONF-' + randomUUID().slice(0, 4).toUpperCase();

    const { error } = await supabase.from('signatures').insert({
      first_name: sig.first_name,
      last_name: sig.last_name,
      email: sig.email,
      address_line_1: sig.address,
      city: sig.city,
      state: 'OH',
      zip_code: '43201',
      address_hash: sha256(sig.address + '|' + sig.city + '|OH'),
      email_hash: sha256(sig.email),
      verification_status: 'verified',
      turnstile_token_valid: true,
      referral_code: referralCode,
      signature_number: i + 1,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      email_opt_in: true,
    });

    if (error) {
      console.error(`Failed to insert signature ${sig.email}:`, error.message);
    }
  }

  console.log('  10 signatures inserted.');

  // ---- Sample Voice Submissions ----
  const sampleVoices = [
    {
      author_name: 'Maria S.',
      author_email: 'maria.s@example.com',
      author_neighborhood: 'Franklinton',
      position: 'support' as const,
      title: 'The rivers were here first',
      body: 'I grew up in Franklinton, a block from the Scioto. My grandmother told me stories about the floods, the cleanup, the way the neighborhood rebuilt itself around that river. Confluence just feels right. It is what this place has always been — a meeting point.',
      slug: 'maria-s-the-rivers-were-here-first',
      moderation_status: 'approved' as const,
      featured: true,
    },
    {
      author_name: 'Tom K.',
      author_email: 'tom.k@example.com',
      author_neighborhood: 'Upper Arlington',
      position: 'oppose' as const,
      title: 'Columbus is my city',
      body: 'I get the argument. I really do. But I have been a Columbusite for 40 years. The name means something to me that has nothing to do with the explorer. It is my city, my home, my identity. I am not ready to give that up for a word that sounds like a software product.',
      slug: 'tom-k-columbus-is-my-city',
      moderation_status: 'approved' as const,
      featured: true,
    },
    {
      author_name: 'Jasmine W.',
      author_email: 'jasmine.w@example.com',
      author_neighborhood: 'Clintonville',
      position: 'undecided' as const,
      title: 'I keep going back and forth',
      body: 'Some days I think Confluence is beautiful and obvious. Other days I think: is this really the best use of civic energy right now? I signed up to follow the campaign because I genuinely do not know yet. I appreciate that they publish all sides.',
      slug: 'jasmine-w-i-keep-going-back-and-forth',
      moderation_status: 'approved' as const,
      featured: true,
    },
  ];

  for (const voice of sampleVoices) {
    const { error } = await supabase.from('voice_submissions').insert({
      ...voice,
      approved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`Failed to insert voice "${voice.title}":`, error.message);
    }
  }

  console.log('  3 voice submissions inserted.');

  // ---- Reset campaign_metrics to match seed data ----
  await supabase.from('campaign_metrics').update({ value: 10 }).eq('metric', 'signature_count');
  await supabase.from('campaign_metrics').update({ value: 10 }).eq('metric', 'verified_signature_count');
  await supabase.from('campaign_metrics').update({ value: 3 }).eq('metric', 'voice_submission_count');

  console.log('  Campaign metrics updated.');

  // ---- Sync signature_counter to match seeded signatures ----
  await supabase.from('signature_counter').update({ next_number: sampleSignatures.length + 1 }).eq('id', 1);

  console.log('  Signature counter synced.');
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
