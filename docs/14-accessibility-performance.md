# Confluence Ohio — Accessibility and Performance Standards

**Artifact 14 · Prompt 14 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 02 (Site Architecture), Artifact 04 (Page Copy), Artifact 06 (Petition Signing Flow), Artifact 08 (Volunteer Sign-Up), Artifact 10 (Community Voices)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **WCAG 2.2 forward-targeting.** ✅ **Confirmed.** Target WCAG 2.1 AA as the compliance floor, implement the four WCAG 2.2 AA additions (Focus Not Obscured 2.4.11, Focus Appearance 2.4.12 partial, Dragging Movements 2.5.7, Target Size minimum 2.5.8) where they apply. This future-proofs against the EU's European Accessibility Act (EAA, in force since June 2025) at near-zero additional cost.

2. **Color palette.** ✅ **Implementation proposes one.** No finalized brand palette exists yet. The Claude Code implementation should propose a color palette based on research into civic campaign aesthetics and the "confluence" / rivers theme, ensuring all text/background combinations meet WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text) from the start. The palette proposal should be included in the first visual implementation handoff.

3. **Screen reader testing devices.** ✅ **BrowserStack as fallback for Windows/NVDA.** Primary manual testing uses VoiceOver + Safari (macOS/iOS). Windows/NVDA testing uses BrowserStack's screen reader testing feature. TalkBack + Chrome (Android) remains P2 recommended.

---

## 1. WCAG 2.1 AA Compliance Checklist

This checklist covers every success criterion relevant to the Confluence Ohio site, organized by the four WCAG principles. Each item maps to a specific WCAG success criterion and identifies where in the codebase it applies.

---

### 1.1 Perceivable

#### 1.1.1 Non-Text Content (SC 1.1.1)

| Requirement | Applies To | Implementation |
|---|---|---|
| All `<img>` elements have meaningful `alt` text | Blog images, campaign photos, partner logos | `alt` prop required in all `<Image>` components; ESLint rule `jsx-a11y/alt-text` enforces |
| Decorative images use `alt=""` and `role="presentation"` | Background textures, separator lines | Code review guideline; ESLint flags missing `alt` |
| Icon-only buttons have accessible labels | Social share buttons (Artifact 11), mobile menu toggle, close buttons | `aria-label` on every icon-only `<button>`; lint rule `jsx-a11y/anchor-has-content` |
| SVG icons include `<title>` or `aria-hidden="true"` with adjacent text | Lucide icons throughout | Wrapper component provides `aria-hidden` by default, explicit `<title>` when icon is informational |
| Signature counter (live) is screen-reader accessible | Homepage hero, `/sign` page (Artifact 06 §1.2) | Counter wrapped in `aria-live="polite"` region with descriptive text: "[X] Ohioans have signed" |
| Turnstile invisible widget produces no unlabeled elements | `/sign`, `/voices/share` (Artifacts 06, 10) | Turnstile renders in a `div` with `aria-hidden="true"`; the actual form submission is the interactive element |

#### 1.2.1–1.2.5 Time-Based Media

Not applicable at launch — no video or audio content. If embedded media is added (campaign videos, podcast player), the following are required: captions (1.2.2), audio descriptions or alternative (1.2.3), and live captions for any streamed content (1.2.4).

#### 1.3.1 Info and Relationships (SC 1.3.1)

| Requirement | Applies To | Implementation |
|---|---|---|
| Heading hierarchy is logical and sequential (`h1` → `h2` → `h3`) | All pages | One `<h1>` per page. `eslint-plugin-jsx-a11y/heading-has-content` enforces. Manual audit per page. |
| Form fields use `<label>` elements (not just placeholders) | Petition form (Artifact 06 §1.3), volunteer form (Artifact 08 §2), voices form (Artifact 10 §1.2) | Every `<input>` has an associated `<label>` with `htmlFor` matching `id`. Placeholders supplement but never replace labels. |
| Related form fields grouped with `<fieldset>` and `<legend>` | Volunteer role selection (radio group), voice position selection (radio group) | Radio groups wrapped in `<fieldset>` with descriptive `<legend>` |
| Data tables use `<th>`, `scope`, and `<caption>` | FAQ page (if table layout), blog metadata | Semantic table markup. No tables for layout. |
| Lists use `<ul>`/`<ol>`/`<li>` | Navigation, "How It Works" steps (Artifact 04 §1), FAQ list | Semantic list elements, never `<div>` sequences |

#### 1.3.2 Meaningful Sequence (SC 1.3.2)

The DOM order matches the visual order on all pages. This is particularly critical for:
- `/sign` page: On desktop, the two-column layout (form left, counter right) must read form-first in DOM order. CSS Grid/Flexbox handles visual arrangement without reordering DOM. Verified in Artifact 06 §1.2.
- Homepage sections: DOM order follows scroll order (hero → 30-second case → how it works → featured voice → counter → footer CTA).

#### 1.3.3 Sensory Characteristics (SC 1.3.3)

No instructions rely solely on shape, size, visual location, or orientation. Form errors identify the field by name ("Please enter a valid email address"), not by position ("the field above").

#### 1.3.4 Orientation (SC 1.3.4)

No page locks to portrait or landscape. CSS uses responsive breakpoints (Artifact 06 §1.2: mobile <768px, tablet 768–1023px, desktop ≥1024px) without orientation restrictions.

#### 1.3.5 Identify Input Purpose (SC 1.3.5)

All form fields that collect personal data include `autocomplete` attributes:

| Field | `autocomplete` Value | Form |
|---|---|---|
| First Name | `given-name` | Petition (Artifact 06 §1.3), Volunteer (Artifact 08 §2) |
| Last Name | `family-name` | Petition, Volunteer |
| Email | `email` | Petition, Volunteer, Voices, Email signup |
| Street Address | `street-address` | Petition |
| ZIP | `postal-code` | Petition |

#### 1.4.1 Use of Color (SC 1.4.1)

Color is never the sole means of conveying information:
- Form validation errors use red color AND an error icon AND text description
- Verification status badges (Artifact 06: verified/flagged/rejected) use color AND text labels AND distinct icons
- Petition progress bar includes percentage text alongside the filled bar

#### 1.4.2 Audio Control

No auto-playing audio. Not applicable at launch.

#### 1.4.3 Contrast Minimum (SC 1.4.3)

| Element Type | Minimum Ratio | Measurement |
|---|---|---|
| Body text, form labels, error messages | 4.5:1 | Against immediate background |
| Large text (≥18pt or ≥14pt bold) — headings, CTAs | 3:1 | Against immediate background |
| Placeholder text | 4.5:1 | Often fails — we set placeholder contrast explicitly rather than using browser defaults |
| Link text (non-underlined) | 3:1 against surrounding text + 4.5:1 against background | Links within paragraphs must be distinguishable by more than just color |

**Enforcement:** Contrast checked in design tokens. Storybook accessibility addon runs axe-core on every component story. CI catches regressions.

#### 1.4.4 Resize Text (SC 1.4.4)

Text resizable to 200% without loss of content or functionality. Implementation: all font sizes in `rem` or `em`, never `px` for text. Layout uses flexible containers. Verified via browser zoom testing (Ctrl+/Cmd+ to 200%).

