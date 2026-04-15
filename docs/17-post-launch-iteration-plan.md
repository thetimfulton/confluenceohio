# Confluence Ohio — Post-Launch Iteration Plan and Structured Debate Roadmap

**Artifact 17 · Prompt 17 Output**
**Date:** April 10, 2026
**Dependencies:** All previous artifacts (01–16)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **Signature target number.** ✅ **Keep the 22,000 target.** The actual legal threshold based on the 2025 municipal election is ~12,533, but the campaign will use 22,000 as the public-facing goal. This demonstrates broad support well beyond the legal minimum and adds credibility when the petition is delivered. Site copy retains "22,000 signatures" in the How It Works section. Internal planning accounts for the actual ~12,533 threshold.

2. **Structured debate vs. community voices.** ✅ **Community voices stays.** The structured debate module (§3.1) is cut from Phase 2. Community voices (Artifact 10) remains the primary community engagement feature. If structured debate is revisited later, it would be a Phase 3+ feature after the ballot initiative process is underway.

3. **Multilingual support.** ✅ **Cut for now.** Foreign language support is removed from Phase 2 scope. Can be revisited if partnership outreach to immigrant community organizations surfaces strong demand.

4. **Events platform.** ✅ **Supabase-native confirmed.** No Mobilize dependency. Events calendar built on existing Supabase stack as specified in §3.4.

5. **SMS/text campaigns.** ✅ **Yes, include SMS.** Brevo SMS add-on confirmed. Budget: ~$0.015/SMS (US). Implementation uses the hexagonal port/adapter pattern per §3.5. TCPA double opt-in required.

---

## 1. Week 1–4 Post-Launch Priorities

The first four weeks after launch are about establishing baselines, catching bugs, earning initial press, and proving the petition can convert. Every decision in this window should prioritize signature volume and email list growth.

### 1.1 Conversion Rate Monitoring

**Target:** 5%+ visitor-to-signature conversion rate (landing page visitors → completed petition signatures). Baseline benchmark for high-intent civic petition pages is 3–5%; our advantage is a single-issue, emotionally resonant campaign with progressive disclosure.

**Monitoring setup (from Artifact 13):**

| Metric | Tool | Target | Alert Threshold |
|--------|------|--------|-----------------|
| Visitor → petition page | PostHog funnel | 40%+ of homepage visitors click through | < 25% → investigate hero CTA |
| Petition page → form start | PostHog funnel | 70%+ of `/sign` visitors interact with form | < 50% → form intimidation |
| Form start → submit | PostHog funnel | 60%+ of form starters complete | < 40% → field friction |
| Submit → verified signature | Server-side tracking | 85%+ of submissions pass Smarty verification | < 70% → address UX issue |
| End-to-end (visit → verified) | Composite | 5%+ | < 3% → systemic issue |

**Session replay protocol:** Review 20 session replays per day from `/sign` page visitors who abandon before submitting. Tag common drop-off patterns (address confusion, Turnstile friction, mobile keyboard issues) and prioritize fixes.

**Week-by-week cadence:**

- **Week 1:** Instrument all funnels. Verify PostHog, GA4, and Vercel Analytics are capturing correctly. Validate that real-time signature counter and recent signers feed (Artifact 02) are updating. Fix any launch-day bugs — this is the highest-traffic window.
- **Week 2:** Establish baseline metrics across all funnels. Begin first A/B test (§1.2). Review first batch of session replays. Publish first blog post post-launch.
- **Week 3:** Analyze A/B test results. Deploy winner. Start second test. Evaluate email deliverability (§1.4). First volunteer onboarding call.
- **Week 4:** Month 1 retrospective. Compile first metrics report. Adjust targets based on data. Plan Month 2 content calendar.

### 1.2 A/B Testing Program

A/B tests run via PostHog feature flags (Artifact 13, §4). Each test runs for minimum 7 days or 1,000 visitors per variant — whichever comes later. Only one test per page at a time to avoid interaction effects.

**Launch window tests (priority order):**

| Test | Variants | Primary Metric | Hypothesis |
|------|----------|----------------|------------|
| Hero headline | "Where the Rivers Meet" vs. "It's Time for a Name That Tells the Truth" vs. "What If Our City's Name Said Something About Us?" | Click-through to `/sign` | Emotional vs. declarative vs. curiosity framing |
| CTA button text | "Sign the Petition" vs. "Add Your Name" vs. "I Support Confluence" | Click-through rate | "Add Your Name" is less formal, may feel lower commitment |
| Petition form layout | Single page vs. two-step (name/email first, address second) | Form completion rate | Two-step reduces initial perceived effort |
| Social proof position | Signature counter in hero vs. below fold | Scroll depth + `/sign` CTR | Counter in hero may establish credibility faster |

### 1.3 Press and Media Outreach

