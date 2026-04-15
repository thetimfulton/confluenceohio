# Confluence Ohio — Site Architecture and Page Inventory

**Source:** Artifact 02
**Dependencies:** Artifact 01 (Messaging Framework)

---

## 1. Site Map

```
confluenceohio.org
│
├── / ................................. Homepage
│
├── /the-case ........................ Why Rename? (parent)
│   ├── /the-case/history ............ The Naming Story
│   ├── /the-case/the-rivers ......... The Confluence
│   ├── /the-case/columbus-legacy .... Who Was Columbus?
│   ├── /the-case/precedents ......... Cities That Changed Their Names
│   └── /the-case/the-process ........ How It Works Legally
│
├── /voices .......................... Community Perspectives (landing)
│   ├── /voices/share ................ Submit Your Perspective
│   └── /voices/[slug] ............... Individual Story Pages (dynamic)
│
├── /sign ............................ Petition (primary conversion)
├── /sign/thank-you .................. Post-Signature (dynamic, auth-gated)
├── /sign/verify ..................... Email Verification Landing
│
├── /volunteer ....................... Volunteer Hub
├── /donate .......................... ActBlue Integration
│
├── /about ........................... Campaign Team & Mission
├── /press ........................... Media Kit & Coverage
├── /blog ............................ Campaign Updates (index)
│   └── /blog/[slug] ................. Individual Blog Posts (dynamic)
│
├── /faq ............................. Frequently Asked Questions
├── /privacy ......................... Privacy Policy
├── /terms ........................... Terms of Use
│
└── /r/[code] ........................ Referral Redirect (short URL)
```

**Total pages:** 14 static routes + 3 dynamic route patterns (`/voices/[slug]`, `/blog/[slug]`, `/r/[code]`) + 2 post-action routes (`/sign/thank-you`, `/sign/verify`)

**URL conventions:**
- Lowercase, hyphenated slugs
- No trailing slashes (Next.js default)
- Canonical URLs enforced via `<link rel="canonical">`
- All pages served over HTTPS (Vercel default + Cloudflare)
- Referral short URLs (`/r/[code]`) redirect to `/sign?ref=[code]` with a 301 after recording the click

---

## 2. Page-by-Page Specifications

---

### 2.1 Homepage — `/`

**Purpose:** First impression and campaign thesis. Convince visitors the campaign is credible, the argument is compelling, and signing is easy. Serve as the hub that routes all visitor intents.

**User intent:** "What is this? Why should I care? Is this real?"

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Petition signature (direct) or scroll engagement leading to `/sign`

**Secondary CTAs:**
- Read the Case → `/the-case`
- Share Your Voice → `/voices`
- Donate → `/donate`
- Email signup (inline footer form)

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Hero | Headline + subhead + "Sign the Petition" CTA button + live signature counter | 30 |
| The 30-Second Case | Condensed manifesto — rivers, the naming, the proposal. From Artifact 01 elevator pitch. | 150 |
| How It Works | 3-step visual: Sign → We collect 22,000 signatures → Voters decide | 60 |
| The Arguments (preview) | 3 strongest arguments as cards, each linking to full `/the-case` sub-pages | 120 |
| Live Signature Counter | Large counter with progress bar toward next milestone + recent signers feed (first name + city) | 20 |
| Featured Community Voice | Pull one featured voice_submission with position, quote excerpt, and link to `/voices` | 80 |
| Press/Social Proof | "As seen in" media logos (when available) + endorsement quotes | 40 |
| Latest Blog Post | Title, excerpt, date, link to `/blog/[slug]` | 40 |
| Email Signup | "Stay in the loop" — email capture with first name | 20 |
| Footer | Standard nav + social links + legal links | — |

**Key UI components:**
- `<HeroSection>` with animated river/confluence visual or hero image
- `<SignatureCounter>` (Supabase real-time subscription)
- `<RecentSignersFeed>` (last 5 signers, first name + city, auto-updating)
- `<ArgumentCards>` (3-up grid, each with icon, headline, 1-sentence summary, link)
- `<FeaturedVoice>` (quote card with position badge)
- `<PressLogos>` (grayscale logo bar)
- `<EmailSignupInline>` (compact horizontal form)
- `<StickyPetitionCTA>` (mobile only — appears after scrolling past hero)

**SEO target keywords:** "Confluence Ohio", "rename Columbus Ohio", "Columbus Ohio renaming campaign"

**Open Graph image concept:** Aerial photograph of the Scioto-Olentangy confluence with "Where the Rivers Meet" text overlay. 1200×630px.

**JSON-LD:** Organization schema (501(c)(4), name, URL, logo, social profiles)

---

### 2.2 The Case (Parent) — `/the-case`

**Purpose:** Overview of all arguments for renaming. Gateway to the five deep-dive sub-pages. Functions as the "why" section of the site — the intellectual backbone.

**User intent:** "Why should Columbus change its name? Convince me."

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Deep engagement (time on site, sub-page visits) leading to petition signature

**Secondary CTAs:**
- Navigate to each sub-page
- Share this page

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Intro | Opening paragraph: the case in brief | 100 |
| Arguments overview | 7 arguments from Artifact 01, each as a card with headline, 2-sentence summary, and link to the relevant sub-page | 350 |
| Counter-arguments acknowledgment | "We take the opposition seriously" — teaser of the steelman, link to FAQ | 100 |
| CTA banner | "Convinced? Add your name." + petition button + signature counter | 30 |

