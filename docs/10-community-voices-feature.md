# Confluence Ohio — Community Voices / Debate Feature

**Artifact 10 · Prompt 10 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 05 (Data Model — `voice_submissions`, `moderation_log` tables), Artifact 04 (Page Copy — `/voices` and `/voices/share` copy)

---

## Decisions Confirmed (April 10, 2026)

1. **Photo upload:** Deferred to Phase 2. Launch with text-only submissions. (Full spec retained in §1.7 for Phase 2.)
2. **AI moderation provider:** Claude Haiku 4.5 confirmed (~$0.001/submission).
3. **Akismet:** Skipped at launch. Rely on Turnstile + honeypot + email verification + time-on-page + IP rate limiting. Re-evaluate if spam exceeds 10% of submissions.
4. **Email verification gate:** Confirmed. Authors must verify email before submission enters moderation queue.
5. **Anonymous submissions:** Displayed in the grid but **never featured**. Admin feature toggle is disabled for submissions where `author_name` is "Anonymous" (case-insensitive).

---

## 1. Submission Form (`/voices/share`)

### 1.1 Page Structure

The submission form is a standalone page at `/voices/share`. It is linked from:
- The `/voices` landing page CTA ("Share Your Perspective →")
- Welcome Email 3 (Artifact 07, §7.4) at day 7 of the drip sequence
- The homepage "Featured Community Voice" section
- The `/faq` answers about opposition voices being welcome

**Layout:** Single-column centered form (max-width 640px). Community guidelines displayed prominently above the form. Mobile-first — the form is the page.

### 1.2 Form Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Display Name | text input | Yes | 2–60 chars | Placeholder: "Your first name, full name, or 'Anonymous'" |
| Email | email input | Yes | Valid email format | Not displayed publicly. Used for verification and notifications. Helper text: "Never displayed. Used to verify your submission and notify you of approval." |
| Neighborhood / Connection | text input | No | Max 100 chars | Placeholder: "e.g., Clintonville, OSU student, grew up in Hilliard" |
| Position | radio group | Yes | Must select one | Options: "I support renaming" / "I have concerns" / "I'm still deciding" — maps to `support` / `oppose` / `undecided` enum |
| Title | text input | No | Max 100 chars | Placeholder: "Give your perspective a headline (optional)" |
| Your Perspective | textarea | Yes | 50–2,500 chars (~500 words). Live character count displayed. | Placeholder: "What does the name of this city mean to you? Whether you support the change, have concerns, or are still thinking it through — tell us why." |
| Community Guidelines | checkbox | Yes | Must be checked | "I've read the community guidelines and my submission is respectful, on-topic, and my own words." |

**Position radio label language:** The prompt spec says "Support / Oppose / Undecided" but the page copy (Artifact 04, §8) uses softer language: "Why I Support" / "Why I Have Concerns." We align the radio labels with the warmer framing:
- "I support renaming" (maps to `support`)
- "I have concerns" (maps to `oppose`)
- "I'm still deciding" (maps to `undecided`)

### 1.3 Community Guidelines (displayed above form)

> **Community Guidelines**
>
> We publish perspectives from all positions — support, opposition, and undecided. Every voice matters, and disagreement is welcome.
>
> We do remove submissions that contain:
> - Personal attacks or name-calling
> - Spam, commercial content, or off-topic material
> - Hate speech or slurs targeting any group
> - Threats or incitement to violence
> - Plagiarized content or AI-generated text presented as personal perspective
>
> Submissions are reviewed by a combination of automated tools and human moderators. Most submissions are reviewed within 48 hours. You'll receive an email when your submission is approved or if it needs revision.

### 1.4 Anti-Spam Measures (Layered)

**Layer 1 — Cloudflare Turnstile (invisible mode)**

Widget renders invisibly. On form submission, the client-side Turnstile script produces a `cf-turnstile-response` token. The server validates this token via POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with the site's secret key. Tokens are single-use and valid for 300 seconds.

```typescript
// Server-side Turnstile validation
async function validateTurnstile(token: string, ip: string): Promise<boolean> {
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    }
  );
  const result = await response.json();
  return result.success === true;
}
```

**Layer 2 — Honeypot field**

Hidden `website` field (CSS `display: none`, `tabindex="-1"`, `autocomplete="off"`). Any submission with this field populated is silently rejected (returns a fake success response to avoid tipping off bots).

```html
<div style="display:none" aria-hidden="true">
  <label for="website">Website</label>
  <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
</div>
```

**Layer 3 — Time-on-page check**

A hidden `form_loaded_at` timestamp (Unix ms) is set via JavaScript when the page loads. The server rejects submissions where `Date.now() - form_loaded_at < 30_000` (30 seconds). Legitimate 500-word submissions take at minimum 1–2 minutes to compose.

**Layer 4 — Rate limiting**

One submission per email address per 24 hours. Enforced server-side via a check against `voice_submissions` table: `WHERE author_email = $1 AND submitted_at > now() - interval '24 hours'`. Returns a friendly message: "You've already submitted a perspective today. Please try again tomorrow."

**Layer 5 — IP-based rate limiting**

Maximum 5 submissions per IP per hour. Implemented via Supabase Edge Function or an in-memory rate limiter (e.g., `@upstash/ratelimit` with Vercel KV or a simple in-memory map for launch). This catches bot farms that rotate email addresses.

### 1.5 Email Verification Flow

Submission is a two-step process:

1. **User submits form →** Server validates all fields, runs Turnstile/honeypot/time checks, then stores a *provisional* record in `voice_submissions` with `moderation_status = 'pending_email'` (new status — see §1.6).
2. **Server sends verification email →** Contains a one-time link: `https://confluenceohio.org/voices/verify?token={raw_token}`. Token is a `crypto.randomUUID()`, hashed via SHA-256 before storage. Expires in 72 hours. Email sent via Brevo transactional API using the `VOICE_EMAIL_VERIFY` template.
3. **User clicks verification link →** Server validates token hash, marks `email_verified = true` on the submission, advances `moderation_status` from `'pending_email'` to `'pending'`, and fires the `voice/submitted` Inngest event (which triggers the AI moderation pipeline — see §2).
4. **Unverified submissions** are automatically deleted after 72 hours by a scheduled Inngest cleanup job (`voice/cleanup-unverified`, runs daily).

**Verification email content:**

| Field | Value |
|-------|-------|
| Subject | `Verify your Confluence Ohio submission` |
| Preview text | `One click to confirm — then we'll review your perspective.` |
| Body | "Thanks for sharing your perspective, {DISPLAY_NAME}. Click below to verify your email and submit your perspective for review. [Verify My Submission →] This link expires in 72 hours." |
| Template ID | `VOICE_EMAIL_VERIFY` (Brevo) |

### 1.6 Data Model Addendum

The Artifact 05 `voice_submissions` table needs one addition to support the email verification gate:

```sql
-- Add to voice_submissions table
ALTER TABLE voice_submissions ADD COLUMN email_verified boolean NOT NULL DEFAULT false;

-- Add email verification token columns (inline, no separate table needed)
ALTER TABLE voice_submissions ADD COLUMN email_token_hash text;
ALTER TABLE voice_submissions ADD COLUMN email_token_expires timestamptz;
```

**New moderation_status enum value:**

```sql
ALTER TYPE moderation_status ADD VALUE 'pending_email' BEFORE 'pending';
```