#### 1.4.5 Images of Text (SC 1.4.5)

No images of text. All text is rendered as HTML text. The campaign logo, if it includes text, also has an adjacent text alternative.

#### 1.4.10 Reflow (SC 1.4.10)

Content reflows at 320px viewport width (equivalent to 400% zoom on 1280px) without horizontal scrolling. The mobile-first design (Artifact 06 §1.2) naturally handles this — all layouts collapse to single-column at narrow widths.

#### 1.4.11 Non-Text Contrast (SC 1.4.11)

| UI Element | Minimum Ratio | Examples |
|---|---|---|
| Form field borders | 3:1 against background | Petition address fields, volunteer form inputs |
| Focus indicators | 3:1 against adjacent colors | All interactive elements (see §1.5 Focus Styles below) |
| Icons conveying information | 3:1 against background | Verification status icons, step indicators |
| Custom checkboxes/radios | 3:1 against background | "Keep me updated" checkbox, voice position radios |

#### 1.4.12 Text Spacing (SC 1.4.12)

Content remains readable and functional when users apply custom text spacing (line height 1.5×, paragraph spacing 2×, letter spacing 0.12em, word spacing 0.16em). Implementation: no fixed-height containers that clip text. Tested via browser extension that overrides spacing.

#### 1.4.13 Content on Hover or Focus (SC 1.4.13)

Tooltips and hover content (e.g., Smarty autocomplete dropdown on `/sign`):
- Dismissable: ESC key closes the dropdown
- Hoverable: user can move pointer over the dropdown without it disappearing
- Persistent: content stays visible until user dismisses, moves focus, or the information is no longer valid

---

### 1.2 Operable

#### 2.1.1 Keyboard (SC 2.1.1)

Every interactive element is keyboard-operable:

| Component | Tab | Enter/Space | Escape | Arrow Keys |
|---|---|---|---|---|
| Navigation links | Focus in order | Activate | — | — |
| CTA buttons ("Sign the Petition") | Focus | Activate | — | — |
| Petition form fields | Focus in order | Submit (on last field) | — | — |
| Smarty autocomplete dropdown | Focus address field | Select suggestion | Close dropdown | Navigate suggestions |
| Volunteer role checkboxes | Focus each | Toggle | — | — |
| Voice position radio group | Focus group | Select | — | Navigate options |
| Mobile hamburger menu | Focus toggle | Open/close | Close | Navigate items |
| Modal dialogs (if any) | Trapped within | Activate focused element | Close modal | — |
| Social share buttons | Focus in order | Open share dialog | — | — |
| Blog post navigation | Focus in order | Navigate to post | — | — |
| "Back to top" link | Focus | Scroll to top | — | — |

#### 2.1.2 No Keyboard Trap (SC 2.1.2)

Focus is never trapped except in modal dialogs, where it is trapped by the `FocusTrap` component (§4.3) and releasable via ESC. The Smarty autocomplete dropdown does not trap focus — arrow keys navigate suggestions, ESC closes the dropdown and returns focus to the input.

#### 2.1.4 Character Key Shortcuts (SC 2.1.4)

No single-character keyboard shortcuts are used. All keyboard interactions require modifier keys or are triggered by standard keys (Tab, Enter, Space, Escape, Arrow keys).

#### 2.4.1 Bypass Blocks (SC 2.4.1)

`SkipLink` component (§4.1) renders as the first focusable element on every page. Targets `#main-content` on the `<main>` element.

#### 2.4.2 Page Titled (SC 2.4.2)

Every page has a unique, descriptive `<title>` (defined in Artifact 12 §1 meta tags):

| Page | Title Pattern |
|---|---|
| Homepage | Confluence Ohio — Rename Columbus to Confluence |
| /sign | Sign the Petition — Confluence Ohio |
| /the-case | Why Rename Columbus? — Confluence Ohio |
| /voices | Community Voices — Confluence Ohio |
| /volunteer | Volunteer — Confluence Ohio |
| /donate | Donate — Confluence Ohio |
| /blog/[slug] | [Post Title] — Confluence Ohio Blog |

#### 2.4.3 Focus Order (SC 2.4.3)

Tab order follows the visual reading order (left-to-right, top-to-bottom). No `tabindex` values greater than 0. Only `tabindex="0"` (to make non-interactive elements focusable when needed) and `tabindex="-1"` (for programmatic focus management, e.g., focusing the `<main>` element after skip link activation).

#### 2.4.4 Link Purpose (SC 2.4.4)

All links have descriptive text. No "click here" or "read more" without context. Blog post cards include the post title as the link text. "Read the Full Case →" is acceptable because the arrow is decorative and the text is descriptive.

#### 2.4.5 Multiple Ways (SC 2.4.5)

Users can reach content through: navigation menu, sitemap (`/sitemap.xml` + HTML sitemap at `/sitemap`), internal links, search (Phase 2 feature), and direct URL.

#### 2.4.6 Headings and Labels (SC 2.4.6)

All headings describe the topic or purpose of their section. Form labels describe the input's purpose. The petition form (Artifact 06 §1.3) uses explicit labels ("Street Address", "First Name") not ambiguous ones.

#### 2.4.7 Focus Visible (SC 2.4.7)

**Focus styles specification (applies globally):**

```css
/* Default focus style — applied to all interactive elements */
:focus-visible {
  outline: 3px solid var(--color-focus-ring); /* High-contrast ring */
  outline-offset: 2px;
  border-radius: 2px;
}

/* Remove default outline for mouse users — :focus-visible only fires on keyboard */
:focus:not(:focus-visible) {
  outline: none;
}
```

The focus ring color (`--color-focus-ring`) must achieve 3:1 contrast against both the element background and the page background. Recommended: a bright blue (`#1A73E8` or similar) that meets contrast on both light and dark surfaces.

---

### 1.3 Understandable

#### 3.1.1 Language of Page (SC 3.1.1)

All pages declare `<html lang="en">`. Next.js App Router: set in `app/layout.tsx`.

#### 3.1.2 Language of Parts (SC 3.1.2)

Any non-English text (Native American place names like "Scioto," "Olentangy") is marked with `lang` attributes where appropriate. For proper nouns that have been absorbed into English, `lang` tagging is not required.

#### 3.2.1 On Focus / 3.2.2 On Input (SC 3.2.1, 3.2.2)

No unexpected context changes on focus or input:
- Smarty autocomplete populates fields but does not submit the form
- Volunteer role checkbox selection does not navigate away
- Voice position radio selection does not trigger submission
- Form submission only occurs on explicit button press

#### 3.3.1 Error Identification (SC 3.3.1)

All form validation errors:
- Identify the specific field in error
- Describe the error in text (not just color)
- Are announced to screen readers via `aria-live="assertive"` (see `ErrorAnnouncer` component, §4.4)
- Appear inline adjacent to the field AND in a summary above the form

**Petition form error messages (from Artifact 06):**

| Validation Failure | Error Text |
|---|---|
| Empty required field | "[Field name] is required" |
| Invalid email format | "Please enter a valid email address" |
| Address not in Ohio | "We can only accept Ohio addresses for this petition" |
| Address verification failed | "We couldn't verify this address. Please check it and try again." |
| Duplicate signature (email) | "This email address has already signed the petition" |
| Turnstile failed | "Verification failed. Please refresh and try again." |

