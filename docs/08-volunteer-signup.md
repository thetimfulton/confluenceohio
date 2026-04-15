# Confluence Ohio — Volunteer Sign-Up and Coordination

**Artifact 08 · Prompt 8 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 05 (Data Model), Artifact 07 (Email Automation)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **Petition committee formation.** ✅ Committee of five electors has NOT yet been formed but will be before physical petition circulation begins. Columbus City Charter §42 requires filing with the City Clerk + City Attorney review before any part-petitions can be circulated. **Implication for launch:** The website launches with the digital petition first. Signature Collector volunteers can sign up and begin training, but they cannot circulate physical petitions until the committee is registered. The site should make clear that the digital petition is Phase 1 (building momentum and demonstrating support) and physical petition circulation is Phase 2 (triggered once the committee is filed). Training sessions should be scheduled to align with the committee filing timeline.

2. **Paid circulator disclosure.** ✅ **Volunteer-only.** No paid circulators planned. The petition form and circulator affidavit do not need a paid-circulator notice. If this changes later, the petition forms must be updated before any paid circulators begin work.

3. **Digital-first petition strategy.** ✅ **Confirmed: digital petition first, physical petition second.** The campaign will launch with the online petition at /sign to build momentum, demonstrate public support, and capture contact information for future volunteer and physical-petition outreach. Once sufficient digital signatures demonstrate viability, the campaign will form the petition committee and transition to physical signature collection. **This distinction must be clearly communicated on the site** — the digital petition page should include language explaining that online signatures demonstrate support and that a formal legal petition (physical signatures) will follow. Volunteer Signature Collectors will be recruited and trained during the digital phase so they're ready when physical collection begins.

4. **Outreach Liaison role.** ✅ **Confirmed — add as 7th role.** `outreach_liaison` added to the role definitions. Migration addendum in §10 updates the Artifact 05 column comment.

5. **Columbus neighborhoods dropdown.** ✅ **List approved.** ~45 curated neighborhoods from §2.5 confirmed for launch.

---

## 1. Volunteer Role Definitions

Seven roles, ordered by campaign priority (highest-impact roles first). Each role has a unique identifier (used in the database `roles` JSONB array), display name, description, time commitment, skills needed, and onboarding requirements.

### 1.1 Signature Collector

| Field | Value |
|---|---|
| **ID** | `signature_collector` |
| **Display Name** | Signature Collector |
| **Description** | Gather petition signatures at community events, farmers markets, festivals, and door-to-door. This is the most direct path to 22,000 signatures. |
| **Time Commitment** | 2–5 hours/week |
| **Mode** | In-person |
| **Skills Needed** | Comfortable talking to strangers, friendly demeanor, basic knowledge of the campaign's talking points |
| **Onboarding Required** | **Mandatory training** before first shift. Covers: Ohio petition circulation law (circulator must witness every signature, one circulator per part-petition, circulator affidavit requirements), talking points, handling objections, de-escalation, data privacy |
| **Materials Provided** | Official petition forms, campaign talking points card, FAQ handout, clipboard, pen, volunteer shift tracker |
| **Legal Note** | Circulators must be Ohio residents. Each circulator signs an affidavit under penalty of election falsification attesting they witnessed every signature and all signers were qualified. Training on this is mandatory — a single invalid part-petition wastes collected signatures. |

**Phased rollout:** At launch, the campaign runs a digital petition first (confluenceohio.org/sign) to build momentum and demonstrate support. Physical petition circulation begins in Phase 2, once the petition committee of five electors is filed with the City Clerk and the pre-circulation copy is reviewed by the City Attorney. Signature Collector volunteers can sign up and begin training during the digital phase so they're ready when physical collection begins. The site must clearly communicate that online signatures are expressions of support and that a formal legal petition with physical signatures will follow.

**Important distinction for training:** Online signers are leads for the legal petition — Signature Collectors can follow up with them — but the online signature is not a legal substitute for an ink signature on an official petition form.

### 1.2 Social Amplifier