**Key UI components:**
- `<ArgumentGrid>` (7 cards, responsive 2-col desktop / 1-col mobile)
- `<InlinePetitionBanner>` (appears between content sections)
- `<SubNavigation>` (sticky sub-nav for the five child pages)

**SEO target keywords:** "why rename Columbus Ohio", "case for renaming Columbus", "Columbus Ohio name change"

**Open Graph image concept:** Typographic design — "7 Reasons Columbus Should Consider a New Name"

---

### 2.3 The Case: History — `/the-case/history`

**Purpose:** Tell the full naming story — how a tavern owner named a capital after a man who never saw it.

**User intent:** "How did Columbus get its name? What's the real history?"

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Informed conviction → signature

**Secondary CTAs:** Read about the Rivers → `/the-case/the-rivers`, Share this page

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Pre-colonial history | Indigenous presence at the confluence, burial mounds, the landscape before European settlement | 300 |
| Franklinton and the capital decision | 1812 founding, why the site was chosen, the "High Banks" document | 400 |
| Joseph Foos and the naming | The tavern, the lobbying, "Ohio City" vs. "Columbus" | 300 |
| The name in context | Why Columbus (the explorer) was admired in 1812, how that perception has shifted | 250 |
| Timeline | Key dates from 1797 (Franklinton founded) to 2025 (Reimagining Columbus initiative) | 200 |
| CTA section | "The name was chosen in a tavern in 1812. In 2026, voters should get to choose." | 30 |

**Key UI components:**
- `<Timeline>` (vertical scrolling timeline with dates and events)
- `<PullQuote>` (founding document quote)
- `<InlinePetitionBanner>`
- `<SubNavigation>` (The Case sub-pages)

**SEO target keywords:** "history of Columbus Ohio name", "why is Columbus Ohio named Columbus", "Joseph Foos Columbus Ohio", "founding of Columbus Ohio 1812"

**Open Graph image concept:** Historical illustration or map of 1812 Ohio with the confluence marked

---

### 2.4 The Case: The Rivers — `/the-case/the-rivers`

**Purpose:** Make the geographic argument — the rivers are why the city exists, and "confluence" is the word for what they do.

**User intent:** "What's the geographic significance? What does 'confluence' actually mean here?"

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Emotional connection to the place → signature

**Secondary CTAs:** Visit the Confluence (directions to North Bank Park), Share this page

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| The rivers explained | Scioto (231 mi, Wyandot "deer," state seal) and Olentangy (97 mi, the 1833 name swap story) | 350 |
| Where they meet | North Bank Park, what you can see today, the parks and bridges | 200 |
| Why the confluence mattered | Location chosen for capital because of the rivers; founding document quote | 200 |
| Indigenous connection | Mounds, river as gathering place, pre-colonial significance | 250 |
| The rivers today | Scioto Mile, Confluence Park (21 acres), riverfront development, the living geography | 200 |
| The metaphor | Convergence of peoples, industries, cultures — the word fits | 150 |
| CTA section | "The rivers are still meeting. The name should say so." | 30 |

**Key UI components:**
- `<MapEmbed>` (interactive or static map showing the confluence point)
- `<RiverFactCards>` (side-by-side Scioto vs. Olentangy stats)
- `<PhotoGallery>` (confluence from different angles, parks, bridges)
- `<InlinePetitionBanner>`

**SEO target keywords:** "Scioto Olentangy confluence", "Columbus Ohio rivers", "where Scioto Olentangy meet", "Confluence Park Columbus"

**Open Graph image concept:** Drone photo of the two rivers meeting, annotated with river names

---

### 2.5 The Case: Columbus Legacy — `/the-case/columbus-legacy`

**Purpose:** Present the historical record on Christopher Columbus accurately, sourced, and without moralizing.

**User intent:** "What did Christopher Columbus actually do? Why is the name controversial?"

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Informed judgment → signature

**Secondary CTAs:** Read the FAQ (especially "wasn't he a man of his time?"), Share

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| The mythology | How Columbus was perceived in 1812 vs. now | 200 |
| The documented record | Voyages, enslavement, governance, arrest — from Artifact 01 Argument 1, expanded | 500 |
| Zero connection to Ohio | He never reached North America — map showing actual voyage routes vs. Ohio | 200 |
| What Columbus (the city) has done | Statue removal, Indigenous Peoples' Day, Reimagining initiative — Artifact 01 Argument 3 | 300 |
| Steelman: Italian American heritage | Honest engagement with the heritage argument from Artifact 01 Counterargument 5 | 200 |
| Sources | Cited primary and secondary sources | 100 |
| CTA section | "We're not erasing history. We're making a different choice about what to honor." | 30 |

