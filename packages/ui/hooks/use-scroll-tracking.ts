'use client';

/**
 * Scroll depth tracking hook for blog posts (Artifact 13 §8.3).
 *
 * Fires `blog_post_scrolled` at 25/50/75/100% milestones.
 * Each milestone fires at most once per mount.
 *
 * Usage:
 *   const contentRef = useRef<HTMLElement>(null);
 *   useScrollTracking(contentRef, 'my-post-slug');
 */

import { useEffect, useRef } from 'react';
import { trackEvent } from '@confluenceohio/core/analytics/track-event';

const MILESTONES = [25, 50, 75, 100] as const;

export function useScrollTracking(
  contentRef: React.RefObject<HTMLElement | null>,
  slug: string,
) {
  const fired = useRef(new Set<number>());

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    // Reset on remount (new slug)
    fired.current = new Set();

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const elementTop = window.scrollY + rect.top;
      const elementHeight = element.scrollHeight;
      const scrolledPast =
        window.scrollY + window.innerHeight - elementTop;
      const percent = Math.min(
        Math.round((scrolledPast / elementHeight) * 100),
        100,
      );

      for (const milestone of MILESTONES) {
        if (percent >= milestone && !fired.current.has(milestone)) {
          fired.current.add(milestone);
          trackEvent('blog_post_scrolled', {
            slug,
            percent_scrolled: milestone,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial position (user may have scrolled before mount)
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentRef, slug]);
}