| Field | Value |
|---|---|
| **ID** | `social_amplifier` |
| **Display Name** | Social Amplifier |
| **Description** | Share campaign content on your social networks. Engage in online conversations about the renaming. Help our message reach beyond the people already paying attention. |
| **Time Commitment** | 1–2 hours/week (15–20 min/day) |
| **Mode** | Online / Remote |
| **Skills Needed** | Active social media presence, comfort with public engagement on a political topic |
| **Onboarding Required** | Light — social media toolkit email (sent Day 3 per Artifact 07 onboarding) with sample posts, graphics, hashtags, and engagement guidelines |
| **Materials Provided** | Social media toolkit (Canva templates, sample posts per platform, hashtag list: #ConfluenceOhio #RenameColumbus), personalized share link with referral tracking |

### 1.3 Neighborhood Captain

| Field | Value |
|---|---|
| **ID** | `neighborhood_captain` |
| **Display Name** | Neighborhood Captain |
| **Description** | Coordinate campaign activity in your neighborhood. Be the point person for your area — track local signature collection, organize events, connect with community leaders, and recruit other volunteers. |
| **Time Commitment** | 3–5 hours/week |
| **Mode** | In-person + coordination |
| **Skills Needed** | Community connections, organizational skills, leadership, familiarity with their neighborhood's organizations, businesses, and gathering places |
| **Onboarding Required** | 30-minute onboarding call with campaign coordinator (per Artifact 07 role-specific next steps). Covers: neighborhood mapping, local contact identification, reporting cadence, coordination with other captains |
| **Materials Provided** | Neighborhood organizing guide, printed materials (flyers, yard sign request forms), contact list of other volunteers in the same area, monthly activity report template |

### 1.4 Event Organizer

| Field | Value |
|---|---|
| **ID** | `event_organizer` |
| **Display Name** | Event Organizer |
| **Description** | Plan and run community events — house parties, public forums, neighborhood meetups, info sessions. Bring the conversation to your part of the city. |
| **Time Commitment** | 3–5 hours/week (concentrated around events) |
| **Mode** | In-person |
| **Skills Needed** | Event planning, logistics coordination, comfortable hosting groups of 10–50 people |
| **Onboarding Required** | Event planning guide + connection with campaign events coordinator. First event should be co-organized with an experienced volunteer. |
| **Materials Provided** | Event planning checklist (venue, date, promotion, materials, debrief), presentation deck (campaign overview, Q&A prompts), sign-in sheet template, event supply kit request form |

### 1.5 Story Collector

| Field | Value |
|---|---|
| **ID** | `story_collector` |
| **Display Name** | Story Collector |
| **Description** | Interview community members and help them share their perspectives for our Voices section. We especially need perspectives from neighborhoods and communities we haven't reached yet. |
| **Time Commitment** | 2–4 hours/week |
| **Mode** | In-person + writing |
| **Skills Needed** | Active listening, basic writing/editing, sensitivity to diverse perspectives, comfort interviewing strangers |
| **Onboarding Required** | Interview guide email (Day 3 onboarding) + optional 30-minute training on interviewing techniques and the Voices editorial process |
| **Materials Provided** | Interview guide (10 prompts, do's and don'ts), voice submission guidelines, consent form template, recorder app recommendations |

### 1.6 Design & Content Creator

| Field | Value |
|---|---|
| **ID** | `design_content` |
| **Display Name** | Design & Content Creator |
| **Description** | Help produce graphics, writing, video, and other campaign materials. If you have creative skills, we have creative needs. |
| **Time Commitment** | Flexible — project-based |
| **Mode** | Remote |
| **Skills Needed** | Graphic design, copywriting, video production, photography, illustration — any one of these |
| **Onboarding Required** | Brand guidelines document, access to shared asset library (Google Drive or Figma), introduction to content review process |
| **Materials Provided** | Brand guidelines (colors, fonts, voice), logo files, photo library, Canva brand kit, editorial calendar with upcoming content needs |

### 1.7 Outreach Liaison

| Field | Value |
|---|---|
| **ID** | `outreach_liaison` |
| **Display Name** | Outreach Liaison |
| **Description** | Connect the campaign with local businesses, civic organizations, neighborhood associations, schools, and faith communities. Build coalitions and secure endorsements, tabling permissions, and event partnerships. |
| **Time Commitment** | 2–4 hours/week |
| **Mode** | In-person + email/phone |
| **Skills Needed** | Professional networking, relationship-building, comfort representing the campaign in formal settings, familiarity with Columbus's civic landscape |
| **Onboarding Required** | Campaign talking points for organizational audiences (different from the public-facing pitch), endorsement request template, partnership proposal template, coordination with campaign leadership on outreach priorities |
| **Materials Provided** | Organizational outreach guide, endorsement one-pager (printable), partnership proposal template, list of target organizations by category (businesses, civic orgs, faith communities, academic institutions, cultural organizations) |

---

## 2. Signup Form Specification

### 2.1 Page Route

`/volunteer` — the volunteer hub page. Content above the form is specified in Artifact 04, §10.

### 2.2 Form Layout

**Desktop (≥1024px):** Two-column layout. Left column (55%): form. Right column (45%): social proof (volunteer count, recent volunteer activity, testimonial quote from a current volunteer).

**Tablet (768–1023px):** Single column. Social proof above form (compact).

**Mobile (<768px):** Single column. Minimal social proof (just volunteer count). Full-width form fields.

### 2.3 Form Fields

| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| First Name | `text` | Yes | 1–100 chars, no digits | `autocomplete="given-name"` |
| Last Name | `text` | Yes | 1–100 chars, no digits | `autocomplete="family-name"` |
| Email | `email` | Yes | RFC 5322 simplified, max 254 chars | `autocomplete="email"` |
| Phone | `tel` | No | 10-digit US phone format, masked input `(___) ___-____` | `autocomplete="tel"`. Subtext: "Optional. We'll only text you about shifts you signed up for." |
| Neighborhood | `select` + free text | No | Selection from curated list or free-text "Other" | Dropdown of ~45 Columbus neighborhoods + "Other (please specify)" → reveals text input |
| Roles | `checkbox` group | Yes (≥1) | At least one role selected | Multi-select. Each role shows name + one-line description + time commitment. See §2.4 for layout. |
| Availability | `checkbox` group | No | Multi-select | Options: Weekday mornings, Weekday evenings, Weekends, Flexible. Multiple selections allowed. |
| How did you hear about us? | `select` | No | Single selection from list | Options: Signed the petition, Social media, Friend or family, News article, Community event, Search engine, Other |
| Anything else? | `textarea` | No | Max 500 chars, char counter displayed | `placeholder="Anything you'd like us to know — skills, availability, questions, ideas"` |

**Hidden fields:**

| Field | Purpose |
|---|---|
| `website` (honeypot) | CSS-hidden, identical pattern to petition form (Artifact 06, §1.3) |
| `cf-turnstile-response` | Cloudflare Turnstile invisible widget |
| `source` | Pre-populated: `volunteer_page` (or `petition_thankyou` if redirected from /sign/thank-you) |

### 2.4 Roles Selector UX

The role selector is the most important part of this form — it needs to communicate what each role involves so volunteers self-select accurately.

**Layout:** Vertical stack of role cards, each containing:

```
┌─────────────────────────────────────────────────┐
│ ☐  Signature Collector                          │
│    Gather petition signatures at community       │
│    events and door-to-door.                      │
│    ⏱ 2–5 hrs/week · 📍 In-person                │
└─────────────────────────────────────────────────┘
```

Each card is a `<label>` wrapping a checkbox. Clicking anywhere on the card toggles selection. Selected cards have a highlighted border (campaign blue, 2px) and light blue background.

**Mobile:** Cards are full-width, stacked vertically with 8px gap. Touch target: entire card (minimum 60px height).

**Accessibility:** Each card's checkbox has `aria-describedby` pointing to the description text. The group has `role="group"` with `aria-labelledby` pointing to the "Roles I'm interested in" heading.

### 2.5 Neighborhood Dropdown

Curated list of ~45 well-known Columbus neighborhoods, alphabetically sorted. The list covers the most commonly referenced areas within Columbus city limits, plus a few adjacent suburbs where volunteers might live.

```typescript
const COLUMBUS_NEIGHBORHOODS = [
  'Bexley',
  'Brewery District',
  'Clintonville',
  'Columbus (Downtown)',
  'Driving Park',
  'East Columbus',
  'Eastmoor',
  'Franklinton',
  'Gahanna',
  'German Village',
  'Grandview Heights',
  'Harrison West',
  'Hilliard',
  'Hilltop',
  'Hungarian Village',
  'Italian Village',
  'King-Lincoln Bronzeville',
  'Linden',
  'Merion Village',
  'Near East Side',
  'Near North / Milo-Grogan',
  'North Columbus',
  'North Linden',
  'Northland',
  'Northwest Columbus',
  'Olde Towne East',
  'Old Oaks',
  'Reynoldsburg',
  'Scioto Peninsula',
  'Short North',
  'South Columbus / South Side',
  'Southeast Columbus',
  'Southwest Columbus',
  'The Ohio State University Area',
  'Upper Arlington',
  'Victorian Village',
  'Weinland Park',
  'West Columbus',
  'Westerville',
  'Westgate',
  'Whitehall',
  'Worthington',
  'Other (please specify)',
] as const;
```

When "Other (please specify)" is selected, a text input appears below the dropdown. The free-text value is stored in the `neighborhood` column.

**Note:** This list should be reviewed by Tim and refined based on local knowledge. Adjacent suburbs (Bexley, Gahanna, Grandview Heights, etc.) are included because volunteers from those areas are valuable even if they're technically outside Columbus city limits.

### 2.6 CTA Button

**Label:** "Count Me In →" (per Artifact 04, §10)

**States:**
- **Default:** Campaign blue (#1e40af), white text, full-width on mobile
- **Hover:** Darker blue
- **Loading:** Spinner + "Signing you up…"
- **Success:** Redirect to `/volunteer/thank-you`
- **Error:** Button re-enables, error message above button

### 2.7 Below-Form CTA (Non-Signers)

Per Artifact 04: "Haven't signed the petition yet? Start there — then come back and join the team."

Conditionally displayed: if the visitor arrived without a `?signed=true` query param (set by the petition thank-you page when linking to /volunteer), show this CTA. If they came from the petition flow, hide it.

### 2.8 Cloudflare Turnstile

Same invisible configuration as the petition form (Artifact 06, §1.9). Token validated server-side. Missing token (ad blocker) results in stricter rate limiting, not rejection.

---

## 3. Server-Side Processing

### 3.1 API Route

`POST /api/volunteer/signup`

```typescript
// apps/web/app/api/volunteer/signup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { inngest } from '@/lib/inngest';

const VALID_ROLES = [
  'signature_collector',
  'social_amplifier',
  'event_organizer',
  'story_collector',
  'neighborhood_captain',
  'design_content',
  'outreach_liaison',
] as const;

const VALID_AVAILABILITY = [
  'weekday_mornings',
  'weekday_evenings',
  'weekends',
  'flexible',
] as const;

const VALID_REFERRAL_SOURCES = [
  'petition',
  'social_media',
  'friend_family',
  'news',
  'community_event',
  'search',
  'other',
] as const;

const VolunteerSignupSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email().max(254).toLowerCase().trim(),
  phone: z.string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/)
    .optional()
    .or(z.literal('')),
  neighborhood: z.string().max(100).trim().optional(),
  roles: z.array(z.enum(VALID_ROLES)).min(1, 'Please select at least one role'),
  availability: z.array(z.enum(VALID_AVAILABILITY)).optional().default([]),
  referralSource: z.enum(VALID_REFERRAL_SOURCES).optional(),
  notes: z.string().max(500).trim().optional().default(''),
  turnstileToken: z.string().optional(),
  website: z.string().optional(),  // Honeypot
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = VolunteerSignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // ── Honeypot check ──
  if (data.website && data.website.trim() !== '') {
    return NextResponse.json({ success: true, redirect: '/volunteer/thank-you' });
  }

  // ── Turnstile verification ──
  const turnstileValid = await verifyTurnstile(data.turnstileToken, getClientIp(request));

  // ── Rate limiting ──
  const ipHash = await hashIp(getClientIp(request));
  const maxAttempts = turnstileValid ? 3 : 1;
  const recentSubmissions = await countRecentSubmissions(ipHash, 'volunteers');
  if (recentSubmissions >= maxAttempts) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    );
  }

  // ── Duplicate check ──
  const { data: existing } = await supabase
    .from('volunteers')
    .select('id, first_name, roles')
    .eq('email', data.email)
    .maybeSingle();

  if (existing) {
    // Update existing volunteer with new/additional roles
    const existingRoles: string[] = existing.roles || [];
    const mergedRoles = [...new Set([...existingRoles, ...data.roles])];

    await supabase
      .from('volunteers')
      .update({
        roles: mergedRoles,
        availability: data.availability.join(', ') || null,
        neighborhood: data.neighborhood || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    // Fire update event (different from creation — sends "welcome back" instead of onboarding)
    await inngest.send({
      name: 'volunteer/signup.updated',
      data: {
        volunteerId: existing.id,
        email: data.email,
        firstName: existing.first_name,
        lastName: data.lastName,
        roles: mergedRoles,
        newRoles: data.roles.filter(r => !existingRoles.includes(r)),
        neighborhood: data.neighborhood,
      },
    });

    return NextResponse.json({
      success: true,
      returning: true,
      redirect: '/volunteer/thank-you?returning=true',
    });
  }

  // ── Insert new volunteer ──
  const { data: volunteer, error } = await supabase
    .from('volunteers')
    .insert({
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
      neighborhood: data.neighborhood || null,
      roles: data.roles,
      availability: data.availability.join(', ') || null,
      notes: data.notes || null,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Volunteer insert error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }

  // ── Also create email subscriber record if not exists ──
  await supabase
    .from('email_subscribers')
    .upsert(
      {
        email: data.email,
        email_hash: await sha256(data.email),
        first_name: data.firstName,
        source: 'volunteer',
        status: 'active',
      },
      { onConflict: 'email', ignoreDuplicates: true }
    );

  // ── Fire Inngest event for onboarding ──
  await inngest.send({
    name: 'volunteer/signup.created',
    data: {
      volunteerId: volunteer.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      roles: data.roles,
      neighborhood: data.neighborhood || null,
    },
  });

  return NextResponse.json({
    success: true,
    returning: false,
    redirect: '/volunteer/thank-you',
  });
}
```

### 3.2 Inngest Event Types

Two volunteer events (adding `volunteer/signup.updated` to the Events type from Artifact 07):

```typescript
// Add to apps/web/lib/inngest.ts Events type

'volunteer/signup.created': {
  data: {
    volunteerId: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    neighborhood?: string;
  };
};
'volunteer/signup.updated': {
  data: {
    volunteerId: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];       // All current roles (merged)
    newRoles: string[];    // Only the roles added in this update
    neighborhood?: string;
  };
};
```

---

## 4. Post-Signup Flow

### 4.1 Thank-You Page

Route: `/volunteer/thank-you`

**New volunteer:**

```
Thank you, [first_name]! You're in.

Here's what happens next:

1. Check your email — we just sent a confirmation with next steps
   specific to your role.
2. We'll follow up within 3 days with your onboarding details.
3. For Signature Collectors: training is required before your first
   shift. We'll send you available training dates.

While you wait, share the campaign with friends:
[Share buttons with personalized referral link if they've signed the petition]

Haven't signed the petition yet?
[Sign the Petition →]
```

**Returning volunteer (adding new roles):**

```
Welcome back, [first_name]!

We've added [new role names] to your volunteer profile. You'll receive
updated next steps by email.

Thank you for stepping up even further.
```

### 4.2 Post-Signup Automation

The `volunteer/signup.created` event triggers the onboarding sequence defined in Artifact 07, §2.8. That sequence handles:

1. **Immediate:** Create/update Brevo contact with volunteer attributes and add to Volunteers list
2. **Immediate:** Send confirmation email with role-specific next steps
3. **Immediate:** Send admin notification email
4. **Day 3:** Send role-specific onboarding details email

This spec adds the following **role-specific onboarding content** that the Artifact 07 templates should include:

### 4.3 Role-Specific Onboarding Content

**Signature Collector — Confirmation Email:**
- "Welcome aboard. Signature collection is our most impactful volunteer role."
- **Phase awareness:** "We're currently in the digital petition phase — building momentum online before launching physical petition circulation. We'll train you now so you're ready to hit the ground running when physical collection begins."
- **Mandatory training notice:** "Before your first shift, you must complete a 45-minute circulator training session. This covers Ohio petition law, the affidavit you'll sign, talking points, and handling objections."
- Link to training calendar (or "We'll email you available dates within 48 hours" if no calendar yet)
- Legal disclaimer: "As a petition circulator, you'll sign an affidavit under penalty of election falsification. Training covers exactly what this means and how to stay compliant."
- **Interim ask:** "While you wait for physical petition collection to begin, help build momentum: share the digital petition with your network using your personal link."

**Signature Collector — Day 3 Onboarding Email:**
- Detailed training prep: what to bring, what to expect
- Preview of talking points (top 3 arguments, top 3 objections and responses)
- FAQ about the circulator experience (including: "When does physical petition collection start?" → "Once the petition committee is formally filed with the City Clerk. We'll notify you as soon as we have a date.")
- "After training, you'll receive your petition packet: official forms, clipboard, talking points card, FAQ handouts, and a volunteer shift tracker."

**Social Amplifier — Confirmation Email:**
- Social media toolkit attached or linked (Google Drive)
- Primary hashtags: #ConfluenceOhio #RenameColumbus
- Sample posts for each platform (Twitter/X, Facebook, Instagram, TikTok)
- "Follow us: [social links]"
- "Your personalized share link: [referral URL]"

**Social Amplifier — Day 3 Onboarding Email:**
- This week's content calendar: what's being posted and when to amplify
- Tips for engaging in conversations (stay on-brand, don't argue, invite curiosity)
- Graphic pack download link (Canva templates, logos, quote graphics)
- "Tag us when you share — we'll repost the best ones"

**Neighborhood Captain — Confirmation Email:**
- "We'll schedule a 30-minute onboarding call within the next week to discuss your neighborhood."
- Preview of what the call covers: mapping your area, identifying local partners, setting a first activity
- Interim reading: "Your Neighborhood Guide" doc

**Neighborhood Captain — Day 3 Onboarding Email:**
- Onboarding call scheduling link (Calendly or similar)
- Neighborhood organizing template (goals, contacts, events, timeline)
- Introduction to other volunteers in the same area (if any)
- "Your first task: identify 3 community gathering places in your neighborhood where we could table or hold a meetup."

**Event Organizer — Confirmation Email:**
- Event planning checklist (venue, date, promotion, materials, debrief)
- "We'll connect you with our events coordinator within 48 hours."
- Suggested first event: house party or coffee shop meetup (low barrier, 10–15 people)

**Event Organizer — Day 3 Onboarding Email:**
- Full event planning guide
- Presentation deck for community events (campaign overview, Q&A facilitation guide)
- Sign-in sheet template (captures attendees as potential petition signers and volunteers)
- "Ready to host your first event? Reply to this email and we'll help you set it up."

**Story Collector — Confirmation Email:**
- Interview guide with 10 prompts
- Consent form template (required before publishing any story)
- "Start by sharing your own story: [Link to /voices/share]"

**Story Collector — Day 3 Onboarding Email:**
- Interviewing tips: active listening, open-ended questions, letting people speak
- Recording consent process
- How to submit collected stories for publication
- "Our goal: collect 10 perspectives from neighborhoods we haven't heard from yet. Can you reach 2 this month?"

**Design & Content Creator — Confirmation Email:**
- Brand guidelines PDF attached
- Access links: shared Google Drive folder, Canva brand kit
- "Our current top needs: [list 2–3 specific items like 'Instagram story templates for petition milestones' or 'flyer for North Market tabling event']"

**Design & Content Creator — Day 3 Onboarding Email:**
- Content review process: submit → campaign review (24-hour turnaround) → publish
- Editorial calendar with upcoming content needs
- Existing asset library tour
- "Pick one item from the needs list and give it a shot. Don't overthink it — we iterate together."

**Outreach Liaison — Confirmation Email:**
- Campaign talking points for organizational audiences (more formal than public-facing messaging)
- Endorsement request one-pager (printable)
- "We'll schedule a 20-minute call to align on outreach priorities for your area."

**Outreach Liaison — Day 3 Onboarding Email:**
- Partnership proposal template
- Target organization list (categorized: businesses, civic orgs, faith communities, academic institutions, cultural organizations, neighborhood associations)
- Outreach tracking spreadsheet (Google Sheets — who's been contacted, response, next steps)
- "Start by reaching out to one organization you already have a relationship with. A warm introduction beats a cold email every time."

---

## 5. Volunteer Onboarding Email Templates

The onboarding automation (Inngest function) was specified in Artifact 07, §2.8. This section specifies the **email content** that the templates should contain.

### 5.1 Template: Volunteer Confirmation (Immediate)

**Template ID:** `VOLUNTEER_CONFIRMATION` (from Artifact 07 registry)

**Subject:** `You're in, {{ params.FIRSTNAME }}! Here's what's next.`
**Preview text:** `Welcome to the Confluence Ohio volunteer team.`

```
{{ params.FIRSTNAME }},

Welcome to the team. You signed up as a {{ params.ROLES }}.

Here's what happens next:

{{ params.ROLE_NEXT_STEPS }}

If you have questions, just reply to this email — a real person reads every message.

— The Confluence Ohio Team

P.S. Haven't signed the petition yet? Add your name:
https://confluenceohio.org/sign
```

The `{{ params.ROLE_NEXT_STEPS }}` variable is populated by the `getRoleNextSteps()` function (Artifact 07, §2.8) with role-specific content from §4.3 above.

### 5.2 Template: Volunteer Onboarding Day 3

**Template ID:** `VOLUNTEER_ONBOARDING_2` (from Artifact 07 registry)

**Subject:** `Your {{ params.PRIMARY_ROLE_DISPLAY }} toolkit is ready`
**Preview text:** `Everything you need to get started as a {{ params.PRIMARY_ROLE_DISPLAY }}.`

```
{{ params.FIRSTNAME }},

You signed up 3 days ago, and we've been getting your toolkit ready.

{{ params.ROLE_ONBOARDING_CONTENT }}

Questions? Reply to this email or reach us at info@confluenceohio.org.

— The Confluence Ohio Team
```

The `{{ params.ROLE_ONBOARDING_CONTENT }}` variable contains the Day 3 content specific to the volunteer's primary role (first role in their `roles` array), drawn from §4.3 above.

### 5.3 Template: Admin New Volunteer Notification

**Template ID:** `ADMIN_NEW_VOLUNTEER` (from Artifact 07 registry)

**Subject:** `New volunteer: {{ params.VOLUNTEER_NAME }}`
**Preview text:** `{{ params.ROLES }} · {{ params.NEIGHBORHOOD }}`

```
New volunteer signup:

Name: {{ params.VOLUNTEER_NAME }}
Email: {{ params.VOLUNTEER_EMAIL }}
Roles: {{ params.ROLES }}
Neighborhood: {{ params.NEIGHBORHOOD }}

View in admin dashboard:
https://confluenceohio.org/admin/volunteers
```

### 5.4 Template: Returning Volunteer Update

New template needed (not yet in Artifact 07 registry).

**Template ID:** `VOLUNTEER_ROLE_UPDATE`

**Subject:** `Welcome back, {{ params.FIRSTNAME }} — new role added`
**Preview text:** `You've been added as a {{ params.NEW_ROLES }}.`

```
{{ params.FIRSTNAME }},

Welcome back! We've added {{ params.NEW_ROLES }} to your volunteer
profile. Here's what that means:

{{ params.NEW_ROLE_NEXT_STEPS }}

Thank you for stepping up.

— The Confluence Ohio Team
```

**Note:** This template must be added to the Artifact 07 template registry (`BREVO_TEMPLATE_VOLUNTEER_ROLE_UPDATE`) and a corresponding environment variable created. The `volunteer/signup.updated` Inngest handler should send this template.

---

## 6. Admin Volunteer Management Interface

### 6.1 Scope for Launch

The admin volunteer interface is deliberately minimal at launch. The goal is visibility and basic coordination — not a full CRM. The campaign will have 1–2 admin users (Tim + one coordinator).

**Views:**

1. **Volunteer List** — `/admin/volunteers`
2. **Volunteer Detail** — `/admin/volunteers/[id]`
3. **Dashboard Metrics** — integrated into main admin dashboard (Prompt 14)

### 6.2 Volunteer List View

**Route:** `/admin/volunteers`

**Default sort:** Most recent signups first

**Columns:**

| Column | Source | Sortable | Filterable |
|---|---|---|---|
| Name | `first_name + last_name` | Yes (alpha) | Yes (search) |
| Email | `email` | No | Yes (search) |
| Neighborhood | `neighborhood` | Yes (alpha) | Yes (dropdown) |
| Roles | `roles` (JSONB) | No | Yes (multi-select filter) |
| Signed Up | `signed_up_at` | Yes (date) | Yes (date range) |
| Status | `status` | No | Yes (dropdown: active, inactive, onboarded) |

**Bulk actions:**
- Export CSV (name, email, phone, neighborhood, roles, availability, signed_up_at)
- Change status (active → inactive, active → onboarded)

**Search:** Full-text search across name, email, and neighborhood.

**Filters:** Role filter is the most important — allows finding all Signature Collectors, all Neighborhood Captains in a specific area, etc.

### 6.3 Volunteer Detail View

**Route:** `/admin/volunteers/[id]`

**Sections:**

1. **Contact info:** Name, email, phone, neighborhood
2. **Roles:** Listed with badges, editable (admin can add/remove roles)
3. **Availability:** Display as tags
4. **Notes:** The volunteer's "Anything else?" text + admin notes field (editable)
5. **Petition status:** Whether this person has also signed the petition (cross-reference by email against `signatures` table). If yes, show signer number.
6. **Email engagement:** Link to Brevo contact profile (opens in new tab) for delivery history
7. **Timeline:** Activity log — signup date, onboarding emails sent (from Inngest event log), status changes, admin notes

**Admin actions:**
- Edit roles and status
- Add admin note (timestamped, attributed to admin user)
- Send ad-hoc email (opens Brevo with pre-filled recipient)
- Mark as "onboarded" (changes status, useful for tracking Signature Collector training completion)

### 6.4 Dashboard Metrics

Displayed on the admin dashboard (not a separate volunteer-only page):

| Metric | Source | Display |
|---|---|---|
| Total volunteers | `campaign_metrics.volunteer_count` | Number |
| This week's signups | Query: `signed_up_at >= 7 days ago` | Number + trend |
| By role | Aggregate query on `roles` JSONB | Bar chart |
| By neighborhood | Aggregate query on `neighborhood` | Top 10 list |
| Onboarding status | Count by `status` | Donut chart (active, onboarded, inactive) |
| Signature Collectors trained | Count where `status = 'onboarded'` AND `roles @> '["signature_collector"]'` | Number / total collectors |

---

## 7. Coordination Approach

### 7.1 Launch Phase (0–50 Active Volunteers)

**Tools:** Brevo segments + admin interface + Google Workspace (shared Drive, Sheets, Calendar)

At launch, the campaign coordinates volunteers through:

1. **Brevo list segments** for role-based email communication (per Artifact 07 list structure)
2. **Admin interface** (§6) for viewing/filtering volunteers and tracking onboarding status
3. **Google Sheets** for:
   - Signature collection tracking (which locations, how many signatures per shift, which collectors)
   - Event calendar (shared Google Calendar)
   - Outreach tracking (who's been contacted, response status)
4. **Email** for individual and role-based coordination (Brevo campaigns to volunteer segments)
5. **Group text/Signal** for real-time coordination during events (set up manually per event)

**No dedicated volunteer management platform at launch.** The administrative overhead of learning, configuring, and paying for a platform like Mobilize is not justified for <50 volunteers. The admin interface + Brevo + Google Workspace covers all coordination needs.

### 7.2 Scale Triggers — When to Upgrade

Upgrade to a dedicated platform when any of these conditions are met:

| Trigger | Threshold | Why |
|---|---|---|
| Active volunteers | 50+ | Manual coordination becomes unsustainable. Admin can't track availability and assignments across 50+ people via spreadsheets. |
| Regular events | 4+ events/month | Event-specific volunteer assignment, shift management, and automated reminders need dedicated tooling. |
| Signature collection shifts | Formalized shift schedule | Shift signup, check-in, and no-show tracking need a platform (Mobilize, SignUpGenius, or custom). |
| Geographic coordination | 5+ active Neighborhood Captains | Captain-to-captain and captain-to-volunteer coordination needs structured communication beyond email. |

### 7.3 Recommended Platform: Mobilize

When the threshold is reached, the recommended platform is **Mobilize** (by Bonterra).

**Why Mobilize:**
- Built specifically for civic campaigns, nonprofits, and advocacy organizations
- Event-based volunteer management (create events, volunteers sign up for shifts, automated reminders, check-in, follow-up)
- 3,000+ campaigns use it (including most major political campaigns)
- Integrates with Brevo/email tools via Zapier or API
- Embeddable event feed widget for the /volunteer page

**Pricing:** Starts at ~$200/month for small organizations. Budget for this when volunteer count approaches 50.

**Migration path:**
1. Export volunteer list from admin interface as CSV
2. Import into Mobilize as initial contact list
3. Create events and shifts in Mobilize
4. Embed Mobilize event feed on /volunteer page (below the signup form)
5. Keep the custom signup form for initial volunteer capture; Mobilize handles post-signup coordination

### 7.4 Signature Collector Coordination (Special Case)

Signature Collectors have the most complex coordination needs and a phased rollout:

**Phase 1 — Digital petition period (launch):**
- Signature Collectors sign up and are trained on circulator law, talking points, and objection handling
- They cannot circulate physical petitions yet (petition committee not yet filed)
- Interim activities: share digital petition with networks, attend events as campaign ambassadors, help recruit other volunteers
- Status: `active` → `onboarded` (after training, even before physical collection begins)

**Phase 2 — Physical petition period (after committee filing):**
- Petition committee of five electors files with City Clerk
- City Attorney reviews pre-circulation copy
- Trained collectors receive petition packets and begin physical signature collection
- All coordination below applies to Phase 2

**Training pipeline:**
1. Sign up on website → status: `active`
2. Complete 45-minute circulator training → status: `onboarded`
3. *(Phase 2)* Receive petition packet (physical materials)
4. *(Phase 2)* Assigned to shifts/events

**Training logistics:**
- Tim or a trained coordinator conducts training sessions (in-person or video call)
- Training scheduled ad hoc as volunteers sign up (minimum 3 people per session to justify scheduling)
- Training covers: Ohio circulator law, affidavit requirements, talking points, handling objections, de-escalation, recording and submitting completed petition forms
- Training completion tracked via admin status change (`active` → `onboarded`)
- Training can begin during Phase 1 so collectors are ready for Phase 2

**Shift coordination (Phase 2):**
- Google Calendar shared with all trained Signature Collectors
- Events added as calendar entries with location, time, and "RSVP" link (Google Form or simple email reply)
- Post-shift: collector reports signatures collected (Google Form → Sheet)

**Petition form chain of custody (Phase 2):**
- Each trained collector receives numbered petition packets
- Completed part-petitions returned to campaign (physical handoff at events or mailed to PO Box 8012, Columbus, OH 43201)
- Campaign maintains a log of issued and returned petition packets
- Chain of custody is important for the Franklin County Board of Elections submission

---

## 8. Analytics Events

Track the following events via PostHog (per tech stack) for volunteer funnel optimization:

| Event | Trigger | Properties |
|---|---|---|
| `volunteer_page_view` | Page load of /volunteer | `source` (referrer), `signed_petition` (boolean from cookie/session) |
| `volunteer_form_start` | First field interaction | `first_field` (which field they started with) |
| `volunteer_role_select` | Role checkbox toggled | `role`, `selected` (true/false), `total_roles_selected` |
| `volunteer_form_submit` | Form submission attempted | `roles_selected`, `neighborhood`, `has_phone`, `has_notes` |
| `volunteer_signup_success` | API returns success | `roles`, `returning` (boolean), `also_signed_petition` |
| `volunteer_signup_error` | API returns error | `error_type`, `error_code` |
| `volunteer_thankyou_view` | Thank-you page load | `returning`, `signed_petition` |
| `volunteer_thankyou_share` | Share button clicked | `platform` |
| `volunteer_thankyou_sign` | "Sign the Petition" CTA clicked | — |

---

## 9. Accessibility Requirements

All requirements from Artifact 06 §8 apply to the volunteer form. Additional volunteer-specific requirements:

- **Role selector cards:** Each card is a `<label>` with a visible checkbox. `role="group"` on the container with `aria-labelledby`. `aria-describedby` links each checkbox to its description text.
- **Phone input mask:** The masked phone input (`(___) ___-____`) must work with screen readers. Use `inputmode="tel"` and announce the format via `aria-describedby` pointing to helper text: "Format: (555) 555-5555"
- **Neighborhood dropdown:** Standard `<select>` element with proper `<label>`. When "Other" is selected and the text input appears, focus moves to the text input automatically. The text input has `aria-label="Please specify your neighborhood"`.
- **Availability checkboxes:** `role="group"` with `aria-labelledby`, same pattern as role selector.
- **Error handling:** Same pattern as petition form — `aria-invalid`, `aria-describedby` for field errors, `role="alert"` for form-level errors.

---

## 10. Database Migration Addendum

Artifact 05's `volunteers` table comment lists 6 roles. With the addition of `outreach_liaison`, a migration update is needed:

```sql
-- Migration: add outreach_liaison to volunteer roles documentation
COMMENT ON COLUMN volunteers.roles IS 
  'JSON array of role strings: signature_collector, social_amplifier, event_organizer, story_collector, neighborhood_captain, design_content, outreach_liaison';

-- No schema change required — roles is JSONB and accepts any string values.
-- This comment update is documentation only.
```

Additionally, add a `referral_source` column to capture how the volunteer heard about the campaign:

```sql
-- Migration: add referral_source to volunteers table
ALTER TABLE volunteers ADD COLUMN referral_source text;

COMMENT ON COLUMN volunteers.referral_source IS 
  'How the volunteer heard about the campaign: petition, social_media, friend_family, news, community_event, search, other';
```

---

## 11. Claude Code Handoff

### Handoff Prompt 8A: Volunteer Page Component

```
Create the volunteer hub page and signup form component.

Files to generate:

1. `apps/web/app/volunteer/page.tsx` — Server component that renders the
   volunteer hub page. Content above the form comes from Artifact 04 §10
   (hero, "Why Volunteer?", role descriptions). Below that, render the
   VolunteerSignupForm client component. Include metadata exports for
   SEO (title, description, OG tags per Artifact 03).

2. `apps/web/components/volunteer-signup-form.tsx` — Client component
   ('use client') with the full volunteer signup form.
   
   Fields: firstName, lastName, email, phone (masked input), neighborhood
   (select + "Other" free text), roles (checkbox card selector — see
   Artifact 08 §2.4 for card layout), availability (checkbox group),
   referralSource (select), notes (textarea with char counter).
   
   Hidden fields: honeypot, Turnstile, source.
   
   Validation: client-side with Zod (same schema as server). Validate
   on blur + on submit. Focus first invalid field.
   
   Submission: POST /api/volunteer/signup. On success, redirect to
   /volunteer/thank-you. On error, display inline.
   
   The role selector cards should be checkboxes styled as cards with:
   role name (bold), one-line description, time commitment + mode badge.
   Selected state: blue border + light blue background.
   
   Accessibility: all requirements from Artifact 08 §9.
   Mobile: full-width fields, stacked role cards, 48px minimum touch
   targets, 16px+ font size.

3. `apps/web/app/volunteer/thank-you/page.tsx` — Thank-you page with
   conditional content for new vs. returning volunteers (check
   ?returning=true query param). Include share buttons, petition CTA
   for non-signers. Server component.

4. `apps/web/lib/constants/neighborhoods.ts` — Export the
   COLUMBUS_NEIGHBORHOODS array from Artifact 08 §2.5.

5. `apps/web/lib/constants/volunteer-roles.ts` — Export volunteer role
   definitions (id, displayName, description, timeCommitment, mode)
   as a typed constant array. Used by both the form component and the
   page content.

Reference Artifact 08 §2 for complete form spec, §9 for accessibility.
Use Tailwind for styling. React Hook Form + Zod for form management.
```

### Handoff Prompt 8B: Volunteer Signup API Route

```
Create the volunteer signup API route.

File: `apps/web/app/api/volunteer/signup/route.ts`

Requirements:
- POST handler with Zod validation (schema from Artifact 08 §3.1)
- Honeypot check (same pattern as petition: fake success response)
- Turnstile verification (same pattern as Artifact 06)
- Rate limiting: 3/hr with valid Turnstile, 1/hr without
- Duplicate check by email:
  - If existing volunteer: merge roles (union of existing + new),
    update other fields, fire volunteer/signup.updated event
  - If new: insert into volunteers table, upsert email_subscribers
    record, fire volunteer/signup.created event
- Return { success, returning, redirect } on success
- Return { error, fields } on validation failure
- Supabase service_role key for all database operations

Reference Artifact 08 §3 for complete server-side processing spec.
Import shared utilities (verifyTurnstile, hashIp, sha256) from
packages/core or a shared utils module.
```

### Handoff Prompt 8C: Volunteer Onboarding Inngest Enhancement

```
Enhance the volunteer onboarding Inngest functions from Artifact 07
with the role-specific content defined in Artifact 08.

Files to update/create:

1. Update `apps/web/lib/inngest.ts` — Add the volunteer/signup.updated
   event type to the Events map.

2. Create `apps/web/inngest/volunteer-signup-updated.ts` — New Inngest
   function triggered by volunteer/signup.updated. Sends the
   VOLUNTEER_ROLE_UPDATE template to returning volunteers with their
   new role-specific next steps. Updates Brevo contact attributes
   (VOLUNTEER_ROLES, etc.).

3. Update `apps/web/inngest/volunteer-onboarding.ts` — Enhance the
   getRoleNextSteps() function with the full role-specific confirmation
   content from Artifact 08 §4.3. Enhance the Day 3 onboarding email
   params to include ROLE_ONBOARDING_CONTENT populated per role.

4. Create `packages/email/content/volunteer-roles.ts` — Export
   functions that return role-specific email content strings:
   - getConfirmationContent(role: string): string
   - getOnboardingContent(role: string): string
   Content from Artifact 08 §4.3.

Reference Artifact 08 §4.3 for all role-specific email content.
Add VOLUNTEER_ROLE_UPDATE to the template ID registry in
packages/email/templates.ts.
```

### Handoff Prompt 8D: Admin Volunteer Management Interface

```
Create the admin volunteer management interface.

Files to generate:

1. `apps/web/app/admin/volunteers/page.tsx` — Server component.
   Volunteer list view with:
   - Sortable table (name, neighborhood, signed_up_at, status)
   - Filter bar: role multi-select, neighborhood dropdown, status
     dropdown, date range picker, text search
   - Bulk actions: export CSV, change status
   - Pagination (25 per page)
   - Row click navigates to detail view
   
   Supabase query with RLS (admin_users check). Server-side filtering
   and pagination via URL search params.

2. `apps/web/app/admin/volunteers/[id]/page.tsx` — Server component.
   Volunteer detail view with:
   - Contact info section
   - Roles with editable badges (add/remove via PATCH)
   - Petition cross-reference (query signatures by email)
   - Admin notes section (add timestamped notes)
   - Status change dropdown
   - Activity timeline (signup date, emails sent, status changes)
   
3. `apps/web/app/api/admin/volunteers/route.ts` — GET handler for
   filtered volunteer list with pagination. PATCH handler for
   bulk status updates.

4. `apps/web/app/api/admin/volunteers/[id]/route.ts` — GET handler
   for single volunteer detail. PATCH handler for role/status/notes
   updates. POST handler for adding admin notes.

5. `apps/web/app/api/admin/volunteers/export/route.ts` — GET handler
   that returns CSV of filtered volunteer list.

All admin routes require authentication (Supabase Auth) and admin_users
check. Reference Artifact 08 §6 for complete interface spec.
Use Supabase service_role for database queries.
Protected by middleware checking admin_users table.
```

### Handoff Prompt 8E: Database Migration for Volunteer Enhancements

```
Create a Supabase migration for volunteer table enhancements.

File: `packages/db/migrations/XXXX_volunteer_enhancements.sql`

Changes:
1. Add referral_source column to volunteers table:
   ALTER TABLE volunteers ADD COLUMN referral_source text;

2. Update roles column comment to include outreach_liaison:
   COMMENT ON COLUMN volunteers.roles IS 
     'JSON array of role strings: signature_collector, social_amplifier,
      event_organizer, story_collector, neighborhood_captain,
      design_content, outreach_liaison';

3. Add index on roles for JSONB containment queries:
   CREATE INDEX idx_volunteers_roles ON volunteers
     USING gin (roles jsonb_path_ops);

4. Add index on referral_source for analytics:
   CREATE INDEX idx_volunteers_referral_source
     ON volunteers (referral_source);

These are additive changes — no existing data is affected.
Reference Artifact 08 §10 for migration details.
```

---

*Artifact 08 complete. This document specifies the full volunteer hub for Confluence Ohio: 7 role definitions with legal requirements for Signature Collectors, signup form with role-card UX, server-side processing with duplicate merging, role-specific onboarding content for all 7 roles (14 email content blocks), admin volunteer management interface, coordination approach with scale triggers, and 5 Claude Code handoff prompts.*
