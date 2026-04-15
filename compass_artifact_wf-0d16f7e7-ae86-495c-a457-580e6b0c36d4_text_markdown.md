# Confluence Ohio — Claude Cowork Project

## Part A: Project Instructions

---

### 1. Project overview and mission

**Project name:** confluenceohio.org Rebuild

**Mission:** Build a world-class civic participation website that makes the case for renaming Columbus, Ohio to "Confluence, Ohio" — grounded in geography, history, and the city's identity as a place where rivers, peoples, and ideas meet. The site is both a persuasion engine and a participation platform: petition signatures are the primary conversion goal, supported by email list growth, volunteer recruitment, ActBlue donations, and social amplification. A lightweight debate/voices feature invites community perspectives from all sides.

**Why "Confluence":** Columbus sits at the literal confluence of the Scioto and Olentangy Rivers — the geographic fact that determined the city's location in 1812. "Confluence" replaces a name honoring a 15th-century colonizer who never set foot in Ohio with a name that describes what the city actually is: a meeting point of waters, cultures, industries, and ideas.

**Campaign positioning:** This is a legitimate civic movement — warm, locally rooted, historically grounded, and invitingly provocative. It is never snarky or dismissive of Columbus or people who disagree. It treats the debate as a genuine conversation, steelmans the opposition, and invites all perspectives. The tone is serious-but-playful: real movement energy with self-awareness and intellectual honesty.

---

### 2. Tim's preferences and working style

- **Stack defaults:** Next.js (App Router), Supabase (PostgreSQL, Auth, RLS, Realtime, Edge Functions), Vercel (hosting, CI/CD, analytics), Brevo (transactional + marketing email), Claude API (content generation, moderation assistance), BullMQ or Inngest (background jobs), Turborepo monorepo with hexagonal architecture
- **Methodology:** Phased Cowork prompts → Claude Code execution prompts. Sequential, dependency-aware. Each Cowork prompt produces a specific artifact that downstream prompts build on.
- **Communication style:** Action-oriented defaults. Aggressive use of web search for research. Early flagging of ambiguity. Structured sequential output with clear task dependencies. No fluff, no throat-clearing.
- **Voice for this campaign:** First person plural ("we"), confident but not arrogant, historically grounded, emotionally resonant without being manipulative. Think: a neighbor who has done their homework, inviting you to consider something. Not a lecture. Not a joke.

---

### 3. Tech stack recommendation

**Decision: Custom build using Tim's default stack, with Smarty for address verification and ActBlue for donations.**

| Layer | Tool | Rationale |
|-------|------|-----------|
| Framework | Next.js 15+ (App Router) | Full UX control for conversion optimization, SSR/SSG for SEO, API routes for server-side logic |
| Database | Supabase (PostgreSQL) | Auth, RLS, real-time signature counters, Edge Functions, free tier covers early stage |
| Hosting | Vercel | Edge CDN, CI/CD from Git, analytics, excellent Next.js integration |
| Email | Brevo (Business, ~$18/mo) | Volume-based pricing ideal for large petition lists with periodic sends. Full REST API, transactional + marketing email, unlimited automation workflows. Storing 50K contacts while sending 10K emails/mo costs ~$18/mo vs $100+ on Mailchimp |
| Address verification | Smarty (formerly SmartyStreets) | **99.8% accuracy** (highest tested), Ohio autocomplete filtering built-in (`include_only_states=OH`), residential/commercial indicator, fraud detection fields (vacancy, CMRA), sub-50ms response, JS SDK, ~$54/mo for 10K verifications. USPS API is disqualified (ToS prohibits non-shipping use) |
| Donations | ActBlue (embed/redirect + refcode tracking) | Industry standard for progressive causes, Express Lane (14M+ users), webhook callbacks for donation tracking, 3.95% processing fee |
| Background jobs | Inngest | Webhook processing, email automation triggers, batch address verification, signature deduplication |
| Monorepo | Turborepo | Shared packages for types, utils, UI components |
| Analytics | Vercel Analytics + PostHog | Conversion funnels, A/B testing, event tracking |
| CDN/Security | Cloudflare (DNS, DDoS, Turnstile CAPTCHA) | Free tier covers DNS + CDN + bot protection. Turnstile replaces reCAPTCHA with zero user friction |

**Why custom over platforms:**
- **Action Network** ($15/mo) was the strongest platform alternative. Its API allows keyless POST submissions from custom JavaScript, which enables a hybrid approach. However, the custom build wins because: (a) full control over the petition UX drives higher conversion — even a 1% improvement on 100K visitors equals 1,000 more signatures; (b) Supabase real-time subscriptions make live signature counters trivial without polling; (c) custom address verification with Smarty is not possible within AN; (d) the debate/voices feature requires custom data modeling; (e) Tim's team already has the stack expertise.
- **NationBuilder** ($129/mo) was rejected: dated UX, steep learning curve, deteriorating product quality, vendor lock-in.
- **EveryAction/Bonterra** and **ActionKit** ($995/mo) are enterprise-grade and overkill for a single-issue civic campaign.

**Fallback:** If build timeline is compressed, use Action Network for petition + email backend with a custom Next.js frontend. This cuts build time from ~120 hours to ~50 hours at the cost of losing custom address verification, debate features, and granular conversion optimization.

---

### 4. Architectural principles

- **Hexagonal architecture:** Domain logic (petition signing, verification, deduplication) is isolated from infrastructure (Supabase, Smarty, Brevo). Ports and adapters pattern. Switching email providers or address verification services should require changing one adapter, not touching business logic.
- **Monorepo structure (Turborepo):**
  - `apps/web` — Next.js frontend
  - `apps/admin` — Admin dashboard (Next.js or separate)
  - `packages/core` — Domain logic, types, validation
  - `packages/db` — Supabase client, migrations, RLS policies
  - `packages/email` — Brevo adapter, email templates
  - `packages/verification` — Smarty adapter, Ohio residency logic
  - `packages/ui` — Shared React components
- **Server-first:** Address verification, signature recording, and deduplication happen server-side (API routes or Edge Functions). Never expose Smarty secret keys to the client. Use Smarty's publishable embedded keys only for autocomplete on the frontend.
- **Progressive enhancement:** Core petition signing works without JavaScript. Signature counter, autocomplete, and social sharing enhance progressively.
- **Privacy by design:** Collect only what is necessary (name, address, email). Encrypt PII at rest. Publish clear privacy policy. Allow signature deletion requests. Store canonical address hashes for deduplication, not raw addresses beyond what is needed.

---

### 5. Brand voice for the campaign

