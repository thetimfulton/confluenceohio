import { Inter, Source_Serif_4 } from 'next/font/google';

/**
 * Font loading strategy (Artifact 14 §2.4):
 *
 * - Body (Inter): font-display: optional — prevents CLS by showing fallback
 *   if font doesn't load in ~100ms. No swap = no layout shift.
 * - Heading (Source Serif 4): font-display: swap — heading font swaps in
 *   when ready, acceptable for larger text.
 *
 * Budget: Max 2 families, 2-3 weights, total < 50KB.
 * Inter 400/700 latin ≈ 22KB, Source Serif 4 600 latin ≈ 14KB = ~36KB total.
 */

export const fontBody = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'optional',
  variable: '--font-body',
  fallback: [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  adjustFontFallback: true,
});

export const fontHeading = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
  variable: '--font-heading',
  fallback: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
  adjustFontFallback: true,
});