#### 3.3.2 Labels or Instructions (SC 3.3.2)

Form fields have visible `<label>` elements. Required fields marked with `*` and `aria-required="true"`. Helper text linked via `aria-describedby`:

```html
<label for="email">Email *</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-describedby="email-help"
  autocomplete="email"
/>
<span id="email-help" class="helper-text">
  Never displayed publicly. Used to verify your signature.
</span>
```

#### 3.3.3 Error Suggestion (SC 3.3.3)

When validation fails and the system can suggest a correction, it does:
- Smarty address verification: "Did you mean [corrected address]?" with accept/reject buttons
- Email format: "Please enter a valid email address (e.g., name@example.com)"

#### 3.3.4 Error Prevention — Legal, Financial, Data (SC 3.3.4)

The petition signature is a civic act with personal data implications:
- **Reviewable:** Confirmation screen summarizes the signer's information before final submission (Artifact 06 §3: "Review your information" step)
- **Reversible:** Users can request signature deletion via email (privacy policy)
- **Confirmed:** Final submission requires an explicit "Sign the Petition" button press

---

### 1.4 Robust

#### 4.1.1 Parsing (SC 4.1.1)

Deprecated in WCAG 2.2 (browsers are now required to handle malformed HTML). Still good practice: HTML validated, no duplicate IDs, proper nesting. JSX/TSX naturally enforces well-formed markup.

#### 4.1.2 Name, Role, Value (SC 4.1.2)

All custom components expose correct ARIA semantics:

| Custom Component | Semantic Requirement |
|---|---|
| Signature counter (animated number) | `role="status"`, `aria-live="polite"`, `aria-label="Petition signatures"` |
| Petition progress bar | `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="[goal]"`, `aria-label="Petition progress"` |
| Smarty autocomplete listbox | `role="listbox"` on dropdown, `role="option"` on each suggestion, `aria-activedescendant` for selection |
| Expandable FAQ items | `<details>`/`<summary>` (native) or `role="button"` + `aria-expanded` on trigger, `role="region"` on panel |
| Mobile navigation menu | `role="navigation"`, `aria-expanded` on toggle, `aria-label="Main navigation"` |
| Toast notifications (success/error) | Uses `ErrorAnnouncer` (§4.4) with `role="alert"`, `aria-live="assertive"` |
| Social share popover | `role="dialog"`, `aria-label="Share this page"`, focus trapped |

#### 4.1.3 Status Messages (SC 4.1.3)

Status messages that do not receive focus are announced to screen readers:

| Status Message | ARIA Pattern | Trigger |
|---|---|---|
| "Your signature has been recorded!" | `role="status"`, `aria-live="polite"` | Successful petition submission |
| "[X] Ohioans have signed" (counter update) | `aria-live="polite"` with debounced updates (max 1 announcement per 10 seconds) | Supabase Realtime counter update |
| "Submitting..." loading state | `aria-busy="true"` on form, `aria-live="polite"` announcement | Form submission in progress |
| Form validation error summary | `role="alert"`, `aria-live="assertive"` | Form submission with errors |
| "Your voice has been submitted for review" | `role="status"`, `aria-live="polite"` | Voices form success |
| "Email verified!" | `role="status"`, `aria-live="polite"` | `/sign/verify` landing |

---

### 1.5 Focus Styles — Global Specification

Focus management is one of the highest-risk accessibility areas for SPAs. This section defines the global focus behavior.

**Focus ring design:**

```typescript
// Design tokens (in CSS custom properties)
const focusTokens = {
  '--color-focus-ring': '#1A73E8',        // Meets 3:1 on white and light gray
  '--color-focus-ring-dark': '#A8C7FA',   // For dark background sections (if any)
  '--focus-ring-width': '3px',
  '--focus-ring-offset': '2px',
};
```

**Route change focus management (critical for SPA):**

When the Next.js App Router navigates between pages, focus must be explicitly moved to the `<main>` element (or a heading within it) so screen reader users know the page has changed. Next.js 15 has a built-in focus management system for route transitions — verify it works correctly during testing. If it doesn't, implement a custom solution:

```typescript
// app/layout.tsx — route change focus management
'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function RouteAnnouncer() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Announce route change to screen readers
    if (ref.current) {
      ref.current.focus();
    }
  }, [pathname]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={-1}
      className="sr-only"
    >
      {/* Page title injected here */}
    </div>
  );
}
```

**Note:** Next.js includes a built-in `<RouteAnnouncer>` since v13. Verify in testing whether it fires correctly for all route transitions before implementing a custom version.

---

## 2. Performance Budget

### 2.1 Core Web Vitals Targets

**Important correction from Prompt 14 spec:** FID (First Input Delay) was deprecated and replaced by INP (Interaction to Next Paint) as a Core Web Vital on March 12, 2024. The targets below reflect the current Core Web Vitals.

| Metric | Target | Good Threshold | Notes |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.0s | < 2.5s | Hero section image/text on homepage, petition counter on `/sign` |
| **INP** (Interaction to Next Paint) | < 150ms | < 200ms | Petition form interactions, Smarty autocomplete, volunteer form |
| **CLS** (Cumulative Layout Shift) | < 0.05 | < 0.1 | Signature counter updates, font loading, image loading |
| **FCP** (First Contentful Paint) | < 1.2s | < 1.8s | Initial paint — navigation + hero text |
| **TTFB** (Time to First Byte) | < 400ms | < 800ms | Vercel Edge CDN + ISR should achieve this easily |

### 2.2 Resource Budgets

| Resource | Budget | Rationale |
|---|---|---|
| **Total initial page weight** (compressed) | < 400KB | Civic traffic is 50–68% mobile (Artifact 02). Many users on throttled connections. |
| **JavaScript bundle** (compressed, per-route) | < 150KB | Next.js code-splits per route. Shared chunks (React runtime, UI library) + route-specific code. |
| **CSS** (compressed) | < 30KB | Tailwind purges unused classes. Single CSS file per page. |
| **Images** (per page, compressed) | < 200KB | All images served as WebP/AVIF via Next.js `<Image>` with responsive `srcSet`. |
| **Web fonts** (total) | < 50KB | Max 2 font families, 2–3 weights each. `font-display: swap` to prevent FOIT. Prefer `font-display: optional` for body text to avoid CLS. |
| **Third-party scripts** | < 50KB | Smarty autocomplete JS (~25KB), Cloudflare Turnstile (~15KB), PostHog (~8KB compressed). No Google Analytics, no reCAPTCHA, no heavyweight trackers. |

### 2.3 Lighthouse Score Targets

| Category | Target | CI Failure Threshold |
|---|---|---|
| **Performance** | ≥ 95 | < 90 |
| **Accessibility** | ≥ 98 | < 95 |
| **Best Practices** | ≥ 95 | < 90 |
| **SEO** | ≥ 100 | < 95 |

### 2.4 Performance Strategies (Architectural)

These strategies are already implied by the tech stack (Artifact 02) but must be explicitly implemented:

