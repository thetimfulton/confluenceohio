// ---------------------------------------------------------------------------
// Public Layout — apps/web/app/(public)/layout.tsx
// ---------------------------------------------------------------------------
// Wraps all public-facing pages with Header, Footer, SkipLink, and the
// mobile sticky petition CTA bar. The admin dashboard uses a separate
// layout at app/(admin)/admin/layout.tsx.
//
// See Artifact 02 §3 for the navigation design spec.
// ---------------------------------------------------------------------------

import { SkipLink } from '@confluenceohio/ui/a11y';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StickyPetitionBar } from '@/components/layout/MobileNav';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Skip to main content — WCAG 2.1 §2.4.1 */}
      <SkipLink />

      <Header />

      <main id="main-content" className="min-h-[60vh]">
        {children}
      </main>

      <Footer />

      {/* Persistent mobile petition CTA bar */}
      <StickyPetitionBar />
    </>
  );
}
