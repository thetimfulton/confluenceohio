#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// Brevo Template Creation Script — scripts/create-brevo-templates.ts
// ---------------------------------------------------------------------------
// Creates placeholder templates in Brevo via API (POST /v3/smtp/templates).
// Outputs the assigned template IDs for copying into .env.local.
//
// Usage:
//   BREVO_API_KEY=xkeysib-... npx tsx scripts/create-brevo-templates.ts
//
// Or if BREVO_API_KEY is already in .env.local:
//   npx tsx scripts/create-brevo-templates.ts
//
// The script creates each template with placeholder HTML containing the
// correct {{ params.X }} variables. You can then edit the templates in
// Brevo's dashboard to apply the full design.
//
// See docs/email-templates.md for complete template specifications.
// See packages/email/templates.ts for the registry mapping.
// ---------------------------------------------------------------------------

const BREVO_API_URL = 'https://api.brevo.com/v3';
const SENDER_EMAIL = 'campaign@confluenceohio.org';
const SENDER_NAME = 'Confluence Ohio';

// ---------------------------------------------------------------------------
// Load env from .env.local if present
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(): void {
  const envPaths = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '..', '.env.local'),
    resolve(process.cwd(), '..', '..', '.env.local'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      console.log(`Loaded env from: ${envPath}`);
      break;
    }
  }
}

loadEnvFile();