Updated enum sequence: `pending_email` → `pending` → `auto_approved` / `needs_review` → `approved` / `rejected` → `appealed`

### 1.7 Photo Upload Spec (Phase 2 — Deferred)

*Included for completeness. Not built at launch.*

- **Bucket:** Supabase Storage private bucket `voice-photos`
- **Upload flow:** Client requests a signed upload URL from an API route → client uploads directly to Supabase Storage → API route records the `photo_path` on the submission
- **Constraints:** Max 5MB, JPEG/PNG/WebP only, validated server-side via magic bytes (not just file extension)
- **Processing:** `sharp` resizes to 800px max width, 80% quality JPEG, strips EXIF metadata (privacy). Generates a 200px thumbnail for the grid view.
- **Content moderation:** Photo passed to Claude Haiku vision for content check (nudity, violence, text overlay spam) before entering the moderation queue.
- **Storage policy:** RLS policy allows public read on approved submissions only. Upload via service_role key.

### 1.8 Progressive Enhancement

The form works without JavaScript via standard HTML form submission (POST to `/api/voices/submit`). When JavaScript is available:
- Live character count on the textarea
- Inline field validation with error messages
- Turnstile widget initialization
- `form_loaded_at` timestamp injection
- Form submission via `fetch()` with loading state and success/error feedback without page reload

When JavaScript is unavailable:
- Turnstile field is absent — server falls back to honeypot + rate limiting only
- No live character count — server enforces the limit and returns an error page
- Standard form POST → server returns a redirect to `/voices/share/verify-email` confirmation page

---

## 2. Moderation Workflow

### 2.1 Pipeline Overview

Every submission passes through a three-stage pipeline:

```
[Email Verified] → [AI Pre-Screen] → [Human Review (if needed)] → [Published / Rejected]
```

The Inngest event `voice/submitted` triggers the AI moderation step. Human review is triggered by `voice/needs-review`.

### 2.2 AI Pre-Screen (Claude Haiku 4.5)

**Why Haiku:** Anthropic's own documentation recommends Haiku for "classification, entity extraction, content moderation" where "latency and cost matter more than nuance." At ~$0.001 per moderation call, moderating 100 submissions/day costs $0.10. Haiku 4.5's classification accuracy is sufficient for this use case — edge cases are routed to human review.

**System prompt:**

```
You are a content moderator for Confluence Ohio, a civic campaign about 
renaming Columbus, Ohio. You are reviewing a community voice submission.

The campaign publishes perspectives from ALL positions — support, opposition, 
and undecided. Disagreement is welcome. Your job is NOT to filter opinions 
but to enforce community guidelines.

REJECT if the submission contains:
- Personal attacks or name-calling directed at specific individuals
- Hate speech, slurs, or dehumanizing language targeting any group
- Threats or incitement to violence
- Spam, commercial content, or off-topic material unrelated to the renaming question
- Clearly AI-generated text (formulaic structure, no personal detail, generic arguments)
- Plagiarized content (verbatim quotes without attribution exceeding 50 words)

FLAG FOR REVIEW if:
- The submission is borderline on any of the above criteria
- The submission contains strong language that may or may not cross the line
- You are less than 85% confident in your assessment
- The submission discusses sensitive historical topics (Indigenous history, 
  slavery, colonialism) that benefit from human editorial judgment

APPROVE if:
- The submission is on-topic, respectful, and appears to be a genuine personal perspective
- You are at least 85% confident it meets all community guidelines
- Strong opinions are fine. Emotional language is fine. Disagreement is expected.

Respond with JSON only:
{
  "decision": "approve" | "reject" | "flag_for_review",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "flagged_issues": ["issue1", "issue2"] // empty array if none
}
```

**User prompt:**

```
Position: {position}
Display Name: {author_name}
Neighborhood: {author_neighborhood}
Title: {title}

Submission:
{body}
```

**Inngest function:**

```typescript
export const moderateVoiceSubmission = inngest.createFunction(
  { id: 'voice-ai-moderation', retries: 2 },
  { event: 'voice/submitted' },
  async ({ event, step }) => {
    const submission = event.data.submission;

    const aiResult = await step.run('ai-moderation', async () => {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: MODERATION_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: formatSubmissionForModeration(submission),
        }],
      });

      return JSON.parse(response.content[0].text);
    });

    await step.run('update-submission-status', async () => {
      const newStatus = mapAiDecisionToStatus(aiResult.decision);
      // newStatus: 'auto_approved' | 'needs_review' | 'rejected'

      await supabaseAdmin
        .from('voice_submissions')
        .update({
          moderation_status: newStatus,
          moderation_ai_result: aiResult,
          moderation_ai_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      // Log the moderation action
      await supabaseAdmin
        .from('moderation_log')
        .insert({
          voice_submission_id: submission.id,
          action: `ai_${aiResult.decision}`,
          actor_type: 'ai',
          ai_confidence: aiResult.confidence,
          reasoning: aiResult.reasoning,
          metadata: { flagged_issues: aiResult.flagged_issues },
        });
    });

    // Route based on AI decision
    if (aiResult.decision === 'approve') {
      await step.sendEvent('notify-auto-approved', {
        name: 'voice/auto-approved',
        data: { submissionId: submission.id },
      });
    } else if (aiResult.decision === 'flag_for_review') {
      await step.sendEvent('notify-needs-review', {
        name: 'voice/needs-review',
        data: { submissionId: submission.id, aiResult },
      });
    } else if (aiResult.decision === 'reject') {
      await step.sendEvent('notify-rejected', {
        name: 'voice/ai-rejected',
        data: { submissionId: submission.id, aiResult },
      });
    }
  }
);

function mapAiDecisionToStatus(decision: string): string {
  switch (decision) {
    case 'approve': return 'auto_approved';
    case 'flag_for_review': return 'needs_review';
    case 'reject': return 'rejected';
    default: return 'needs_review'; // fail open to human review
  }
}
```

### 2.3 Decision Routing

| AI Decision | Confidence | Status | Next Action |
|-------------|-----------|--------|-------------|
| `approve` | ≥ 0.85 | `auto_approved` | Publish immediately. Send author approval email. Increment `voice_submission_count` metric. |
| `flag_for_review` | Any | `needs_review` | Add to human moderation queue. Include in next admin digest. |
| `reject` | ≥ 0.90 | `rejected` | Send author rejection email with guidelines link. Log reason. |
| `reject` | < 0.90 | `needs_review` | Route to human review (AI not confident enough to auto-reject). |
| API error / timeout | — | `needs_review` | Fail open. Route to human review. Log the error. |

**Critical design principle:** The system fails open. If AI moderation errors out, the submission enters the human queue — it is never silently discarded. Only high-confidence rejections (≥ 0.90) are automated; everything else gets human eyes.

### 2.4 Optional Akismet Pre-Filter (Phase 2)

If spam volume warrants it, add an Akismet check *before* the Claude AI step:

```typescript
// Akismet comment-check (if enabled)
const akismetResult = await step.run('akismet-check', async () => {
  const response = await fetch(
    `https://${process.env.AKISMET_KEY}.rest.akismet.com/1.1/comment-check`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        blog: 'https://confluenceohio.org',
        user_ip: submission.ip,
        user_agent: submission.userAgent,
        comment_type: 'comment',
        comment_author: submission.author_name,
        comment_author_email: submission.author_email,
        comment_content: submission.body,
      }),
    }
  );
  const isSpam = (await response.text()) === 'true';
  const isDiscard = response.headers.get('X-akismet-pro-tip') === 'discard';
  return { isSpam, isDiscard };
});