**Voice attributes:**
- **Rooted:** Speaks from deep knowledge of Columbus — its rivers, neighborhoods, history, people. Not outsider commentary.
- **Inviting:** Opens doors rather than closing them. "Consider this" rather than "you're wrong." Welcomes disagreement.
- **Historically grounded:** Every claim is sourced. The site teaches as it persuades.
- **Confident without being righteous:** Takes a clear position but holds it with humility. Acknowledges complexity.
- **Warm and local:** References specific Columbus places, institutions, culture. Feels like The Confluence Cast, not a national think piece.
- **Playful when appropriate:** The Flavortown petition got 118,000 signatures because it was fun. This campaign should have that energy — channeled into something substantive.

**Voice don'ts:**
- Never mock or dismiss people who love the name Columbus
- Never reduce the argument to "Columbus was bad, therefore change the name"
- Never use academic jargon or activist-speak
- Never be preachy or self-congratulatory
- Never treat this as settled — it is a genuine question being asked

**Sample tone:**
> "In 1812, a tavern owner named Joseph Foos invited some legislators over for drinks and convinced them to name Ohio's new capital after Christopher Columbus — an Italian explorer who never came within a thousand miles of the Scioto River. It was a fine name for its time. But times change, and names can too. We think 'Confluence' — the word for the meeting of rivers that made this city possible — tells a truer story about who we are."

---

### 6. How Cowork should structure its phased outputs

Each Cowork prompt below produces a specific artifact. Artifacts have explicit dependencies — no prompt should be executed until its dependencies are complete. The final output of executing all prompts is a complete set of Claude Code-ready technical specifications.

**Phase structure:**
1. **Foundation** (Prompts 1–3): Brand, messaging, site architecture
2. **Content** (Prompt 4): Page-by-page copy and content strategy
3. **Technical design** (Prompts 5–10): Data model, petition flow, integrations, features
4. **Infrastructure** (Prompts 11–16): Sharing, SEO, analytics, accessibility, admin, deployment
5. **Iteration** (Prompt 17): Post-launch roadmap

Each prompt output should include:
- The artifact itself (messaging doc, schema, spec, copy, etc.)
- A "Claude Code Handoff" section: the exact Claude Code prompt that would implement this artifact
- Any open questions or decisions that need Tim's input before proceeding

---

### 7. Quality standards and constraints

- **Accessibility:** WCAG 2.1 AA minimum. All forms keyboard-navigable. Screen reader tested. Color contrast ratios verified. Alt text on all images.
- **Performance:** Lighthouse score ≥90 on all metrics. First Contentful Paint <1.5s. Largest Contentful Paint <2.5s. Core Web Vitals passing.
- **Mobile-first:** 50–68% of civic campaign traffic is mobile. All critical flows (petition signing, sharing, donating) must be optimized for mobile first.
- **SEO:** All pages have unique meta titles, descriptions, and Open Graph tags. JSON-LD structured data (NGO, FAQ, Event, Article schemas). Sitemap and robots.txt. Semantic HTML.
- **Security:** No PII in client-side logs. Smarty secret keys server-side only. Rate limiting on all form submissions. Cloudflare Turnstile on petition form. Input validation and sanitization. Supabase RLS on all tables.
- **Legal:** Privacy policy, terms of use, CAN-SPAM compliance, cookie consent. Petition disclaimers as required by Ohio law.

---

## Part B: Sequential Cowork Prompts

---

### PROMPT 1: Brand Discovery and Messaging Framework

**Dependencies:** None (this is the foundation)

**Task:** Create the complete messaging framework for the Confluence Ohio campaign. This document will guide all copy, content, and communications across the site.

**Produce the following artifacts:**

1. **Mission statement** (1 sentence, <30 words)
2. **Vision statement** (what success looks like)
3. **Campaign manifesto** (500–700 words): The emotional and intellectual case for renaming Columbus to Confluence. Written in first person plural. Opens with the rivers. Moves through history. Arrives at the name. Ends with an invitation.
4. **Name origin story** — a compelling narrative of why "Confluence":
   - The literal geography: Scioto (Wyandot for "deer") and Olentangy (Delaware for "river of the red face paint") meet in northern downtown Columbus, just northwest of North Bank Park. This confluence is why the city exists — the state legislature chose this location specifically because of the rivers.
   - The metaphorical resonance: Columbus is a city where diverse communities, economic sectors, transportation routes, and ideas converge. It is Ohio's largest, youngest, and fastest-growing city.
   - The contrast: "Columbus" honors a 15th-century colonizer with zero connection to Ohio. "Confluence" describes what the city actually is.
