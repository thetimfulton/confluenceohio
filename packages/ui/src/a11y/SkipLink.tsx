'use client';

interface SkipLinkProps {
  /** The ID of the element to skip to (without #). Default: 'main-content' */
  targetId?: string;
  /** The link text. Default: 'Skip to content' */
  children?: React.ReactNode;
}

/**
 * Skip navigation link — visually hidden until focused.
 * Must be the first focusable element in the DOM (placed at top of layout).
 *
 * On activation: sets tabindex=-1 on target, focuses it,
 * removes tabindex on blur to avoid disrupting natural tab order.
 */
export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to content',
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={[
        'sr-only',
        'focus:not-sr-only',
        'focus:fixed focus:top-0 focus:left-0 focus:z-[9999]',
        'focus:block focus:w-full focus:p-4',
        'focus:bg-white focus:text-black',
        'focus:text-lg focus:font-bold focus:text-center',
        'focus:outline-none focus:ring-4 focus:ring-blue-600',
      ].join(' ')}
      onClick={(e) => {
        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          target.setAttribute('tabindex', '-1');
          target.focus();
          target.addEventListener(
            'blur',
            () => target.removeAttribute('tabindex'),
            { once: true },
          );
        }
      }}
    >
      {children}
    </a>
  );
}
