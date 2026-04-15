import { AnnouncerProvider } from '@confluenceohio/ui/a11y';
import type { ReactNode } from 'react';

/**
 * Test wrapper that provides the AnnouncerProvider context
 * required by forms and components that use useAnnouncer().
 *
 * Usage with @testing-library/react:
 *   render(<MyComponent />, { wrapper: A11yWrapper });
 */
export function A11yWrapper({ children }: { children: ReactNode }) {
  return <AnnouncerProvider>{children}</AnnouncerProvider>;
}