5. **The case for renaming — 7 core arguments:**
   - Christopher Columbus's documented legacy (enslavement, brutality, imprisonment by Spain)
   - Zero connection to Ohio (never set foot within a thousand miles)
   - The city itself has already acknowledged the problem (statue removed 2020, Indigenous Peoples' Day adopted 2020, $3.5M Reimagining Columbus initiative)
   - "Confluence" is geographically accurate and place-based
   - The name tells a truer story about the city's identity
   - Branding opportunity (distinctive, memorable, no other major US city uses it)
   - Precedent exists (Barrow → Utqiaġvik, 2016; St. Paul from Pig's Eye; Cincinnati from Losantiville)
6. **Steelman of the opposition — 7 strongest counterarguments, honestly presented:**
   - 200+ years of tradition and civic identity
   - Enormous cost and logistical complexity for a city of 900K+ (signs, documents, branding, sports teams, airport)
   - Brand recognition loss ("Columbus, Ohio" is nationally known)
   - Potential confusion during transition
   - Italian American heritage connection
   - The name has been reclaimed/recontextualized — many residents identify with "Columbus" as their city, separate from the historical figure
   - Slippery slope: 6,000+ US places named for Columbus; where does it end?
7. **FAQ document** (15–20 Q&As covering process, cost, precedent, timeline, legality)
8. **Elevator pitches** — 10-second, 30-second, and 2-minute versions
9. **Key talking points** for press, social media, volunteer conversations
10. **Hashtag strategy:** Primary and secondary hashtags

**Key historical facts to incorporate:**
- Founded February 14, 1812, as "Ohio City" — renamed to Columbus before incorporation, reportedly by Joseph Foos, a tavern-owning legislator who admired Christopher Columbus
- The founding document describes the location as "High Banks opposite Franklinton at the Forks of the Scioto"
- Native American history at the confluence: Mingo, Shawnee, Delaware, and Wyandot peoples. Nearly 200 burial and ceremonial mounds in Franklin County, several at the confluence itself
- The rivers: Scioto (231 miles, longest river entirely in Ohio, on state seal) and Olentangy (97 miles, name was actually a translation error by the 1833 Ohio General Assembly)
- 2020: Columbus statue removed from City Hall; Columbus Day replaced with Indigenous Peoples' Day
- 2023–25: $3.5M Reimagining Columbus initiative (Mellon Foundation + City)
- 2020: The "Flavortown" petition got 118,000+ signatures — demonstrating genuine appetite for change
- Legal path: Charter amendment via citizen petition — requires signatures from 10% of last mayoral vote, then simple majority at election

**Claude Code Handoff:** Generate a `docs/messaging-framework.md` file containing all 10 artifacts above, formatted in Markdown with clear section headers. Also generate `docs/historical-research.md` with the full historical research compiled into a reference document for content writers.

---

### PROMPT 2: Site Architecture and Page Inventory

**Dependencies:** Prompt 1 (messaging framework)

**Task:** Define the complete site architecture, navigation structure, URL scheme, and page inventory for confluenceohio.org. Every page should have a defined purpose, primary CTA, and conversion goal.

**Produce:**

1. **Site map** (visual hierarchy):
   ```
   / (Homepage)
   ├── /the-case (Why rename?)
   │   ├── /the-case/history (The naming story)
   │   ├── /the-case/the-rivers (The confluence)
   │   ├── /the-case/columbus-legacy (Who was Columbus?)
   │   ├── /the-case/precedents (Cities that changed their names)
   │   └── /the-case/the-process (How it works legally)
   ├── /voices (Community perspectives — debate section)
   │   ├── /voices/share (Submit your perspective)
   │   └── /voices/[slug] (Individual story pages)
   ├── /sign (Petition page — primary conversion)
   ├── /volunteer (Volunteer hub)
   ├── /donate (ActBlue integration)
   ├── /about (Campaign team, mission, transparency)
   ├── /press (Media kit, coverage, press releases)
   ├── /blog (Campaign updates, content marketing)
   │   └── /blog/[slug]
   ├── /faq (Frequently asked questions)
   ├── /privacy (Privacy policy)
   └── /terms (Terms of use)
   ```

2. **Page-by-page specification** — for each page, define:
   - Purpose and user intent
   - Primary CTA and conversion goal
   - Secondary CTAs
   - Content outline (sections, approximate word counts)
   - Key UI components needed
   - SEO target keywords
   - Open Graph image concept

3. **Navigation design:**
   - Primary nav: The Case | Voices | Sign the Petition (prominent CTA) | Volunteer | Donate
   - Footer nav: About | Press | Blog | FAQ | Privacy | Terms
   - Mobile: Hamburger menu with "Sign the Petition" as persistent sticky CTA button

4. **Conversion architecture:**
   - Every page should have a path to the petition. Define where and how petition CTAs appear across the site.
   - Post-signature flow: Thank you → Share (personalized: "You were signer #X!") → Donate → Volunteer → Email subscribe
   - Define the "ladder of engagement": Visit → Sign → Share → Subscribe → Volunteer → Donate → Lead

**Claude Code Handoff:** Generate `docs/site-architecture.md` with the full site map, page specifications, and navigation design. Generate `docs/conversion-architecture.md` with the conversion flow diagrams and CTA placement strategy.

---

### PROMPT 3: Content Strategy and SEO Plan

**Dependencies:** Prompts 1–2

**Task:** Develop the content strategy, editorial calendar framework, and SEO plan for confluenceohio.org. The site should function as both a campaign platform and a comprehensive resource on the topic.

**Produce:**

1. **Content pillars** (5 pillars with 10+ article ideas each):
   - The History (Columbus naming, Indigenous history, river history, city development)
   - The Case (arguments, counterarguments, rebuttals, expert perspectives)
   - The Process (legal pathway, charter amendments, signature requirements, timeline)
   - Community Voices (supporter stories, opposition perspectives, neighborhood perspectives)
   - Campaign Updates (milestones, events, press coverage, endorsements)

2. **SEO keyword strategy:**
   - Primary keywords: "rename Columbus Ohio," "Confluence Ohio," "Columbus Ohio renaming"
   - Long-tail targets: "why is Columbus Ohio named Columbus," "history of Columbus Ohio name," "how to rename a city in Ohio," "Columbus Ohio rivers," "Scioto Olentangy confluence"
   - Local SEO: Google Business Profile setup, Ohio-specific directory listings, local news backlink strategy
   - Aim for Google Ad Grants ($10K/mo free ads for nonprofits) to supplement organic

3. **Schema markup plan:**
   - NGO/Organization schema (JSON-LD) for the campaign
   - FAQ schema for /faq page (rich snippets)
   - Article/BlogPosting schema for blog content
   - Event schema for rallies and campaign events
   - BreadcrumbList schema for navigation

4. **Open Graph strategy:**
   - Unique OG images (1200×630px) for every key page
   - Dynamic OG images for petition milestones and shared signatures
   - Twitter Card implementation (summary_large_image)
   - Test all URLs via Facebook Sharing Debugger before launch

5. **Content production workflow:** How campaign updates, blog posts, and community voices move from draft to published

**Claude Code Handoff:** Generate `docs/content-strategy.md` with the full content strategy, keyword targets, and schema markup specifications. Generate `docs/seo-checklist.md` with a page-by-page SEO implementation checklist.

---

### PROMPT 4: Page-by-Page Copy and Content

**Dependencies:** Prompts 1–3

**Task:** Write initial copy for every page on the site. This is the content that populates the site at launch. Use the messaging framework from Prompt 1 and the page specifications from Prompt 2.

**Produce initial copy for each page:**

1. **Homepage:** Hero headline + subhead, the 30-second case, live signature counter section, "How it works" (3 steps), featured community voice, latest blog post, email signup, social proof (endorsements, media mentions)
2. **The Case (parent page):** Overview of all arguments, links to sub-pages
3. **The Case: History:** The full naming story — Ohio City → Columbus, Joseph Foos's tavern, the 1812 founding, what came before (Franklinton, Wolf's Ridge, Native American settlements)
4. **The Case: The Rivers:** The confluence of Scioto and Olentangy — geography, Indigenous names and history, why the rivers determined the city's location, Confluence Park, the Scioto Mile
5. **The Case: Columbus Legacy:** Who Christopher Columbus was, what he did, why the name is contested, the city's own actions (statue removal, Indigenous Peoples' Day)
6. **The Case: Precedents:** Barrow → Utqiaġvik, St. Paul from Pig's Eye, Cincinnati from Losantiville, Atlanta from Terminus, international examples (Bombay → Mumbai, etc.)
7. **The Case: The Process:** Legal pathway for a charter amendment in Columbus — citizen petition requiring 10% of last mayoral vote, petition committee of 5 electors, one-year collection window, Franklin County Board of Elections validation, simple majority at election
8. **Voices (section landing):** Introduction to the community perspectives section, featured stories, submission CTA
9. **Sign the Petition:** Petition form page with compelling above-fold copy, form (first name, last name, email, Ohio address with autocomplete), live signature counter, recent signers feed, trust signals
10. **Volunteer Hub:** Volunteer roles (signature collectors, social amplifiers, event organizers, story collectors, neighborhood captains, design/content creators), signup form
11. **Donate:** Case for financial support, ActBlue embed/link, transparency on how funds are used
12. **About:** Campaign team, mission, values, transparency commitments, contact info
13. **Press:** Media kit, press releases, media coverage links, press contact, downloadable assets
14. **FAQ:** 15–20 Q&As from the messaging framework
15. **Blog:** Launch post — "Why We're Asking Columbus to Consider a New Name"

