interface VisuallyHiddenProps {
  /** The content to visually hide (still read by screen readers) */
  children: React.ReactNode;
  /** Render as a specific element. Default: 'span' */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * Hides content visually while keeping it accessible to screen readers.
 * Uses the sr-only technique (not display:none or visibility:hidden,
 * which hide content from screen readers too).
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
}: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}