**Server-side rendering and caching:**
- Homepage, `/the-case/*`, `/about`, `/faq`, `/press`, `/blog`: Static generation (SSG) at build time. ISR revalidation every 60 seconds for pages with signature counter.
- `/sign`: Dynamic SSR (needs fresh counter, Turnstile token). Streamed with React Suspense — form shell renders instantly, counter loads as a streamed component.
- `/voices`: ISR with 60-second revalidation (new approved voices appear within a minute).
- `/blog/[slug]`: SSG at build time from MDX files (Artifact 05 §blog content).

**Image optimization:**
- All images served through `next/image` with automatic format negotiation (WebP/AVIF)
- Explicit `width` and `height` on all `<Image>` components to prevent CLS
- `priority` prop on above-the-fold images (hero, `/sign` page header)
- `loading="lazy"` (default) on all below-the-fold images

**Font loading strategy:**
```css
/* Preload critical font files */
@font-face {
  font-family: 'CampaignSans';
  src: url('/fonts/campaign-sans-regular.woff2') format('woff2');
  font-weight: 400;
  font-display: optional; /* Body text: avoid layout shift, show fallback if slow */
}

@font-face {
  font-family: 'CampaignSans';
  src: url('/fonts/campaign-sans-bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap; /* Headings: swap in when ready */
}
```

**Bundle optimization:**
- Dynamic imports for non-critical components: `const ShareButtons = dynamic(() => import('./ShareButtons'), { ssr: false })`
- Smarty autocomplete loaded only on `/sign` page, not globally
- PostHog loaded after hydration via `next/script` with `strategy="afterInteractive"`
- Turnstile script loaded only on pages with forms (`/sign`, `/voices/share`, `/volunteer`)

**Critical CSS:**
- Next.js App Router extracts critical CSS by default
- Tailwind CSS is purged at build time — only used classes ship

### 2.5 CLS Prevention Checklist

CLS is the highest-risk metric for this site due to live-updating content:

