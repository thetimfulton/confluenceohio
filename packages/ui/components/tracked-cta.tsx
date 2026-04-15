'use client';

/**
 * TrackedCTA — CTA click tracking component (Artifact 13 §8.2).
 *
 * Wraps anchor tags and fires `cta_clicked` events with:
 *   - cta_id:      stable identifier for this CTA placement
 *   - cta_text:    visible text (falls back to ctaId)
 *   - page:        current pathname
 *   - destination: href target
 *
 * Usage:
 *   <TrackedCTA ctaId="homepage_hero_sign" href="/sign">
 *     Sign the Petition &rarr;
 *   </TrackedCTA>
 */

import { trackEvent } from '@confluenceohio/core/analytics/track-event';
import { usePathname } from 'next/navigation';

interface TrackedCTAProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Stable identifier for analytics (e.g., 'homepage_hero_sign') */
  ctaId: string;
  children: React.ReactNode;
}

export function TrackedCTA({
  ctaId,
  children,
  href,
  onClick,
  ...props
}: TrackedCTAProps) {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackEvent('cta_clicked', {
      cta_id: ctaId,
      cta_text: typeof children === 'string' ? children : ctaId,
      page: pathname,
      destination: href,
    });
    onClick?.(e);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
