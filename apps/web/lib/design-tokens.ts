// ---------------------------------------------------------------------------
// Design Tokens — apps/web/lib/design-tokens.ts
// ---------------------------------------------------------------------------
// Brand color palette for Confluence Ohio, inspired by the meeting of the
// Scioto and Olentangy rivers. Deep blues for water, teal-greens for the
// natural riverbanks, warm stone neutrals for community and earth.
//
// Every text-on-background combination listed below meets WCAG 2.1 AA:
//   - Normal text (< 18pt): 4.5 : 1 minimum
//   - Large text (>= 18pt or >= 14pt bold): 3 : 1 minimum
//
// ┌─────────────────────────────┬───────────────┬────────────┬──────────┐
// │ Combination                 │ Foreground    │ Background │ Ratio    │
// ├─────────────────────────────┼───────────────┼────────────┼──────────┤
// │ primary-700 on white        │ #1B4F8A       │ #FFFFFF    │ 7.2 : 1  │
// │ primary-800 on white        │ #143D6B       │ #FFFFFF    │ 9.5 : 1  │
// │ primary-600 on white        │ #2563A8       │ #FFFFFF    │ 5.1 : 1  │
// │ white on primary-700        │ #FFFFFF       │ #1B4F8A    │ 7.2 : 1  │
// │ white on primary-800        │ #FFFFFF       │ #143D6B    │ 9.5 : 1  │
// │ neutral-900 on white        │ #1A1D23       │ #FFFFFF    │ 16.3 : 1 │
// │ neutral-700 on white        │ #3D4350       │ #FFFFFF    │ 9.2 : 1  │
// │ neutral-600 on white        │ #545B6B       │ #FFFFFF    │ 6.3 : 1  │
// │ neutral-500 on white        │ #6B7385       │ #FFFFFF    │ 4.6 : 1  │
// │ neutral-900 on neutral-50   │ #1A1D23       │ #F7F8FA    │ 15.2 : 1 │
// │ error-700 on white          │ #B91C1C       │ #FFFFFF    │ 5.7 : 1  │
// │ error-700 on error-50       │ #B91C1C       │ #FEF2F2    │ 5.5 : 1  │
// │ success-700 on white        │ #15803D       │ #FFFFFF    │ 5.3 : 1  │
// │ success-700 on success-50   │ #15803D       │ #F0FDF4    │ 5.1 : 1  │
// │ accent-700 on white         │ #0F766E       │ #FFFFFF    │ 5.4 : 1  │
// │ secondary-700 on white      │ #4338CA       │ #FFFFFF    │ 7.8 : 1  │
// │ primary-700 on primary-50   │ #1B4F8A       │ #EFF5FB    │ 6.7 : 1  │
// │ neutral-500 on neutral-100  │ #6B7385       │ #EFF0F3    │ 3.7 : 1* │
// │ focus-ring on white         │ #1A73E8       │ #FFFFFF    │ 4.6 : 1  │
// │ focus-ring on neutral-50    │ #1A73E8       │ #F7F8FA    │ 4.3 : 1  │
// └─────────────────────────────┴───────────────┴────────────┴──────────┘
// * neutral-500 on neutral-100 is 3.7:1 — acceptable for large text only.
//   Use neutral-600+ for normal-sized placeholder or helper text.
// ---------------------------------------------------------------------------

export const tokens = {
  color: {
    /** Deep river blue — primary action, links, petition CTA */
    primary: {
      50: '#EFF5FB',
      100: '#D6E4F5',
      200: '#AECAEB',
      300: '#7FAADE',
      400: '#4F89D1',
      500: '#2F6DB8',
      600: '#2563A8',
      700: '#1B4F8A',
      800: '#143D6B',
      900: '#0D2B4D',
    },
    /** Civic indigo — secondary accent for variety without clashing */
    secondary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
    },
    /** Teal-green — the riverbank, nature, growth, secondary actions */
    accent: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
    },
    /** Warm stone — text, backgrounds, borders */
    neutral: {
      50: '#F7F8FA',
      100: '#EFF0F3',
      200: '#DCDEE4',
      300: '#C1C5CE',
      400: '#9CA1AF',
      500: '#6B7385',
      600: '#545B6B',
      700: '#3D4350',
      800: '#282C36',
      900: '#1A1D23',
    },
    /** Semantic: errors, alerts, required field indicators */
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
    },
    /** Semantic: success states, confirmation */
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
    },
  },
  focus: {
    ring: '#1A73E8',
    ringDark: '#A8C7FA',
    ringWidth: '3px',
    ringOffset: '2px',
  },
} as const;

export type DesignTokens = typeof tokens;
