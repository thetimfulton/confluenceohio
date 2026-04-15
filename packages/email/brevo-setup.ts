#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// Brevo One-Time Setup Script — packages/email/brevo-setup.ts
// ---------------------------------------------------------------------------
// Creates custom contact attributes and lists in Brevo via API.
// Run once during initial project configuration:
//
//   cd packages/email && npx tsx brevo-setup.ts
//
// Requires BREVO_API_KEY in .env.local (or exported in shell).
// See Artifact 07 §1.2 (attributes) and §1.3 (lists).
// ---------------------------------------------------------------------------

const BREVO_API_URL = 'https://api.brevo.com/v3';

const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) {
  console.error('Error: BREVO_API_KEY environment variable is not set.');
  console.error('Export it or add it to .env.local before running this script.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Custom Contact Attributes (Artifact 07 §1.2)
// ---------------------------------------------------------------------------
// Brevo built-in attributes (FIRSTNAME, LASTNAME, EMAIL) don't need creation.
// Category attributes use the Brevo "enumeration" format: array of {value, label}.
// ---------------------------------------------------------------------------

interface AttributeDef {
  name: string;
  category: 'normal';
  type: 'text' | 'float' | 'date' | 'boolean' | 'category';
  enumeration?: Array<{ value: number; label: string }>;
}

const customAttributes: AttributeDef[] = [
  {
    name: 'SOURCE',
    category: 'normal',
    type: 'category',
    enumeration: [
      { value: 1, label: 'petition' },
      { value: 2, label: 'standalone' },
      { value: 3, label: 'volunteer' },
      { value: 4, label: 'blog' },
      { value: 5, label: 'footer' },
      { value: 6, label: 'event' },
    ],
  },
  { name: 'SIGNATURE_NUMBER', category: 'normal', type: 'float' },
  { name: 'REFERRAL_CODE', category: 'normal', type: 'text' },
  { name: 'REFERRAL_COUNT', category: 'normal', type: 'float' },
  {
    name: 'VERIFICATION_STATUS',
    category: 'normal',
    type: 'category',
    enumeration: [
      { value: 1, label: 'verified' },
      { value: 2, label: 'flagged' },
      { value: 3, label: 'rejected' },
    ],
  },
  { name: 'EMAIL_VERIFIED', category: 'normal', type: 'boolean' },
  { name: 'VOLUNTEER', category: 'normal', type: 'boolean' },
  { name: 'VOLUNTEER_ROLES', category: 'normal', type: 'text' },
  { name: 'DONOR', category: 'normal', type: 'boolean' },
  { name: 'DONATION_TOTAL', category: 'normal', type: 'float' },
  { name: 'CITY', category: 'normal', type: 'text' },
  { name: 'NEIGHBORHOOD', category: 'normal', type: 'text' },
  { name: 'SIGNED_AT', category: 'normal', type: 'date' },
  { name: 'LAST_ENGAGEMENT', category: 'normal', type: 'date' },
];

// ---------------------------------------------------------------------------
// Contact Lists (Artifact 07 §1.3)
// ---------------------------------------------------------------------------

const lists = [
  { name: 'All Subscribers', envVar: 'BREVO_LIST_ALL' },
  { name: 'Petition Signers', envVar: 'BREVO_LIST_SIGNERS' },
  { name: 'Verified Signers', envVar: 'BREVO_LIST_VERIFIED' },
  { name: 'Volunteers', envVar: 'BREVO_LIST_VOLUNTEERS' },
  { name: 'Donors', envVar: 'BREVO_LIST_DONORS' },
  { name: 'Engaged (30 days)', envVar: 'BREVO_LIST_ENGAGED' },
  { name: 'Disengaged (60+ days)', envVar: 'BREVO_LIST_DISENGAGED' },
  { name: 'Standalone Subscribers', envVar: 'BREVO_LIST_STANDALONE' },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

interface BrevoError {
  error: true;
  status: number;
  body: unknown;
}

type BrevoResult = BrevoError | Record<string, unknown>;

function isBrevoError(result: BrevoResult): result is BrevoError {
  return 'error' in result && result.error === true;
}

async function brevoRequest(
  path: string,
  options: RequestInit = {},
): Promise<BrevoResult> {
  const response = await fetch(`${BREVO_API_URL}${path}`, {
    ...options,
    headers: {
      'api-key': apiKey!,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    return { error: true, status: response.status, body };
  }

  return (body as Record<string, unknown>) ?? {};
}

// ---------------------------------------------------------------------------
// Attribute creation
// ---------------------------------------------------------------------------

async function createAttributes(): Promise<void> {
  console.log('\n--- Creating custom contact attributes ---\n');

  for (const attr of customAttributes) {
    const payload: Record<string, unknown> = { type: attr.type };
    if (attr.enumeration) {
      payload.enumeration = attr.enumeration;
    }

    const result = await brevoRequest(
      `/contacts/attributes/${attr.category}/${attr.name}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

    if (isBrevoError(result)) {
      if (result.status === 400) {
        // Attribute likely already exists
        console.log(`  [skip] ${attr.name} — already exists`);
      } else {
        console.error(`  [FAIL] ${attr.name} — ${JSON.stringify(result.body)}`);
      }
    } else {
      console.log(`  [ok]   ${attr.name} (${attr.type})`);
    }
  }
}

// ---------------------------------------------------------------------------
// List creation
// ---------------------------------------------------------------------------

async function createLists(): Promise<void> {
  console.log('\n--- Creating contact lists ---\n');
  console.log('Add these to your .env.local / Vercel environment:\n');

  for (const list of lists) {
    const result = await brevoRequest('/contacts/lists', {
      method: 'POST',
      body: JSON.stringify({ name: list.name, folderId: 1 }),
    });

    if (isBrevoError(result)) {
      console.error(
        `  [FAIL] ${list.name} — ${JSON.stringify(result.body)}`,
      );
    } else if ('id' in result) {
      console.log(`  [ok]   ${list.name} — id: ${result.id}`);
      console.log(`         ${list.envVar}=${result.id}`);
    }
  }

  console.log(
    '\nCopy the list IDs above into your .env.local file.',
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Brevo One-Time Setup');
  console.log('====================');

  await createAttributes();
  await createLists();

  console.log('\nDone. Review output above for any errors.');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