**Guidelines for copy:**
- Write in the brand voice defined in Prompt 1
- Front-load key information (BLUF)
- Keep paragraphs short (2–4 sentences)
- Use specific Columbus details — neighborhoods, landmarks, institutions
- Steelman opposition arguments wherever they appear
- Include clear CTAs on every page
- Write for scanning: use subheads, bold key facts, short paragraphs

**Claude Code Handoff:** Generate content files in `content/pages/` directory — one MDX file per page with frontmatter (title, description, ogImage, keywords) and body copy. Generate `content/blog/` for launch blog post.

---

### PROMPT 5: Data Model and Database Schema

**Dependencies:** Prompts 2, 4 (page inventory and content define the data requirements)

**Task:** Design the complete Supabase database schema, Row-Level Security policies, and data model for confluenceohio.org.

**Tables to define:**

1. **`signatures`** — Petition signatures
   - `id` (uuid, PK), `first_name`, `last_name`, `email` (unique), `address_line_1`, `address_line_2`, `city`, `state` (must be "OH"), `zip_code`, `zip_plus_4`, `address_hash` (for dedup — hash of canonical Smarty-normalized address), `smarty_dpv_match_code`, `smarty_rdi` (Residential/Commercial), `verification_status` (enum: pending, verified, rejected, flagged), `ip_address` (hashed), `user_agent`, `referral_code`, `referred_by` (FK to signatures), `signature_number` (sequential), `signed_at`, `email_verified` (boolean), `email_verified_at`

2. **`email_subscribers`** — Email list (may overlap with signatures)
   - `id`, `email` (unique), `first_name`, `source` (petition, standalone, volunteer, blog), `brevo_contact_id`, `subscribed_at`, `unsubscribed_at`, `status`

3. **`volunteers`** — Volunteer signups
   - `id`, `email` (FK or unique), `first_name`, `last_name`, `phone`, `neighborhood`, `roles` (jsonb array — signature_collector, social_amplifier, event_organizer, story_collector, neighborhood_captain, design_content, outreach), `availability`, `notes`, `signed_up_at`, `status`

4. **`voice_submissions`** — Debate/community perspectives
   - `id`, `author_name`, `author_email`, `author_neighborhood`, `position` (enum: support, oppose, undecided), `title`, `body` (text, 500-word limit), `photo_url`, `slug`, `status` (enum: pending, approved, rejected), `submitted_at`, `approved_at`, `featured` (boolean)

5. **`donations`** — ActBlue webhook data
   - `id`, `actblue_order_id`, `donor_email`, `donor_name`, `amount_cents`, `recurring` (boolean), `refcode`, `refcode2`, `express_lane` (boolean), `donated_at`, `webhook_received_at`

6. **`referrals`** — Social sharing tracking
   - `id`, `referrer_signature_id` (FK), `referral_code` (unique), `platform` (facebook, twitter, whatsapp, email, copy, other), `clicks`, `conversions` (resulting signatures), `created_at`

7. **`blog_posts`** — Campaign blog (if not using MDX files)
   - `id`, `title`, `slug`, `body`, `excerpt`, `author`, `published_at`, `status`, `og_image_url`, `meta_description`

8. **`admin_users`** — Admin access
   - `id`, `email`, `role` (enum: admin, moderator, viewer), `created_at`

9. **`campaign_metrics`** — Aggregated metrics for dashboard
   - `id`, `metric_type`, `value`, `recorded_at`

**Also define:**
- RLS policies for each table (signatures readable by admins only; voice submissions readable when approved; blog posts readable when published)
- Database indexes (email on signatures, address_hash on signatures, slug on voice_submissions and blog_posts)
- Supabase real-time subscription configuration for signature count
- Migration files in sequential order
- Seed data for development

**Claude Code Handoff:** Generate Supabase migration files in `packages/db/migrations/` with complete SQL for table creation, indexes, RLS policies, and enum types. Generate `packages/db/types.ts` with TypeScript types derived from the schema. Generate `packages/db/seed.ts` with development seed data.

---

### PROMPT 6: Petition Signing Flow with Ohio Residency Verification

**Dependencies:** Prompt 5 (schema), Prompt 4 (petition page copy)

**Task:** Design and specify the complete petition signing flow — from form display to confirmation — with Ohio residency verification via Smarty, fraud prevention, and duplicate detection.

**Specify the complete flow:**

**Step 1 — Form display:**
- Fields: First Name, Last Name, Email, Street Address (with Smarty Autocomplete Pro filtered to Ohio via `include_only_states=OH`), Apt/Unit (optional), City (auto-populated from autocomplete), State (locked to OH), ZIP (auto-populated)
- Live signature counter with progress bar toward next milestone
- Recent signers feed (first name + city only, for privacy)
- Trust signals: "Your information is secure. We only use your address to verify Ohio residency."
- CTA button: "Add My Name" (not "Submit")
- Cloudflare Turnstile (invisible) for bot prevention
- Honeypot field (hidden) as additional bot filter

**Step 2 — Client-side validation:**
- Required fields check
- Email format validation
- Address selected from Smarty autocomplete (or manually entered)