if (akismetResult.isDiscard) {
  // Blatant spam — skip AI moderation entirely
  await updateStatus(submission.id, 'rejected', { reason: 'akismet_discard' });
  return;
}
```

**Deferred because:** Turnstile + honeypot + email verification + time-on-page already form four spam layers. Akismet adds a fifth at the cost of an API dependency and licensing complexity. Re-evaluate after launch if spam volume exceeds 10% of submissions.

### 2.5 Admin Daily Digest

An Inngest cron function (`voice/admin-digest`, runs daily at 9:00 AM ET) queries submissions with `moderation_status = 'needs_review'` and compiles a digest email sent to all `admin_users`.

```typescript
export const voiceAdminDigest = inngest.createFunction(
  { id: 'voice-admin-digest' },
  { cron: '0 13 * * *' }, // 9 AM ET = 1 PM UTC
  async ({ step }) => {
    const pending = await step.run('fetch-pending', async () => {
      const { data } = await supabaseAdmin
        .from('voice_submissions')
        .select('id, author_name, position, title, body, submitted_at, moderation_ai_result')
        .eq('moderation_status', 'needs_review')
        .order('submitted_at', { ascending: true });
      return data ?? [];
    });

    if (pending.length === 0) return; // No digest needed

    const autoApprovedToday = await step.run('count-auto-approved', async () => {
      const { count } = await supabaseAdmin
        .from('voice_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('moderation_status', 'auto_approved')
        .gte('moderation_ai_at', new Date(Date.now() - 86400000).toISOString());
      return count ?? 0;
    });

    await step.run('send-digest', async () => {
      const admins = await getAdminEmails();
      await emailAdapter.sendTransactional({
        templateId: getTemplateId('VOICE_ADMIN_DIGEST'),
        to: admins,
        params: {
          PENDING_COUNT: pending.length,
          AUTO_APPROVED_COUNT: autoApprovedToday,
          SUBMISSIONS: pending.map(s => ({
            id: s.id,
            author: s.author_name,
            position: s.position,
            title: s.title || '(no title)',
            excerpt: s.body.slice(0, 200) + (s.body.length > 200 ? '…' : ''),
            ai_decision: s.moderation_ai_result?.decision,
            ai_confidence: s.moderation_ai_result?.confidence,
            ai_issues: s.moderation_ai_result?.flagged_issues?.join(', ') || 'none',
            review_url: `https://confluenceohio.org/admin/voices/${s.id}`,
          })),
          ADMIN_URL: 'https://confluenceohio.org/admin/voices?status=needs_review',
        },
      });
    });
  }
);
```

---

## 3. Public Display

### 3.1 Voices Landing Page (`/voices`)

**Route:** `/voices` (statically generated with ISR, revalidate every 60 seconds)

**Page sections (top to bottom):**

1. **Hero** — Headline: "Every Perspective Matters" / Subhead per Artifact 04, §8
2. **Introduction** — The "this section is that conversation" paragraph from Artifact 04
3. **Featured Voices** — Up to 3 admin-featured stories (ideally 1 support, 1 oppose, 1 undecided). Displayed as large cards with full excerpt, author name, neighborhood, position badge. Anonymous submissions are excluded from featuring. At launch, display fictional examples with "Example" badges per Artifact 04 spec until real submissions are approved.
4. **Filter Bar** — Tabs: All | Support | Have Concerns | Undecided — client-side filtering of the grid with URL parameter sync (`/voices?position=support`)
5. **Voice Grid** — Paginated grid of all approved submissions (20 per page). Each card shows: position badge (color-coded), title (or first line if no title), excerpt (first 150 chars), author name, neighborhood. Click-through to `/voices/{slug}`.
6. **Pagination** — "Load more" button (not infinite scroll — accessible, works without JS as page param)
7. **Share CTA** — "Add Your Voice" section per Artifact 04 with "Share Your Perspective →" button linking to `/voices/share`
8. **Signature Counter** — Persistent mini-counter: "[X] Ohioans have signed the petition. [Add your name →]"

**Position badges:**

| Position | Label | Color | Icon |
|----------|-------|-------|------|
| support | "Supports renaming" | Green (`#16a34a`) | ✓ |
| oppose | "Has concerns" | Amber (`#d97706`) | — |
| undecided | "Still deciding" | Blue (`#2563eb`) | ? |

**Why "Has concerns" instead of "Opposes":** Softer, more inviting language. Consistent with the radio label "I have concerns" and the Artifact 04 column header "Why I Have Concerns." This is a deliberate brand voice decision — the campaign steelmans the opposition by refusing to label them harshly.

### 3.2 Two-Column Layout (Desktop)

On screens ≥ 1024px, the voice grid switches to a two-column layout:
- **Left column:** "Why People Support" — all `support` submissions
- **Right column:** "Why People Have Concerns" — all `oppose` submissions
- **Below both columns:** "Still Deciding" — all `undecided` submissions in a single-column section

On mobile (< 1024px), the layout collapses to a single column with the filter tabs controlling which position is displayed.

**Design rationale:** The two-column layout visually communicates that this is a genuine two-sided conversation. It prevents the page from appearing one-sided regardless of the submission ratio.

### 3.3 Individual Voice Page (`/voices/[slug]`)

**Route:** `/voices/[slug]` (dynamically generated with ISR, revalidate every 60 seconds)

**Slug generation:** On submission, generate from title if provided, otherwise from first 6 words of body. Sanitize: lowercase, replace spaces with hyphens, strip special characters, append 4-char random suffix for uniqueness. Example: `the-rivers-were-here-first-a7b3` or `perspective-from-clintonville-x9k2`.

**Page layout:**

```
[Position badge]
[Title] (or "A Perspective from {Neighborhood}" if no title)
[Author name] · [Neighborhood] · [Submitted date]

[Full body text — rendered with basic Markdown: paragraphs, emphasis, links]

---

[Share buttons: Twitter, Facebook, WhatsApp, Copy Link]
[Pre-populated share text: "Read this perspective on renaming Columbus: {url}"]

---

[← Back to All Voices]

[CTA: "Have your own perspective? Share it →"]

[Mini petition CTA: "{X} Ohioans have signed. Add your name →"]
```

**SEO:**
- Title tag: `"{Title}" — {Author} on Renaming Columbus | Confluence Ohio`
- Meta description: First 155 chars of body
- OG image: Default Confluence Ohio OG image (dynamic per-voice OG images deferred to Phase 2 / Prompt 11)
- JSON-LD: `Article` schema with `author`, `datePublished`, `description`

### 3.4 Empty State

Before any voices are approved, the `/voices` page shows the three fictional example voices from Artifact 04 (Maria S., Tom K., Jasmine W.) with a prominent "Example" badge overlay and a CTA: "Be the first to share your real perspective →"

### 3.5 Content Rendering

Voice body text is stored as plain text in the database. On render:
- Convert double newlines to paragraph breaks
- Sanitize against XSS (no raw HTML — use a text-to-HTML function, not `dangerouslySetInnerHTML`)
- Optional: detect and linkify URLs (with `rel="nofollow ugc"`)
- No Markdown rendering at launch (users submit plain text, not Markdown)

### 3.6 Caching Strategy

| Route | Strategy | Revalidation |
|-------|----------|-------------|
| `/voices` | ISR (Incremental Static Regeneration) | 60 seconds |
| `/voices/[slug]` | ISR | 60 seconds |
| `/voices/share` | Static | N/A (form page, no dynamic data) |
| `/api/voices/*` | No cache | N/A (API routes) |

When a voice is approved, rejected, featured, or unfeatured, the admin action triggers `revalidatePath('/voices')` and `revalidatePath(`/voices/${slug}`)` via Next.js on-demand revalidation.

---

## 4. Admin Controls

### 4.1 Admin Route: `/admin/voices`

Protected by Supabase Auth + `admin_users` table check. Same auth pattern as Artifact 08 (Volunteer Admin).

**Layout:** Full-width table with filters and bulk actions.

### 4.2 Moderation Queue View

**Default view:** Submissions with `moderation_status = 'needs_review'`, sorted by `submitted_at ASC` (oldest first).

**Table columns:**

| Column | Content |
|--------|---------|
| Status | Color-coded badge: pending_email (gray), pending (yellow), needs_review (orange), auto_approved (green), approved (green ✓), rejected (red) |
| Position | Support / Concerns / Undecided badge |
| Author | Display name + neighborhood |
| Title / Excerpt | Title if present, else first 80 chars of body |
| AI Decision | approve / reject / flag — with confidence percentage and flagged issues tooltip |
| Submitted | Relative time (e.g., "2 hours ago") |
| Actions | [Approve] [Reject] [View] |

**Filters (sidebar or top bar):**

- Status: All / Pending Email / Pending / Needs Review / Auto-Approved / Approved / Rejected
- Position: All / Support / Concerns / Undecided
- Date range: Last 24h / Last 7 days / Last 30 days / All time
- Search: Full-text search across author_name, title, body

### 4.3 Individual Submission Review (`/admin/voices/[id]`)

**Full-detail view:**

```
[Status badge]  [Position badge]

AUTHOR INFORMATION
  Display Name:    {author_name}
  Email:           {author_email}  [Copy]
  Neighborhood:    {author_neighborhood}
  Email Verified:  ✓ Yes / ✗ No
  Submitted:       {submitted_at}

AI MODERATION
  Decision:        {approve/reject/flag_for_review}
  Confidence:      {0.XX}
  Reasoning:       "{reasoning text}"
  Flagged Issues:  {issues or "None"}
  Moderated At:    {moderation_ai_at}

SUBMISSION
  Title:           {title}
  ─────────────────────────────
  {full body text}
  ─────────────────────────────

MODERATION LOG
  {timestamp} — AI auto-moderation: {decision} (confidence: {X})
  {timestamp} — Human: approved by {admin_email}

ACTIONS
  [✓ Approve]  [✗ Reject]  [★ Feature]  [✎ Edit]
  
  Rejection reason (required if rejecting):
  [dropdown: Off-topic / Personal attack / Hate speech / Spam / Other]
  [text field for custom note]
```

### 4.4 Admin Actions

**Approve:**
- Sets `moderation_status = 'approved'`, `approved_at = now()`, `moderated_by = admin.id`
- Logs `human_approve` to `moderation_log`
- Sends author approval notification email (§5.2)
- Increments `voice_submission_count` in `campaign_metrics`
- Triggers `revalidatePath('/voices')` and `revalidatePath(`/voices/${slug}`)`

**Reject:**
- Requires a rejection reason (dropdown + optional note)
- Sets `moderation_status = 'rejected'`, `rejected_at = now()`, `rejection_reason = {reason}`, `moderated_by = admin.id`
- Logs `human_reject` to `moderation_log`
- Sends author rejection email (§5.3) with specific guidance on how to revise

**Feature / Unfeature:**
- Toggles `featured = true/false`
- Maximum 6 featured voices at any time (soft limit, enforced in UI with warning)
- **Anonymous submissions cannot be featured.** The Feature button is disabled for submissions where `author_name` matches "Anonymous" (case-insensitive). Tooltip: "Anonymous submissions cannot be featured."
- Featured voices appear in the "Featured Voices" section of `/voices`
- Triggers page revalidation

**Edit:**
- Admin can edit `title` and `body` (for typo fixes, formatting)
- Original content is preserved in `moderation_log` metadata (`{ original_title, original_body }`)
- Author is notified via email that their submission was lightly edited (§5.4)
- Admin must provide an edit reason

**Override:**
- If AI auto-approved, admin can reverse to rejected (and vice versa)
- Logged as `human_override` in `moderation_log` with reasoning

### 4.5 Bulk Actions

Available when multiple rows are selected:
- **Bulk approve** — approves all selected `needs_review` submissions
- **Bulk reject** — rejects all selected with a shared rejection reason
- Confirmation modal: "You are about to approve/reject {N} submissions. This will send {N} notification emails. Continue?"

### 4.6 Export

**Export button** in the top bar. Exports a CSV of all submissions matching the current filter:

| Columns | `id`, `author_name`, `author_email`, `author_neighborhood`, `position`, `title`, `body`, `moderation_status`, `ai_decision`, `ai_confidence`, `featured`, `submitted_at`, `approved_at`, `rejected_at` |
|---------|---|

Uses server-side streaming to handle large exports without timeout. Accessible via `/api/admin/voices/export?status=approved&position=support&format=csv`.

---

## 5. Email Notifications

All emails use the Brevo transactional API via the adapter from Artifact 07. Template IDs follow the `VOICE_*` naming convention.

### 5.1 Verification Email (`VOICE_EMAIL_VERIFY`)

See §1.5 for full spec. Sent immediately on form submission.

### 5.2 Approval Notification (`VOICE_APPROVED`)

| Field | Value |
|-------|-------|
| Subject | `Your perspective is live on Confluence Ohio` |
| Preview text | `Thanks for sharing your voice, {{ params.DISPLAY_NAME }}.` |

```
{{ params.DISPLAY_NAME }},

Your perspective on renaming Columbus has been published. You can view 
it here:

[Read Your Submission →]  {{ params.VOICE_URL }}

Thank you for being part of this conversation — whether you support 
the change, have concerns, or are still deciding. Every perspective 
makes this a better, more honest discussion.

Share your perspective with others:
[Share on Twitter →]  {{ params.TWITTER_SHARE_URL }}
[Share on Facebook →]  {{ params.FACEBOOK_SHARE_URL }}

— The Confluence Ohio Team
```

### 5.3 Rejection Notification (`VOICE_REJECTED`)

| Field | Value |
|-------|-------|
| Subject | `About your Confluence Ohio submission` |
| Preview text | `We weren't able to publish your submission as written.` |

```
{{ params.DISPLAY_NAME }},

Thank you for taking the time to share your perspective. Unfortunately, 
we weren't able to publish your submission as written.

Reason: {{ params.REJECTION_REASON }}

{{ params.MODERATOR_NOTE }}

We welcome perspectives from all positions — support, opposition, and 
undecided. Our community guidelines ask that submissions be:

• On-topic (related to the question of renaming Columbus)
• Respectful (no personal attacks, hate speech, or threats)
• Original (your own words, not copied from another source)

You're welcome to submit a revised perspective that meets these 
guidelines:

[Submit Again →]  https://confluenceohio.org/voices/share

If you believe this decision was made in error, you can reply to this 
email and a human moderator will review your submission again.

— The Confluence Ohio Team
```

**Rejection reason mapping:**

| Dropdown value | Email text |
|---------------|------------|
| Off-topic | "Your submission didn't appear to be about the question of renaming Columbus." |
| Personal attack | "Your submission contained language that targeted specific individuals." |
| Hate speech | "Your submission contained language that violates our hate speech guidelines." |
| Spam | "Your submission appeared to be spam or commercial content." |
| AI-generated | "Your submission appeared to be AI-generated rather than a personal perspective." |
| Other | (Uses the admin's custom note) |

### 5.4 Edit Notification (`VOICE_EDITED`)

| Field | Value |
|-------|-------|
| Subject | `A small edit was made to your Confluence Ohio submission` |
| Preview text | `We made a minor correction. No action needed.` |

```
{{ params.DISPLAY_NAME }},

We made a small editorial correction to your published submission 
(e.g., a typo fix or formatting adjustment). The substance of your 
perspective has not been changed.

Edit note from our team: {{ params.EDIT_NOTE }}

You can review the current version here:
[View Your Submission →]  {{ params.VOICE_URL }}

If you have any concerns about the edit, reply to this email.

— The Confluence Ohio Team
```

### 5.5 Email Template Summary

| Template ID | Trigger | Recipient |
|-------------|---------|-----------|
| `VOICE_EMAIL_VERIFY` | Form submission | Author |
| `VOICE_APPROVED` | Admin approve or AI auto-approve | Author |
| `VOICE_REJECTED` | Admin reject or AI auto-reject | Author |
| `VOICE_EDITED` | Admin edits published submission | Author |
| `VOICE_ADMIN_DIGEST` | Daily cron (9 AM ET) | All admin_users |

---

## 6. Inngest Events and Functions

### 6.1 Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `voice/submitted` | `{ submission: VoiceSubmission }` | Email verification completed |
| `voice/auto-approved` | `{ submissionId: string }` | AI approves with high confidence |
| `voice/needs-review` | `{ submissionId: string, aiResult: AiModerationResult }` | AI flags for human review |
| `voice/ai-rejected` | `{ submissionId: string, aiResult: AiModerationResult }` | AI rejects with high confidence |
| `voice/human-approved` | `{ submissionId: string, adminId: string }` | Admin approves |
| `voice/human-rejected` | `{ submissionId: string, adminId: string, reason: string }` | Admin rejects |
| `voice/featured` | `{ submissionId: string }` | Admin features a voice |
| `voice/edited` | `{ submissionId: string, adminId: string, editNote: string }` | Admin edits published voice |

### 6.2 Functions

| Function ID | Trigger | Description |
|-------------|---------|-------------|
| `voice-ai-moderation` | `voice/submitted` | Runs Claude Haiku moderation, routes to next step |
| `voice-auto-approve-notify` | `voice/auto-approved` | Sends approval email, increments metric, revalidates pages |
| `voice-rejection-notify` | `voice/ai-rejected` or `voice/human-rejected` | Sends rejection email with reason |
| `voice-approval-notify` | `voice/human-approved` | Sends approval email, increments metric, revalidates pages |
| `voice-edit-notify` | `voice/edited` | Sends edit notification email |
| `voice-admin-digest` | Cron `0 13 * * *` | Daily digest of pending reviews |
| `voice-cleanup-unverified` | Cron `0 5 * * *` (1 AM ET) | Deletes submissions with `pending_email` status older than 72 hours |

---

## 7. API Routes

### 7.1 Route Summary

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/voices/submit` | Public (Turnstile) | Submit a new voice (creates pending_email record) |
| GET | `/api/voices/verify` | Public (token) | Verify email, advance to moderation |
| GET | `/api/voices` | Public | Fetch approved voices (paginated, filterable) |
| GET | `/api/voices/[slug]` | Public | Fetch single approved voice by slug |
| GET | `/api/voices/featured` | Public | Fetch featured voices (max 6) |
| GET | `/api/admin/voices` | Admin | Fetch all voices (any status, filterable) |
| GET | `/api/admin/voices/[id]` | Admin | Fetch single voice with full detail + moderation log |
| PATCH | `/api/admin/voices/[id]/approve` | Admin | Approve a submission |
| PATCH | `/api/admin/voices/[id]/reject` | Admin | Reject with reason |
| PATCH | `/api/admin/voices/[id]/feature` | Admin | Toggle featured status |
| PATCH | `/api/admin/voices/[id]/edit` | Admin | Edit title/body with audit trail |
| POST | `/api/admin/voices/bulk` | Admin | Bulk approve/reject |
| GET | `/api/admin/voices/export` | Admin | CSV export |

### 7.2 Submission API (`POST /api/voices/submit`)

**Request body:**

```typescript
interface VoiceSubmitRequest {
  author_name: string;        // 2-60 chars
  author_email: string;       // Valid email
  author_neighborhood?: string; // Max 100 chars
  position: 'support' | 'oppose' | 'undecided';
  title?: string;             // Max 100 chars
  body: string;               // 50-2500 chars
  guidelines_accepted: boolean; // Must be true
  cf_turnstile_response: string; // Turnstile token
  website?: string;           // Honeypot (must be empty)
  form_loaded_at: number;     // Unix timestamp ms
}
```

**Server-side flow:**

```
1. Validate request body (zod schema)
2. Check honeypot field (reject if populated)
3. Validate Turnstile token
4. Check time-on-page (reject if < 30 seconds)
5. Check email rate limit (1 per 24h)
6. Check IP rate limit (5 per hour)
7. Generate slug from title or body
8. Generate email verification token
9. Insert into voice_submissions (status: pending_email)
10. Send verification email via Brevo
11. Return { success: true, message: "Check your email to verify..." }
```

**Response (always 200 to avoid leaking validation state to bots):**

```json
{
  "success": true,
  "message": "Thanks! Check your email to verify your submission."
}
```

Even if the honeypot is triggered or rate limit is hit, return the same success response shape. Log the rejection reason server-side for monitoring.

### 7.3 Verification API (`GET /api/voices/verify`)

**Query params:** `?token={raw_token}`

**Flow:**

```
1. Hash the raw token with SHA-256
2. Look up voice_submissions where email_token_hash = hashed_token
3. Check token hasn't expired (email_token_expires > now())
4. Check submission still exists and is in pending_email status
5. Update: email_verified = true, moderation_status = 'pending'
6. Fire Inngest event: voice/submitted
7. Redirect to /voices/share/confirmed (success page)
```

**Error cases:**
- Invalid/expired token → redirect to `/voices/share/expired` with "Your verification link has expired. Please submit again." message
- Already verified → redirect to `/voices/share/confirmed` (idempotent)

---

## 8. Component Architecture

### 8.1 Client Components

```
apps/web/
├── app/
│   ├── voices/
│   │   ├── page.tsx                    // Voices landing (server component)
│   │   ├── [slug]/
│   │   │   └── page.tsx                // Individual voice (server component)
│   │   └── share/
│   │       ├── page.tsx                // Submission form (client component wrapper)
│   │       ├── confirmed/
│   │       │   └── page.tsx            // "Check your email" confirmation
│   │       └── expired/
│   │           └── page.tsx            // "Link expired" page
│   ├── admin/
│   │   └── voices/
│   │       ├── page.tsx                // Moderation queue
│   │       └── [id]/
│   │           └── page.tsx            // Individual review
│   └── api/
│       ├── voices/
│       │   ├── submit/route.ts         // POST: submit voice
│       │   ├── verify/route.ts         // GET: verify email
│       │   ├── route.ts                // GET: public voice list
│       │   ├── featured/route.ts       // GET: featured voices
│       │   └── [slug]/route.ts         // GET: single voice
│       └── admin/
│           └── voices/
│               ├── route.ts            // GET: admin voice list
│               ├── bulk/route.ts       // POST: bulk actions
│               ├── export/route.ts     // GET: CSV export
│               └── [id]/
│                   ├── route.ts        // GET: full detail
│                   ├── approve/route.ts // PATCH
│                   ├── reject/route.ts  // PATCH
│                   ├── feature/route.ts // PATCH
│                   └── edit/route.ts    // PATCH

packages/core/
├── voices/
│   ├── types.ts                        // VoiceSubmission, ModerationResult types
│   ├── validation.ts                   // Zod schemas for submission
│   ├── slug.ts                         // Slug generation utility
│   └── moderation.ts                   // AI moderation port + prompt constants
```

### 8.2 Shared UI Components

```
packages/ui/
├── VoiceCard.tsx                       // Grid card (position badge, excerpt, author)
├── VoiceFeatured.tsx                   // Large featured voice card
├── VoiceGrid.tsx                       // Grid with filter tabs + pagination
├── VoicePositionBadge.tsx              // Color-coded position badge
├── VoiceSubmissionForm.tsx             // Full submission form with validation
├── VoiceShareButtons.tsx               // Share buttons for individual voice page
├── ModerationStatusBadge.tsx           // Admin status badge
└── ModerationQueue.tsx                 // Admin queue table component
```

---

## 9. Claude Code Handoff

### Handoff Prompt 10A: Voice Submission Form and API

```
Build the community voice submission form and its API route for the 
Confluence Ohio campaign.

Context: This is a curated community perspectives feature where people 
share their views on renaming Columbus to Confluence. All positions 
(support, oppose, undecided) are welcome. Submissions require email 
verification before entering a moderation queue.

Read these artifacts for full specifications:
- 10-community-voices-feature.md §1 (Submission Form)
- 10-community-voices-feature.md §7.2-7.3 (API Routes)
- 05-data-model.md §3.4 (voice_submissions table)

Files to generate:

1. `packages/core/voices/types.ts` — TypeScript types:
   - VoiceSubmission (matching voice_submissions table)
   - VoiceSubmitRequest (form input)
   - VoicePosition ('support' | 'oppose' | 'undecided')
   - ModerationStatus (full enum including 'pending_email')
   - AiModerationResult ({ decision, confidence, reasoning, flagged_issues })

2. `packages/core/voices/validation.ts` — Zod schemas:
   - voiceSubmitSchema: validates all form fields per §1.2
   - Position radio must map: "I support renaming" → 'support', 
     "I have concerns" → 'oppose', "I'm still deciding" → 'undecided'
   - Body: 50-2500 chars. Title: max 100 chars. Author name: 2-60 chars.

3. `packages/core/voices/slug.ts` — Slug generator:
   - Input: title (optional) + body
   - If title exists, slugify title; else slugify first 6 words of body
   - Lowercase, hyphens, strip special chars, append 4-char random hex
   - Example: "the-rivers-were-here-first-a7b3"

4. `apps/web/app/voices/share/page.tsx` — Submission form page:
   - Community guidelines displayed above form (see §1.3 for exact text)
   - All fields per §1.2 with the warm radio label language
   - Hidden honeypot field per §1.4 Layer 2
   - Cloudflare Turnstile widget (invisible mode)
   - form_loaded_at hidden timestamp per §1.4 Layer 3
   - Live character count on textarea
   - Progressive enhancement: works as standard HTML form POST without JS
   - Mobile-first, single-column, max-width 640px

5. `apps/web/app/api/voices/submit/route.ts` — POST handler:
   - Full validation pipeline per §7.2 (10-step flow)
   - Turnstile server-side validation via siteverify endpoint
   - Honeypot check (silent reject with fake success)
   - Time-on-page check (< 30s = reject)
   - Email rate limit: 1 submission per email per 24h
   - IP rate limit: 5 per hour (use @upstash/ratelimit or in-memory)
   - Generate slug via slug utility
   - Generate email verification token (crypto.randomUUID, SHA-256 hash)
   - Insert with moderation_status = 'pending_email'
   - Send verification email via Brevo adapter (template VOICE_EMAIL_VERIFY)
   - Always return 200 with success message (never leak validation state)

6. `apps/web/app/api/voices/verify/route.ts` — GET handler:
   - Accept ?token= query param
   - Hash token, look up matching submission
   - Validate not expired (72h) and still pending_email
   - Mark email_verified = true, advance to 'pending'
   - Fire Inngest event 'voice/submitted'
   - Redirect to /voices/share/confirmed

7. `apps/web/app/voices/share/confirmed/page.tsx` — Success page:
   - "Your submission is being reviewed"
   - "Most perspectives are reviewed within 48 hours."
   - Link back to /voices

8. `apps/web/app/voices/share/expired/page.tsx` — Expired token page:
   - "Your verification link has expired."
   - "Please submit your perspective again."
   - Link to /voices/share

Data model addendum: Add email_verified (boolean), email_token_hash (text), 
email_token_expires (timestamptz) columns to voice_submissions. Add 
'pending_email' value to moderation_status enum before 'pending'.

Use Supabase service_role key for all database writes (bypass RLS).
Use the Brevo email adapter from packages/email for sending.
Use Turnstile secret key from process.env.TURNSTILE_SECRET_KEY.
```

### Handoff Prompt 10B: AI Moderation Pipeline

```
Build the AI moderation pipeline for community voice submissions using 
Claude Haiku 4.5 and Inngest.

Context: When a voice submission's email is verified, the Inngest event 
'voice/submitted' fires. This triggers an AI moderation step that 
classifies the submission as approve/reject/flag_for_review. The system 
fails open — errors route to human review, never silent discard.

Read these artifacts:
- 10-community-voices-feature.md §2 (Moderation Workflow)
- 10-community-voices-feature.md §6 (Inngest Events/Functions)
- 05-data-model.md §3.4 and §3.10 (voice_submissions, moderation_log)

Files to generate:

1. `packages/core/voices/moderation.ts` — Moderation constants and types:
   - MODERATION_SYSTEM_PROMPT (exact text from §2.2)
   - formatSubmissionForModeration() function
   - mapAiDecisionToStatus() function
   - AiModerationResult type

2. `apps/web/inngest/functions/voice-ai-moderation.ts`:
   - Triggered by 'voice/submitted'
   - Calls Claude Haiku 4.5 (model: 'claude-haiku-4-5-20251001')
   - max_tokens: 256, expects JSON response
   - Parse AI result, update voice_submissions status
   - Insert moderation_log entry
   - Route: approve → fire 'voice/auto-approved'
           flag_for_review → fire 'voice/needs-review'
           reject (confidence ≥ 0.90) → fire 'voice/ai-rejected'
           reject (confidence < 0.90) → set needs_review, fire 'voice/needs-review'
           error → set needs_review, log error
   - 2 retries on failure

3. `apps/web/inngest/functions/voice-auto-approve-notify.ts`:
   - Triggered by 'voice/auto-approved'
   - Send VOICE_APPROVED email to author
   - Increment voice_submission_count in campaign_metrics
   - Call revalidatePath('/voices')

4. `apps/web/inngest/functions/voice-rejection-notify.ts`:
   - Triggered by 'voice/ai-rejected' OR 'voice/human-rejected'
   - Send VOICE_REJECTED email with rejection reason mapping per §5.3
   - AI rejections use the AI reasoning as the moderator note

5. `apps/web/inngest/functions/voice-admin-digest.ts`:
   - Cron: '0 13 * * *' (9 AM ET / 1 PM UTC)
   - Query needs_review submissions
   - Count auto-approved in last 24h
   - Send VOICE_ADMIN_DIGEST email to all admin_users
   - Skip sending if no pending submissions

6. `apps/web/inngest/functions/voice-cleanup-unverified.ts`:
   - Cron: '0 5 * * *' (1 AM ET / 5 AM UTC)
   - Delete voice_submissions where moderation_status = 'pending_email' 
     AND email_token_expires < now()
   - Log count of deleted records

Use Anthropic SDK (@anthropic-ai/sdk). Wrap the AI call in step.run() 
for Inngest retry/observability. Use supabaseAdmin (service_role) for 
all database operations.
```

### Handoff Prompt 10C: Public Voices Pages

```
Build the public-facing community voices pages: the landing page 
(/voices), individual voice page (/voices/[slug]), and the public 
API routes that serve them.

Context: The voices feature shows a curated, two-column conversation 
about renaming Columbus. All approved submissions are public. Featured 
voices appear prominently. The layout communicates that this is a 
genuine two-sided discussion.

Read these artifacts:
- 10-community-voices-feature.md §3 (Public Display)
- 04-page-copy.md §8 (Voices page copy)
- 10-community-voices-feature.md §7.1 (API routes)

Files to generate:

1. `packages/ui/VoicePositionBadge.tsx`:
   - Props: position ('support' | 'oppose' | 'undecided')
   - Support: green (#16a34a), "Supports renaming", ✓ icon
   - Oppose: amber (#d97706), "Has concerns", — icon
   - Undecided: blue (#2563eb), "Still deciding", ? icon

2. `packages/ui/VoiceCard.tsx`:
   - Props: voice (approved submission data)
   - Shows: position badge, title or first line, 150-char excerpt, 
     author name, neighborhood
   - Links to /voices/{slug}

3. `packages/ui/VoiceFeatured.tsx`:
   - Larger card variant for featured voices
   - Full excerpt (not truncated), author quote styling
   - "Example" badge overlay when isExample=true

4. `packages/ui/VoiceGrid.tsx`:
   - Filter tabs: All | Support | Have Concerns | Undecided
   - Two-column layout on desktop (≥1024px): left = support, right = oppose
   - Below columns: undecided in single column
   - Mobile: single column with tab filtering
   - URL parameter sync (?position=support)
   - "Load more" pagination (20 per page)
   - Works without JS (falls back to page param pagination)

5. `apps/web/app/voices/page.tsx` — Voices landing:
   - Server component with ISR (revalidate: 60)
   - Fetch featured voices from /api/voices/featured
   - Fetch paginated voices from /api/voices
   - Sections: Hero, Introduction, Featured Voices, Filter+Grid, 
     Share CTA, Mini petition counter
   - Empty state: fictional examples with "Example" badge per 
     Artifact 04 §8

6. `apps/web/app/voices/[slug]/page.tsx` — Individual voice:
   - Server component with ISR (revalidate: 60)
   - generateStaticParams from approved voices
   - generateMetadata: title, description, OG tags, Article JSON-LD
   - Layout per §3.3: badge, title, author line, body, share buttons, 
     back link, CTA
   - Body rendering: plain text → paragraphs, XSS-safe, no raw HTML

7. `packages/ui/VoiceShareButtons.tsx`:
   - Share buttons: Twitter, Facebook, WhatsApp, Copy Link
   - Pre-populated text: "Read this perspective on renaming Columbus: {url}"
   - Use Web Share API on mobile where available, fall back to 
     platform-specific share URLs

8. `apps/web/app/api/voices/route.ts` — Public voice list:
   - GET with query params: ?position=support&page=1&limit=20
   - Returns only approved/auto_approved voices
   - Paginated response with total count

9. `apps/web/app/api/voices/featured/route.ts` — Featured voices:
   - GET, returns up to 6 featured + approved voices
   - Ordered by featured_at or approved_at DESC

10. `apps/web/app/api/voices/[slug]/route.ts` — Single voice:
    - GET by slug, returns full voice data if approved
    - 404 if not found or not approved

SEO requirements per §3.3: unique title tags, meta descriptions from 
first 155 chars, Article JSON-LD schema. Use Next.js generateMetadata.
```

### Handoff Prompt 10D: Admin Moderation Interface

```
Build the admin moderation interface for community voice submissions.

Context: Admins review AI-moderated voice submissions. The interface 
shows a filterable queue, individual submission detail views, and 
supports approve/reject/feature/edit actions with full audit trail.

Read these artifacts:
- 10-community-voices-feature.md §4 (Admin Controls)
- 10-community-voices-feature.md §7.1 (Admin API routes)
- 05-data-model.md §3.4, §3.7, §3.10 (voice_submissions, admin_users, moderation_log)

Files to generate:

1. `packages/ui/ModerationStatusBadge.tsx`:
   - Color-coded badge for all moderation_status values
   - pending_email: gray, pending: yellow, needs_review: orange, 
     auto_approved: light green, approved: green ✓, rejected: red

2. `packages/ui/ModerationQueue.tsx`:
   - Table component with columns per §4.2
   - Row selection for bulk actions
   - Inline action buttons: [Approve] [Reject] [View]
   - AI decision column with confidence % and flagged issues tooltip
   - Sortable by submitted_at, position, AI confidence

3. `apps/web/app/admin/voices/page.tsx` — Queue page:
   - Protected by admin auth (check admin_users table)
   - Sidebar/top filters: status, position, date range, search
   - ModerationQueue component with data fetching
   - Bulk action bar (appears when rows selected)
   - Bulk confirmation modal

4. `apps/web/app/admin/voices/[id]/page.tsx` — Detail page:
   - Full submission view per §4.3
   - Author info, AI moderation result, full body text
   - Moderation log timeline
   - Action buttons: Approve, Reject (with reason dropdown + note), 
     Feature toggle, Edit (with reason field)
   - Reject requires selecting a reason from dropdown per §5.3 mapping

5. Admin API routes (all require admin auth middleware):

   a. `apps/web/app/api/admin/voices/route.ts` — GET: 
      filterable list of all submissions (any status)
   
   b. `apps/web/app/api/admin/voices/[id]/route.ts` — GET: 
      full detail including moderation_log join
   
   c. `apps/web/app/api/admin/voices/[id]/approve/route.ts` — PATCH:
      Set approved, log human_approve, fire 'voice/human-approved' event,
      send approval email, increment metric, revalidate paths
   
   d. `apps/web/app/api/admin/voices/[id]/reject/route.ts` — PATCH:
      Require rejection_reason + optional note
      Set rejected, log human_reject, fire 'voice/human-rejected' event
   
   e. `apps/web/app/api/admin/voices/[id]/feature/route.ts` — PATCH:
      Toggle featured boolean, warn if > 6 featured voices
      Revalidate /voices
   
   f. `apps/web/app/api/admin/voices/[id]/edit/route.ts` — PATCH:
      Accept new title/body + edit_reason
      Preserve original in moderation_log metadata
      Send VOICE_EDITED email to author
      Revalidate voice pages
   
   g. `apps/web/app/api/admin/voices/bulk/route.ts` — POST:
      Accept { action: 'approve'|'reject', ids: string[], reason?: string }
      Process sequentially, fire events for each
   
   h. `apps/web/app/api/admin/voices/export/route.ts` — GET:
      CSV export with streaming response
      Respects current filter params

Admin auth middleware: check Supabase Auth session, then verify user 
exists in admin_users table. Return 401/403 if not authenticated/authorized.
Same pattern as Artifact 08 volunteer admin.
```

### Handoff Prompt 10E: Brevo Email Templates for Voices

```
Create the Brevo email templates for the community voices feature.

Context: The voices feature sends 5 types of transactional emails. 
All templates use Brevo's transactional API with template params.

Read these artifacts:
- 10-community-voices-feature.md §5 (Email Notifications)
- 07-email-automation.md §6 (template design patterns, Brevo conventions)

Files to generate:

1. templates/voice-email-verify.html — VOICE_EMAIL_VERIFY
   - Subject: "Verify your Confluence Ohio submission"
   - Preview: "One click to confirm — then we'll review your perspective."
   - Params: DISPLAY_NAME, VERIFY_URL
   - Simple, single-CTA layout matching campaign brand

2. templates/voice-approved.html — VOICE_APPROVED
   - Subject: "Your perspective is live on Confluence Ohio"
   - Preview: "Thanks for sharing your voice, {{ params.DISPLAY_NAME }}."
   - Params: DISPLAY_NAME, VOICE_URL, TWITTER_SHARE_URL, FACEBOOK_SHARE_URL
   - Includes social share buttons

3. templates/voice-rejected.html — VOICE_REJECTED
   - Subject: "About your Confluence Ohio submission"
   - Preview: "We weren't able to publish your submission as written."
   - Params: DISPLAY_NAME, REJECTION_REASON, MODERATOR_NOTE
   - Community guidelines reminder
   - CTA to resubmit at /voices/share

4. templates/voice-edited.html — VOICE_EDITED
   - Subject: "A small edit was made to your Confluence Ohio submission"
   - Preview: "We made a minor correction. No action needed."
   - Params: DISPLAY_NAME, EDIT_NOTE, VOICE_URL
   - Reassuring, light tone

5. templates/voice-admin-digest.html — VOICE_ADMIN_DIGEST
   - Subject: "Voices digest: {{ params.PENDING_COUNT }} submissions need review"
   - Params: PENDING_COUNT, AUTO_APPROVED_COUNT, SUBMISSIONS (array), ADMIN_URL
   - Table layout: each pending submission with author, position, title, 
     excerpt, AI decision, confidence, link to review
   - CTA: "Review Submissions →" linking to admin queue

6. Update packages/email/template-ids.ts to add all VOICE_* template 
   constants following the pattern from Artifact 07 §6.

Match the email design patterns (header, footer, unsubscribe, campaign 
branding) from the welcome sequence templates in Artifact 07.
```

### Handoff Prompt 10F: Database Migration for Voices Addendum

```
Create the Supabase migration for the voice_submissions table addendum 
required by the community voices feature.

Context: The voice_submissions table from Artifact 05 needs three 
additional columns and one new enum value to support the email 
verification gate before moderation.

Read: 10-community-voices-feature.md §1.6

Generate: `packages/db/migrations/XXXXXX_voice_email_verification.sql`

SQL:

1. Add 'pending_email' to moderation_status enum:
   ALTER TYPE moderation_status ADD VALUE 'pending_email' BEFORE 'pending';

2. Add columns to voice_submissions:
   ALTER TABLE voice_submissions ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
   ALTER TABLE voice_submissions ADD COLUMN email_token_hash text;
   ALTER TABLE voice_submissions ADD COLUMN email_token_expires timestamptz;

3. Add index for cleanup job:
   CREATE INDEX idx_voices_pending_email_cleanup 
     ON voice_submissions (email_token_expires) 
     WHERE moderation_status = 'pending_email';

4. Add voice_submission_count trigger update to fire on status change 
   to 'approved' or 'auto_approved' (not on insert — only when moderation 
   completes):
   
   CREATE OR REPLACE FUNCTION update_voice_count_on_approval()
   RETURNS trigger
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     IF OLD.moderation_status NOT IN ('approved', 'auto_approved') 
        AND NEW.moderation_status IN ('approved', 'auto_approved') THEN
       UPDATE campaign_metrics SET value = value + 1, recorded_at = now()
       WHERE metric = 'voice_submission_count';
     END IF;
     RETURN NEW;
   END;
   $$;

   CREATE TRIGGER on_voice_approval
     AFTER UPDATE OF moderation_status ON voice_submissions
     FOR EACH ROW
     EXECUTE FUNCTION update_voice_count_on_approval();

This migration is additive — it does not modify existing data or drop 
any columns. Safe to run against a production database.
```

---

## 10. Accessibility Requirements

- All form fields have associated `<label>` elements (not placeholder-only)
- Error messages are announced via `aria-live="polite"` regions
- Position radio group uses `<fieldset>` + `<legend>`
- Character count on textarea is associated via `aria-describedby`
- Voice grid cards are keyboard-navigable (`<a>` or `role="link"`)
- Position badges use `aria-label` for screen readers (not color-only)
- Admin moderation queue is a proper `<table>` with `<th scope="col">`
- Bulk action checkboxes have `aria-label="Select submission by {author_name}"`
- Focus management: after form submission, focus moves to the success/error message
- All interactive elements have visible focus indicators (minimum 2px outline)
- Color contrast: all badge text meets WCAG 2.1 AA (4.5:1 ratio minimum)

---

## 11. Testing Checklist

**Submission form:**
- [ ] Valid submission creates pending_email record
- [ ] Honeypot rejection returns fake success
- [ ] Turnstile invalid token is rejected
- [ ] Submissions < 30 seconds are rejected
- [ ] Duplicate email within 24h is rejected with friendly message
- [ ] IP rate limit (5/hour) triggers on 6th attempt
- [ ] Form works without JavaScript (progressive enhancement)
- [ ] Character count displays and enforces limits

**Email verification:**
- [ ] Valid token advances status to pending and fires voice/submitted
- [ ] Expired token redirects to /voices/share/expired
- [ ] Already-verified token is idempotent (no error)
- [ ] Unverified submissions are cleaned up after 72 hours

**AI moderation:**
- [ ] Respectful support submission → auto_approved
- [ ] Respectful opposition submission → auto_approved (NOT rejected for disagreeing)
- [ ] Submission with personal attack → rejected or needs_review
- [ ] Borderline submission → needs_review
- [ ] API error → needs_review (fail open)
- [ ] Low-confidence rejection (< 0.90) → needs_review

**Public pages:**
- [ ] /voices shows only approved + auto_approved submissions
- [ ] Filter tabs work (URL params sync)
- [ ] Two-column layout on desktop, single column on mobile
- [ ] Individual voice page renders body safely (no XSS)
- [ ] Featured voices appear in featured section
- [ ] Empty state shows example voices with badges
- [ ] SEO: correct meta tags, JSON-LD, OG tags

**Admin:**
- [ ] Non-admin users get 401/403
- [ ] Approve action sends email, increments metric, revalidates pages
- [ ] Reject action requires reason, sends email
- [ ] Edit preserves original in moderation_log
- [ ] Bulk actions process correctly with confirmation
- [ ] Export generates valid CSV
- [ ] Feature toggle works, warns above 6