**Launch day press kit** (staged in Artifact 16's launch checklist):
- Press release distributed to local media contacts
- Media kit at `/press` with high-res images, founding story, key facts, and embeddable signature counter widget
- Direct pitches to: Columbus Dispatch, Columbus Underground, WOSU (NPR affiliate), NBC4i (WCMH), ABC6 (WSYX), 10TV (WBNS), Columbus Alive, The Columbus Messenger, CityScene Magazine

**Pitch angles by outlet:**

| Outlet | Angle | Why |
|--------|-------|-----|
| Columbus Dispatch | "Citizens launch petition to rename Columbus after its rivers" | News hook — local government impact |
| Columbus Underground | "The case for Confluence: why a new name might fit a changing city" | Long-form narrative, cultural angle |
| WOSU | "How does a city rename itself? The legal process behind Confluence Ohio" | Educational, process-focused |
| NBC4i / ABC6 / 10TV | "Petition to rename Columbus goes live — how many signatures they need" | Numbers-driven TV news hit |
| Columbus Alive | "From Flavortown to Confluence — Columbus's identity conversation continues" | Pop culture connection, tone match |

**Reactive protocol:** When press inquiries arrive, respond within 2 hours during business hours. Campaign spokesperson is Tim (or designee). Talking points are drawn from Artifact 01's messaging framework — particularly the manifesto and elevator pitches. Key discipline: never lead with "Columbus was bad." Always lead with "Confluence describes what this city actually is."

### 1.4 Email Deliverability Monitoring

**Targets (from Artifact 07):**

| Metric | Target | Red Flag |
|--------|--------|----------|
| Open rate (welcome series) | 40%+ | < 25% |
| Open rate (ongoing) | 25%+ | < 15% |
| Click rate | 5%+ | < 2% |
| Bounce rate | < 2% | > 5% |
| Unsubscribe rate | < 0.5% per send | > 1% |
| Spam complaint rate | < 0.1% | > 0.3% |

**Week 1 actions:**
- Verify DKIM, SPF, and DMARC records are passing via Brevo's deliverability dashboard
- Send test emails to seed accounts on Gmail, Outlook, Yahoo, and Apple Mail to verify inbox placement
- Monitor Brevo's sender reputation score daily for the first two weeks
- If inbox placement drops below 90%, immediately reduce send volume and investigate content/authentication issues

### 1.5 Community Voices Monitoring

**Target:** 20+ voice submissions in the first month. Monitor moderation queue (Artifact 10, Artifact 15) daily. The AI auto-moderation pipeline should handle ~80% of submissions; manually review any `needs_review` items within 24 hours.

**Content quality signals to watch:**
- Ratio of support/oppose/undecided submissions (healthy: at least 15% opposing — shows the feature attracts genuine perspectives, not just supporters)
- Average word count (healthy: 100–300 words — shorter suggests low engagement, longer suggests the form isn't constraining enough)
- Rejection rate (healthy: < 10% — higher suggests the guidelines aren't clear or the AI threshold is too aggressive)

### 1.6 Volunteer Onboarding

**Target:** Onboard first 10 active volunteers by end of Week 4. Per Artifact 08, the seven volunteer roles are: signature collectors (priority for Phase 3 in-person collection), event organizers, social media amplifiers, content contributors, translators, community liaisons, and data entry assistants.

**Week 1–4 onboarding sequence:**
1. Email welcome to all volunteer sign-ups with role selection confirmation (Inngest workflow from Artifact 07)
2. Schedule first group orientation call (Week 3) — overview of the campaign, tools, and expectations
3. Create shared volunteer coordination channel (Slack or Discord — decision needed from Tim)
4. Assign first tasks to social media amplifiers: share launch content with their referral codes (Artifact 11)

---

## 2. Month 2–3 Growth Priorities

Transition from launch-mode firefighting to sustainable growth. The focus shifts to content marketing, earned media, community building, and optimization of the systems launched in Month 1.

### 2.1 Content Marketing

**Publishing cadence:** 2–3 blog posts per week, authored as MDX files in `content/blog/` per Artifact 05.

**Content calendar themes:**

| Week | Theme | Example Posts |
|------|-------|---------------|
| Month 2, Wk 1 | Deep dives | "The Real History of How Columbus Got Its Name" · "Five Cities That Changed Their Names — and What Happened Next" |
| Month 2, Wk 2 | Community | "Why I Signed: Three Voices from the East Side" · Featured voice submission spotlight |
| Month 2, Wk 3 | Process | "What Happens After We Hit 13,000 Signatures?" · "How Charter Amendments Work in Columbus" |
| Month 2, Wk 4 | Culture | "What Would Change (and What Wouldn't) If We Became Confluence" · "Confluence in the National Conversation" |
| Month 3, Wk 1 | Data | "Month 2 Signature Report: Where We Are and What's Next" · Neighborhood-by-neighborhood breakdown |
| Month 3, Wk 2 | Partnership | Co-authored posts with local organizations, op-eds placed in local media |
| Month 3, Wk 3 | Education | "The Rivers That Made This City" · Indigenous history deep dive |
| Month 3, Wk 4 | Momentum | Milestone celebration post · Updated FAQ based on common objections |

**SEO strategy (Artifact 03, Artifact 12):** Each post targets one primary keyword from the content strategy's 57-article editorial calendar. Internal links to `/the-case` sub-pages and `/sign`. All posts include JSON-LD Article schema and unique OG images.

### 2.2 Earned Media Strategy

Move from reactive press coverage to proactive media generation.

**Pitching approach:**
- **Columbus Dispatch op-ed:** Draft a 700-word op-ed for Tim's byline: "I Love Columbus. That's Why I Want to Change Its Name." Submit to Dispatch editorial page.
- **WOSU interview:** Pitch a 15-minute segment on "All Sides with Ann Fisher" (or successor program) — structured as a debate with a credible opposing voice. Shows the campaign welcomes disagreement.
- **Columbus Underground feature:** Pitch a long-form profile: "Meet the People Behind Confluence Ohio."
- **National media:** If signature count is ahead of pace, pitch to CityLab, Atlas Obscura, Vox / Today Explained, or NPR's "1A" as a national story about place-naming in America. The Flavortown petition's virality (118,000+ signatures on Change.org) proves this has national curiosity value.

**Monitoring:** Set up Google Alerts for "Confluence Ohio," "rename Columbus Ohio," and "Columbus Ohio name change." Track media mentions in the admin dashboard (Artifact 15 — add a manual media log to the settings/metrics page).

### 2.3 Community Events

**First community forum (Target: Month 2, Week 3):**
- Format: 90-minute public information session
- Venue: Columbus Metropolitan Library (Main Library, 96 S. Grant Ave) or a community center in a high-diversity neighborhood (e.g., Northland, Linden, Hilltop)
- Structure: 20-minute presentation (the case, the process, FAQ), 30-minute open Q&A, 30-minute small group discussion, 10-minute petition signing station
- Promoted via email list, social media, and local event listings (Columbus Navigator, Experience Columbus)
- Capture attendee email addresses (with consent) for post-event follow-up
- Record video for social media clips (with consent signage)

**Recurring events (Monthly):**
- "Confluence Conversations" — rotating neighborhood forums
- Partner events with aligned organizations (see §2.4)
- "Sign and Sip" — informal social gatherings at local venues to collect signatures and build community

### 2.4 Partnership Outreach

**Tier 1 targets (direct alignment with campaign themes):**
- Columbus Metropolitan Library — civic education partner
- Ohio History Connection — historical accuracy validation
- Columbus Foundation — civic engagement alignment
- COSI (Center of Science and Industry) — geography/science education angle
- Scioto Mile Conservancy — literal stewards of the rivers
- Friends of the Lower Olentangy Watershed (FLOW) — river advocacy

**Tier 2 targets (community organizations):**
- Greater Columbus Arts Council
- Community Refugee & Immigration Services (CRIS) — immigrant community connection
- Columbus Urban League
- Asian American Community Services (Nepali/Bhutanese community bridge)
- Somali Community Association of Ohio
- Hispanic Coalition — Spanish-speaking community bridge

**Ask:** Endorsement on the `/endorsements` page (Phase 2), social media shares, co-hosted events. Start conversations now; formal endorsement asks in Month 3–4 when the campaign has demonstrated traction.

### 2.5 Email Sequence Optimization

**Based on Month 1 data, optimize:**
- Welcome series timing (Artifact 07) — adjust delay between emails based on open/click data
- Non-signer conversion sequence — test different incentives (exclusive content, event invitations, petition progress updates)
- Re-engagement threshold — are 30-day inactive subscribers recoverable? Test with a "We miss you" email before suppressing
- Referral nudge emails — test different send times and copy for the "Your friend signed!" notification

### 2.6 Referral Program Optimization

**Leaderboard monitoring (Artifact 11):**
- Identify top 10 referrers weekly. Personal thank-you emails from Tim.
- Test referral incentives: "Top referrer this month gets [a Confluence Ohio t-shirt / event VIP access / shout-out on the blog]" — civic campaigns can't offer cash incentives, but recognition and swag work.
- Analyze which referral platforms (Facebook, Twitter/X, WhatsApp, email, link) drive the highest conversion rates. Shift social media content strategy to emphasize the highest-converting platform.

---

## 3. Phase 2 Features (Month 3–6)

Phase 2 builds on the launch platform with features that deepen engagement and provide infrastructure for the ballot initiative process. Scope: interactive signature map, endorsements page, events calendar, SMS campaigns, enhanced admin dashboard, and petition delivery planning. Structured debate and multilingual support are deferred.

### 3.1 ~~Structured Debate Feature~~ — Deferred

**Status:** Cut from Phase 2. Community voices (Artifact 10) remains the primary community engagement feature. Structured debate (Kialo/Pol.is-inspired argument trees with strength voting) may be revisited in Phase 3+ after the ballot initiative process is underway, if there's demonstrated demand for a more analytical discussion format alongside the personal stories in community voices.

### 3.2 Interactive Signature Map

**Purpose:** Visualize petition momentum by geography — shows signatures by Columbus neighborhood and Franklin County zip code.

**Implementation:**
- GeoJSON boundary files for Columbus neighborhoods (publicly available from the City of Columbus Open Data Portal)
- Choropleth map rendered with MapLibre GL JS (open-source, no API key required)
- Color intensity scaled by signature density (signatures per 1,000 residents)
- Hover tooltips showing neighborhood name, signature count, and percentage of goal
- Data sourced from `signatures` table, aggregated by zip code, served via a cacheable API route with 15-minute TTL

**Privacy:** Map shows aggregate counts at the neighborhood/zip level only. No individual signature locations are displayed.

**Route:** Embedded on the homepage as a `<SignatureMap>` component + full-page version at `/map`

### 3.4 Endorsements Page

**Route:** `/endorsements`

**Structure:**
- Tiered endorsement display: organizations (with logos), elected officials, public figures, community leaders
- Each endorsement includes: name, title/role, organization, optional quote, date endorsed
- Endorsements stored in a new `endorsements` table (admin-managed, not user-submitted):

```sql
CREATE TABLE endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,                     -- Role/position
  organization text,
  quote text,                     -- Optional endorsement quote
  logo_url text,                  -- For organizations
  tier text DEFAULT 'community',  -- 'organization', 'elected', 'public_figure', 'community'
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  endorsed_at date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active endorsements" ON endorsements FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage endorsements" ON endorsements FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

**Admin interface:** Add an "Endorsements" section to the admin dashboard (Artifact 15) with CRUD for endorsement records and logo upload.

### 3.5 Events Calendar

**Route:** `/events`

**Approach (recommendation: Supabase-native, not Mobilize):** Build a lightweight events system using the existing Supabase stack. Mobilize adds cost and complexity that isn't justified until event volume exceeds 4–5 events per month.

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  slug text UNIQUE NOT NULL,
  location_name text NOT NULL,        -- "Columbus Metropolitan Library"
  location_address text NOT NULL,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_virtual boolean DEFAULT false,
  virtual_url text,                   -- Zoom/Teams link for virtual events
  max_attendees integer,
  rsvp_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id),
  email text NOT NULL,
  first_name text NOT NULL,
  email_hash text NOT NULL,           -- For dedup
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, email_hash)
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active events" ON events FOR SELECT USING (is_active = true);
CREATE POLICY "Public can RSVP" ON event_rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage events" ON events FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins manage RSVPs" ON event_rsvps FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

**Inngest integration:** `event/rsvp.created` → send confirmation email with calendar attachment (.ics file) → send reminder email 24 hours before event.

**Admin interface:** Add an "Events" section to the admin dashboard with event creation, RSVP list, and attendance tracking.

### 3.6 SMS/Text Campaign Infrastructure

**Confirmed for Phase 2.** Implementation uses Brevo's SMS API ($0.015/SMS US) via the existing hexagonal email port pattern:

```typescript
// packages/sms/port.ts
export interface SmsPort {
  sendSms(to: string, message: string): Promise<{ messageId: string }>;
  sendBulkSms(recipients: { phone: string; params: Record<string, string> }[], templateId: number): Promise<void>;
}

// packages/sms/brevo-adapter.ts — implements SmsPort using Brevo's SMS API
```

**Consent model:** SMS requires explicit opt-in (separate from email). Add a phone number + SMS consent checkbox to the volunteer form and an optional SMS opt-in on the petition thank-you page. TCPA compliance requires double opt-in (confirmation SMS with reply-to-confirm).

### 3.7 ~~Multilingual Support~~ — Cut

**Status:** Foreign language support removed from Phase 2 scope. Revisit if partnership outreach to immigrant community organizations (§2.4) surfaces strong demand. When revisited, the recommended approach is `next-intl` with `[locale]` route segments, starting with Spanish.

### 3.8 Petition Delivery Planning

This is a strategic planning item, not a feature build. When the signature threshold is reached, the campaign needs a planned, media-friendly delivery event.

**Delivery components:**
1. **Signature verification report** — export from admin dashboard showing total signatures, verification rate, geographic distribution, and timeline
2. **Formal petition document** — legal formatting per Columbus City Charter requirements, with cover letter addressed to Columbus City Council
3. **Delivery ceremony** — public event at Columbus City Hall with press, supporters, and Council members invited
4. **Digital documentation** — professional video of delivery for social media and campaign record
5. **Follow-up protocol** — what happens after delivery: Council review timeline, public hearing dates, ballot placement process

---

## 4. Phase 3 — Ballot Initiative Roadmap (Month 6–12)

Phase 3 transitions from digital petition to formal legal process. This section is strategic planning — the actual legal work requires election counsel.

### 4.1 Legal Framework

**Governing law:** Columbus City Charter, Section 42 — "Qualifications."

**Key requirements verified via web research:**
- A proposed charter amendment must be submitted by petition signed by electors equal to **not less than 10% of the total vote cast at the last preceding regular municipal election**
- Based on the November 2025 regular municipal election, the current threshold is approximately **12,533 valid signatures** (per the Columbus City Bulletin's own calculation for a 2026 charter amendment petition — 10% of 125,329 total electors who participated)
- Petitioners have **one year** from the date the petition is certified to collect and submit completed petitions
- Petitions must be submitted to the Columbus City Clerk and Franklin County Board of Elections for validation
- Signatures must be from City of Columbus registered voters
- Signatures must be written in ink on official petition forms
- The City Attorney reviews petitions for single-subject compliance

**Important distinction:** The online petition on confluenceohio.org is a *demonstration of public support*, not the formal legal petition required under the City Charter. The formal petition requires physical signatures on official forms (Ohio does not accept electronic signatures for charter amendment petitions as of this writing). The online petition establishes mandate and builds the volunteer network for the physical signature collection campaign.

### 4.2 Petition Committee Formation

Ohio Revised Code § 3501.38 and Columbus City Charter require a **petition committee** of qualified electors. For a charter amendment:

**Committee requirements:**
- Minimum 5 qualified electors of the City of Columbus (Ohio law)
- Committee members file as the official sponsors with the Columbus City Clerk
- Committee designates a treasurer if campaign finance reporting is triggered
- Committee must submit the initial petition text to the City Attorney for single-subject review before circulation begins

**Recruitment strategy (Month 6–8):**
- Identify committee candidates from the volunteer network (Artifact 08) — prioritize: legal expertise, community credibility, neighborhood diversity, demonstrated commitment to the campaign
- At least one committee member should have experience with Columbus ballot initiatives (the Columbus Safety Collective's 2025 charter amendment campaign is a recent precedent — their pathway from petition to ballot is instructive)
- Legal counsel retained to draft charter amendment language and advise on procedural requirements

### 4.3 Charter Amendment Language

**The amendment itself must be carefully drafted.** A name change for a city of Columbus's size affects:

- The city charter itself (every reference to "Columbus" must be updated or addressed)
- Intergovernmental agreements and contracts
- State law references (Columbus is mentioned by name in Ohio Revised Code in hundreds of places)
- The city's legal identity for bonds, contracts, and federal programs

**Recommended approach:** The amendment should authorize the name change and establish a transition timeline (e.g., 2-year implementation period) rather than attempting to enumerate every required change. Specific implementation authority should be delegated to the City Attorney and City Clerk.

**Draft amendment structure (for election counsel review):**
1. Statement of purpose
2. Name change declaration: "The name of the City of Columbus shall be changed to the City of Confluence"
3. Transition timeline and implementation authority
4. Charter text updates (or delegation to codify them)
5. Savings clause (existing contracts, agreements, and legal references remain valid during transition)
6. Effective date

### 4.4 Physical Signature Collection Campaign

Once the petition committee is formed and amendment language is certified, the campaign shifts to physical signature collection.

**Infrastructure needed:**
- Official petition forms printed per Franklin County Board of Elections specifications
- Volunteer training program: how to approach voters, legal requirements for petition circulators, handling objections
- Signature collection locations: farmers markets, festivals (Columbus Arts Festival, Comfest, Ohio State Fair), university campuses (OSU, Columbus State), transit stations, community events
- Data management: daily signature count tracking, geographic distribution monitoring, quality control (legibility, valid addresses)

**Target:** Collect 150% of the required threshold (approximately 18,800 signatures based on current threshold of 12,533) to build in a margin for invalid signatures. Recent Columbus data suggests signature validity rates of approximately 60–65% (the Columbus Safety Collective's 2025 petition had roughly 15,428 valid out of 27,458 submitted — a 56% validity rate, though that was a first effort). Well-organized campaigns with trained volunteers can achieve higher validity. At 70% validity, collecting 18,800 gross signatures would yield approximately 13,160 valid signatures — safely above the 12,533 threshold. At 60% validity, the campaign would need approximately 21,000 gross signatures.

**Timeline:**
- Month 6–7: Committee formation, legal counsel retention, amendment drafting
- Month 8: Amendment language certified, petition forms printed, volunteer training
- Month 9–11: Active signature collection (3-month push)
- Month 12: Submission to City Clerk and Board of Elections for validation

### 4.5 Coalition Building

**Formal coalition asks (Month 6+):**
- Convert Tier 1 and Tier 2 partner conversations (§2.4) into formal endorsements
- Seek endorsements from Columbus City Council members sympathetic to the cause
- Engage faith communities: major churches, mosques, and temples in Columbus
- Academic institutions: OSU history and political science departments, Columbus State Community College
- Business community: Columbus Partnership, Columbus Chamber of Commerce, individual business owners (especially those whose branding wouldn't be affected or who might benefit from the novelty)

### 4.6 Public Opinion Research

**Month 6–8:** Commission a professional poll to gauge public opinion on the renaming question. This serves two purposes: (a) calibrating campaign strategy, and (b) demonstrating public interest to City Council.

**Poll specifications:**
- Sample: 600+ registered Columbus voters (margin of error ≤ 4%)
- Questions: awareness of the campaign, support/oppose/undecided, most persuasive arguments, demographic breakdowns
- Vendor: reputable Ohio polling firm (Baldwin Wallace University Community Research Institute, or a firm with Columbus-specific experience)
- Budget estimate: $15,000–25,000 for a full professional survey

**If poll results are unfavorable (< 35% support):** Reassess strategy. The campaign may need more time on education and earned media before pursuing the ballot initiative. The online petition and community engagement continue regardless — building support is a multi-year project.

**If poll results are favorable (≥ 45% support):** Accelerate Phase 3 timeline. Use poll data in press outreach and City Council engagement.

### 4.7 Signature Goal Calibration

The plan document references "10% of last mayoral vote" as the signature requirement. The actual legal standard under Columbus City Charter Section 42 is **10% of the total vote cast at the last preceding regular municipal election.** This is an important distinction:

| Election | Year | Total Votes | 10% Threshold |
|----------|------|-------------|---------------|
| Mayoral (most recent) | 2023 | ~212,000 | ~21,200 |
| Regular municipal (most recent) | 2025 | 125,329 | 12,533 |

The threshold depends on *which election was most recent* at the time the petition is filed. If the petition is filed before the November 2027 municipal election, the threshold is based on 2025 turnout (12,533). If filed after, it would be based on 2027 turnout (unknown). **Strategy: file the petition before November 2027 to lock in the lower threshold.**

---

## 5. Success Metrics and KPI Framework

### 5.1 Primary KPIs

| Category | Metric | Month 1 Target | Month 3 Target | Month 6 Target | Month 12 Target |
|----------|--------|----------------|----------------|----------------|-----------------|
| **Signatures** | Total verified online | 2,000 | 8,000 | 15,000 | 20,000+ |
| | Monthly new signatures | 2,000 | 2,500 | 2,000 | 1,500 |
| | Visitor → signature rate | 3.5% | 5% | 5.5% | 5% |
| | Verification pass rate | 80% | 85% | 88% | 90% |
| **Email** | List size | 3,000 | 10,000 | 20,000 | 35,000 |
| | Open rate (campaigns) | 30% | 28% | 25% | 25% |
| | Click rate | 5% | 4.5% | 4% | 4% |
| | Unsubscribe rate per send | < 0.5% | < 0.4% | < 0.3% | < 0.3% |
| **Volunteers** | Active count | 10 | 30 | 60 | 100 |
| | Events organized | 1 | 5 | 15 | 40 |
| | Hours contributed/month | 50 | 200 | 500 | 1,000 |
| **Donations** | Total raised (cumulative) | $2,000 | $10,000 | $30,000 | $75,000 |
| | Unique donors | 50 | 200 | 500 | 1,000 |
| | Average donation | $35 | $40 | $45 | $50 |
| **Social/Referral** | Referral conversions | 200 | 1,500 | 4,000 | 8,000 |
| | Share rate (signatures → shares) | 15% | 20% | 22% | 25% |
| | Media mentions (cumulative) | 5 | 20 | 50 | 100 |
| **SEO** | Organic monthly visitors | 1,000 | 5,000 | 15,000 | 30,000 |
| | Ranking: "rename Columbus Ohio" | Top 10 | Top 5 | Top 3 | #1 |
| | Ranking: "Confluence Ohio" | #1 | #1 | #1 | #1 |
| | Backlinks (referring domains) | 10 | 50 | 150 | 300 |

### 5.2 Dashboard Requirements

The admin dashboard (Artifact 15) already includes a metrics overview page. Phase 2 extends it with:

**Dashboard home additions:**
- Sparkline charts for all primary KPIs (7-day, 30-day, all-time views)
- Signature velocity indicator (signatures per day, 7-day moving average) with trend arrow
- Funnel visualization (homepage → /sign → form start → submit → verified)
- Geographic heatmap thumbnail (link to full `/map` page)
- Media mention counter (manual entry + RSS feed from Google Alerts)

**Weekly email digest (Inngest job):**
- Automated weekly metrics summary emailed to Tim and campaign team every Monday at 9 AM ET
- Includes: signatures (total + weekly delta), email list growth, top referrers, top-performing content, conversion rate trend
- Template: Brevo transactional email with embedded charts (generated server-side as SVG or PNG)

**PostHog dashboards (pre-configured):**
1. **Acquisition:** Traffic sources, landing page performance, UTM campaign attribution
2. **Petition Funnel:** The 4-step funnel from §1.1 with breakdowns by device, source, and location
3. **Content Performance:** Blog post views, time on page, scroll depth, CTA clicks per post
4. **Referral Analytics:** Referral code usage, platform breakdown, viral coefficient (referral conversions per signer)
5. **Email Health:** Deliverability, engagement rates, list growth rate (requires Brevo webhook → PostHog events via Inngest)

### 5.3 Reporting Cadence

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| Daily metrics snapshot | Daily (automated) | Tim via Slack/email | Signatures, traffic, email sends — anomaly alerts only |
| Weekly metrics digest | Weekly (automated email) | Campaign team | Full KPI review, top performers, action items |
| Monthly retrospective | Monthly (manual) | Campaign team + advisors | Goal vs. actual, strategy adjustments, next month plan |
| Quarterly board report | Quarterly (manual) | Board/stakeholders | Cumulative progress, financial summary, Phase status |
| Milestone reports | At each 1K signature milestone | Public (blog post) | Signature count, community highlights, next milestone |

### 5.4 Alert Thresholds

Automated PostHog alerts (Artifact 13, §5) trigger notifications when metrics fall outside expected ranges:

| Alert | Condition | Channel | Action |
|-------|-----------|---------|--------|
| Conversion crash | `/sign` conversion < 2% for 24h | Email + Slack | Investigate form, Smarty, Turnstile |
| Traffic spike | > 3x average daily traffic | Email | Identify source, ensure infrastructure holds |
| Email deliverability | Bounce rate > 5% on any send | Email | Pause sending, investigate Brevo health |
| Signature velocity stall | < 50% of 7-day average for 48h | Email | Content push, social campaign, email blast |
| Error rate | Server errors > 1% of requests | Email + Slack | Vercel logs, Supabase health check |

---

## 6. Claude Code Handoff

### Handoff Prompt 17-A: Post-Launch Iteration Plan Document

```
You are building the Confluence Ohio campaign website. Generate `docs/iteration-plan.md` — the complete post-launch iteration plan.

Context: Read artifacts 01 through 16 in the project for full campaign context. The site uses Next.js 15 App Router, TypeScript, Supabase, Vercel, PostHog for analytics, and Inngest for background jobs.

Generate a Markdown document containing:

1. **Week 1–4 checklist** — a checklist-formatted list of every launch-week and Month 1 task:
   - PostHog funnel verification (homepage → /sign → form start → submit → verified)
   - GA4 and Vercel Analytics validation
   - Session replay review protocol (20 replays/day from /sign abandons)
   - A/B test schedule: hero headline (3 variants), CTA text (3 variants), form layout (single vs two-step), social proof position
   - Email deliverability checks (DKIM/SPF/DMARC verification, inbox placement testing)
   - Press outreach tracking (outlets, pitch dates, status)
   - Volunteer onboarding milestones (target: 10 active by Week 4)
   - Community voices moderation queue monitoring
   - Week-by-week cadence (Week 1: instrument, Week 2: baseline, Week 3: optimize, Week 4: retrospective)

2. **Month 2–3 growth plan:**
   - Content calendar with 2–3 posts/week, themed by week
   - Earned media pitch schedule (Dispatch op-ed, WOSU, Columbus Underground, TV stations)
   - Community events plan (first forum in Month 2 Week 3, recurring monthly events)
   - Partnership outreach tracker (Tier 1 and Tier 2 organizations)
   - Email and referral optimization tasks

3. **Phase 2 roadmap (Month 3–6):**
   - Interactive signature map
   - Endorsements page
   - Events calendar with RSVP
   - SMS infrastructure (Brevo SMS, TCPA double opt-in)
   - Petition delivery planning
   - Note: structured debate and multilingual support are deferred

4. **Phase 3 roadmap (Month 6–12):**
   - Petition committee formation (5 electors minimum)
   - Charter amendment language drafting
   - Physical signature collection campaign (target: 18,800 gross for ~13,160 valid vs. 12,533 threshold)
   - Coalition building strategy
   - Public opinion polling ($15K–25K budget)
   - Timeline: file petition before November 2027 to use 2025 turnout baseline

Output: `docs/iteration-plan.md`
```

### Handoff Prompt 17-B: Phase 2 Feature Specification

```
You are building the Confluence Ohio campaign website. Generate `docs/phase-2-spec.md` — the complete Phase 2 feature specification.

Context: Read artifacts 01–16 plus docs/iteration-plan.md. The existing platform includes: petition signing with Smarty address verification, email automation via Brevo+Inngest, community voices with AI moderation, social sharing with referral tracking, an admin dashboard, and PostHog analytics.

Generate a Markdown document containing full specifications for each Phase 2 feature:

**1. Interactive Signature Map**
- MapLibre GL JS choropleth with Columbus neighborhood GeoJSON boundaries
- Data: aggregate signature counts by zip code, 15-minute cache TTL
- Privacy: neighborhood-level aggregation only, no individual locations
- Routes: embedded component on homepage + full page at /map

**2. Endorsements Page**
- endorsements table schema (name, title, organization, quote, logo_url, tier, sort_order)
- Tiered display: organizations, elected officials, public figures, community
- Admin CRUD interface
- Route: /endorsements

**3. Events Calendar**
- events and event_rsvps table schemas
- Supabase-native (no Mobilize dependency)
- Inngest integration: RSVP confirmation email + 24h reminder + .ics calendar attachment
- Admin interface for event management
- Route: /events

**4. SMS Infrastructure**
- SmsPort interface + Brevo SMS adapter
- TCPA double opt-in flow
- Phone number collection on volunteer form and petition thank-you page

**5. Admin Dashboard Extensions**
- Endorsements management
- Events management with RSVP lists
- Enhanced metrics dashboard with sparklines and geographic heatmap

Output: `docs/phase-2-spec.md`
```

### Handoff Prompt 17-C: Success Metrics and KPI Dashboard

```
You are building the Confluence Ohio campaign website. Generate `docs/success-metrics.md` — the KPI tracking framework and dashboard specification.

Context: Read artifacts 13 (analytics), 15 (admin dashboard), and docs/iteration-plan.md.

Generate a Markdown document containing:

**1. KPI Definitions**
For each metric, specify: name, calculation method, data source (PostHog event / Supabase query / Brevo API / Vercel Analytics), target by month (1, 3, 6, 12), and alert threshold.

Categories:
- Signatures: total verified, monthly new, conversion rate (visitor→signature), verification pass rate
- Email: list size, open rate, click rate, unsubscribe rate, spam complaint rate
- Volunteers: active count, events organized, hours contributed
- Donations: total raised, unique donors, average donation
- Social/Referral: referral conversions, share rate, media mentions
- SEO: organic visitors, keyword rankings, backlinks
- Performance: LCP, CLS, INP (from Vercel Speed Insights)

**2. Dashboard Specification**
Define the admin dashboard home page layout with:
- Sparkline charts for all primary KPIs (7-day, 30-day, all-time toggle)
- Signature velocity indicator (daily rate, 7-day moving average, trend direction)
- Funnel visualization (4-step with conversion percentages)
- Geographic heatmap thumbnail
- Media mention counter

**3. Automated Reports**
- Weekly digest email: Inngest cron job (Monday 9 AM ET), Brevo transactional template, content spec
- Daily anomaly alerts: PostHog alert definitions for conversion crash, traffic spike, deliverability drop, velocity stall, error rate
- Milestone blog post triggers: automated draft creation at each 1K signature milestone

**4. PostHog Dashboard Configurations**
Pre-configured dashboard definitions for: Acquisition, Petition Funnel, Content Performance, Referral Analytics, Email Health.

**5. Reporting Templates**
Markdown templates for: monthly retrospective, quarterly board report, milestone blog post.

Output: `docs/success-metrics.md`
```

### Handoff Prompt 17-D: Phase 2 Database Migration

```
You are building the Confluence Ohio campaign website. Generate the Supabase migration file for all Phase 2 database schema additions.

Context: Read artifact 05 (data model) for existing schema. Read docs/phase-2-spec.md for Phase 2 feature specifications.

Generate `packages/db/migrations/002_phase2_features.sql` containing:

1. New tables: endorsements, events, event_rsvps
2. All indexes specified in the Phase 2 spec
3. RLS policies for all new tables (public read for active content, public insert for RSVPs, admin full access)
4. Updated admin_role enum to add 'moderator' role

Follow the conventions from the existing migration: UUIDs, timestamptz, text not varchar, RLS on every table.

Output: `packages/db/migrations/002_phase2_features.sql`
```

### Handoff Prompt 17-E: Phase 2 TypeScript Types

```
You are building the Confluence Ohio campaign website. Generate updated TypeScript types for all Phase 2 database tables.

Context: Read packages/db/types.ts for existing type patterns. Read docs/phase-2-spec.md and packages/db/migrations/002_phase2_features.sql.

Add to `packages/db/types.ts`:
- Row types for: Endorsement, Event, EventRsvp
- Insert types (omitting generated fields)
- Update types (all fields optional except id)
- Supabase Database type extension for the new tables

Follow existing patterns in the file exactly.

Output: Updated `packages/db/types.ts`
```

### Handoff Prompt 17-F: Weekly Metrics Digest Inngest Job

```
You are building the Confluence Ohio campaign website. Generate the Inngest cron function for the automated weekly metrics digest email.

Context: Read artifact 07 (email automation) for Brevo adapter patterns and Inngest function conventions. Read artifact 13 (analytics) for PostHog query patterns. Read docs/success-metrics.md for KPI definitions.

Generate `apps/web/inngest/weekly-metrics-digest.ts`:

1. Inngest cron function triggered every Monday at 9:00 AM ET
2. Queries Supabase for: total signatures (+ weekly delta), email list size (+ weekly delta), new volunteers, donation total, top 5 referrers
3. Queries PostHog API for: weekly unique visitors, conversion rate, top traffic sources, top-performing blog posts
4. Formats data into a metrics summary object
5. Sends via Brevo transactional email to configured admin recipients
6. Includes signature velocity trend (up/down/flat compared to previous week)

Follow the Inngest function patterns established in artifact 07 exactly (event-driven, step functions, error handling).

Output: `apps/web/inngest/weekly-metrics-digest.ts`
```

---

## Appendix A: Complete Feature Roadmap Timeline

```
LAUNCH ─────────────────────────────────────────────────────────────────►
│
├── Month 1 (Weeks 1–4): ESTABLISH
│   ├── Monitor all funnels and fix launch bugs
│   ├── Begin A/B testing program (4 tests queued)
│   ├── Press outreach and media response
│   ├── Email deliverability verification
│   ├── Community voices moderation
│   ├── First volunteer onboarding cohort (10 volunteers)
│   └── Month 1 retrospective and baseline metrics report
│
├── Month 2–3: GROW
│   ├── Content marketing: 2–3 blog posts/week
│   ├── Earned media: op-ed, radio, TV pitches
│   ├── First community forum (Month 2, Week 3)
│   ├── Partnership conversations with Tier 1 & 2 orgs
│   ├── Email sequence optimization
│   ├── Referral program optimization
│   └── Monthly "Confluence Conversations" neighborhood forums
│
├── Month 3–6: BUILD (Phase 2)
│   ├── Interactive signature map (/map)
│   ├── Endorsements page (/endorsements)
│   ├── Events calendar with RSVP (/events)
│   ├── SMS infrastructure (Brevo SMS, TCPA double opt-in)
│   ├── Enhanced admin dashboard (sparklines, heatmap, endorsements, events)
│   ├── Weekly automated metrics digest
│   └── Petition delivery planning begins
│
├── Month 6–9: ORGANIZE (Phase 3 Part 1)
│   ├── Petition committee formation (5 electors)
│   ├── Election counsel retained
│   ├── Charter amendment language drafted and reviewed
│   ├── Public opinion poll commissioned ($15K–25K)
│   ├── Formal coalition endorsement asks
│   └── Volunteer training for physical signature collection
│
├── Month 9–12: COLLECT (Phase 3 Part 2)
│   ├── Amendment language certified by City Attorney
│   ├── Official petition forms printed
│   ├── Physical signature collection campaign (target: 18,800 gross)
│   ├── Signature collection at events, markets, campuses
│   ├── Daily signature tracking and quality control
│   └── Submit to City Clerk before November 2027 municipal election
│
└── Beyond Month 12: VOTE
    ├── Board of Elections signature validation
    ├── City Council consideration period
    ├── Ballot placement for next eligible election
    ├── "Yes on Confluence" ballot campaign
    └── Implementation planning (if approved)
```

---

## Appendix B: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low initial conversion rate (< 2%) | Medium | High | A/B testing program, session replay analysis, form simplification |
| Negative press framing ("cancel culture") | Medium | Medium | Proactive media relationships, messaging discipline (Artifact 01), invite opposing voices |
| Smarty API outage during high traffic | Low | High | Graceful degradation (accept signatures pending verification), Smarty status monitoring |
| Signature validity rate below 60% | Medium | High | Volunteer training, quality control protocols, collect 150% of threshold |
| Legal challenge to amendment language | Low | High | Retain election counsel early, study recent Columbus charter amendment precedents |
| Donor fatigue before Phase 3 | Medium | Medium | Milestone-based donation asks, transparent budget reporting, diversify revenue (events, merch) |
| Community backlash from immigrant communities | Low | Medium | Early partnership outreach, inclusive messaging, revisit multilingual support if demand emerges |
| Ohio legislature preempts local renaming authority | Low | High | Monitor state legislation, build bipartisan local support, legal counsel assessment |

---

*End of Artifact 17. This completes the 17-prompt Cowork sequence. The repository specification is now complete: all documentation, database schemas, feature specifications, deployment configuration, and post-launch strategy are defined. The Claude Code handoff prompts above will generate the final set of implementation artifacts.*