**Key UI components:**
- `<VoyageMap>` (Columbus's actual routes vs. Ohio location)
- `<SourceCitations>` (expandable footnotes/endnotes)
- `<InlinePetitionBanner>`

**SEO target keywords:** "Christopher Columbus legacy", "Christopher Columbus Ohio", "Columbus statue removed Ohio", "why Columbus Day controversial"

**Open Graph image concept:** Side-by-side: Columbus's voyage map vs. Ohio map, showing the disconnect

---

### 2.6 The Case: Precedents — `/the-case/precedents`

**Purpose:** Normalize city renaming by showing it has happened before — successfully.

**User intent:** "Has any city actually done this? What happened?"

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Remove the "this is impossible" objection → signature

**Secondary CTAs:** Read about the legal process → `/the-case/the-process`, Share

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Intro | "Cities change their names. It's disruptive, and then it's normal." | 80 |
| Utqiagvik (Barrow) | Full case study — vote, process, outcome, lessons | 300 |
| Cincinnati (Losantiville) | Ohio's own precedent — Governor St. Clair, 1790 | 200 |
| Atlanta (Terminus → Marthasville → Atlanta) | Triple rename | 200 |
| St. Paul (Pig's Eye Landing) | The tavern-owner parallel | 200 |
| Mumbai (Bombay) | International scale — no loss of global recognition | 200 |
| Others (brief) | Denali/McKinley, Istanbul/Constantinople, Chennai/Madras | 150 |
| Pattern recognition | What successful renames have in common | 150 |
| CTA section | "They did it. We can too." | 30 |

**Key UI components:**
- `<CaseStudyCards>` (expandable cards per city with before/after, year, process)
- `<ComparisonTable>` (city, old name, new name, year, population at time, outcome)
- `<InlinePetitionBanner>`

**SEO target keywords:** "cities that changed their names", "city renaming examples", "Barrow to Utqiagvik", "can a city change its name"

**Open Graph image concept:** Before/after name pairs in clean typography

---

### 2.7 The Case: The Process — `/the-case/the-process`

**Purpose:** Demystify the legal pathway. Show this is achievable, democratic, and already underway.

**User intent:** "How would this actually work? Is it even possible?"

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Remove "it can't be done" objection → immediate signature

**Secondary CTAs:** Volunteer to collect signatures → `/volunteer`, Share

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Overview | Charter amendment via citizen petition — no City Council needed | 100 |
| Step-by-step process | 5 steps with visual flow: (1) Form petition committee of 5 electors, (2) Collect ~22,000 signatures in 12 months, (3) Submit to Franklin County Board of Elections, (4) Board validates signatures, (5) Simple majority vote at next election | 400 |
| Where we are now | Current status of the campaign, progress toward signature goal | 150 |
| Legal authority | Columbus City Charter Section 42, Ohio Revised Code references | 150 |
| FAQ excerpt | "Does City Council have to approve?" "What if the vote fails?" "What about costs?" | 200 |
| CTA section | "Every signature gets us closer to the ballot. Add yours." | 30 |

**Key UI components:**
- `<ProcessStepper>` (5-step visual with current step highlighted)
- `<ProgressBar>` (signatures collected vs. 22,000 goal)
- `<LegalCitation>` (expandable charter text)
- `<InlinePetitionBanner>`

**SEO target keywords:** "how to rename a city in Ohio", "Columbus Ohio charter amendment", "citizen petition Columbus Ohio", "how to change a city name"

**Open Graph image concept:** "5 Steps to Confluence" — clean numbered process graphic

---

### 2.8 Voices (Landing) — `/voices`

**Purpose:** Showcase community perspectives from all sides. Demonstrate that this is a conversation, not a decree.

**User intent:** "What do real people think about this?" / "Where does the community stand?"

**Primary CTA:** Share Your Perspective → `/voices/share`
**Conversion goal:** Community voice submission (secondary: petition signature)

**Secondary CTAs:** Sign the Petition → `/sign`, Filter by position

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Intro | "This is a conversation. Every perspective matters." | 80 |
| Featured voices | 3 featured submissions (1 support, 1 oppose, 1 undecided) | 300 (displayed) |
| Voice grid | Paginated grid of all approved submissions with position badges | — |
| Filters | Filter by position: All / Support / Oppose / Undecided | — |
| Share CTA | "Add your voice — wherever you stand." | 30 |
| Petition CTA | Inline banner | 30 |

**Key UI components:**
- `<VoiceCard>` (author name, neighborhood, position badge, excerpt, link to full)
- `<PositionFilter>` (All | Support | Oppose | Undecided — client-side filter or query param)
- `<FeaturedVoiceCarousel>` (3 featured, one per position)
- `<VoiceSubmitCTA>` (prominent button to `/voices/share`)
- `<InlinePetitionBanner>`

**SEO target keywords:** "Columbus Ohio renaming opinions", "should Columbus change its name", "Columbus rename debate"

**Open Graph image concept:** Mosaic of community member photos/avatars with the headline "Every Perspective Matters"

---

### 2.9 Voices: Share — `/voices/share`

**Purpose:** Submission form for community perspectives. Low friction, welcoming to all positions.

**User intent:** "I want to share my opinion about this."

**Primary CTA:** Submit Your Perspective (form submission)
**Conversion goal:** Voice submission → secondary: email capture, petition CTA on confirmation

**Secondary CTAs:** Sign the Petition (post-submission), Read other voices

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Intro | "Whether you support, oppose, or are undecided — we want to hear from you." | 40 |
| Form | Name, email, neighborhood (optional), position (support/oppose/undecided), title, body (500-word limit), photo upload (optional) | — |
| Guidelines | Respectful discourse expectations, moderation policy | 100 |
| What happens next | "Submissions are reviewed for respectfulness (not agreement) and published within 48 hours." | 50 |

**Moderation workflow (AI-assisted):**
1. Submission arrives → Inngest event triggered
2. Claude API moderation pass: checks for hate speech, personal attacks, spam, off-topic content, and PII exposure. Returns one of: `auto_approve`, `needs_review`, `auto_reject` with confidence score and reasoning
3. `auto_approve` (high-confidence respectful content): published immediately, admin notified for spot-check
4. `needs_review` (ambiguous or borderline): queued for manual review in admin dashboard with AI reasoning displayed
5. `auto_reject` (clear violations): rejected with template notification to submitter explaining why; admin can override
6. All decisions logged for audit trail and moderation model improvement
7. Human moderator has final authority — can override any AI decision from the admin dashboard

**Key UI components:**
- `<VoiceSubmissionForm>` (Turnstile-protected, progressive enhancement)
- `<PositionSelector>` (3 options with icons: Support / Oppose / Undecided)
- `<RichTextArea>` (word count indicator, 500-word limit)
- `<PhotoUpload>` (optional, with crop/resize)

**SEO target keywords:** Not an SEO-targeted page (form page)

**Open Graph image concept:** Same as `/voices` parent

---

### 2.10 Voices: Individual Story — `/voices/[slug]`

**Purpose:** Full-page display of a single community voice. Shareable, indexable.

**User intent:** Arrived via share link or from voices listing.

**Primary CTA:** Sign the Petition → `/sign` (if supporter voice) or Share Your Own → `/voices/share` (if opposing/undecided voice)
**Conversion goal:** Context-dependent — petition signature or voice submission

**Secondary CTAs:** Read more voices, Share this story

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Author info | Name, neighborhood, position badge | 10 |
| Full body | The submitted text, up to 500 words | ≤500 |
| Author photo | If provided | — |
| Related voices | 3 more voices (mix of positions) | — |
| CTA | Context-dependent petition or share-your-own | 30 |

**Key UI components:**
- `<VoiceArticle>` (clean article layout)
- `<PositionBadge>` (Support / Oppose / Undecided)
- `<RelatedVoices>` (3-card grid)
- `<ShareButtons>` (Facebook, X, WhatsApp, email, copy link)
- `<InlinePetitionBanner>`

**SEO target keywords:** Dynamic — auto-generated from title and author name

**Open Graph image concept:** Dynamic OG image — quote excerpt + author name + position badge on branded background

**JSON-LD:** Article schema (author, datePublished, publisher)

---

### 2.11 Sign the Petition — `/sign`

**Purpose:** THE conversion page. Every design decision serves one goal: get the signature. This is the most important page on the site.

**User intent:** "I want to sign." or "I'm almost convinced — show me why I should."

**Primary CTA:** Add My Name (form submission)
**Conversion goal:** Petition signature

**Secondary CTAs:** None above the fold. Below: Read the Case (for unconvinced visitors only).

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Above the fold | Headline ("Add Your Name"), 1-sentence case, form (first name, last name, email, address with Smarty autocomplete), "Add My Name" button, Turnstile (invisible) | 40 |
| Social proof sidebar/below | Live signature counter with progress bar, "Join [X] Ohioans who've signed" | 20 |
| Recent signers | Scrolling feed: first name + city, updated in real-time | — |
| Trust signals | "Your address verifies Ohio residency. We never share your personal information." + privacy link | 30 |
| Below-fold reinforcement | For visitors who scroll past the form: 3 strongest arguments (cards), then form repeats | 150 |
| FAQ excerpt | "Is this legally binding?" "Who can sign?" "What happens after I sign?" | 100 |

**Key UI components:**
- `<PetitionForm>` (4 visible fields + hidden honeypot + invisible Turnstile)
  - First Name (text)
  - Last Name (text)
  - Email (email)
  - Street Address (Smarty Autocomplete Pro, filtered to OH via `include_only_states=OH`)
  - Apt/Unit (text, optional — appears when address selected)
  - City (auto-populated, read-only)
  - State (locked to "OH", read-only)
  - ZIP (auto-populated, read-only)
- `<SignatureCounter>` (large number + progress bar + milestone label, Supabase real-time)
- `<RecentSignersFeed>` (auto-scrolling, last 10 signers)
- `<TrustSignals>` (lock icon + privacy text)
- `<MilestoneIndicator>` (next milestone: 1K, 5K, 10K, 22K)

**Form UX notes:**
- Address autocomplete reduces visible fields to effectively 4 (name, name, email, address)
- Each additional required field reduces conversion by ~7% — keep it minimal
- "Add My Name" button text (not "Submit" — personal, action-oriented)
- Progressive enhancement: form works without JS (server-side POST fallback)
- Error messages inline, not alert boxes
- Auto-focus first field on page load (desktop only)

**SEO target keywords:** "sign petition rename Columbus Ohio", "Confluence Ohio petition", "rename Columbus petition"

**Open Graph image concept:** "Join [X] Ohioans" — dynamic counter in OG image (updated periodically, not real-time)

**JSON-LD:** No special schema (petition page is action-oriented, not content)

---

### 2.12 Post-Signature: Thank You — `/sign/thank-you`

**Purpose:** Critical conversion moment. The signer just committed — capitalize on peak engagement to drive sharing, donations, and volunteering.

**User intent:** "I signed. Now what?"

**Note:** This page is only accessible after a successful signature submission (redirect with session token). If accessed directly, redirect to `/sign`.

**Content outline (this is a conversion funnel, not a content page):**

| Step | Content | Goal |
|------|---------|------|
| 1. Confirmation | "You're signer #[number]!" + confetti animation | Satisfaction, completion |
| 2. Share | "Help us reach [next milestone] — share with 3 friends" + pre-populated share buttons with referral code | Viral sharing |
| 3. Donate | "Fund the campaign — every dollar helps us reach 22,000 signatures" + ActBlue link with refcode | Donation |
| 4. Volunteer | "Want to do more?" + volunteer role cards + link to `/volunteer` | Volunteer signup |
| 5. Email confirm | "Check your email to verify your signature" + resend link | Email verification |

**Key UI components:**
- `<ConfirmationHero>` (signer number, confetti animation via canvas)
- `<SharePanel>` (Facebook, X, WhatsApp, email, copy link — each pre-populated with referral URL)
- `<DonatePrompt>` (suggested amounts: $5, $10, $25, $50 — links to embedded ActBlue page `/donate` with refcode)
- `<VolunteerTeaser>` (2–3 role cards with one-click interest)
- `<EmailVerificationReminder>` (subtle, bottom of page)

**SEO:** noindex, nofollow (post-action page, not for search)

---

### 2.13 Email Verification — `/sign/verify`

**Purpose:** Landing page for email verification links. Confirms the signature is verified and re-enters the engagement funnel.

**User intent:** Clicked email verification link.

**Content:** "Your signature is verified!" → Share panel → Donate prompt → Return to homepage.

**Key UI components:**
- `<VerificationConfirmation>` (checkmark animation)
- `<SharePanel>` (reuse from thank-you page)
- `<DonatePrompt>` (reuse)

**SEO:** noindex, nofollow

---

### 2.14 Volunteer Hub — `/volunteer`

**Purpose:** Convert interested supporters into active campaign participants with defined roles.

**User intent:** "I want to help beyond signing."

**Primary CTA:** Sign Up to Volunteer (form submission)
**Conversion goal:** Volunteer registration

**Secondary CTAs:** Sign the Petition (if not yet signed), Donate

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Hero | "Join the Movement" — what volunteers do and why they matter | 80 |
| Roles | 6 volunteer role cards, each with description, time commitment, and "I'm interested" button | 300 |
| Form | Name, email, phone (optional), neighborhood, role interests (multi-select), availability, notes | — |
| Current volunteers | Count of active volunteers + neighborhood map (if data supports) | 30 |
| Petition CTA | For visitors who haven't signed | 30 |

**Volunteer roles:**
1. **Signature Collector** — Gather petition signatures at events, door-to-door, and community spaces
2. **Social Amplifier** — Share campaign content, engage in online conversations, grow reach
3. **Event Organizer** — Plan and run community events, house parties, and public forums
4. **Story Collector** — Interview community members and help them share their perspectives for /voices
5. **Neighborhood Captain** — Coordinate campaign activity in your neighborhood
6. **Design & Content Creator** — Help produce graphics, writing, video, and other campaign materials

**Key UI components:**
- `<RoleCards>` (6-up grid, each with icon, title, description, time estimate)
- `<VolunteerForm>` (Turnstile-protected)
- `<NeighborhoodSelector>` (dropdown of Columbus neighborhoods)

**SEO target keywords:** "Confluence Ohio volunteer", "rename Columbus Ohio volunteer", "Columbus civic campaign volunteer"

**Open Graph image concept:** "Join [X] Volunteers Building Confluence" — community photo

---

### 2.15 Donate — `/donate`

**Purpose:** Convert supporters into financial backers via ActBlue.

**User intent:** "I want to financially support this campaign."

**Primary CTA:** Donate via ActBlue (external link or embed)
**Conversion goal:** Donation

**Secondary CTAs:** Sign the Petition, Volunteer, Share

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Hero | "Fund the Future of Confluence" — why donations matter | 80 |
| How funds are used | Transparent breakdown: signature collection, digital outreach, legal costs, events, operational | 150 |
| Donation options | Suggested amounts ($5, $10, $25, $50, $100, Custom) via embedded ActBlue form with refcode tracking | — |
| Recurring option | "Make it monthly" — sustainer pitch | 50 |
| Transparency | "We're a 501(c)(4) organization. View our financial disclosures." | 40 |
| Small-dollar framing | "$10 = printing 50 petition flyers" / "$25 = one community event" / "$100 = one week of digital ads" | 60 |

**Key UI components:**
- `<DonationGrid>` (suggested amount buttons that pre-fill the embedded ActBlue form)
- `<FundBreakdown>` (visual breakdown of how funds are allocated)
- `<ActBlueEmbed>` (embedded ActBlue form via their iframe/JS embed SDK, with refcode passthrough for attribution tracking)

**SEO target keywords:** Not heavily SEO-targeted (donation pages convert via internal traffic, not search)

**Open Graph image concept:** "Every Dollar Moves Us Closer to the Ballot"

---

### 2.16 About — `/about`

**Purpose:** Build trust and credibility. Show the humans behind the campaign.

**User intent:** "Who's running this? Can I trust them?"

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Trust → petition signature

**Secondary CTAs:** Donate, Volunteer, Contact us

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Mission | Restate mission from Artifact 01 | 50 |
| Our values | How we run this campaign — transparency, honesty, respect for disagreement | 150 |
| The team | Bios and photos of key campaign team members | 200 |
| Organization | "Confluence Ohio is a 501(c)(4) civic organization..." — legal structure, transparency | 100 |
| Contact | Email, social media handles | 30 |
| Petition CTA | Inline banner | 30 |

**Key UI components:**
- `<TeamGrid>` (photo + name + role + short bio)
- `<ValueCards>` (3–4 core values as cards)
- `<ContactInfo>` (email, social links)
- `<InlinePetitionBanner>`

**SEO target keywords:** "Confluence Ohio campaign", "who is behind Confluence Ohio", "Confluence Ohio organization"

**Open Graph image concept:** Team photo or campaign logo on branded background

**JSON-LD:** Organization schema (expanded — team members, contact, legal structure)

---

### 2.17 Press — `/press`

**Purpose:** Media resource hub. Make it effortless for journalists to cover the campaign.

**User intent:** "I'm a journalist / I want to see media coverage."

**Primary CTA:** Download Media Kit (PDF)
**Conversion goal:** Media coverage

**Secondary CTAs:** Press contact email, Sign the Petition

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Press contact | Name, email, phone for media inquiries | 20 |
| Media kit download | PDF with campaign summary, key facts, high-res logos, photos, leadership bios, talking points | — |
| Press releases | Chronological list of campaign press releases | — |
| In the news | Links to external media coverage with publication logos, headlines, dates | — |
| Brand assets | Downloadable logos (SVG, PNG), brand colors, fonts, approved photography | — |
| Key facts | At-a-glance campaign statistics for quick journalist reference | 100 |

**Key UI components:**
- `<PressReleaseList>` (date + headline + excerpt + link)
- `<MediaCoverageList>` (publication logo + headline + date + external link)
- `<DownloadGrid>` (media kit PDF, logos, photos)
- `<QuickFacts>` (key stats in a scannable sidebar)

**SEO target keywords:** "Confluence Ohio press", "Columbus rename news", "Confluence Ohio media kit"

**Open Graph image concept:** Campaign logo on clean background

---

### 2.18 Blog (Index) — `/blog`

**Purpose:** Campaign updates, content marketing, SEO content. Keeps the site fresh and gives supporters reasons to return and share.

**User intent:** "What's new with the campaign?" / arrived via search on a topic

**Primary CTA:** Sign the Petition → `/sign` (if not yet signed), Subscribe (if signed)
**Conversion goal:** Email subscription, petition signature

**Secondary CTAs:** Share individual posts, Read related content

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Latest post | Featured hero card with title, excerpt, image, date | 40 |
| Post grid | Paginated grid of blog posts, reverse chronological | — |
| Email signup | "Get campaign updates in your inbox" | 20 |
| Petition CTA | Inline banner (for non-signers) | 30 |

**Key UI components:**
- `<BlogPostCard>` (image, title, excerpt, date, read time)
- `<BlogGrid>` (responsive grid, paginated, 9 per page)
- `<EmailSignupInline>`
- `<InlinePetitionBanner>`

**SEO target keywords:** Varies by post — blog is the primary SEO content vehicle

**Open Graph image concept:** Generic blog OG with campaign branding

**JSON-LD:** Blog schema on index, BlogPosting schema on individual posts

---

### 2.19 Blog Post — `/blog/[slug]`

**Purpose:** Individual blog post — campaign update, historical deep dive, or persuasive essay.

**User intent:** Varies by post content — arrived via search, social, or internal link.

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Petition signature (for persuasive content) or email subscription (for updates)

**Secondary CTAs:** Share, Read related posts, Subscribe

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| Article | Full blog post body | Varies (600–2000) |
| Author | Author name and brief bio (defaults to "Confluence Ohio" if no individual author) | 30 |
| Share buttons | Facebook, X, WhatsApp, email, copy link | — |
| Related posts | 3 related articles | — |
| Petition CTA | End-of-article banner | 30 |
| Email signup | Below article | 20 |

**Key UI components:**
- `<BlogArticle>` (clean article layout with proper heading hierarchy)
- `<AuthorBio>` (compact)
- `<ShareButtons>`
- `<RelatedPosts>` (3-card grid)
- `<InlinePetitionBanner>`
- `<EmailSignupInline>`

**SEO:** Each post targets specific keywords defined in content strategy (Prompt 3)

**JSON-LD:** BlogPosting schema (headline, datePublished, author, publisher, image)

---

### 2.20 FAQ — `/faq`

**Purpose:** Address objections, reduce friction, build confidence. Answer the 20 questions from Artifact 01.

**User intent:** "I have a specific question about this." / "I'm not sure yet."

**Primary CTA:** Sign the Petition → `/sign`
**Conversion goal:** Objection removal → petition signature

**Secondary CTAs:** Read the Case, Share Your Voice

**Content outline:**

| Section | Content | ~Word Count |
|---------|---------|-------------|
| FAQ groups | 4 groups from Artifact 01: The Basics (Q1–4), The Process (Q5–9), Cost & Logistics (Q10–12), History & Identity (Q13–17), Getting Involved (Q18–20) | ~2,500 total |
| Petition CTA | End-of-page banner | 30 |

**Key UI components:**
- `<FAQAccordion>` (expandable Q&A pairs, grouped by category)
- `<FAQSearch>` (optional — client-side filter across all questions)
- `<InlinePetitionBanner>`

**SEO target keywords:** "Confluence Ohio FAQ", "Columbus renaming questions", "how to rename Columbus Ohio"

**Open Graph image concept:** "Your Questions, Answered" — clean typographic

**JSON-LD:** FAQPage schema (critical for rich snippet eligibility — each Q&A pair as a Question/Answer entity)

---

### 2.21 Privacy Policy — `/privacy`

**Purpose:** Legal compliance and trust. Explain exactly what data is collected and how it is used.

**Primary CTA:** None (legal page)
**SEO:** noindex (low-value for search, required for trust)

**Content requirements:**
- What data is collected (name, email, address for petition; email for newsletter; etc.)
- How data is used (Ohio residency verification, signature validation, campaign communications)
- Third parties (Smarty for address verification, Brevo for email, ActBlue for donations, Cloudflare for security)
- Data retention and deletion (how to request signature removal)
- Cookie policy (Turnstile, PostHog analytics, essential cookies only)
- Contact for privacy requests
- CAN-SPAM compliance statement
- Ohio-specific petition privacy considerations

---

### 2.22 Terms of Use — `/terms`

**Purpose:** Legal protection for the campaign.

**Primary CTA:** None (legal page)
**SEO:** noindex

**Content requirements:**
- Acceptable use of the site
- Petition submission terms (one signature per person, Ohio residents only, truthful information)
- Voice submission terms (moderation policy, content license, no hate speech)
- Intellectual property (campaign content copyright)
- Disclaimer (not legal advice, campaign views)
- Limitation of liability

---

### 2.23 Referral Redirect — `/r/[code]`

**Purpose:** Short referral URL for social sharing. Records click attribution, then redirects to `/sign?ref=[code]`.

**User intent:** Clicked a shared link from a friend or social media.

**Behavior:**
1. Receives request at `/r/ABC123`
2. Server-side: increment click count for referral code `ABC123` in the `referrals` table
3. 301 redirect to `/sign?ref=ABC123`
4. The `/sign` page reads `ref` query param, stores in hidden form field, and attributes the resulting signature to the referrer

**SEO:** noindex, nofollow (redirect page)

---

## 3. Navigation Design

### 3.1 Desktop Primary Navigation

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo: Confluence Ohio]                                         │
│                                                                  │
│  The Case ▾  │  Voices  │  Volunteer  │  Donate                 │
│                                              [Sign the Petition] │ ← Accent button
└──────────────────────────────────────────────────────────────────┘
```

**"The Case" dropdown** (on hover/click):
- Why Rename? (parent overview)
- The Naming Story
- The Confluence
- Who Was Columbus?
- Cities That Changed Their Names
- How It Works Legally

**"Sign the Petition" button:**
- Always visible in the nav bar
- Accent color (campaign primary — distinct from nav text)
- Does not collapse into a dropdown or hamburger

### 3.2 Mobile Navigation

```
┌──────────────────────────┐
│  [Logo]        [☰ Menu]  │
│                           │
│  ┌─────────────────────┐  │
│  │ Sign the Petition ▸ │  │ ← Persistent sticky bar at bottom
│  └─────────────────────┘  │
└──────────────────────────┘
```

**Hamburger menu contents (full-screen overlay):**
1. Sign the Petition ← repeated at top of menu
2. The Case (expandable: 5 sub-pages)
3. Voices
4. Volunteer
5. Donate
6. About
7. Press
8. Blog
9. FAQ

**Sticky bottom CTA bar:**
- Appears after user scrolls past the first screen (hero)
- Full-width bar at the bottom of viewport
- "Sign the Petition →" button
- Disappears when user is on `/sign` (already on the petition page)
- 60px height minimum (touch-friendly)
- Semi-transparent background with backdrop blur

### 3.3 Footer Navigation

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo: Confluence Ohio]                                         │
│                                                                  │
│  Campaign          Learn              Legal                      │
│  ─────────         ────────           ──────                     │
│  Sign Petition     The Case           Privacy Policy             │
│  Volunteer         FAQ                Terms of Use               │
│  Donate            Blog                                          │
│  About             Press                                         │
│  Voices                                                          │
│                                                                  │
│  ┌─────────────────────────────────────┐                         │
│  │ Stay in the loop: [email] [Submit]  │                         │
│  └─────────────────────────────────────┘                         │
│                                                                  │
│  [Facebook] [X/Twitter] [Instagram]                              │
│                                                                  │
│  © 2026 Confluence Ohio · 501(c)(4) · confluenceohio.org         │
│  #ConfluenceOhio  #WhereTheRiversMeet                            │
└──────────────────────────────────────────────────────────────────┘
```

**Footer email signup:**
- Compact horizontal form: first name (optional) + email + submit
- Same Brevo integration as other email signups
- Source tag: `footer`

### 3.4 Sub-Navigation (The Case section)

When viewing any page under `/the-case/*`, a horizontal sub-navigation appears below the primary nav:

```
┌──────────────────────────────────────────────────────────────────┐
│  Overview  │  History  │  The Rivers  │  Columbus Legacy  │      │
│  Precedents  │  The Process                                      │
└──────────────────────────────────────────────────────────────────┘
```

- Current page is visually highlighted (underline or bold)
- Sticky on scroll (desktop) — pins below the primary nav
- On mobile: horizontal scrollable row

---

## 5. Photography and Visual Asset Shot List

The following photography and visual assets are needed before launch. Organized by priority (P1 = must-have for launch, P2 = needed within 30 days, P3 = nice-to-have).

### P1 — Required for Launch

| # | Asset | Description | Used On | Specs |
|---|-------|-------------|---------|-------|
| 1 | **Aerial confluence shot** | Drone/aerial photograph of the Scioto-Olentangy confluence from above, clearly showing the two rivers meeting. Golden hour preferred. | Homepage hero, `/the-case/the-rivers` hero, primary OG image | 2400×1600px min (crops to 1200×630 for OG) |
| 2 | **North Bank Park ground-level** | The confluence visible from ground level at North Bank Park — rivers, bridges, downtown skyline in background | `/the-case/the-rivers`, blog imagery | 2400×1600px min |
| 3 | **Scioto riverfront** | The Scioto Mile / Scioto riverfront — the river as it flows through downtown, ideally with city context | `/the-case/the-rivers`, `/the-case/history` | 2400×1600px min |
| 4 | **Olentangy riverfront** | The Olentangy as it winds through campus/park areas before the confluence | `/the-case/the-rivers` | 2400×1600px min |
| 5 | **Campaign team photo** | Group photo of core team members, professional but approachable, outdoor Columbus setting preferred | `/about`, press kit, OG image for `/about` | 2400×1600px min |
| 6 | **Individual team headshots** | Head-and-shoulders portraits of each team member listed on `/about` | `/about` team grid | 800×800px min, square crop |
| 7 | **Campaign logo — full** | "Confluence Ohio" wordmark/logo, full color. Needs SVG master + PNG exports. Consider incorporating river/confluence motif. | Every page (nav, footer, OG fallback), press kit | SVG + PNG at 1x, 2x, 3x |
| 8 | **Campaign logo — icon** | Compact icon/mark version for favicon, social avatars, small placements | Favicon, social profiles, mobile nav | SVG + PNG, square, 512×512px min |
| 9 | **OG fallback image** | Branded default OG image with logo and tagline "Where the Rivers Meet" for pages without unique OG images | All pages without custom OG | 1200×630px |

### P2 — Needed Within 30 Days of Launch

| # | Asset | Description | Used On | Specs |
|---|-------|-------------|---------|-------|
| 10 | **Columbus neighborhood scenes (5–8)** | Representative photos from recognizable Columbus neighborhoods: Short North, German Village, Franklinton, Hilltop, University District, Clintonville, etc. | Homepage, blog posts, `/the-case` pages, social media | 2400×1600px min each |
| 11 | **Community diversity shots (3–5)** | Candid photos reflecting Columbus's diversity — farmers markets, festivals, neighborhood life. No staged stock-photo feel. Must have photo releases. | Homepage "convergence" section, `/the-case/the-rivers` (metaphor section), social media | 2400×1600px min each |
| 12 | **Columbus landmarks** | Recognizable landmarks: Ohio Statehouse, Ohio Stadium (exterior), COSI, Scioto Mile bike path, Main Street Bridge, North Market | Blog posts, `/the-case/history`, social media | 2400×1600px min each |
| 13 | **Historical images** | Public domain or licensed images: early Columbus/Franklinton maps, 1812-era illustrations, historical river photographs | `/the-case/history` timeline, blog posts | Best available resolution |
| 14 | **Columbus statue removal** | Photo from the July 2020 statue removal (likely available via AP/Reuters license or public domain press photos) | `/the-case/columbus-legacy` | Standard editorial license |
| 15 | **Petition signing action shots** | People signing the petition at events, tables, door-to-door (staged initially if needed, real as campaign progresses) | `/sign` social proof area, volunteer page, social media | 2400×1600px min |

### P3 — Nice-to-Have / Ongoing

| # | Asset | Description | Used On | Specs |
|---|-------|-------------|---------|-------|
| 16 | **Volunteer action photos** | Volunteers in action — tabling, canvassing, organizing events | `/volunteer`, email campaigns, social media | 2400×1600px min |
| 17 | **Event photography** | Campaign events, community forums, rallies as they happen | Blog posts, social media, press page | 2400×1600px min |
| 18 | **Confluence Park** | Photos of the 21-acre Confluence Park at the river junction | `/the-case/the-rivers` | 2400×1600px min |
| 19 | **River detail shots** | Close-up texture/detail of the rivers — water, reflections, seasonal variations | Background imagery, social media | 2400×1600px min |
| 20 | **Precedent city imagery** | Licensed photos of Utqiagvik, Cincinnati riverfront, Atlanta skyline, Mumbai — illustrating the "cities that changed" narrative | `/the-case/precedents` | Standard editorial license |

### Asset Sourcing Notes

- **Drone photography:** Requires FAA Part 107 licensed pilot. Columbus airspace has restrictions near downtown (John Glenn airport proximity). Budget ~$500–$1,000 for a professional drone photographer to capture shots #1 and #2.
- **Stock alternatives (temporary):** For launch, Unsplash and Pexels have usable Columbus skyline and river photos. Search "Columbus Ohio Scioto" and "Columbus Ohio aerial." Not ideal but workable for MVP.
- **Historical images:** Ohio History Connection and Columbus Metropolitan Library have digital archives with public domain imagery from the city's founding era.
- **Photo releases:** Any identifiable person in community/diversity shots requires a signed photo release. Template should be prepared before any community photography begins.
