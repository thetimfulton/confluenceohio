# Email Template Specifications

**Reference:** Artifact 07, §3 (Design System), §7 (Content Reference)
**Last Updated:** April 13, 2026

This document is the complete specification for all Brevo email templates used by Confluence Ohio. Each entry documents the template's purpose, subject line, preheader, body content, dynamic parameters, CTAs, and compliance requirements.

For the template design system (fonts, colors, layout), see [Design System](#design-system) at the bottom.

---

## Template Index

| # | Template Name | Registry Key | Env Var | Type |
|---|---|---|---|---|
| 1 | [Email Verification](#1-email-verification) | `EMAIL_VERIFICATION` | `BREVO_TEMPLATE_EMAIL_VERIFY` | Transactional |
| 2 | [Verification Reminder (24h)](#2-verification-reminder-24h) | `VERIFICATION_REMINDER` | `BREVO_TEMPLATE_VERIFY_REMINDER` | Transactional |
| 3 | [Resend Verification](#3-resend-verification) | `RESEND_VERIFICATION` | `BREVO_TEMPLATE_RESEND_VERIFY` | Transactional |
| 4 | [Welcome — Verified Signer](#4-welcome--verified-signer) | `VERIFIED_WELCOME` | `BREVO_TEMPLATE_VERIFIED_WELCOME` | Marketing |
| 5 | [Welcome 1 — Signature Confirmation](#5-welcome-1--signature-confirmation) | `WELCOME_1_CONFIRMATION` | `BREVO_TEMPLATE_WELCOME_1` | Marketing |
| 6 | [Welcome 2 — The Story](#6-welcome-2--the-story) | `WELCOME_2_STORY` | `BREVO_TEMPLATE_WELCOME_2` | Marketing |
| 7 | [Welcome 3 — Community Voices](#7-welcome-3--community-voices) | `WELCOME_3_VOICES` | `BREVO_TEMPLATE_WELCOME_3` | Marketing |
| 8 | [Welcome 4 — Get Involved](#8-welcome-4--get-involved) | `WELCOME_4_INVOLVE` | `BREVO_TEMPLATE_WELCOME_4` | Marketing |
| 9 | [Signer-to-Volunteer Conversion](#9-signer-to-volunteer-conversion) | `SIGNER_TO_VOLUNTEER` | `BREVO_TEMPLATE_SIGNER_TO_VOLUNTEER` | Marketing |
| 10 | [Signer-to-Donor Conversion](#10-signer-to-donor-conversion) | `SIGNER_TO_DONOR` | `BREVO_TEMPLATE_SIGNER_TO_DONOR` | Marketing |
| 11 | [Milestone Celebration](#11-milestone-celebration) | `MILESTONE_CELEBRATION` | `BREVO_TEMPLATE_MILESTONE` | Marketing |
| 12 | [Re-engagement 1](#12-re-engagement-1) | `RE_ENGAGEMENT_1` | `BREVO_TEMPLATE_RE_ENGAGEMENT_1` | Marketing |
| 13 | [Re-engagement 2](#13-re-engagement-2) | `RE_ENGAGEMENT_2` | `BREVO_TEMPLATE_RE_ENGAGEMENT_2` | Marketing |
| 14 | [Volunteer Confirmation](#14-volunteer-confirmation) | `VOLUNTEER_CONFIRMATION` | `BREVO_TEMPLATE_VOLUNTEER_CONFIRM` | Marketing |
| 15 | [Volunteer Onboarding (Day 3)](#15-volunteer-onboarding-day-3) | `VOLUNTEER_ONBOARDING_2` | `BREVO_TEMPLATE_VOLUNTEER_ONBOARD_2` | Marketing |
| 16 | [Volunteer First Task (Day 7)](#16-volunteer-first-task-day-7) | `VOLUNTEER_FIRST_TASK` | `BREVO_TEMPLATE_VOLUNTEER_FIRST_TASK` | Marketing |
| 17 | [Volunteer Check-in (Day 14)](#17-volunteer-check-in-day-14) | `VOLUNTEER_CHECK_IN` | `BREVO_TEMPLATE_VOLUNTEER_CHECK_IN` | Marketing |
| 18 | [Standalone Subscriber Welcome](#18-standalone-subscriber-welcome) | `STANDALONE_WELCOME` | `BREVO_TEMPLATE_STANDALONE_WELCOME` | Marketing |
| 19 | [Subscriber Nurture: The Case in 5 Minutes](#19-subscriber-nurture-the-case-in-5-minutes) | `SUBSCRIBER_CASE` | `BREVO_TEMPLATE_SUBSCRIBER_CASE` | Marketing |
| 20 | [Subscriber Nurture: Ready to Sign?](#20-subscriber-nurture-ready-to-sign) | `SUBSCRIBER_PETITION_CTA` | `BREVO_TEMPLATE_SUBSCRIBER_PETITION_CTA` | Marketing |
| 21 | [Subscriber Nurture: Community + Share](#21-subscriber-nurture-community--share) | `SUBSCRIBER_VOICES_SHARE` | `BREVO_TEMPLATE_SUBSCRIBER_VOICES` | Marketing |
| 22 | [Referral Notification](#22-referral-notification) | `REFERRAL_NOTIFICATION` | `BREVO_TEMPLATE_REFERRAL_NOTIFY` | Marketing |
| 23 | [Donation Thank You](#23-donation-thank-you) | `DONATION_THANK_YOU` | `BREVO_TEMPLATE_DONATION_THANKS` | Marketing |
| 24 | [Donation Thank You (Recurring)](#24-donation-thank-you-recurring) | `DONATION_THANK_YOU_RECURRING` | `BREVO_TEMPLATE_DONATION_THANKS_RECURRING` | Marketing |
| 25 | [Admin: New Volunteer](#25-admin-new-volunteer) | `ADMIN_NEW_VOLUNTEER` | `BREVO_TEMPLATE_ADMIN_NEW_VOLUNTEER` | Transactional |
| 26 | [Volunteer Role Update](#26-volunteer-role-update) | `VOLUNTEER_ROLE_UPDATE` | `BREVO_TEMPLATE_VOLUNTEER_ROLE_UPDATE` | Marketing |

Community Voices templates (Artifact 10) are documented separately in `docs/10-community-voices.md`.

---

## 1. Email Verification

**Type:** Transactional (sent regardless of unsubscribe status)
**Trigger:** Immediate on petition signature creation
**Registry Key:** `EMAIL_VERIFICATION`
**Env Var:** `BREVO_TEMPLATE_EMAIL_VERIFY`

**Subject:** `Confirm your signature — you're signer #{{ params.SIGNATURE_NUMBER }}!`
**Preheader:** `Click to verify your email and make it official.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `SIGNATURE_NUMBER` | string | Formatted signer number (e.g., "1,234") |
| `VERIFICATION_URL` | string | Unique email verification link (72h expiry) |

### Body

```
Hi {{ params.FIRSTNAME }},

You just signed the petition to rename Columbus to Confluence, Ohio.
You're signer #{{ params.SIGNATURE_NUMBER }}.

Confirm your email to verify your signature:

[Confirm My Signature →]  {{ params.VERIFICATION_URL }}

This link expires in 72 hours.

If you didn't sign this petition, you can safely ignore this email.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Confirm My Signature → | `{{ params.VERIFICATION_URL }}` | Primary (blue, full-width on mobile) |

### Footer

Transactional footer (no unsubscribe required, but included as best practice). Physical address + privacy policy link.

---

## 2. Verification Reminder (24h)

**Type:** Transactional
**Trigger:** 24 hours after signature if email not yet verified
**Registry Key:** `VERIFICATION_REMINDER`
**Env Var:** `BREVO_TEMPLATE_VERIFY_REMINDER`

**Subject:** `Don't forget to confirm — your signature is waiting`
**Preheader:** `One click and you're officially signer #{{ params.SIGNATURE_NUMBER }}.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `SIGNATURE_NUMBER` | string | Formatted signer number |
| `VERIFICATION_URL` | string | Same verification link (72h from original send) |
| `HOURS_REMAINING` | string | Approximate hours until link expires (e.g., "48") |

### Body

```
{{ params.FIRSTNAME }},

You signed the petition yesterday, but we haven't confirmed your email
yet. Without confirmation, your signature can't be verified.

You have about {{ params.HOURS_REMAINING }} hours left:

[Confirm My Signature →]  {{ params.VERIFICATION_URL }}

That's it — one click and you're officially signer #{{ params.SIGNATURE_NUMBER }}.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Confirm My Signature → | `{{ params.VERIFICATION_URL }}` | Primary |

### Footer

Transactional footer.

---

## 3. Resend Verification

**Type:** Transactional
**Trigger:** 72 hours after signature if email still not verified (final reminder)
**Registry Key:** `RESEND_VERIFICATION`
**Env Var:** `BREVO_TEMPLATE_RESEND_VERIFY`

**Subject:** `Last chance to confirm your signature`
**Preheader:** `Your verification link expires today. Confirm now to make your signature count.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `SIGNATURE_NUMBER` | string | Formatted signer number |
| `VERIFICATION_URL` | string | Fresh verification link (new 72h expiry) |

### Body

```
{{ params.FIRSTNAME }},

Your original verification link has expired. We've generated a new one.

Confirm your email to make your signature count:

[Confirm My Signature →]  {{ params.VERIFICATION_URL }}

This new link expires in 72 hours.

If you no longer want to be part of this, no action needed. But if you
signed because you believe this city's name should reflect what it
actually is — please take 5 seconds to click the button above.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Confirm My Signature → | `{{ params.VERIFICATION_URL }}` | Primary |

### Footer

Transactional footer.

---

## 4. Welcome — Verified Signer

**Type:** Marketing
**Trigger:** Immediately after successful email verification
**Registry Key:** `VERIFIED_WELCOME`
**Env Var:** `BREVO_TEMPLATE_VERIFIED_WELCOME`

**Subject:** `You're verified — signer #{{ params.SIGNATURE_NUMBER }} is official`
**Preheader:** `Your signature is confirmed. Here's your personal share link to recruit friends.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `SIGNATURE_NUMBER` | string | Formatted signer number |
| `CURRENT_COUNT` | string | Current total signature count (formatted) |
| `REFERRAL_CODE` | string | Signer's personal referral code (CONF-XXXX) |
| `SHARE_URL` | string | `https://confluenceohio.org/sign?ref=CONF-XXXX` |

### Body

```
{{ params.FIRSTNAME }},

Your email is confirmed. You're officially signer #{{ params.SIGNATURE_NUMBER }}.

We're at {{ params.CURRENT_COUNT }} verified signatures. Every confirmed
signer brings us closer to the ballot.

Share your personal link to help us grow:

{{ params.SHARE_URL }}

[Share on Facebook]  [Share on Twitter/X]  [Share on WhatsApp]  [Copy Link]

Every person who signs through your link is tracked — we'll notify you
when your friends join.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Share on Facebook | Facebook share URL with `{{ params.SHARE_URL }}` | Social button |
| Share on Twitter/X | Twitter intent URL with pre-populated text | Social button |
| Share on WhatsApp | WhatsApp share URL | Social button |
| Copy Link | JavaScript copy to clipboard | Secondary button |

### Footer

Marketing footer with unsubscribe.

---

## 5. Welcome 1 — Signature Confirmation

**Type:** Marketing (welcome series email 1 of 4)
**Trigger:** Immediate on petition signature (if email opt-in)
**Registry Key:** `WELCOME_1_CONFIRMATION`
**Env Var:** `BREVO_TEMPLATE_WELCOME_1`

**Subject:** `You're signer #{{ params.SIGNATURE_NUMBER }} — welcome to the movement`
**Preheader:** `{{ params.CURRENT_COUNT }} people and counting. Help us reach {{ params.NEXT_MILESTONE }}.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `SIGNATURE_NUMBER` | string | Formatted signer number |
| `CURRENT_COUNT` | string | Current total signature count (formatted) |
| `NEXT_MILESTONE` | string | Next milestone target (formatted, e.g., "5,000") |
| `REFERRAL_CODE` | string | Signer's referral code |
| `SHARE_URL` | string | `https://confluenceohio.org/sign?ref=CONF-XXXX` |

### Body

```
You're signer #{{ params.SIGNATURE_NUMBER }}.

{{ params.CURRENT_COUNT }} people have added their names so far. Help us
reach {{ params.NEXT_MILESTONE }} — share with 3 friends.

[Share on Facebook]  [Share on Twitter/X]  [Share on WhatsApp]  [Copy Link]

Your personal share link: {{ params.SHARE_URL }}
Every person who signs through your link is tracked — we'll let you know
when your friends join.

Thank you for being part of this.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Share on Facebook | Facebook share dialog with `{{ params.SHARE_URL }}` | Social button |
| Share on Twitter/X | Twitter intent URL | Social button |
| Share on WhatsApp | WhatsApp API share URL | Social button |
| Copy Link | Copies `{{ params.SHARE_URL }}` to clipboard | Secondary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 6. Welcome 2 — The Story

**Type:** Marketing (welcome series email 2 of 4)
**Trigger:** Day 3 after signature
**Registry Key:** `WELCOME_2_STORY`
**Env Var:** `BREVO_TEMPLATE_WELCOME_2`

**Subject:** `The tavern, the rivers, and how Columbus got its name`
**Preheader:** `In 1812, a tavern owner convinced the legislature to borrow a name. Here's the full story.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `REFERRAL_CODE` | string | Signer's referral code |
| `SHARE_URL` | string | Personalized share link |

### Body

```
{{ params.FIRSTNAME }},

In 1812, the Ohio legislature needed a name for the state's new capital.
The city sat at the confluence of the Scioto and Olentangy rivers — the
very reason the site was chosen. The founding document described it as
"High Banks opposite Franklinton at the Forks of the Scioto."

But a tavern-owning legislator named Joseph Foos admired Christopher
Columbus, and over drinks, he persuaded his colleagues to name the city
after an Italian explorer who never came within a thousand miles of Ohio.

That was a fine name for its time. But times change.

In 2020, the city removed the Columbus statue from City Hall and replaced
Columbus Day with Indigenous Peoples' Day. In 2023, the city launched a
$3.5 million "Reimagining Columbus" initiative. The conversation about
this city's name isn't new — we're just helping it reach its conclusion.

"Confluence" isn't just a pretty word. It's what this city literally is:
the place where two rivers meet, where diverse communities converge,
where ideas collide. It's Ohio's largest, youngest, fastest-growing city
— and its name should reflect what it actually is.

[Read the full case →]  https://confluenceohio.org/the-case

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Read the full case → | `https://confluenceohio.org/the-case` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 7. Welcome 3 — Community Voices

**Type:** Marketing (welcome series email 3 of 4)
**Trigger:** Day 7 after signature
**Registry Key:** `WELCOME_3_VOICES`
**Env Var:** `BREVO_TEMPLATE_WELCOME_3`

**Subject:** `Why did you sign? We'd love to hear your perspective`
**Preheader:** `{{ params.CURRENT_COUNT }} voices and counting. Add yours to the conversation.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `CURRENT_COUNT` | string | Current total signature count (formatted) |
| `VOICES_URL` | string | `https://confluenceohio.org/voices/share` |
| `REFERRAL_CODE` | string | Signer's referral code |
| `SHARE_URL` | string | Personalized share link |

### Body

```
{{ params.FIRSTNAME }},

We're at {{ params.CURRENT_COUNT }} signatures. But numbers alone don't
tell the story. We want to hear yours.

Why did you sign? What does the name of this city mean to you? Whether
you support the change wholeheartedly, have reservations, or signed out
of curiosity — your perspective matters.

In 300 words or less, share your thoughts. We publish all perspectives
— support, opposition, and everything in between.

[Share Your Perspective →]  {{ params.VOICES_URL }}

Here's something you might not know: nearly 200 burial and ceremonial
mounds have been documented in Franklin County, several at the confluence
itself. The Mingo, Shawnee, Delaware, and Wyandot peoples knew this
place long before anyone named it Columbus.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Share Your Perspective → | `{{ params.VOICES_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 8. Welcome 4 — Get Involved

**Type:** Marketing (welcome series email 4 of 4)
**Trigger:** Day 10 after signature
**Registry Key:** `WELCOME_4_INVOLVE`
**Env Var:** `BREVO_TEMPLATE_WELCOME_4`

**Subject:** `Beyond the petition: 6 ways to make Confluence happen`
**Preheader:** `Signature collectors, social amplifiers, neighborhood captains — find your role.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `VOLUNTEER_URL` | string | `https://confluenceohio.org/volunteer` |
| `DONATE_URL` | string | ActBlue link with refcode |
| `REFERRAL_CODE` | string | Signer's referral code |
| `SHARE_URL` | string | Personalized share link |

### Body

```
{{ params.FIRSTNAME }},

Your signature moved us one step closer to the ballot. Here's how to
take the next step.

SIGNATURE COLLECTOR (2 hrs/week)
Table at farmers markets and community events. We provide the petitions,
talking points, and training.

SOCIAL AMPLIFIER (15 min/day)
Share campaign content, engage in online conversations, and help our
message reach new audiences.

NEIGHBORHOOD CAPTAIN (3 hrs/week)
Coordinate efforts in your area. Connect with neighbors, host
conversations, distribute materials.

EVENT ORGANIZER (4 hrs/month)
Plan community forums, info sessions, and house parties.

[Find Your Role →]  {{ params.VOLUNTEER_URL }}

Or help fund the campaign:
[Donate Any Amount →]  {{ params.DONATE_URL }}

$5 prints a yard sign. $25 covers an hour of legal review. Every dollar
goes directly to getting this question on the ballot.

And the simplest thing you can do right now? Share your personal link
with 3 friends:

{{ params.SHARE_URL }}

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Find Your Role → | `{{ params.VOLUNTEER_URL }}` | Primary |
| Donate Any Amount → | `{{ params.DONATE_URL }}` | Secondary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 9. Signer-to-Volunteer Conversion

**Type:** Marketing
**Trigger:** Day 14 after signature (eligibility: active, not already volunteer, engaged in last 14 days)
**Registry Key:** `SIGNER_TO_VOLUNTEER`
**Env Var:** `BREVO_TEMPLATE_SIGNER_TO_VOLUNTEER`

**Subject:** `{{ params.FIRSTNAME }}, we could use your help this weekend`
**Preheader:** `Last weekend, 12 volunteers collected 300 signatures. Join them.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `VOLUNTEER_URL` | string | `https://confluenceohio.org/volunteer` |

### Body

```
{{ params.FIRSTNAME }},

Last weekend, 12 volunteers collected 300 signatures in 5 neighborhoods.
This campaign moves when people show up — and we could use you.

Here's what we need right now:

SIGNATURE COLLECTOR — Table at the North Market this Saturday, 10am–12pm.
We provide everything: petitions, clipboard, talking points.

SOCIAL AMPLIFIER — Share one post a day from our feed. Takes 15 minutes.

Even 2 hours makes a difference.

[Sign Up to Volunteer →]  {{ params.VOLUNTEER_URL }}

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Sign Up to Volunteer → | `{{ params.VOLUNTEER_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 10. Signer-to-Donor Conversion

**Type:** Marketing
**Trigger:** Day 21 after signature (eligibility: active, not already donor)
**Registry Key:** `SIGNER_TO_DONOR`
**Env Var:** `BREVO_TEMPLATE_SIGNER_TO_DONOR`

**Subject:** `$5 = one more yard sign in your neighborhood`
**Preheader:** `Every dollar funds signature collection, legal review, and community outreach.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Signer's first name |
| `DONATE_URL` | string | ActBlue link with signer's refcode |

### Body

```
{{ params.FIRSTNAME }},

Getting a name change on the ballot takes more than signatures. It takes
legal filings, printed materials, community outreach, and a lot of
coffee.

Here's where every dollar goes:

  $5 — prints a yard sign
  $25 — covers an hour of legal review
  $100 — funds a neighborhood canvass day

Breakdown: 40% signature collection materials, 25% legal/ballot access,
20% digital outreach, 15% operations.

[Chip In →]  {{ params.DONATE_URL }}

Any amount helps. Even $5. If you can, we'd appreciate it. If not,
sharing your personal link is just as valuable.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Chip In → | `{{ params.DONATE_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 11. Milestone Celebration

**Type:** Marketing (campaign send to Signers list)
**Trigger:** Signature count crosses threshold (1,000 / 2,500 / 5,000 / 10,000 / 15,000 / 22,000)
**Registry Key:** `MILESTONE_CELEBRATION`
**Env Var:** `BREVO_TEMPLATE_MILESTONE`

**Subject:** Dynamic per milestone:
- 1,000: `1,000 signatures. This is real.`
- 2,500: `2,500 strong — the movement is growing`
- 5,000: `5,000 people agree: the name should fit the place`
- 10,000: `10,000 signatures. We're almost halfway.`
- 15,000: `15,000 — the finish line is in sight`
- 22,000: `22,000 signatures. We did it. The ballot awaits.`

**Preheader:** `We did it. {{ params.MILESTONE }} people have signed. Next stop: {{ params.NEXT_MILESTONE }}.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `MILESTONE` | string | Milestone number (formatted, e.g., "5,000") |
| `NEXT_MILESTONE` | string | Next milestone target (formatted) |
| `CURRENT_COUNT` | string | Exact current count (formatted) |
| `MILESTONE_PERCENTAGE` | number | Percentage of 22,000 goal (integer) |

### Body

```
{{ params.MILESTONE }} signatures.

This is what civic participation looks like.

[===== PROGRESS BAR: {{ params.MILESTONE_PERCENTAGE }}% =====]
{{ params.MILESTONE }} of 22,000

We're {{ params.MILESTONE_PERCENTAGE }}% of the way to the ballot.
Help us reach {{ params.NEXT_MILESTONE }}.

[Share to Help Us Grow →]  (personalized per recipient via Brevo merge)

— The Confluence Ohio Team
```

**Note for 22,000 milestone:** Use different body entirely:

```
22,000 signatures. We did it.

The petition is complete. Here's what happens next:

1. We submit the signed petition to the Franklin County Board of Elections
2. The Board verifies signatures (this takes several weeks)
3. If validated, the question goes on the next eligible ballot
4. Columbus voters decide

Thank you for being part of this — from signer #1 to signer #22,000.

This isn't the end. It's the beginning of the next chapter.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Share to Help Us Grow → | Recipient's personalized share link | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 12. Re-engagement 1

**Type:** Marketing
**Trigger:** Contact moved to Disengaged list (60+ days no opens/clicks)
**Registry Key:** `RE_ENGAGEMENT_1`
**Env Var:** `BREVO_TEMPLATE_RE_ENGAGEMENT_1`

**Subject:** `A lot has happened since you signed — here's the update`
**Preheader:** `We're at {{ params.CURRENT_COUNT }} signatures. Here's what you missed.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Contact's first name (falls back to "friend") |
| `CURRENT_COUNT` | string | Current signature count (formatted) |

### Body

```
{{ params.FIRSTNAME }},

It's been a while. Here's what's happened with the Confluence campaign:

We're at {{ params.CURRENT_COUNT }} signatures.

{{ COPY: Insert 2–3 bullet points about the biggest recent developments.
These should be manually updated in the Brevo template periodically —
media coverage, endorsements, legal milestones, community events. }}

[Catch Up on the Campaign →]  https://confluenceohio.org

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Catch Up on the Campaign → | `https://confluenceohio.org` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 13. Re-engagement 2

**Type:** Marketing
**Trigger:** 7 days after Re-engagement 1, if still no engagement
**Registry Key:** `RE_ENGAGEMENT_2`
**Env Var:** `BREVO_TEMPLATE_RE_ENGAGEMENT_2`

**Subject:** `Still with us?`
**Preheader:** `If you'd like to keep hearing from us, no action needed. If not, you can unsubscribe below.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Contact's first name (falls back to "friend") |

### Body

```
{{ params.FIRSTNAME }},

We haven't heard from you in a while.

If you'd still like campaign updates, you don't need to do anything.
We'll keep you in the loop.

If not, the unsubscribe link is below — no hard feelings.

Either way, thank you for signing. Your name is still on the petition
and it still counts.

— The Confluence Ohio Team
```

### CTA

None (intentional — the email is respectful and low-pressure).

### Footer

Marketing footer with `{{ unsubscribe }}` prominently placed.

---

## 14. Volunteer Confirmation

**Type:** Marketing
**Trigger:** Immediate on volunteer signup
**Registry Key:** `VOLUNTEER_CONFIRMATION`
**Env Var:** `BREVO_TEMPLATE_VOLUNTEER_CONFIRM`

**Subject:** `Welcome aboard, {{ params.FIRSTNAME }} — you're a Confluence volunteer`
**Preheader:** `You signed up as: {{ params.ROLES }}. Here's what happens next.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Volunteer's first name |
| `ROLES` | string | Comma-separated display names of selected roles |
| `ROLE_NEXT_STEPS` | string | HTML string with role-specific next steps |

### Body

```
{{ params.FIRSTNAME }},

Thank you for volunteering. You signed up for:

{{ params.ROLES }}

Here's what happens next:

{{ params.ROLE_NEXT_STEPS }}

We'll be in touch within the next few days with more details and your
first opportunity to get involved.

— The Confluence Ohio Team
```

### CTA

None in main body (next steps are role-specific and delivered via `ROLE_NEXT_STEPS` parameter).

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 15. Volunteer Onboarding (Day 3)

**Type:** Marketing
**Trigger:** Day 3 after volunteer signup
**Registry Key:** `VOLUNTEER_ONBOARDING_2`
**Env Var:** `BREVO_TEMPLATE_VOLUNTEER_ONBOARD_2`

**Subject:** `Your {{ params.PRIMARY_ROLE }} guide is ready`
**Preheader:** `Everything you need to get started in your role.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Volunteer's first name |
| `PRIMARY_ROLE` | string | Primary role slug (e.g., "signature_collector") |
| `ROLE_GUIDE_URL` | string | `https://confluenceohio.org/volunteer/guide/{role}` |

### Body

```
{{ params.FIRSTNAME }},

Your volunteer guide is ready. It covers everything you need to get
started as a {{ params.PRIMARY_ROLE }}:

- What to expect in your first week
- Key talking points and FAQs
- How to connect with other volunteers in your area
- Upcoming events and opportunities

[Read Your Guide →]  {{ params.ROLE_GUIDE_URL }}

Questions? Reply to this email — a real person reads every reply.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Read Your Guide → | `{{ params.ROLE_GUIDE_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 16. Volunteer First Task (Day 7)

**Type:** Marketing
**Trigger:** Day 7 after volunteer signup
**Registry Key:** `VOLUNTEER_FIRST_TASK`
**Env Var:** `BREVO_TEMPLATE_VOLUNTEER_FIRST_TASK`

**Subject:** `Your first task: this week's volunteer opportunity`
**Preheader:** `A specific, time-bounded way to contribute this week.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Volunteer's first name |
| `PRIMARY_ROLE` | string | Primary role slug |
| `VOLUNTEER_URL` | string | `https://confluenceohio.org/volunteer` |

### Body

```
{{ params.FIRSTNAME }},

You've had a few days to read through your guide. Ready for your first
task?

{{ COPY: This section should be updated periodically in the Brevo
template with a current, specific opportunity — e.g., "We're tabling at
the Clintonville Farmers Market this Saturday, 9am–noon. Show up and
we'll pair you with an experienced collector." }}

If that doesn't work for your schedule, check the volunteer dashboard
for other opportunities:

[See All Opportunities →]  {{ params.VOLUNTEER_URL }}

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| See All Opportunities → | `{{ params.VOLUNTEER_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 17. Volunteer Check-in (Day 14)

**Type:** Marketing
**Trigger:** Day 14 after volunteer signup
**Registry Key:** `VOLUNTEER_CHECK_IN`
**Env Var:** `BREVO_TEMPLATE_VOLUNTEER_CHECK_IN`

**Subject:** `How's it going, {{ params.FIRSTNAME }}?`
**Preheader:** `Quick check-in from the Confluence Ohio team.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Volunteer's first name |
| `VOLUNTEER_URL` | string | `https://confluenceohio.org/volunteer` |

### Body

```
{{ params.FIRSTNAME }},

You signed up to volunteer two weeks ago. How's it going?

If you've already jumped in — thank you. You're making a difference.

If life got in the way, no worries. The campaign will be here when
you're ready. Here are some low-effort ways to contribute:

- Share a campaign post on social media (2 minutes)
- Send your personal petition link to 3 friends (1 minute)
- Talk to one neighbor about the campaign this week

[Check the Volunteer Dashboard →]  {{ params.VOLUNTEER_URL }}

Questions, feedback, or ideas? Reply to this email.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Check the Volunteer Dashboard → | `{{ params.VOLUNTEER_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 18. Standalone Subscriber Welcome

**Type:** Marketing
**Trigger:** Immediate on non-petition email signup (footer, blog, standalone form)
**Registry Key:** `STANDALONE_WELCOME`
**Env Var:** `BREVO_TEMPLATE_STANDALONE_WELCOME`

**Subject:** `Welcome — here's why {{ params.CURRENT_COUNT }} people have signed`
**Preheader:** `You're on the list. Here's the case for renaming Columbus.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Subscriber's first name (falls back to "friend") |
| `CURRENT_COUNT` | string | Current signature count (formatted) |
| `SIGN_URL` | string | `https://confluenceohio.org/sign` |

### Body

```
{{ params.FIRSTNAME }},

Welcome to Confluence Ohio. Here's the 30-second version:

Columbus, Ohio was named after Christopher Columbus in 1812, by a state
legislator who admired the explorer. The city actually sits at the
confluence of the Scioto and Olentangy rivers — and "Confluence" better
reflects what this place actually is.

{{ params.CURRENT_COUNT }} people have signed the petition to put a name
change on the ballot. You can join them:

[Sign the Petition →]  {{ params.SIGN_URL }}

We'll send you campaign updates, but never spam. Unsubscribe any time.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Sign the Petition → | `{{ params.SIGN_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 19. Subscriber Nurture: The Case in 5 Minutes

**Type:** Marketing
**Trigger:** Day 2 after standalone subscription
**Registry Key:** `SUBSCRIBER_CASE`
**Env Var:** `BREVO_TEMPLATE_SUBSCRIBER_CASE`

**Subject:** `The case for Confluence, in 5 minutes`
**Preheader:** `History, geography, and why this city's name should fit what it actually is.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Subscriber's first name (falls back to "friend") |
| `SIGN_URL` | string | `https://confluenceohio.org/sign` |
| `CASE_URL` | string | `https://confluenceohio.org/the-case` |

### Body

```
{{ params.FIRSTNAME }},

Yesterday you signed up for campaign updates. Here's the full picture.

THE HISTORY
In 1812, Ohio's legislature needed a name for the new capital. The city
sat where two rivers meet. A tavern owner named Joseph Foos lobbied for
"Columbus." It stuck — but it was always a borrowed name.

THE GEOGRAPHY
"Confluence" means the meeting point of two rivers. That's literally
what this city is: the Scioto and Olentangy converge right downtown.

THE MOMENTUM
The city already removed the Columbus statue, replaced Columbus Day with
Indigenous Peoples' Day, and launched a "Reimagining Columbus" initiative.

[Read the Full Case →]  {{ params.CASE_URL }}

Or, if you've seen enough:
[Sign the Petition →]  {{ params.SIGN_URL }}

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Read the Full Case → | `{{ params.CASE_URL }}` | Primary |
| Sign the Petition → | `{{ params.SIGN_URL }}` | Secondary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 20. Subscriber Nurture: Ready to Sign?

**Type:** Marketing
**Trigger:** Day 5 after standalone subscription
**Registry Key:** `SUBSCRIBER_PETITION_CTA`
**Env Var:** `BREVO_TEMPLATE_SUBSCRIBER_PETITION_CTA`

**Subject:** `Ready to add your name?`
**Preheader:** `It takes 60 seconds. Your signature helps get this question on the ballot.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Subscriber's first name (falls back to "friend") |
| `CURRENT_COUNT` | string | Current signature count (formatted) |
| `SIGN_URL` | string | `https://confluenceohio.org/sign` |

### Body

```
{{ params.FIRSTNAME }},

{{ params.CURRENT_COUNT }} people have signed the petition. Each
signature brings us closer to putting the question on the ballot and
letting Columbus voters decide.

Signing takes about 60 seconds. You'll enter your name, Ohio address
(for verification), and email.

[Sign the Petition →]  {{ params.SIGN_URL }}

Not ready yet? That's fine. We'll keep you updated as the campaign
progresses.

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Sign the Petition → | `{{ params.SIGN_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 21. Subscriber Nurture: Community + Share

**Type:** Marketing
**Trigger:** Day 10 after standalone subscription
**Registry Key:** `SUBSCRIBER_VOICES_SHARE`
**Env Var:** `BREVO_TEMPLATE_SUBSCRIBER_VOICES`

**Subject:** `What people are saying about Confluence`
**Preheader:** `Voices from across Columbus — support, opposition, and everything in between.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Subscriber's first name (falls back to "friend") |
| `VOICES_URL` | string | `https://confluenceohio.org/voices` |
| `SIGN_URL` | string | `https://confluenceohio.org/sign` |

### Body

```
{{ params.FIRSTNAME }},

This campaign isn't just about us. Here's what people across Columbus
are saying:

{{ COPY: Include 2–3 curated community voice excerpts. Update this
section periodically in the Brevo template with recent, diverse
perspectives. Include at least one supportive and one skeptical voice. }}

We publish all perspectives — support, opposition, and everything in
between. Have something to say?

[Share Your Perspective →]  {{ params.VOICES_URL }}

Or, if you're ready:
[Sign the Petition →]  {{ params.SIGN_URL }}

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Share Your Perspective → | `{{ params.VOICES_URL }}` | Primary |
| Sign the Petition → | `{{ params.SIGN_URL }}` | Secondary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 22. Referral Notification

**Type:** Marketing
**Trigger:** When someone signs via a signer's referral link
**Registry Key:** `REFERRAL_NOTIFICATION`
**Env Var:** `BREVO_TEMPLATE_REFERRAL_NOTIFY`

**Subject:** `Someone signed through your link!`
**Preheader:** `Your referral just became signer #{{ params.NEW_SIGNER_NUMBER }}. Keep sharing!`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Referrer's first name |
| `NEW_SIGNER_NUMBER` | string | The new signer's number (formatted) |
| `REFERRAL_COUNT` | string | Total referrals by this person (formatted) |
| `SHARE_URL` | string | Referrer's personalized share link |

### Body

```
{{ params.FIRSTNAME }},

Someone just signed the petition through your link — they're signer
#{{ params.NEW_SIGNER_NUMBER }}.

You've referred {{ params.REFERRAL_COUNT }} people so far.

Keep sharing:
{{ params.SHARE_URL }}

[Share on Facebook]  [Share on Twitter/X]  [Share on WhatsApp]  [Copy Link]

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Share on Facebook | Facebook share dialog | Social button |
| Share on Twitter/X | Twitter intent URL | Social button |
| Share on WhatsApp | WhatsApp share URL | Social button |
| Copy Link | Copies share URL | Secondary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 23. Donation Thank You

**Type:** Marketing
**Trigger:** ActBlue webhook (one-time donation)
**Registry Key:** `DONATION_THANK_YOU`
**Env Var:** `BREVO_TEMPLATE_DONATION_THANKS`

**Subject:** `Thank you, {{ params.DONOR_NAME }} — your {{ params.AMOUNT }} makes a difference`
**Preheader:** `Here's exactly what your donation funds.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `DONOR_NAME` | string | Donor's display name |
| `AMOUNT` | string | Formatted donation amount (e.g., "$25.00") |
| `RECURRING` | boolean | Whether this is a recurring donation (false for this template) |

### Body

```
{{ params.DONOR_NAME }},

Thank you for your {{ params.AMOUNT }} donation to Confluence Ohio.

Here's what your contribution funds:

- Signature collection materials (petitions, clipboards, canopies)
- Legal review and ballot access filings
- Digital outreach and community engagement
- Printed materials (yard signs, flyers, postcards)

Every dollar goes directly to getting this question on the ballot.

Your donation receipt will come separately from ActBlue. If you need
it for tax purposes, note that contributions to a 501(c)(4) organization
are generally not tax-deductible.

— The Confluence Ohio Team
```

### CTA

None (the thank-you is the message; no further ask).

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 24. Donation Thank You (Recurring)

**Type:** Marketing
**Trigger:** ActBlue webhook (recurring donation)
**Registry Key:** `DONATION_THANK_YOU_RECURRING`
**Env Var:** `BREVO_TEMPLATE_DONATION_THANKS_RECURRING`

**Subject:** `Thank you for your monthly {{ params.AMOUNT }}, {{ params.DONOR_NAME }}`
**Preheader:** `Recurring support like yours keeps this campaign running.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `DONOR_NAME` | string | Donor's display name |
| `AMOUNT` | string | Monthly donation amount (formatted) |
| `RECURRING` | boolean | true |

### Body

```
{{ params.DONOR_NAME }},

Thank you for setting up a monthly {{ params.AMOUNT }} contribution to
Confluence Ohio.

Recurring donors are the backbone of this campaign. Your steady support
means we can plan ahead — booking event spaces, printing materials, and
funding legal work — with confidence.

You can manage or cancel your recurring donation at any time through
ActBlue. Your receipts will come from ActBlue directly.

Note: Contributions to a 501(c)(4) organization are generally not
tax-deductible.

— The Confluence Ohio Team
```

### CTA

None.

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## 25. Admin: New Volunteer

**Type:** Transactional (internal notification)
**Trigger:** Immediate on volunteer signup
**Registry Key:** `ADMIN_NEW_VOLUNTEER`
**Env Var:** `BREVO_TEMPLATE_ADMIN_NEW_VOLUNTEER`

**Subject:** `New volunteer: {{ params.VOLUNTEER_NAME }}`
**Preheader:** `Roles: {{ params.ROLES }}`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `VOLUNTEER_NAME` | string | Full name (first + last) |
| `VOLUNTEER_EMAIL` | string | Volunteer's email address |
| `ROLES` | string | Comma-separated role slugs |
| `NEIGHBORHOOD` | string | Neighborhood (or "Not specified") |

### Body

```
New volunteer signup:

Name: {{ params.VOLUNTEER_NAME }}
Email: {{ params.VOLUNTEER_EMAIL }}
Roles: {{ params.ROLES }}
Neighborhood: {{ params.NEIGHBORHOOD }}

This volunteer has received an automated confirmation email with
role-specific next steps. Follow up within 48 hours if their role
requires direct coordination (neighborhood captain, event organizer).
```

### CTA

None.

### Footer

Minimal internal footer (no unsubscribe — this is an admin notification).

---

## 26. Volunteer Role Update

**Type:** Marketing
**Trigger:** When a volunteer updates their selected roles
**Registry Key:** `VOLUNTEER_ROLE_UPDATE`
**Env Var:** `BREVO_TEMPLATE_VOLUNTEER_ROLE_UPDATE`

**Subject:** `Your volunteer roles have been updated`
**Preheader:** `New roles: {{ params.NEW_ROLES }}. Here's what to expect.`

### Dynamic Parameters

| Parameter | Type | Description |
|---|---|---|
| `FIRSTNAME` | string | Volunteer's first name |
| `NEW_ROLES` | string | Updated comma-separated role display names |
| `ROLE_NEXT_STEPS` | string | HTML string with role-specific next steps |
| `VOLUNTEER_URL` | string | `https://confluenceohio.org/volunteer` |

### Body

```
{{ params.FIRSTNAME }},

Your volunteer roles have been updated to: {{ params.NEW_ROLES }}.

Here's what to expect next:

{{ params.ROLE_NEXT_STEPS }}

[Visit the Volunteer Dashboard →]  {{ params.VOLUNTEER_URL }}

— The Confluence Ohio Team
```

### CTA

| Button Text | URL | Style |
|---|---|---|
| Visit the Volunteer Dashboard → | `{{ params.VOLUNTEER_URL }}` | Primary |

### Footer

Marketing footer with `{{ unsubscribe }}`.

---

## Design System

All templates share these visual specifications. See Artifact 07 §3.1 for the canonical reference.

### Layout

| Property | Value |
|---|---|
| Max width | 600px (email standard) |
| Mobile | Fluid width, single-column |
| Header | Campaign logo (Confluence Ohio wordmark), 120px wide, left-aligned |
| Approach | Table-based layout for email client compatibility |

### Typography

| Element | Size | Color | Weight | Line Height |
|---|---|---|---|---|
| Body text | 16px | #333333 | normal | 1.6 |
| Headings | 22px | #1e3a5f (campaign navy) | bold | 1.3 |
| Footer text | 14px | #666666 | normal | 1.4 |
| Preheader | 0px (hidden) | — | — | — |

**Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
No web fonts (inconsistent email client support).

### Colors

| Name | Hex | Usage |
|---|---|---|
| Campaign Navy | #1e3a5f | Headings |
| Campaign Blue | #1e40af | CTA buttons, links |
| Body Text | #333333 | Body copy |
| Footer Text | #666666 | Footer copy |
| Footer Background | #f5f5f5 | Footer section |
| CTA Button Text | #ffffff | Button text |

### CTA Button

| Property | Value |
|---|---|
| Height | 48px |
| Horizontal padding | 16px |
| Background | #1e40af |
| Text color | #ffffff |
| Border radius | 6px |
| Mobile | Full-width |
| Font size | 16px, bold |

### Links

Color: #1e40af, underlined.

### Preheader

Hidden preheader text for inbox preview:
```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
  {{ preheader text }}
</div>
```

### Footer (CAN-SPAM Compliant)

Required on every marketing email:

```html
<div style="background: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #666;">
  <p>Confluence Ohio · PO Box 8012 · Columbus, OH 43201</p>
  <p>
    You're receiving this because you signed the petition or subscribed at confluenceohio.org.
    <br>
    <a href="{{ unsubscribe }}" style="color: #1e40af;">Unsubscribe</a> ·
    <a href="https://confluenceohio.org/privacy" style="color: #1e40af;">Privacy Policy</a>
  </p>
</div>
```

`{{ unsubscribe }}` is Brevo's built-in tag — generates a per-recipient unsubscribe link automatically.

### Transactional vs. Marketing

**Transactional** (no unsubscribe legally required, but included as best practice):
- Email Verification (#1)
- Verification Reminder (#2)
- Resend Verification (#3)
- Admin: New Volunteer (#25)

**Marketing** (CAN-SPAM mandatory — unsubscribe + physical address):
- All other templates

---

## Template Parameter Summary

Quick reference for all `{{ params.X }}` variables used across templates.

| Parameter | Templates | Source |
|---|---|---|
| `FIRSTNAME` | 1–10, 12–22, 26 | Form field / Brevo attribute |
| `SIGNATURE_NUMBER` | 1–5 | Petition flow |
| `VERIFICATION_URL` | 1–3 | Generated URL with HMAC token |
| `CURRENT_COUNT` | 4, 5, 7, 12, 18, 20 | `campaign_metrics` table |
| `NEXT_MILESTONE` | 5, 11 | Calculated from count |
| `REFERRAL_CODE` | 4–8 | Petition flow |
| `SHARE_URL` | 4–8, 22 | `https://confluenceohio.org/sign?ref={code}` |
| `VOICES_URL` | 7, 21 | Static URL |
| `VOLUNTEER_URL` | 8, 9, 16, 17, 26 | Static URL |
| `DONATE_URL` | 8, 10 | ActBlue URL with refcode |
| `MILESTONE` | 11 | Milestone threshold |
| `MILESTONE_PERCENTAGE` | 11 | Calculated (milestone / 22000 * 100) |
| `ROLES` | 14 | Comma-separated role display names |
| `ROLE_NEXT_STEPS` | 14, 26 | HTML string, role-specific |
| `PRIMARY_ROLE` | 15, 16 | First role in volunteer's role array |
| `ROLE_GUIDE_URL` | 15 | Dynamic URL per role |
| `SIGN_URL` | 18–21 | Static URL |
| `CASE_URL` | 19 | Static URL |
| `NEW_SIGNER_NUMBER` | 22 | Referral target's signer number |
| `REFERRAL_COUNT` | 22 | Referrer's total conversion count |
| `DONOR_NAME` | 23, 24 | ActBlue webhook |
| `AMOUNT` | 23, 24 | Formatted donation amount |
| `RECURRING` | 23, 24 | Boolean |
| `VOLUNTEER_NAME` | 25 | Full name |
| `VOLUNTEER_EMAIL` | 25 | Email address |
| `NEIGHBORHOOD` | 25 | Volunteer form or "Not specified" |
| `NEW_ROLES` | 26 | Updated role display names |
| `HOURS_REMAINING` | 2 | Calculated from verification expiry |