| CLS Risk | Mitigation |
|---|---|
| Signature counter updates | Reserve fixed height for counter container. Use CSS `min-height` matching the max expected digit count. Animate number changes without reflowing layout. |
| Web font loading | `font-display: optional` for body text (shows fallback font if web font doesn't load within ~100ms, no swap = no shift). `font-display: swap` only for headings (larger tolerance). Use `size-adjust` in `@font-face` to match fallback metrics. |
| Smarty autocomplete dropdown | Position with `position: absolute` — dropdown does not push form content down. |
| Image loading | Explicit `width`/`height` on all `<Image>`. Aspect ratio boxes for dynamic images. |
| Above-the-fold content | No lazy-loaded content above the fold. Hero text is SSR'd. Counter skeleton shown during hydration. |
| Cookie consent banner (if added) | Fixed position at bottom of viewport — does not shift page content. |

---

## 3. Testing Plan

### 3.1 Automated Testing — CI Pipeline

#### 3.1.1 ESLint: Static Analysis (Build-Time)

**Package:** `eslint-plugin-jsx-a11y` (included by default in `eslint-config-next`)

**Configuration:**

```jsonc
// .eslintrc.json (relevant a11y rules)
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    // Enforce stricter mode (upgrade warnings to errors)
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-activedescendant-has-tabindex": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/heading-has-content": "error",
    "jsx-a11y/html-has-lang": "error",
    "jsx-a11y/img-redundant-alt": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    "jsx-a11y/label-has-associated-control": ["error", { "assert": "either" }],
    "jsx-a11y/no-noninteractive-element-interactions": "error",
    "jsx-a11y/no-redundant-roles": "error",
    "jsx-a11y/no-static-element-interactions": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error",
    "jsx-a11y/tabindex-no-positive": "error"
  }
}
```

**When it runs:** Every commit, every PR. Fails the build on violations.

#### 3.1.2 axe-core: Runtime Analysis (Unit/Integration Tests)

**Important note:** `@axe-core/react` (the development overlay) does not support React 18+. For runtime testing, use `vitest-axe` (Vitest) or `jest-axe` (Jest) which run axe-core against rendered component output.

**Package:** `vitest-axe` (recommended — Vitest is faster than Jest for Next.js projects)

**Setup:**

```typescript
// vitest.setup.ts
import 'vitest-axe/extend-expect';
```

**Example test pattern:**

```typescript
// __tests__/petition-form.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PetitionForm } from '@/components/PetitionForm';

describe('PetitionForm accessibility', () => {
  it('has no axe violations in default state', async () => {
    const { container } = render(<PetitionForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in error state', async () => {
    const { container } = render(<PetitionForm />);
    // Trigger form submission without filling fields
    fireEvent.click(screen.getByRole('button', { name: /sign the petition/i }));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with autocomplete dropdown open', async () => {
    const { container } = render(<PetitionForm />);
    // Type in address field to trigger Smarty autocomplete
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '123 Main' },
    });
    // Wait for dropdown to appear
    await waitFor(() => screen.getByRole('listbox'));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Required test coverage — axe-core tests for every form and interactive component:**

| Component | States to Test |
|---|---|
| `PetitionForm` | Default, error, loading, autocomplete open, success |
| `VolunteerForm` | Default, error, success, all role options visible |
| `VoicesSubmissionForm` | Default, error, success, each position selected |
| `EmailSignupForm` | Default, error, success |
| `Navigation` | Desktop, mobile menu open, mobile menu closed |
| `ShareButtons` | Default, popover open |
| `FAQAccordion` | All collapsed, one expanded, all expanded |
| `SignatureCounter` | Loading skeleton, hydrated, updating |
| `BlogPostCard` | Default |
| `SkipLink` | Focused |

#### 3.1.3 Lighthouse CI (PR Check)

**Package:** `@lhci/cli` + GitHub Action `treosh/lighthouse-ci-action`

**Configuration:**

```jsonc
// lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run start",
      "startServerReadyPattern": "ready on",
      "startServerReadyTimeout": 30000,
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/sign",
        "http://localhost:3000/the-case",
        "http://localhost:3000/voices",
        "http://localhost:3000/volunteer",
        "http://localhost:3000/donate",
        "http://localhost:3000/faq",
        "http://localhost:3000/blog"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.90 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.90 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-byte-weight": ["error", { "maxNumericValue": 500000 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**Mobile configuration (separate run):**

```jsonc
// lighthouserc.mobile.json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run start",
      "startServerReadyPattern": "ready on",
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/sign"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "mobile",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

**GitHub Action:**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Lighthouse CI (Desktop)
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
      - name: Lighthouse CI (Mobile)
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: './lighthouserc.mobile.json'
          uploadArtifacts: true
```

#### 3.1.4 Pa11y: Page-Level Accessibility Scan

**Package:** `pa11y` + `pa11y-ci`

Pa11y complements axe-core — it uses HTML_CodeSniffer under the hood, which catches some issues axe misses (and vice versa). Running both maximizes automated coverage.

**Configuration:**

```jsonc
// .pa11yci.json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 30000,
    "wait": 2000,
    "chromeLaunchConfig": {
      "args": ["--no-sandbox"]
    },
    "ignore": []
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/sign",
    "http://localhost:3000/the-case",
    "http://localhost:3000/the-case/history",
    "http://localhost:3000/the-case/the-rivers",
    "http://localhost:3000/voices",
    "http://localhost:3000/voices/share",
    "http://localhost:3000/volunteer",
    "http://localhost:3000/donate",
    "http://localhost:3000/faq",
    "http://localhost:3000/about",
    "http://localhost:3000/blog",
    "http://localhost:3000/press",
    "http://localhost:3000/privacy",
    "http://localhost:3000/terms"
  ]
}
```

**Runs:** On every PR alongside Lighthouse CI. Failures block merge.

#### 3.1.5 Performance Budget Enforcement

**Package:** Built into Next.js (experimental) + bundlesize

```jsonc
// next.config.ts — experimental performance budgets
{
  experimental: {
    // Next.js will warn if a page's JS exceeds this threshold
    largePageDataWarning: true
  }
}
```

```jsonc
// bundlesize configuration (package.json)
{
  "bundlesize": [
    { "path": ".next/static/chunks/main-*.js", "maxSize": "80KB" },
    { "path": ".next/static/chunks/pages/_app-*.js", "maxSize": "50KB" },
    { "path": ".next/static/css/*.css", "maxSize": "30KB" }
  ]
}
```

### 3.2 Manual Testing Protocol

Automated tools catch approximately 30–50% of accessibility issues. Manual testing catches the rest: logical reading order, meaningful alt text quality, cognitive load, and real-world assistive technology behavior.

#### 3.2.1 Screen Reader Testing Matrix

| Screen Reader | Browser | OS | Priority | Covers |
|---|---|---|---|---|
| **VoiceOver** | Safari | macOS | P0 (required) | Most common SR on Mac/iOS, tests Safari-specific behavior |
| **VoiceOver** | Safari | iOS | P0 (required) | Mobile SR experience — critical given 50–68% mobile traffic |
| **NVDA** | Chrome | Windows (via BrowserStack) | P1 (required) | Most common SR/browser combo globally. Tested via BrowserStack screen reader testing. |
| **TalkBack** | Chrome | Android | P2 (recommended) | Android mobile SR experience |
| **JAWS** | Chrome/Edge | Windows | P3 (nice to have) | Enterprise/government users |

**Windows/NVDA testing:** Uses BrowserStack's screen reader testing (supports NVDA + Chrome). No local Windows machine required.

#### 3.2.2 Manual Test Script — Petition Form (`/sign`)

This is the highest-priority manual test because it's the primary conversion flow:

1. **Keyboard-only completion:** Navigate to `/sign` using only keyboard. Tab through all fields. Verify: skip link works, all fields receive visible focus, tab order is logical, autocomplete dropdown navigable with arrow keys, form submittable with Enter.

2. **Screen reader walkthrough:** Using VoiceOver + Safari:
   - Navigate to page. Verify page title is announced.
   - Tab to first form field. Verify label "First Name" is read.
   - Fill all fields. Verify autocomplete suggestions are announced (role="listbox" + aria-activedescendant).
   - Submit with errors. Verify error summary is announced (aria-live="assertive") and individual field errors are read when field is focused.
   - Submit successfully. Verify success message is announced.

3. **Error state testing:** Submit empty form. Verify all error messages appear, are linked to fields via `aria-describedby`, and are announced by SR.

4. **Mobile screen reader:** Using iOS VoiceOver: Complete full signing flow with swipe gestures. Verify Smarty autocomplete is usable with VoiceOver touch exploration.

5. **Zoom testing:** At 200% zoom on desktop: verify form is fully visible and usable without horizontal scrolling. At 400% zoom: verify content reflows to single column.

6. **Reduced motion:** Enable `prefers-reduced-motion` in OS settings. Verify: signature counter does not animate numbers, no auto-playing animations, page transitions are instant.

#### 3.2.3 Manual Test Script — Community Voices (`/voices`)

1. **Voice card grid:** Verify cards are reachable by keyboard, have meaningful link text (post title or excerpt), and position labels ("I support renaming" / "I have concerns") are read by SR.

2. **Submission form (`/voices/share`):** Complete form with keyboard only. Verify radio group navigable with arrow keys. Verify character count is announced to SR (either via aria-live or when field is focused). Verify guidelines checkbox is operable.

3. **Moderation status:** After submission, verify the status message ("Your submission is under review") is announced by SR.

#### 3.2.4 Manual Test Script — Navigation

1. **Desktop:** Verify all nav links are keyboard-focusable and in logical order. Verify current page is indicated (aria-current="page").

2. **Mobile menu:** Open menu with keyboard (Enter on hamburger button). Verify focus is moved into the menu. Verify ESC closes the menu and returns focus to the hamburger button. Verify the open/closed state is announced (aria-expanded).

3. **Skip link:** Tab once from page load. Verify "Skip to content" link appears. Activate it. Verify focus moves to main content area.

#### 3.2.5 Testing Cadence

| Phase | Testing |
|---|---|
| **Development** | ESLint a11y plugin on every save (editor integration). axe-core tests run with `vitest --watch`. |
| **PR review** | Lighthouse CI + Pa11y CI run automatically. Reviewer checks for semantic HTML, label associations, ARIA usage. |
| **Pre-launch** | Full manual screen reader test of all pages (VoiceOver + NVDA). Keyboard-only test of all interactive flows. Zoom testing at 200% and 400%. Reduced motion testing. Color contrast verification with browser DevTools. |
| **Post-launch** | Monthly automated audit (scheduled Pa11y CI run against production). Quarterly manual audit of new content (blog posts, new voices). User feedback channel for accessibility issues. |

---

## 4. Accessibility Utility Components

These shared components live in `packages/ui/src/a11y/` and are used across the application.

### 4.1 SkipLink

```typescript
// packages/ui/src/a11y/SkipLink.tsx
'use client';

interface SkipLinkProps {
  /** The ID of the element to skip to (without #). Default: 'main-content' */
  targetId?: string;
  /** The link text. Default: 'Skip to content' */
  children?: React.ReactNode;
}

/**
 * SkipLink — renders an anchor that is visually hidden until focused.
 * Must be the first focusable element in the DOM (placed at top of layout).
 *
 * Usage:
 *   <SkipLink />                    // skips to #main-content
 *   <SkipLink targetId="petition-form">Skip to petition form</SkipLink>
 *
 * Styling: Uses sr-only (Tailwind) by default, transitions to visible on :focus-visible.
 * The focused state renders a fixed-position banner at the top of the viewport.
 *
 * Acceptance criteria:
 * - First Tab press from page load focuses this link
 * - Enter activates the link and moves focus to the target element
 * - Target element has tabIndex={-1} so it can receive programmatic focus
 * - Link is visually hidden until focused
 * - When focused, link is fully visible with high contrast
 */
export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to content',
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={[
        // Visually hidden by default
        'sr-only',
        // Visible on focus
        'focus:not-sr-only',
        'focus:fixed focus:top-0 focus:left-0 focus:z-[9999]',
        'focus:block focus:w-full focus:p-4',
        'focus:bg-white focus:text-black',
        'focus:text-lg focus:font-bold focus:text-center',
        'focus:outline-none focus:ring-4 focus:ring-blue-600',
      ].join(' ')}
      onClick={(e) => {
        // Ensure smooth focus transfer
        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          target.setAttribute('tabindex', '-1');
          target.focus();
          // Remove tabindex after blur so it doesn't disrupt natural tab order
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        }
      }}
    >
      {children}
    </a>
  );
}
```

### 4.2 VisuallyHidden

```typescript
// packages/ui/src/a11y/VisuallyHidden.tsx

interface VisuallyHiddenProps {
  /** The content to visually hide (still read by screen readers) */
  children: React.ReactNode;
  /** Render as a specific element. Default: 'span' */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * VisuallyHidden — hides content visually while keeping it accessible to screen readers.
 *
 * Uses the well-tested sr-only technique (not display:none or visibility:hidden,
 * which hide content from screen readers too).
 *
 * Usage:
 *   <button>
 *     <SearchIcon aria-hidden="true" />
 *     <VisuallyHidden>Search the site</VisuallyHidden>
 *   </button>
 *
 *   <VisuallyHidden as="h2">Petition signature form</VisuallyHidden>
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
}: VisuallyHiddenProps) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}
```

### 4.3 FocusTrap

```typescript
// packages/ui/src/a11y/FocusTrap.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface FocusTrapProps {
  /** Whether the trap is active. When false, focus is not trapped. */
  active: boolean;
  /** The content to trap focus within */
  children: React.ReactNode;
  /** Called when the user presses Escape. Parent should set active=false. */
  onEscape?: () => void;
  /** Element to return focus to when the trap deactivates. Default: the element that was focused before activation. */
  returnFocusTo?: HTMLElement | null;
  /** Whether to auto-focus the first focusable element on activation. Default: true */
  autoFocus?: boolean;
}

/**
 * FocusTrap — traps keyboard focus within its children when active.
 *
 * Used for: modal dialogs, mobile navigation menu, share popovers.
 *
 * Behavior:
 * - On activation: focuses the first focusable element (or the element with autoFocus)
 * - Tab from last focusable element wraps to first
 * - Shift+Tab from first focusable element wraps to last
 * - Escape calls onEscape
 * - On deactivation: returns focus to the previously focused element
 *
 * Recommendation: For modal dialogs, prefer the native <dialog> element
 * (which handles focus trapping natively). Use FocusTrap only for non-dialog
 * patterns like the mobile nav menu or custom popovers.
 *
 * Acceptance criteria:
 * - Focus cannot leave the trap via Tab or Shift+Tab
 * - Escape triggers onEscape callback
 * - Focus returns to the previously focused element on deactivation
 * - Works with dynamically added/removed focusable elements
 */
export function FocusTrap({
  active,
  children,
  onEscape,
  returnFocusTo,
  autoFocus = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector));
  }, []);

  // Store previous focus and auto-focus on activation
  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      if (autoFocus) {
        // Defer to allow children to render
        requestAnimationFrame(() => {
          const focusable = getFocusableElements();
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        });
      }
    } else if (previousFocusRef.current) {
      // Return focus on deactivation
      const target = returnFocusTo || previousFocusRef.current;
      target?.focus();
      previousFocusRef.current = null;
    }
  }, [active, autoFocus, getFocusableElements, returnFocusTo]);

  // Handle Tab wrapping and Escape
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, getFocusableElements, onEscape]);

  return (
    <div ref={containerRef} role="presentation">
      {children}
    </div>
  );
}
```

### 4.4 ErrorAnnouncer

```typescript
// packages/ui/src/a11y/ErrorAnnouncer.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type Politeness = 'polite' | 'assertive';

interface Announcement {
  message: string;
  politeness: Politeness;
}

interface ErrorAnnouncerContextValue {
  /** Announce a message to screen readers. Use 'assertive' for errors, 'polite' for status. */
  announce: (message: string, politeness?: Politeness) => void;
}

/**
 * ErrorAnnouncer — provides a centralized way to announce messages to screen readers.
 *
 * Uses twin aria-live regions (polite + assertive) that are always in the DOM
 * but visually hidden. Messages are injected into the appropriate region,
 * triggering screen reader announcements without visual UI changes.
 *
 * Usage (as a React context):
 *
 *   // In a form component:
 *   const { announce } = useAnnouncer();
 *
 *   // On form error:
 *   announce('3 errors found. First Name is required. Email is required. Address is required.', 'assertive');
 *
 *   // On success:
 *   announce('Your signature has been recorded! Thank you.', 'polite');
 *
 *   // On counter update:
 *   announce('12,453 Ohioans have signed', 'polite');
 *
 * Implementation notes:
 * - The component clears the previous message before setting the new one (via a
 *   brief empty string) to ensure screen readers announce repeated identical messages.
 * - Debounces rapid announcements (e.g., counter updates) to avoid overwhelming SR users.
 * - The context provider should wrap the entire app in layout.tsx.
 *
 * Acceptance criteria:
 * - 'assertive' messages interrupt current SR output (for errors)
 * - 'polite' messages wait until SR is idle (for status updates)
 * - Repeated identical messages are still announced
 * - No visual UI is rendered (sr-only)
 */

// Context and hook (implementation sketch — full React context pattern)
export function createAnnouncerHook() {
  // This would be a full React context in implementation.
  // The component renders two visually-hidden divs:
  //
  // <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
  //   {politeMessage}
  // </div>
  // <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
  //   {assertiveMessage}
  // </div>
  //
  // The announce() function clears the relevant div, then sets the message
  // on the next tick to ensure the screen reader detects the change.
}
```

### 4.5 ReducedMotion

```typescript
// packages/ui/src/a11y/ReducedMotion.tsx
'use client';

import { useEffect, useState } from 'react';

/**
 * useReducedMotion — returns true if the user prefers reduced motion.
 *
 * Usage:
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   // In animation config:
 *   const counterAnimation = prefersReducedMotion
 *     ? { duration: 0 }              // Instant update
 *     : { duration: 500, ease: 'easeOut' };  // Animated
 *
 * Used by:
 * - Signature counter number animation
 * - Progress bar fill animation
 * - Page transition effects
 * - Any CSS animation/transition
 *
 * CSS complement — also respect the preference in CSS:
 *   @media (prefers-reduced-motion: reduce) {
 *     *, *::before, *::after {
 *       animation-duration: 0.01ms !important;
 *       animation-iteration-count: 1 !important;
 *       transition-duration: 0.01ms !important;
 *       scroll-behavior: auto !important;
 *     }
 *   }
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
```

### 4.6 Component Index

```typescript
// packages/ui/src/a11y/index.ts
export { SkipLink } from './SkipLink';
export { VisuallyHidden } from './VisuallyHidden';
export { FocusTrap } from './FocusTrap';
export { useReducedMotion } from './ReducedMotion';
// ErrorAnnouncer exports the context provider + hook
```

---

## 5. Accessibility Testing Checklist Document

This is a printable/shareable checklist for the team to use during manual testing passes.

### Pre-Launch Accessibility Audit Checklist

**Tester:** _______________ **Date:** _______________ **Browser/SR:** _______________

#### Global

- [ ] Skip link present and functional on every page
- [ ] Page `<title>` is unique and descriptive on every page
- [ ] `<html lang="en">` is set
- [ ] One `<h1>` per page, heading hierarchy is sequential
- [ ] No positive `tabindex` values anywhere in the codebase
- [ ] Focus ring visible on all interactive elements (keyboard navigation)
- [ ] Focus ring has ≥3:1 contrast against adjacent colors
- [ ] No keyboard traps (can Tab through entire page and back)
- [ ] All images have appropriate `alt` text (or `alt=""` if decorative)
- [ ] Color contrast ≥4.5:1 for normal text, ≥3:1 for large text (verify with DevTools)
- [ ] Reduced motion: animations respect `prefers-reduced-motion`
- [ ] Zoom to 200%: all content accessible without horizontal scrolling
- [ ] Zoom to 400%: content reflows to single column

#### Navigation

- [ ] All nav links keyboard-accessible
- [ ] Current page indicated with `aria-current="page"`
- [ ] Mobile menu: focus trapped when open, ESC closes, focus returns to toggle
- [ ] Mobile menu toggle: `aria-expanded` toggles correctly
- [ ] Navigation landmark: `<nav aria-label="Main navigation">`

#### Petition Form (`/sign`)

- [ ] All fields have visible `<label>` elements
- [ ] Required fields marked with `*` and `aria-required="true"`
- [ ] Helper text linked via `aria-describedby`
- [ ] Smarty autocomplete: dropdown navigable with arrow keys
- [ ] Smarty autocomplete: selection announced by screen reader
- [ ] Error messages: appear inline next to field AND in summary above form
- [ ] Error messages: announced by screen reader (`aria-live="assertive"`)
- [ ] Error messages: identify the field and describe the error
- [ ] Success message: announced by screen reader (`aria-live="polite"`)
- [ ] Turnstile widget: `aria-hidden="true"`, does not disrupt tab order
- [ ] Honeypot field: hidden from screen readers (`tabindex="-1"`, off-screen)
- [ ] Signature counter: `aria-live="polite"`, not announced on every tick
- [ ] Progress bar: has `role="progressbar"` with correct `aria-value*` attributes
- [ ] Form completable with keyboard only (no mouse required)
- [ ] Form completable with screen reader

#### Volunteer Form (`/volunteer`)

- [ ] All fields have visible `<label>` elements
- [ ] Role selection: checkboxes grouped in `<fieldset>` with `<legend>`
- [ ] Neighborhood dropdown: keyboard-navigable
- [ ] Error and success states announced to screen readers

#### Community Voices (`/voices` + `/voices/share`)

- [ ] Voice card grid: cards are keyboard-focusable
- [ ] Position labels: read by screen reader for each card
- [ ] Submission form: radio group navigable with arrow keys
- [ ] Character count: accessible to screen readers
- [ ] Community guidelines: readable before form (logical DOM order)

#### Blog

- [ ] Blog post cards: link text is the post title (not "Read more")
- [ ] Blog post content: heading hierarchy is correct
- [ ] Images in blog posts: meaningful `alt` text

#### Footer

- [ ] Footer links keyboard-accessible
- [ ] Email signup form: labeled, error states announced
- [ ] Social links: have accessible labels (e.g., `aria-label="Follow us on Twitter"`)

---

## 6. Claude Code Handoff

### Handoff Prompt 14-A: Accessibility Utility Components

```
Create the accessibility utility components in packages/ui/src/a11y/ per Artifact 14 §4.

Files to create:
1. packages/ui/src/a11y/SkipLink.tsx — Skip navigation link, visually hidden until focused. Uses Tailwind sr-only / focus:not-sr-only pattern. Targets #main-content by default. On click, sets tabindex=-1 on target and focuses it, removes tabindex on blur.

2. packages/ui/src/a11y/VisuallyHidden.tsx — Renders children in a span (or configurable element) with className="sr-only". Used for screen-reader-only labels on icon buttons, hidden headings, etc.

3. packages/ui/src/a11y/FocusTrap.tsx — Client component. Props: active (boolean), onEscape (callback), returnFocusTo (optional HTMLElement), autoFocus (boolean, default true), children. When active: stores previously focused element, auto-focuses first focusable child, wraps Tab/Shift+Tab at boundaries, calls onEscape on Escape key. When deactivated: returns focus to previous element. Used for mobile nav menu and share popovers. Prefer native <dialog> for modals.

4. packages/ui/src/a11y/ReducedMotion.tsx — exports useReducedMotion() hook. Uses matchMedia('(prefers-reduced-motion: reduce)') with change listener. Returns boolean. Used by signature counter animation, progress bar, page transitions.

5. packages/ui/src/a11y/ErrorAnnouncer.tsx — React context provider + useAnnouncer() hook. Provider renders two sr-only divs: one role="status" aria-live="polite", one role="alert" aria-live="assertive". The announce(message, politeness) function clears then sets text (on next tick to trigger re-announcement of identical messages). Wrap in app layout.tsx.

6. packages/ui/src/a11y/index.ts — barrel export of all components and hooks.

Also add the global reduced-motion CSS to the global stylesheet:
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

And the global focus-visible styles:
:focus-visible {
  outline: 3px solid var(--color-focus-ring, #1A73E8);
  outline-offset: 2px;
  border-radius: 2px;
}
:focus:not(:focus-visible) {
  outline: none;
}

Write tests for each component using vitest + @testing-library/react:
- SkipLink: renders, is focusable, moves focus to target on Enter
- VisuallyHidden: renders with sr-only class, supports 'as' prop
- FocusTrap: traps focus when active, releases when inactive, returns focus, handles Escape
- useReducedMotion: returns false by default, responds to media query change
- ErrorAnnouncer: announce() sets text in the correct aria-live region

Reference: Artifact 14 §4 for full implementation specs.
```

### Handoff Prompt 14-B: ESLint Accessibility Configuration

```
Update the ESLint configuration to enforce strict accessibility rules per Artifact 14 §3.1.1.

In the root .eslintrc.json (or eslint.config.js if using flat config):
- Extend "next/core-web-vitals" (already includes eslint-plugin-jsx-a11y)
- Override all jsx-a11y rules listed in Artifact 14 §3.1.1 to "error" severity
- Key rules: alt-text, anchor-has-content, anchor-is-valid, label-has-associated-control (assert: "either"), tabindex-no-positive, click-events-have-key-events, heading-has-content, html-has-lang, interactive-supports-focus, no-static-element-interactions, role-has-required-aria-props

Verify: run eslint across the codebase after configuration. Fix any existing violations. All jsx-a11y rules should fail the build (error, not warn).
```

### Handoff Prompt 14-C: axe-core Integration Tests

```
Set up vitest-axe for runtime accessibility testing per Artifact 14 §3.1.2.

1. Install: vitest-axe (as devDependency)
2. Add to vitest.setup.ts: import 'vitest-axe/extend-expect'
3. Create accessibility test files for each interactive component:

Required test files (one per component):
- __tests__/a11y/petition-form.a11y.test.tsx
- __tests__/a11y/volunteer-form.a11y.test.tsx
- __tests__/a11y/voices-form.a11y.test.tsx
- __tests__/a11y/email-signup.a11y.test.tsx
- __tests__/a11y/navigation.a11y.test.tsx
- __tests__/a11y/share-buttons.a11y.test.tsx
- __tests__/a11y/faq-accordion.a11y.test.tsx
- __tests__/a11y/signature-counter.a11y.test.tsx

Each test file should:
- Render the component in its default state and run axe()
- Render the component in its error state and run axe()
- Render the component in its success/loading state and run axe()
- Test with interactive states (dropdown open, menu expanded) where applicable

Use the component states matrix from Artifact 14 §3.1.2 table.

Note: Mock Smarty API calls and Supabase Realtime in tests. The axe tests verify DOM structure, not backend behavior.
```

### Handoff Prompt 14-D: Lighthouse CI and Pa11y CI Configuration

```
Set up Lighthouse CI and Pa11y CI per Artifact 14 §3.1.3 and §3.1.4.

Files to create:

1. lighthouserc.json — Desktop configuration. URLs: /, /sign, /the-case, /voices, /volunteer, /donate, /faq, /blog. 3 runs per URL. Assert: performance ≥0.90, accessibility ≥0.95, best-practices ≥0.90, SEO ≥0.95, LCP ≤2500, CLS ≤0.1, total-byte-weight ≤500000. Upload to temporary-public-storage.

2. lighthouserc.mobile.json — Mobile configuration. URLs: /, /sign (the two highest-traffic mobile pages). 3 runs, mobile preset, 4x CPU slowdown, 150ms RTT, 1638.4 Kbps throughput. Assert: performance ≥0.85, accessibility ≥0.95, LCP ≤3000, CLS ≤0.1.

3. .pa11yci.json — WCAG2AA standard. All 15 static page URLs. 30-second timeout, 2-second wait. No ignored rules.

4. .github/workflows/lighthouse.yml — GitHub Action that:
   - Triggers on PRs to main
   - Checks out code, installs deps, builds
   - Runs Lighthouse CI desktop
   - Runs Lighthouse CI mobile
   - Runs Pa11y CI
   - Uploads artifacts
   - Posts results as PR comment

5. Add bundlesize to package.json per Artifact 14 §3.1.5: main chunk ≤80KB, app chunk ≤50KB, CSS ≤30KB.

Reference: Artifact 14 §3.1.3–§3.1.5 for full configuration details.
```

### Handoff Prompt 14-E: Accessibility Integration into Existing Components

```
Audit and update all existing UI components for WCAG 2.1 AA compliance per Artifact 14 §1.

This prompt assumes the core components from earlier prompts (petition form, volunteer form, voices form, navigation, etc.) have been built. Audit each and apply:

1. SkipLink: Add <SkipLink /> as the first child of the root layout (app/layout.tsx). Add id="main-content" to the <main> element on every page.

2. ErrorAnnouncer: Wrap the app in <AnnouncerProvider> in layout.tsx. Update all forms to use announce() for:
   - Error summaries (assertive)
   - Success messages (polite)
   - Counter updates (polite, debounced to max 1 per 10 seconds)

3. Focus management:
   - Petition form: Smarty autocomplete must use aria-activedescendant, role="listbox" on dropdown, role="option" on suggestions
   - Mobile nav: wrap menu content in <FocusTrap active={isOpen} onEscape={close}>
   - Share popovers: wrap in <FocusTrap>

4. Form field audit:
   - Every <input> has <label> with matching htmlFor/id
   - Every required field has aria-required="true"
   - Every field with helper text uses aria-describedby
   - Error messages linked via aria-describedby (pointing to both helper AND error spans)
   - Autocomplete attributes on all personal data fields per Artifact 14 §1.3.5

5. ARIA landmarks:
   - <header role="banner"> (only the site header, not section headers)
   - <nav aria-label="Main navigation">
   - <main id="main-content"> on every page
   - <footer role="contentinfo">
   - <aside aria-label="..."> for sidebar content if applicable

6. Signature counter: role="status", aria-live="polite", aria-label="Petition signatures". Number updates announced max once per 10 seconds.

7. Progress bar: role="progressbar", aria-valuenow, aria-valuemin="0", aria-valuemax="[goal]", aria-label="Petition progress toward [goal] signatures".

8. Reduced motion: import useReducedMotion() in counter animation and progress bar. When true, set animation duration to 0.

9. Route change handling: verify Next.js built-in route announcer works. If not, add RouteAnnouncer per Artifact 14 §1.5.

10. Color palette proposal: As part of this integration pass, propose a brand color palette (primary, secondary, accent, neutral, error, success) inspired by the "confluence" / rivers theme and civic campaign aesthetics. Every text/background combination must meet WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text). Produce the palette as CSS custom properties in the global stylesheet and a design-tokens.ts file. Include a contrast verification table showing every combination and its ratio.

Reference: Artifact 14 §1 (full WCAG checklist) and §4 (component specs) for all requirements.
```

### Handoff Prompt 14-F: Performance Optimization Implementation

```
Implement the performance budget and optimization strategies from Artifact 14 §2.

1. Font loading:
   - Use next/font for font loading (local fonts preferred for performance)
   - Body font: font-display: optional (prevents CLS — shows fallback if font doesn't load in ~100ms)
   - Heading font: font-display: swap
   - Max 2 font families, 2–3 weights total
   - Total font weight < 50KB

2. Image optimization:
   - All images use next/image with explicit width/height
   - Above-the-fold images: priority={true}
   - Responsive srcSet for all images
   - Format negotiation: WebP/AVIF automatic via Next.js

3. Script loading:
   - PostHog: next/script strategy="afterInteractive"
   - Smarty autocomplete: dynamic import, only on /sign
   - Turnstile: dynamic import, only on pages with forms (/sign, /voices/share, /volunteer)
   - No global third-party scripts in _document or layout

4. Code splitting:
   - ShareButtons: dynamic(() => import('./ShareButtons'), { ssr: false })
   - SignatureCounter (Realtime): dynamic with ssr: false, show skeleton during load
   - Blog MDX content: statically generated at build time

5. SSR/ISR strategy per Artifact 14 §2.4:
   - SSG: /the-case/*, /about, /faq, /press, /privacy, /terms
   - ISR (60s): /, /voices, /blog
   - Dynamic SSR with streaming: /sign (needs fresh counter + Turnstile)
   - SSG at build: /blog/[slug] (from MDX)

6. CLS prevention per Artifact 14 §2.5:
   - Counter: fixed min-height container, CSS-only animation
   - Fonts: size-adjust in @font-face for fallback matching
   - Autocomplete dropdown: position: absolute
   - All images: explicit dimensions

7. Bundle analysis: Add @next/bundle-analyzer. Add npm script "analyze": "ANALYZE=true next build". Run and verify per-route JS is under 150KB compressed.

Reference: Artifact 14 §2 for all targets and strategies.
```

---

## Appendix: Package Versions Reference

| Package | Purpose | Minimum Version |
|---|---|---|
| `eslint-plugin-jsx-a11y` | Static a11y linting | Included in `eslint-config-next` |
| `vitest-axe` | Runtime a11y testing in Vitest | ^1.0.0 |
| `@testing-library/react` | Component rendering for tests | ^14.0.0 |
| `@lhci/cli` | Lighthouse CI command line | ^0.13.0 |
| `pa11y-ci` | Pa11y CI runner | ^3.1.0 |
| `bundlesize` | Bundle size enforcement | ^0.18.0 |
| `@next/bundle-analyzer` | Webpack bundle visualization | Match Next.js version |