const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) {
  console.error('Error: BREVO_API_KEY environment variable is not set.');
  console.error(
    'Export it, add it to .env.local, or pass it inline:\n' +
      '  BREVO_API_KEY=xkeysib-... npx tsx scripts/create-brevo-templates.ts',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------
// Each entry maps to a key in packages/email/templates.ts (TEMPLATE_IDS).
// The envVar matches what getTemplateId() reads from process.env.
// ---------------------------------------------------------------------------

interface TemplateDef {
  /** Human-readable name shown in Brevo dashboard */
  name: string;
  /** Environment variable name for the template ID */
  envVar: string;
  /** Default subject line (can use {{ params.X }} Brevo syntax) */
  subject: string;
  /** Whether this is a transactional email (vs. marketing) */
  isTransactional: boolean;
  /** Placeholder HTML body ({{ params.X }} variables included) */
  htmlContent: string;
}

const FOOTER_MARKETING = `
<div style="background:#f5f5f5;padding:24px;text-align:center;font-size:14px;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <p style="margin:0 0 8px;">Confluence Ohio &middot; PO Box 8012 &middot; Columbus, OH 43201</p>
  <p style="margin:0;">
    You're receiving this because you signed the petition or subscribed at confluenceohio.org.<br>
    <a href="{{ unsubscribe }}" style="color:#1e40af;">Unsubscribe</a> &middot;
    <a href="https://confluenceohio.org/privacy" style="color:#1e40af;">Privacy Policy</a>
  </p>
</div>`;

const FOOTER_TRANSACTIONAL = `
<div style="background:#f5f5f5;padding:24px;text-align:center;font-size:14px;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <p style="margin:0 0 8px;">Confluence Ohio &middot; PO Box 8012 &middot; Columbus, OH 43201</p>
  <p style="margin:0;">
    <a href="https://confluenceohio.org/privacy" style="color:#1e40af;">Privacy Policy</a>
  </p>
</div>`;

function wrapBody(body: string, isTransactional: boolean, preheader: string): string {
  const footer = isTransactional ? FOOTER_TRANSACTIONAL : FOOTER_MARKETING;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confluence Ohio</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr>
      <td style="padding:24px;">
        <img src="https://confluenceohio.org/logo.png" alt="Confluence Ohio" width="120" style="display:block;margin-bottom:24px;">
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;font-size:16px;color:#333333;line-height:1.6;">
${body}
      </td>
    </tr>
    <tr>
      <td>${footer}</td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:#1e40af;border-radius:6px;padding:0;">
      <a href="${url}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">${text}</a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Template list — ordered to match docs/email-templates.md
// ---------------------------------------------------------------------------

const templates: TemplateDef[] = [
  // 1. Email Verification
  {
    name: 'Email Verification',
    envVar: 'BREVO_TEMPLATE_EMAIL_VERIFY',
    subject: "Confirm your signature — you're signer #{{ params.SIGNATURE_NUMBER }}!",
    isTransactional: true,
    htmlContent: wrapBody(
      `<p>Hi {{ params.FIRSTNAME }},</p>
<p>You just signed the petition to rename Columbus to Confluence, Ohio. You're signer #{{ params.SIGNATURE_NUMBER }}.</p>
<p>Confirm your email to verify your signature:</p>
${ctaButton('Confirm My Signature &rarr;', '{{ params.VERIFICATION_URL }}')}
<p>This link expires in 72 hours.</p>
<p style="color:#666;">If you didn't sign this petition, you can safely ignore this email.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      true,
      'Click to verify your email and make it official.',
    ),
  },

  // 2. Verification Reminder (24h)
  {
    name: 'Verification Reminder',
    envVar: 'BREVO_TEMPLATE_VERIFY_REMINDER',
    subject: "Don't forget to confirm — your signature is waiting",
    isTransactional: true,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>You signed the petition yesterday, but we haven't confirmed your email yet. Without confirmation, your signature can't be verified.</p>
<p>You have about {{ params.HOURS_REMAINING }} hours left:</p>
${ctaButton('Confirm My Signature &rarr;', '{{ params.VERIFICATION_URL }}')}
<p>That's it &mdash; one click and you're officially signer #{{ params.SIGNATURE_NUMBER }}.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      true,
      "One click and you're officially signer #{{ params.SIGNATURE_NUMBER }}.",
    ),
  },

  // 3. Resend Verification
  {
    name: 'Resend Verification',
    envVar: 'BREVO_TEMPLATE_RESEND_VERIFY',
    subject: 'Last chance to confirm your signature',
    isTransactional: true,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Your original verification link has expired. We've generated a new one.</p>
<p>Confirm your email to make your signature count:</p>
${ctaButton('Confirm My Signature &rarr;', '{{ params.VERIFICATION_URL }}')}
<p>This new link expires in 72 hours.</p>
<p>If you no longer want to be part of this, no action needed. But if you signed because you believe this city's name should reflect what it actually is &mdash; please take 5 seconds to click the button above.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      true,
      'Your verification link expires today. Confirm now to make your signature count.',
    ),
  },

  // 4. Welcome — Verified Signer
  {
    name: 'Verified Signer Welcome',
    envVar: 'BREVO_TEMPLATE_VERIFIED_WELCOME',
    subject: "You're verified — signer #{{ params.SIGNATURE_NUMBER }} is official",
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Your email is confirmed. You're officially signer #{{ params.SIGNATURE_NUMBER }}.</p>
<p>We're at {{ params.CURRENT_COUNT }} verified signatures. Every confirmed signer brings us closer to the ballot.</p>
<p>Share your personal link to help us grow:</p>
<p style="background:#f5f5f5;padding:12px;border-radius:4px;font-family:monospace;">{{ params.SHARE_URL }}</p>
<p>Every person who signs through your link is tracked &mdash; we'll notify you when your friends join.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'Your signature is confirmed. Here\'s your personal share link to recruit friends.',
    ),
  },

  // 5. Welcome 1 — Signature Confirmation
  {
    name: 'Welcome 1 — Signature Confirmation',
    envVar: 'BREVO_TEMPLATE_WELCOME_1',
    subject: "You're signer #{{ params.SIGNATURE_NUMBER }} — welcome to the movement",
    isTransactional: false,
    htmlContent: wrapBody(
      `<h1 style="color:#1e3a5f;font-size:22px;">You're signer #{{ params.SIGNATURE_NUMBER }}.</h1>
<p>{{ params.CURRENT_COUNT }} people have added their names so far. Help us reach {{ params.NEXT_MILESTONE }} &mdash; share with 3 friends.</p>
<p style="background:#f5f5f5;padding:12px;border-radius:4px;">Your personal share link: <strong>{{ params.SHARE_URL }}</strong></p>
<p>Every person who signs through your link is tracked &mdash; we'll let you know when your friends join.</p>
<p>Thank you for being part of this.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      '{{ params.CURRENT_COUNT }} people and counting. Help us reach {{ params.NEXT_MILESTONE }}.',
    ),
  },

  // 6. Welcome 2 — The Story
  {
    name: 'Welcome 2 — The Story',
    envVar: 'BREVO_TEMPLATE_WELCOME_2',
    subject: 'The tavern, the rivers, and how Columbus got its name',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>In 1812, the Ohio legislature needed a name for the state's new capital. The city sat at the confluence of the Scioto and Olentangy rivers &mdash; the very reason the site was chosen.</p>
<p>But a tavern-owning legislator named Joseph Foos admired Christopher Columbus, and over drinks, he persuaded his colleagues to name the city after an Italian explorer who never came within a thousand miles of Ohio.</p>
<p>That was a fine name for its time. But times change.</p>
<p>In 2020, the city removed the Columbus statue from City Hall and replaced Columbus Day with Indigenous Peoples' Day. In 2023, the city launched a $3.5 million "Reimagining Columbus" initiative.</p>
<p>"Confluence" isn't just a pretty word. It's what this city literally is: the place where two rivers meet, where diverse communities converge, where ideas collide.</p>
${ctaButton('Read the Full Case &rarr;', 'https://confluenceohio.org/the-case')}
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'In 1812, a tavern owner convinced the legislature to borrow a name. Here\'s the full story.',
    ),
  },

  // 7. Welcome 3 — Community Voices
  {
    name: 'Welcome 3 — Community Voices',
    envVar: 'BREVO_TEMPLATE_WELCOME_3',
    subject: "Why did you sign? We'd love to hear your perspective",
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>We're at {{ params.CURRENT_COUNT }} signatures. But numbers alone don't tell the story. We want to hear yours.</p>
<p>Why did you sign? What does the name of this city mean to you? Whether you support the change wholeheartedly, have reservations, or signed out of curiosity &mdash; your perspective matters.</p>
<p>In 300 words or less, share your thoughts. We publish all perspectives &mdash; support, opposition, and everything in between.</p>
${ctaButton('Share Your Perspective &rarr;', '{{ params.VOICES_URL }}')}
<p style="color:#666;font-size:14px;">Here's something you might not know: nearly 200 burial and ceremonial mounds have been documented in Franklin County, several at the confluence itself.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      '{{ params.CURRENT_COUNT }} voices and counting. Add yours to the conversation.',
    ),
  },

  // 8. Welcome 4 — Get Involved
  {
    name: 'Welcome 4 — Get Involved',
    envVar: 'BREVO_TEMPLATE_WELCOME_4',
    subject: 'Beyond the petition: 6 ways to make Confluence happen',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Your signature moved us one step closer to the ballot. Here's how to take the next step.</p>
<p><strong>SIGNATURE COLLECTOR</strong> (2 hrs/week)<br>Table at farmers markets and community events.</p>
<p><strong>SOCIAL AMPLIFIER</strong> (15 min/day)<br>Share campaign content and engage in online conversations.</p>
<p><strong>NEIGHBORHOOD CAPTAIN</strong> (3 hrs/week)<br>Coordinate efforts in your area.</p>
<p><strong>EVENT ORGANIZER</strong> (4 hrs/month)<br>Plan community forums, info sessions, and house parties.</p>
${ctaButton('Find Your Role &rarr;', '{{ params.VOLUNTEER_URL }}')}
<p>Or help fund the campaign:</p>
${ctaButton('Donate Any Amount &rarr;', '{{ params.DONATE_URL }}')}
<p>$5 prints a yard sign. $25 covers an hour of legal review. Every dollar goes directly to getting this question on the ballot.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'Signature collectors, social amplifiers, neighborhood captains — find your role.',
    ),
  },

  // 9. Signer-to-Volunteer Conversion
  {
    name: 'Signer to Volunteer',
    envVar: 'BREVO_TEMPLATE_SIGNER_TO_VOLUNTEER',
    subject: '{{ params.FIRSTNAME }}, we could use your help this weekend',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Last weekend, 12 volunteers collected 300 signatures in 5 neighborhoods. This campaign moves when people show up &mdash; and we could use you.</p>
<p>Even 2 hours makes a difference.</p>
${ctaButton('Sign Up to Volunteer &rarr;', '{{ params.VOLUNTEER_URL }}')}
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'Last weekend, 12 volunteers collected 300 signatures. Join them.',
    ),
  },

  // 10. Signer-to-Donor Conversion
  {
    name: 'Signer to Donor',
    envVar: 'BREVO_TEMPLATE_SIGNER_TO_DONOR',
    subject: '$5 = one more yard sign in your neighborhood',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Getting a name change on the ballot takes more than signatures. Here's where every dollar goes:</p>
<ul style="line-height:2;">
  <li><strong>$5</strong> &mdash; prints a yard sign</li>
  <li><strong>$25</strong> &mdash; covers an hour of legal review</li>
  <li><strong>$100</strong> &mdash; funds a neighborhood canvass day</li>
</ul>
${ctaButton('Chip In &rarr;', '{{ params.DONATE_URL }}')}
<p>Any amount helps. Even $5. If you can, we'd appreciate it.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'Every dollar funds signature collection, legal review, and community outreach.',
    ),
  },

  // 11. Milestone Celebration
  {
    name: 'Milestone Celebration',
    envVar: 'BREVO_TEMPLATE_MILESTONE',
    subject: '{{ params.MILESTONE }} signatures reached!',
    isTransactional: false,
    htmlContent: wrapBody(
      `<h1 style="color:#1e3a5f;font-size:28px;text-align:center;">{{ params.MILESTONE }} signatures</h1>
<p style="text-align:center;font-size:18px;">This is what civic participation looks like.</p>
<div style="background:#f0f0f0;border-radius:8px;padding:16px;margin:24px 0;">
  <div style="background:#1e40af;height:12px;border-radius:6px;width:{{ params.MILESTONE_PERCENTAGE }}%;"></div>
  <p style="text-align:center;margin:8px 0 0;font-size:14px;color:#666;">{{ params.MILESTONE }} of 22,000 ({{ params.MILESTONE_PERCENTAGE }}%)</p>
</div>
<p>We're {{ params.MILESTONE_PERCENTAGE }}% of the way to the ballot. Help us reach {{ params.NEXT_MILESTONE }}.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'We did it. {{ params.MILESTONE }} people have signed. Next stop: {{ params.NEXT_MILESTONE }}.',
    ),
  },

  // 12. Re-engagement 1
  {
    name: 'Re-engagement 1',
    envVar: 'BREVO_TEMPLATE_RE_ENGAGEMENT_1',
    subject: "A lot has happened since you signed — here's the update",
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>It's been a while. Here's what's happened with the Confluence campaign:</p>
<p>We're at <strong>{{ params.CURRENT_COUNT }}</strong> signatures.</p>
<p><!-- UPDATE THIS SECTION periodically with recent developments --></p>
${ctaButton('Catch Up on the Campaign &rarr;', 'https://confluenceohio.org')}
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      "We're at {{ params.CURRENT_COUNT }} signatures. Here's what you missed.",
    ),
  },

  // 13. Re-engagement 2
  {
    name: 'Re-engagement 2',
    envVar: 'BREVO_TEMPLATE_RE_ENGAGEMENT_2',
    subject: 'Still with us?',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>We haven't heard from you in a while.</p>
<p>If you'd still like campaign updates, you don't need to do anything. We'll keep you in the loop.</p>
<p>If not, the unsubscribe link is below &mdash; no hard feelings.</p>
<p>Either way, thank you for signing. Your name is still on the petition and it still counts.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      "If you'd like to keep hearing from us, no action needed. If not, you can unsubscribe below.",
    ),
  },

  // 14. Volunteer Confirmation
  {
    name: 'Volunteer Confirmation',
    envVar: 'BREVO_TEMPLATE_VOLUNTEER_CONFIRM',
    subject: "Welcome aboard, {{ params.FIRSTNAME }} — you're a Confluence volunteer",
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Thank you for volunteering. You signed up for:</p>
<p><strong>{{ params.ROLES }}</strong></p>
<p>Here's what happens next:</p>
<div>{{ params.ROLE_NEXT_STEPS }}</div>
<p>We'll be in touch within the next few days with more details and your first opportunity to get involved.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'You signed up as: {{ params.ROLES }}. Here\'s what happens next.',
    ),
  },

  // 15. Volunteer Onboarding (Day 3)
  {
    name: 'Volunteer Onboarding',
    envVar: 'BREVO_TEMPLATE_VOLUNTEER_ONBOARD_2',
    subject: 'Your {{ params.PRIMARY_ROLE }} guide is ready',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Your volunteer guide is ready. It covers everything you need to get started:</p>
<ul>
  <li>What to expect in your first week</li>
  <li>Key talking points and FAQs</li>
  <li>How to connect with other volunteers in your area</li>
  <li>Upcoming events and opportunities</li>
</ul>
${ctaButton('Read Your Guide &rarr;', '{{ params.ROLE_GUIDE_URL }}')}
<p>Questions? Reply to this email &mdash; a real person reads every reply.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'Everything you need to get started in your role.',
    ),
  },

  // 16. Standalone Subscriber Welcome
  {
    name: 'Standalone Subscriber Welcome',
    envVar: 'BREVO_TEMPLATE_STANDALONE_WELCOME',
    subject: "Welcome — here's why {{ params.CURRENT_COUNT }} people have signed",
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Welcome to Confluence Ohio. Here's the 30-second version:</p>
<p>Columbus, Ohio was named after Christopher Columbus in 1812, by a state legislator who admired the explorer. The city actually sits at the confluence of the Scioto and Olentangy rivers &mdash; and "Confluence" better reflects what this place actually is.</p>
<p>{{ params.CURRENT_COUNT }} people have signed the petition to put a name change on the ballot.</p>
${ctaButton('Sign the Petition &rarr;', '{{ params.SIGN_URL }}')}
<p>We'll send you campaign updates, but never spam. Unsubscribe any time.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      "You're on the list. Here's the case for renaming Columbus.",
    ),
  },

  // 17. Donation Thank You
  {
    name: 'Donation Thank You',
    envVar: 'BREVO_TEMPLATE_DONATION_THANKS',
    subject: 'Thank you, {{ params.DONOR_NAME }} — your {{ params.AMOUNT }} makes a difference',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.DONOR_NAME }},</p>
<p>Thank you for your {{ params.AMOUNT }} donation to Confluence Ohio.</p>
<p>Here's what your contribution funds:</p>
<ul>
  <li>Signature collection materials (petitions, clipboards, canopies)</li>
  <li>Legal review and ballot access filings</li>
  <li>Digital outreach and community engagement</li>
  <li>Printed materials (yard signs, flyers, postcards)</li>
</ul>
<p>Every dollar goes directly to getting this question on the ballot.</p>
<p style="color:#666;font-size:14px;">Your donation receipt will come separately from ActBlue. Contributions to a 501(c)(4) organization are generally not tax-deductible.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      "Here's exactly what your donation funds.",
    ),
  },

  // 18. Donation Thank You (Recurring)
  {
    name: 'Donation Thank You (Recurring)',
    envVar: 'BREVO_TEMPLATE_DONATION_THANKS_RECURRING',
    subject: 'Thank you for your monthly {{ params.AMOUNT }}, {{ params.DONOR_NAME }}',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.DONOR_NAME }},</p>
<p>Thank you for setting up a monthly {{ params.AMOUNT }} contribution to Confluence Ohio.</p>
<p>Recurring donors are the backbone of this campaign. Your steady support means we can plan ahead &mdash; booking event spaces, printing materials, and funding legal work &mdash; with confidence.</p>
<p>You can manage or cancel your recurring donation at any time through ActBlue.</p>
<p style="color:#666;font-size:14px;">Contributions to a 501(c)(4) organization are generally not tax-deductible.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'Recurring support like yours keeps this campaign running.',
    ),
  },

  // 19. Admin: New Volunteer
  {
    name: 'Admin: New Volunteer Notification',
    envVar: 'BREVO_TEMPLATE_ADMIN_NEW_VOLUNTEER',
    subject: 'New volunteer: {{ params.VOLUNTEER_NAME }}',
    isTransactional: true,
    htmlContent: wrapBody(
      `<h2 style="color:#1e3a5f;">New Volunteer Signup</h2>
<table style="width:100%;border-collapse:collapse;">
  <tr><td style="padding:8px 0;font-weight:bold;">Name:</td><td>{{ params.VOLUNTEER_NAME }}</td></tr>
  <tr><td style="padding:8px 0;font-weight:bold;">Email:</td><td>{{ params.VOLUNTEER_EMAIL }}</td></tr>
  <tr><td style="padding:8px 0;font-weight:bold;">Roles:</td><td>{{ params.ROLES }}</td></tr>
  <tr><td style="padding:8px 0;font-weight:bold;">Neighborhood:</td><td>{{ params.NEIGHBORHOOD }}</td></tr>
</table>
<p style="color:#666;font-size:14px;">This volunteer has received an automated confirmation email. Follow up within 48 hours if their role requires direct coordination.</p>`,
      true,
      'Roles: {{ params.ROLES }}',
    ),
  },

  // 20. Volunteer Role Update
  {
    name: 'Volunteer Role Update',
    envVar: 'BREVO_TEMPLATE_VOLUNTEER_ROLE_UPDATE',
    subject: 'Your volunteer roles have been updated',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Your volunteer roles have been updated to: <strong>{{ params.NEW_ROLES }}</strong>.</p>
<p>Here's what to expect next:</p>
<div>{{ params.ROLE_NEXT_STEPS }}</div>
${ctaButton('Visit the Volunteer Dashboard &rarr;', '{{ params.VOLUNTEER_URL }}')}
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'New roles: {{ params.NEW_ROLES }}. Here\'s what to expect.',
    ),
  },

  // 21. Volunteer First Task (Day 7)
  {
    name: 'Volunteer First Task',
    envVar: 'BREVO_TEMPLATE_VOLUNTEER_FIRST_TASK',
    subject: "Your first task: this week's volunteer opportunity",
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>You've had a few days to read through your guide. Ready for your first task?</p>
<p><!-- UPDATE THIS SECTION periodically with a current, specific opportunity --></p>
<p>Check the volunteer dashboard for all current opportunities:</p>
${ctaButton('See All Opportunities &rarr;', '{{ params.VOLUNTEER_URL }}')}
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'A specific, time-bounded way to contribute this week.',
    ),
  },

  // 22. Volunteer Check-in (Day 14)
  {
    name: 'Volunteer Check-in',
    envVar: 'BREVO_TEMPLATE_VOLUNTEER_CHECK_IN',
    subject: "How's it going, {{ params.FIRSTNAME }}?",
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>You signed up to volunteer two weeks ago. How's it going?</p>
<p>If you've already jumped in &mdash; thank you. You're making a difference.</p>
<p>If life got in the way, no worries. Here are some low-effort ways to contribute:</p>
<ul>
  <li>Share a campaign post on social media (2 minutes)</li>
  <li>Send your personal petition link to 3 friends (1 minute)</li>
  <li>Talk to one neighbor about the campaign this week</li>
</ul>
${ctaButton('Check the Volunteer Dashboard &rarr;', '{{ params.VOLUNTEER_URL }}')}
<p>Questions, feedback, or ideas? Reply to this email.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'Quick check-in from the Confluence Ohio team.',
    ),
  },

  // 23. Subscriber Nurture: The Case in 5 Minutes (Day 2)
  {
    name: 'Subscriber: The Case in 5 Minutes',
    envVar: 'BREVO_TEMPLATE_SUBSCRIBER_CASE',
    subject: 'The case for Confluence, in 5 minutes',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Yesterday you signed up for campaign updates. Here's the full picture.</p>
<h3 style="color:#1e3a5f;">THE HISTORY</h3>
<p>In 1812, Ohio's legislature needed a name for the new capital. A tavern owner named Joseph Foos lobbied for "Columbus." It stuck &mdash; but it was always a borrowed name.</p>
<h3 style="color:#1e3a5f;">THE GEOGRAPHY</h3>
<p>"Confluence" means the meeting point of two rivers. That's literally what this city is.</p>
<h3 style="color:#1e3a5f;">THE MOMENTUM</h3>
<p>The city already removed the Columbus statue, replaced Columbus Day with Indigenous Peoples' Day, and launched a "Reimagining Columbus" initiative.</p>
${ctaButton('Read the Full Case &rarr;', '{{ params.CASE_URL }}')}
<p>Or, if you've seen enough:</p>
${ctaButton('Sign the Petition &rarr;', '{{ params.SIGN_URL }}')}
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      "History, geography, and why this city's name should fit what it actually is.",
    ),
  },

  // 24. Subscriber Nurture: Ready to Sign? (Day 5)
  {
    name: 'Subscriber: Ready to Sign?',
    envVar: 'BREVO_TEMPLATE_SUBSCRIBER_PETITION_CTA',
    subject: 'Ready to add your name?',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>{{ params.CURRENT_COUNT }} people have signed the petition. Each signature brings us closer to putting the question on the ballot and letting Columbus voters decide.</p>
<p>Signing takes about 60 seconds. You'll enter your name, Ohio address (for verification), and email.</p>
${ctaButton('Sign the Petition &rarr;', '{{ params.SIGN_URL }}')}
<p>Not ready yet? That's fine. We'll keep you updated as the campaign progresses.</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'It takes 60 seconds. Your signature helps get this question on the ballot.',
    ),
  },

  // 25. Subscriber Nurture: Community + Share (Day 10)
  {
    name: 'Subscriber: Community Voices',
    envVar: 'BREVO_TEMPLATE_SUBSCRIBER_VOICES',
    subject: 'What people are saying about Confluence',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>This campaign isn't just about us. Here's what people across Columbus are saying:</p>
<p><!-- UPDATE THIS SECTION periodically with 2-3 curated community voice excerpts --></p>
<p>We publish all perspectives &mdash; support, opposition, and everything in between.</p>
${ctaButton('Share Your Perspective &rarr;', '{{ params.VOICES_URL }}')}
<p>Or, if you're ready:</p>
${ctaButton('Sign the Petition &rarr;', '{{ params.SIGN_URL }}')}
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      'Voices from across Columbus — support, opposition, and everything in between.',
    ),
  },

  // 26. Referral Notification
  {
    name: 'Referral Notification',
    envVar: 'BREVO_TEMPLATE_REFERRAL_NOTIFY',
    subject: 'Someone signed through your link!',
    isTransactional: false,
    htmlContent: wrapBody(
      `<p>{{ params.FIRSTNAME }},</p>
<p>Someone just signed the petition through your link &mdash; they're signer #{{ params.NEW_SIGNER_NUMBER }}.</p>
<p>You've referred <strong>{{ params.REFERRAL_COUNT }}</strong> people so far.</p>
<p>Keep sharing:</p>
<p style="background:#f5f5f5;padding:12px;border-radius:4px;font-family:monospace;">{{ params.SHARE_URL }}</p>
<p>&mdash; The Confluence Ohio Team</p>`,
      false,
      "Your referral just became signer #{{ params.NEW_SIGNER_NUMBER }}. Keep sharing!",
    ),
  },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

interface BrevoTemplateResponse {
  id: number;
}

interface BrevoErrorResponse {
  code: string;
  message: string;
}

async function createTemplate(template: TemplateDef): Promise<number | null> {
  const body = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    templateName: template.name,
    subject: template.subject,
    htmlContent: template.htmlContent,
    isActive: true,
  };

  const response = await fetch(`${BREVO_API_URL}/smtp/templates`, {
    method: 'POST',
    headers: {
      'api-key': apiKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as BrevoErrorResponse;
    if (response.status === 400 && errorBody.message?.includes('already exists')) {
      return null; // Template name already taken
    }
    throw new Error(
      `Failed to create template "${template.name}": ${response.status} ${JSON.stringify(errorBody)}`,
    );
  }

  const result = (await response.json()) as BrevoTemplateResponse;
  return result.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Brevo Template Creation');
  console.log('=======================\n');
  console.log(`Creating ${templates.length} templates...\n`);

  const results: Array<{ name: string; envVar: string; id: number | null }> = [];

  for (const template of templates) {
    try {
      const id = await createTemplate(template);
      results.push({ name: template.name, envVar: template.envVar, id });

      if (id !== null) {
        console.log(`  [ok]   ${template.name} — id: ${id}`);
      } else {
        console.log(`  [skip] ${template.name} — already exists`);
      }
    } catch (err) {
      console.error(`  [FAIL] ${template.name} — ${(err as Error).message}`);
      results.push({ name: template.name, envVar: template.envVar, id: null });
    }
  }

  // Output environment variable assignments
  const created = results.filter((r) => r.id !== null);
  if (created.length > 0) {
    console.log('\n--- Copy these to .env.local ---\n');
    for (const r of created) {
      console.log(`${r.envVar}=${r.id}`);
    }
  }

  const skipped = results.filter((r) => r.id === null);
  if (skipped.length > 0) {
    console.log(`\n${skipped.length} template(s) skipped (already exist).`);
    console.log(
      'To get their IDs, check the Brevo dashboard or use:\n' +
        '  GET https://api.brevo.com/v3/smtp/templates?limit=50',
    );
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Template creation failed:', err);
  process.exit(1);
});