**Step 3 — Server-side processing (API route):**
1. Validate Turnstile token
2. Check honeypot field (reject if filled)
3. Rate limit check (max 3 submissions per IP per hour)
4. Call Smarty US Street Address API with secret key:
   - Verify `dpv_match_code === "Y"` (confirmed delivery point)
   - Verify `components.state_abbreviation === "OH"`
   - Check `metadata.rdi === "Residential"` (flag but don't reject commercial)
   - Check `analysis.dpv_cmra !== "Y"` (flag commercial mail receiving agencies)
   - Check `analysis.dpv_vacant !== "Y"` (flag vacant addresses)
5. Generate canonical address hash from Smarty's standardized output for deduplication
6. Check `address_hash` against existing signatures (duplicate detection)
7. Check email against existing signatures (duplicate detection)
8. If duplicate: return friendly message ("It looks like you've already signed! Share with friends instead.")
9. If address invalid or non-Ohio: return clear error ("We could only verify Ohio addresses. Please check your address and try again.")
10. If valid: insert signature record with `verification_status = 'verified'`, assign sequential `signature_number`
11. Send email verification link via Brevo transactional API
12. Trigger Inngest event for post-signature automation (Brevo contact creation, welcome email, referral code generation)

**Step 4 — Thank you page (critical conversion moment):**
- "You're signer #[number]! 🎉"
- Personalized share prompt: "Help us reach [next milestone] — share with 3 friends"
- Pre-populated share buttons for Facebook, Twitter/X, WhatsApp, email, copy link
- Each share includes unique referral code (`?ref=[code]`) for tracking
- Donation CTA: "Support the campaign" → ActBlue link with refcode
- Volunteer CTA: "Get more involved"
- Email subscribe confirmation

**Step 5 — Email verification:**
- Signer receives email with verification link
- Clicking confirms email and updates `email_verified = true`
- Unverified signatures still count but are flagged in admin

**Also specify:**
- Error states and messaging for every failure mode
- Mobile-optimized form layout
- Accessibility requirements (labels, ARIA, keyboard navigation, error announcements)
- Analytics events to track (form_view, form_start, field_complete, form_submit, verification_success, verification_failure, share_click, donate_click)

**Claude Code Handoff:** Generate the petition page component (`apps/web/app/sign/page.tsx`), the API route (`apps/web/app/api/petition/sign/route.ts`), the Smarty verification adapter (`packages/verification/smarty.ts`), the deduplication logic (`packages/core/petition/dedup.ts`), the thank-you page component, and the email verification flow. Include comprehensive error handling and all analytics event hooks.

---

### PROMPT 7: Email List and Automation Flows

**Dependencies:** Prompts 5–6 (schema and petition flow define the subscriber data)

**Task:** Design the complete email infrastructure — Brevo integration, automation workflows, email templates, and subscriber lifecycle management.

**Specify:**

1. **Brevo integration architecture:**
   - Contact creation via Brevo API on petition sign, volunteer signup, or standalone email subscribe
   - Contact attributes mapping (first_name, source, signature_number, volunteer_roles, referral_count)
   - List segmentation: All Subscribers, Petition Signers, Verified Signers, Volunteers, Donors, Engaged (opened in last 30 days), Disengaged (no opens in 60+ days)
   - Webhook configuration for bounce/unsubscribe handling

2. **Automation workflows (Brevo workflows):**

   **Welcome series (petition signers) — 4 emails over 10 days:**
   - Email 1 (immediate): Signature confirmation, current count, share prompt with personalized referral link
   - Email 2 (Day 3): The story behind the campaign — why this matters, introduce the team
   - Email 3 (Day 7): "Why did you sign?" — invite them to submit a community voice, share a specific data point or argument
   - Email 4 (Day 10): Other ways to get involved — volunteer roles, upcoming events, "recruit 3 friends"

   **Signer-to-volunteer conversion (triggered Day 14, only for engaged signers):**
   - Offer specific, time-bounded volunteer opportunities
   - Show impact: "Last weekend, 12 volunteers collected 300 signatures"

   **Signer-to-donor conversion (triggered Day 21, only for engaged signers):**
   - Tie to specific need: "We need $X for [specific purpose]"
   - Small, transparent asks
   - ActBlue link with refcode tracking

   **Milestone celebrations (triggered at signature thresholds: 1K, 5K, 10K, 25K, 50K, 100K):**
   - Celebratory tone, community-focused
   - Progress bar graphic
   - Share prompt: "Help us reach the next milestone"

   **Re-engagement (triggered: no opens in 60 days):**
   - 2-email sequence with compelling subject lines and major update
   - If no engagement after 2 attempts, move to inactive segment

3. **Email templates:** Design specs for each email type (transactional confirmation, marketing campaign, milestone celebration). All should include: campaign branding, unsubscribe link, physical address (CAN-SPAM), social links.

4. **Compliance:** CAN-SPAM requirements, unsubscribe handling, suppression list management, Ohio-specific regulations (if any).

**Claude Code Handoff:** Generate the Brevo adapter (`packages/email/brevo.ts`) with methods for contact creation, list management, transactional sends, and webhook handling. Generate email templates in `packages/email/templates/`. Generate Inngest functions for each automation trigger in `apps/web/inngest/`. Generate the standalone email signup component.

---

### PROMPT 8: Volunteer Sign-Up and Coordination

**Dependencies:** Prompts 5, 7

**Task:** Design the volunteer hub — signup flow, role definitions, onboarding, and coordination tools.

**Specify:**

1. **Volunteer roles** (each with description, time commitment, and skills needed):
   - Signature Collector — in-person tabling at farmers markets, community events
   - Social Amplifier — share campaign content, engage in online conversations
   - Event Organizer — plan and host community forums, info sessions, house parties
   - Story Collector — interview community members for the Voices section
   - Neighborhood Captain — coordinate efforts in a geographic area
   - Design/Content Creator — flyers, social graphics, blog posts
   - Outreach Liaison — connect with local businesses, organizations, schools

2. **Signup form:** Name, email, phone (optional), neighborhood/area, roles interested in (multi-select), availability (weekdays/weekends/evenings), how they heard about the campaign, optional message

3. **Post-signup flow:**
   - Immediate confirmation email with role-specific next steps
   - Add to Brevo as contact with volunteer tags
   - Admin notification of new signup
   - Onboarding email sequence (role-specific, 2–3 emails)

4. **Coordination approach:** For launch, use Brevo segments + a simple admin interface rather than a dedicated tool like Mobilize. Define when to upgrade to Mobilize (threshold: 50+ active volunteers with regular events).

**Claude Code Handoff:** Generate the volunteer page component (`apps/web/app/volunteer/page.tsx`), the volunteer signup API route, the admin volunteer management interface, and the volunteer onboarding email templates.

---

### PROMPT 9: ActBlue Donation Integration

**Dependencies:** Prompt 5 (donations table), Prompt 2 (donate page spec)

**Task:** Specify the ActBlue integration — embed/link strategy, refcode tracking, webhook processing, and donation attribution.

**Specify:**

1. **Integration method:** Link to ActBlue form with refcodes (simplest, most reliable). URL format: `https://secure.actblue.com/donate/confluenceohio?refcode=[source]&refcode2=[campaign]`
   - Refcode strategy: `refcode` = traffic source (homepage, petition_thankyou, email_welcome, social_facebook), `refcode2` = specific campaign or experiment
   - Consider iframe embed for the /donate page for seamless experience (requires HTTPS, `sandbox` and `allowpaymentrequest` attributes)

2. **ActBlue webhook processing:**
   - Configure webhook URL in ActBlue dashboard
   - API route to receive and validate webhook payloads
   - Parse donation data: amount, donor name, email, employer/occupation, refcodes, Express Lane status, recurring flag
   - Insert into `donations` table
   - Trigger Inngest event for post-donation actions (thank-you email, update donor segment in Brevo)

3. **Donate page design:**
   - Why donations matter (specific, transparent use of funds)
   - Suggested amounts with impact framing ("$10 prints 100 flyers," "$50 sponsors a community forum")
   - Prominent ActBlue button/embed
   - Trust signals (ActBlue security, campaign transparency)

4. **Donation tracking dashboard:** Admin view of total raised, donor count, average donation, refcode performance

**Claude Code Handoff:** Generate the donate page component, the ActBlue webhook handler API route (`apps/web/app/api/webhooks/actblue/route.ts`), the donation processing logic, and the admin donation dashboard components.

---

### PROMPT 10: Debate/Voices Submission Feature

**Dependencies:** Prompts 5, 4

**Task:** Design the lightweight community voices/debate feature for launch. This is NOT a full moderation platform — it is a curated pro/con story submission system with light moderation.

**Specify:**

1. **Submission form (/voices/share):**
   - Fields: Display Name (or "Anonymous"), Email (not displayed), Neighborhood/connection to Columbus, Position (Support / Oppose / Undecided — radio buttons), Title (optional, 100 chars), Your Perspective (textarea, 500-word limit with live word count), Photo upload (optional)
   - Anti-spam: Honeypot field, Cloudflare Turnstile, rate limiting (1 submission per email per 24 hours), minimum 30 seconds on page before submission
   - Community guidelines displayed prominently: "We welcome all perspectives. We remove personal attacks, spam, and off-topic content."
   - Email verification required before submission enters moderation queue

2. **Moderation workflow:**
   - All submissions enter a moderation queue (never auto-published)
   - Admin receives daily digest email of pending submissions
   - Simple approve/reject interface in admin dashboard
   - Optional: Akismet integration for automated spam pre-filtering
   - Rejection sends a polite email explaining community guidelines

3. **Public display (/voices):**
   - Two-column layout: "Why I Support" / "Why I Have Concerns" (not "Pro/Con" — warmer language)
   - Undecided perspectives displayed in a third section or interspersed
   - Each story shows: author name, neighborhood, position badge, title, excerpt
   - Click through to full story page (/voices/[slug])
   - Featured stories highlighted at top (admin can feature stories)
   - No threaded replies, no upvoting/downvoting (avoids flame wars and gaming)

4. **Admin controls:**
   - Approve/reject queue
   - Feature/unfeature stories
   - Edit stories (with author notification)
   - Filter by position, status, date
   - Export submissions

**Claude Code Handoff:** Generate the voice submission form component, the submission API route with spam prevention, the moderation queue admin interface, the public voices page with two-column layout, individual story pages, and the approval workflow logic.

---

### PROMPT 11: Social Sharing Mechanics and Referral Tracking

**Dependencies:** Prompts 5–6 (referrals table, petition flow)

**Task:** Design the social sharing system — referral codes, share buttons, tracking, and viral mechanics.

**Specify:**

1. **Referral code system:**
   - Each petition signer receives a unique referral code (short alphanumeric, e.g., `cf-a7b3x`)
   - Referral URL: `confluenceohio.org/sign?ref=cf-a7b3x`
   - When a new signer arrives via referral link, the referral is attributed to the referrer
   - Referrer receives notification email: "Your friend [Name] just signed thanks to you!"

2. **Share buttons (post-signature and across site):**
   - Facebook, Twitter/X, WhatsApp, Email, Copy Link
   - Pre-populated messages tailored to each platform:
     - Twitter: "I just signed the petition to rename Columbus to Confluence, Ohio — a name that actually describes our city. Add your name: [link] #ConfluenceOhio"
     - Facebook: longer version with emotional hook
     - WhatsApp: personal, conversational tone
     - Email: subject line + body text with link
   - Platform-specific share URLs using Web Share API on mobile where available

3. **Open Graph implementation:**
   - Default OG tags on all pages (1200×630 images, compelling titles/descriptions)
   - Dynamic OG image for the petition page showing current signature count
   - Unique OG image for each voice submission story
   - Test all URLs via Facebook Sharing Debugger, Twitter Card Validator

4. **Referral dashboard (stretch goal):**
   - Signers can see how many people they have referred
   - Leaderboard of top referrers (opt-in only)

**Claude Code Handoff:** Generate the referral code generation utility, the referral tracking middleware, the share button components with platform-specific pre-populated messages, the OG tag implementation (dynamic and static), and the referral attribution API route.

---

### PROMPT 12: SEO and Structured Data Implementation

**Dependencies:** Prompt 3 (SEO plan), Prompt 2 (site architecture)

**Task:** Implement the technical SEO specification from the content strategy, including structured data, meta tags, sitemap, and performance optimizations.

**Specify:**

1. **Meta tags:** Page-by-page title tags, meta descriptions, and canonical URLs
2. **JSON-LD structured data:**
   - NGO schema on all pages (organization info, area served: Ohio)
   - FAQ schema on /faq (generates rich snippets)
   - Article schema on blog posts
   - Event schema on event announcements
   - BreadcrumbList schema on all pages
3. **Technical SEO:**
   - `sitemap.xml` generation (dynamic, includes blog posts and voice stories)
   - `robots.txt` configuration
   - Semantic HTML (proper heading hierarchy, landmark roles)
   - Image optimization (next/image with WebP, proper alt text, lazy loading)
   - Internal linking strategy
4. **Performance:**
   - Target Lighthouse ≥90 all metrics
   - Font optimization (next/font)
   - Bundle analysis and code splitting
   - Edge caching strategy

**Claude Code Handoff:** Generate the SEO utility components (meta tag helper, JSON-LD generators), the sitemap generation logic, robots.txt, and the Next.js configuration for performance optimization. Generate a Lighthouse CI configuration for automated testing.

---

### PROMPT 13: Analytics and Conversion Tracking

**Dependencies:** Prompts 6, 9, 11 (petition flow, donations, referrals define the key events)

**Task:** Design the analytics and conversion tracking implementation to measure every step of the funnel.

**Specify:**

1. **Analytics stack:** Vercel Analytics (Web Vitals, page views) + PostHog (event tracking, funnels, A/B testing) + optional Google Analytics 4 (for Google Ad Grants eligibility)
2. **Key events to track:**
   - Page views (all pages)
   - Petition form: view, start (first field interaction), each field completion, submit, verification_success, verification_failure (with reason), share_click (by platform), donate_click
   - Volunteer form: view, start, submit
   - Donation: redirect_to_actblue, webhook_received (amount, refcode)
   - Voice submission: view_form, submit, approved
   - Email: subscribe, unsubscribe
   - Referral: referral_link_click, referral_conversion
   - Social: share_button_click (by platform and page)
3. **Conversion funnels:**
   - Primary: Visit → Petition View → Form Start → Submit → Verified → Share
   - Donation: Any page → Donate page → ActBlue redirect → Webhook received
   - Volunteer: Any page → Volunteer page → Form submit
4. **A/B testing framework:** PostHog feature flags for testing headline copy, CTA text, form layout, thank-you page variants
5. **Admin dashboard metrics:** Total signatures (verified vs. unverified), signatures today/week/month, conversion rate (visitors to signers), top referral sources, top referrers, donation total, volunteer count, voice submissions pending/approved

**Claude Code Handoff:** Generate the analytics provider setup, the event tracking utility (`packages/core/analytics/`), PostHog integration, conversion funnel definitions, and the admin metrics dashboard components.

---

### PROMPT 14: Accessibility and Performance Standards

**Dependencies:** All UI-related prompts (2, 4, 6, 8, 10)

**Task:** Define and implement accessibility and performance standards across the entire site.

**Specify:**

1. **WCAG 2.1 AA compliance checklist:**
   - All form inputs have visible labels (not just placeholders)
   - Error messages announced to screen readers (aria-live regions)
   - Color contrast ratios ≥4.5:1 for normal text, ≥3:1 for large text
   - Keyboard navigation for all interactive elements (tab order, focus styles)
   - Skip-to-content link
   - Alt text on all images
   - Focus trapping in modals
   - Reduced motion support (prefers-reduced-motion)
2. **Performance budget:**
   - LCP < 2.5s, FID < 100ms, CLS < 0.1
   - Total page weight < 500KB (initial load)
   - JavaScript bundle < 200KB (compressed)
3. **Testing plan:**
   - Automated: axe-core in CI, Lighthouse CI
   - Manual: Screen reader testing (VoiceOver, NVDA), keyboard-only navigation
   - Tools: pa11y, eslint-plugin-jsx-a11y

**Claude Code Handoff:** Generate the accessibility utility components (SkipLink, VisuallyHidden, FocusTrap, ErrorAnnouncer), the axe-core test configuration, the Lighthouse CI config, and an accessibility testing checklist document.

---

### PROMPT 15: Admin Dashboard and Moderation Tools

**Dependencies:** Prompts 5, 6, 9, 10, 13 (schema, petition, donations, voices, analytics)

**Task:** Design the admin dashboard for campaign management — signature monitoring, voice moderation, donation tracking, and volunteer management.

**Specify:**

1. **Authentication:** Supabase Auth with email-based admin login. Role-based access: admin (full access), moderator (voices queue only), viewer (read-only metrics)
2. **Dashboard home:** Signature count (live), signatures today/this week, conversion rate, pending voice submissions, total donations, active volunteers — all with trend indicators
3. **Signatures management:** Searchable/filterable list, verification status, export to CSV, flag/unflag, view referral chain
4. **Voice moderation queue:** Pending submissions with approve/reject/edit actions, daily digest email trigger
5. **Donation tracking:** List of donations from ActBlue webhooks, totals by period, refcode performance
6. **Volunteer management:** List of volunteers by role, status, contact info, notes
7. **Content management:** Blog post CRUD (if not using MDX files), FAQ updates
8. **Settings:** Signature counter goal, milestone thresholds, ActBlue webhook URL configuration

**Claude Code Handoff:** Generate the admin app (`apps/admin/` or `apps/web/app/admin/`) with all dashboard pages, the authentication flow, the Supabase RLS policies for admin access, and the moderation workflow components.

---

### PROMPT 16: Deployment, DNS, and Launch Checklist

**Dependencies:** All previous prompts

**Task:** Create the complete deployment configuration, DNS setup, and pre-launch checklist.

**Specify:**

1. **Vercel deployment:**
   - Project configuration (monorepo setup, build settings)
   - Environment variables (Smarty keys, Brevo API key, ActBlue webhook secret, Supabase URL/keys, Turnstile keys)
   - Preview deployments for PR review
   - Production branch protection

2. **DNS configuration (Cloudflare):**
   - confluenceohio.org → Vercel
   - SSL/TLS configuration
   - DDoS protection
   - Turnstile setup for petition form

3. **Pre-launch checklist:**
   - [ ] All environment variables set in Vercel
   - [ ] Supabase production project created with migrations applied
   - [ ] Brevo account configured with lists, automation workflows, and templates
   - [ ] Smarty production API keys configured
   - [ ] ActBlue form created and webhook configured
   - [ ] Cloudflare DNS propagated
   - [ ] SSL certificate active
   - [ ] OG tags tested via Facebook Debugger and Twitter Card Validator
   - [ ] Sitemap submitted to Google Search Console
   - [ ] Google Business Profile created
   - [ ] Google Ad Grants application submitted
   - [ ] Privacy policy and terms of use published
   - [ ] Analytics tracking verified (all key events firing)
   - [ ] Accessibility audit passed (axe-core, manual screen reader test)
   - [ ] Lighthouse scores ≥90
   - [ ] Load testing (simulate 100 concurrent petition submissions)
   - [ ] Email deliverability tested (check spam scores)
   - [ ] Backup and recovery plan documented
   - [ ] Admin accounts created
   - [ ] Launch blog post ready
   - [ ] Social media accounts created and linked
   - [ ] Press kit uploaded

**Claude Code Handoff:** Generate the Vercel configuration (`vercel.json`), the environment variable template (`.env.example`), the Cloudflare DNS configuration guide, the GitHub Actions CI/CD pipeline, and the launch checklist as a trackable document.

---

### PROMPT 17: Post-Launch Iteration Plan and Structured Debate Roadmap

**Dependencies:** All previous prompts (this is the final prompt)

**Task:** Define the post-launch iteration plan, growth strategy, and Phase 2 roadmap including structured debate features.

**Specify:**

1. **Week 1–4 post-launch priorities:**
   - Monitor petition conversion rate (target: 5%+ of visitors sign, baseline benchmark is ~3.5%)
   - A/B test headline copy, CTA text, form layout
   - Monitor email deliverability and engagement rates (target: 25%+ open rate)
   - Respond to press inquiries, pitch local media
   - Begin volunteer onboarding for signature collection events
   - Iterate on the voices/debate feature based on submission volume and quality

2. **Month 2–3 priorities:**
   - Content marketing: publish 2–3 blog posts per week
   - Earned media strategy: pitch Columbus Dispatch, Columbus Underground, WOSU, local TV
   - Community events: host first community forum/info session
   - Partnerships: reach out to aligned local organizations
   - Evaluate email automation performance, optimize sequences
   - Referral program optimization based on data

3. **Phase 2 features (Month 3–6):**
   - **Structured debate feature:** Implement a more sophisticated debate interface inspired by Kialo/Pol.is concepts. Features: threaded arguments, evidence linking, consensus mapping, argument strength voting (not agree/disagree — "how strong is this argument?"). Design this as a separate module.
   - **Interactive map:** Show signatures by Columbus neighborhood/zip code
   - **Endorsements page:** Organizations and public figures who support the campaign
   - **Events calendar:** Upcoming campaign events with RSVP (consider Mobilize integration at this point)
   - **SMS/text campaigns:** Brevo SMS add-on or separate tool for event reminders and action alerts
   - **Multilingual support:** Spanish language version at minimum (Columbus has a significant Spanish-speaking population)
   - **Petition delivery:** Digital signature delivery to Columbus City Council — design the ceremony and documentation

4. **Phase 3 (Month 6–12):**
   - Formal petition committee formation (5 qualified electors per Ohio law)
   - Legal review of charter amendment language
   - Ballot initiative timeline planning
   - Coalition building with civic organizations
   - Polling/research to assess public opinion
   - Signature goal calibration based on 10% of last mayoral vote requirement

5. **Success metrics and KPIs:**
   - Signatures: Monthly target, conversion rate, verification rate
   - Email: List size, open rate, click rate, unsubscribe rate
   - Volunteers: Active count, hours contributed, events organized
   - Donations: Total raised, average donation, donor count
   - Social: Referral conversions, share rate, media mentions
   - SEO: Organic traffic, keyword rankings, backlinks

**Claude Code Handoff:** Generate `docs/iteration-plan.md` with the complete post-launch roadmap, `docs/phase-2-spec.md` with the structured debate feature specification, and `docs/success-metrics.md` with the KPI tracking framework and dashboard requirements.

---

## Part C: Claude Code Output Mapping

Each Cowork prompt maps to specific Claude Code outputs. Below is the complete manifest of what executing all 17 prompts produces:

| Prompt | Primary Output | Claude Code Artifacts |
|--------|---------------|----------------------|
| 1 | Messaging framework | `docs/messaging-framework.md`, `docs/historical-research.md` |
| 2 | Site architecture | `docs/site-architecture.md`, `docs/conversion-architecture.md` |
| 3 | Content/SEO strategy | `docs/content-strategy.md`, `docs/seo-checklist.md` |
| 4 | Page copy | `content/pages/*.mdx`, `content/blog/launch-post.mdx` |
| 5 | Database schema | `packages/db/migrations/*.sql`, `packages/db/types.ts`, `packages/db/seed.ts` |
| 6 | Petition flow | `apps/web/app/sign/`, `apps/web/app/api/petition/`, `packages/verification/smarty.ts`, `packages/core/petition/` |
| 7 | Email automation | `packages/email/brevo.ts`, `packages/email/templates/`, `apps/web/inngest/` |
| 8 | Volunteer hub | `apps/web/app/volunteer/`, `apps/web/app/api/volunteer/` |
| 9 | ActBlue integration | `apps/web/app/donate/`, `apps/web/app/api/webhooks/actblue/` |
| 10 | Voices/debate feature | `apps/web/app/voices/`, `apps/web/app/api/voices/` |
| 11 | Social sharing | `packages/core/referrals/`, share components, OG utilities |
| 12 | SEO implementation | SEO components, `sitemap.xml` generator, JSON-LD utilities |
| 13 | Analytics | `packages/core/analytics/`, PostHog setup, admin metrics |
| 14 | Accessibility | A11y components, axe-core config, Lighthouse CI |
| 15 | Admin dashboard | `apps/web/app/admin/` (all dashboard pages, auth, moderation) |
| 16 | Deployment | `vercel.json`, `.env.example`, CI/CD pipeline, launch checklist |
| 17 | Iteration plan | `docs/iteration-plan.md`, `docs/phase-2-spec.md`, `docs/success-metrics.md` |

**End state:** After executing all 17 Cowork prompts and their resulting Claude Code handoffs, the repository contains a fully specified, buildable monorepo with complete documentation, database migrations, API routes, frontend components, email templates, admin dashboard, and deployment configuration for confluenceohio.org.

---

## Appendix: Key Research Findings Informing These Decisions

### Petition conversion benchmarks
Change.org baseline is **3.5–3.7%** visitor-to-signer. Petitions with photos are **7× more likely to succeed**. Reducing form fields from 11 to 4 increases conversions by **120%**. Social proof ("Join X people who signed") increases sign rates by up to **26%**. CAPTCHAs reduce conversion by up to **40%** — use invisible Turnstile instead. Multi-step forms convert **86% higher** than single-page forms.

### Address verification
Smarty wins decisively: **99.8% accuracy** (highest tested), Ohio autocomplete filtering via `include_only_states=OH`, residential/commercial classification via `metadata.rdi`, fraud detection (vacancy, CMRA, DPV match codes), sub-50ms response time, and ~$54/mo for 10K verifications. USPS API is disqualified — its Terms of Service restrict use to "in conjunction with USPS shipping or mailing services only." Google Address Validation is too expensive at scale ($1,615 for 100K verifications vs. Smarty's ~$200) and imposes a 30-day data retention limit incompatible with petition record-keeping.

### Tech stack
Custom Next.js + Supabase wins over platform alternatives. Action Network is the best platform option at $15/mo with keyless API POST submissions, but lacks custom address verification, debate features, and granular conversion optimization. NationBuilder ($129/mo) has dated UX and declining product quality. EveryAction and ActionKit are enterprise-grade overkill ($333+/mo and $995/mo respectively). The custom build costs ~$735/year in infrastructure (Vercel + Supabase + Brevo + Smarty + domain) versus $1,548/year for NationBuilder with less control.

### Email
Brevo wins for this campaign. Its email-volume pricing model ($18/mo for unlimited contacts + moderate sends) is structurally superior to Mailchimp's contact-based pricing ($100+/mo for the same scenario). Brevo includes full REST API, transactional + marketing email in one platform, unlimited automation workflows at Business tier, and a 15% nonprofit discount. Action Network's email is adequate but lacks transactional email and developer-grade API access.

### Legal pathway
Renaming Columbus requires a **charter amendment** — achievable via citizen petition collecting signatures equal to 10% of the last mayoral vote, followed by a simple majority at election. A petition committee of 5 qualified Columbus electors must be formed. The committee has one year to collect signatures. The Franklin County Board of Elections validates signatures within 10 days. No state legislative approval is required under Ohio's home rule framework (Article XVIII, Section 3 of the Ohio Constitution), though the General Assembly may need to update statutory references.

### Historical context
Columbus was originally named "Ohio City" in 1812 before being renamed — reportedly by Joseph Foos, a tavern-owning state legislator who admired Christopher Columbus. The city was founded at "the Forks of the Scioto" specifically because of the river confluence. Native American peoples (Mingo, Shawnee, Delaware, Wyandot) lived at the confluence for thousands of years and left nearly 200 burial and ceremonial mounds in Franklin County. The 2020 Flavortown petition garnered 118,000+ signatures, demonstrating genuine public appetite for discussing the city's name. The city itself has removed its Columbus statue (2020), adopted Indigenous Peoples' Day (2020), and funded a $3.5M "Reimagining Columbus" initiative.