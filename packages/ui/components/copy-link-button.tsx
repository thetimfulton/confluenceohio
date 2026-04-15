'use client';

/**
 * Copy Link button with clipboard fallback (Artifact 11 §2.5).
 *
 * Uses navigator.clipboard when available (HTTPS), falls back to a
 * temporary textarea + execCommand('copy') for older browsers / dev HTTP.
 * Shows "Copied!" feedback for 2 seconds via aria-live for screen readers.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Icons (inline SVG — no icon library dependency)
// ---------------------------------------------------------------------------

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.018a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CopyLinkButtonProps {
  /** The URL to copy to the clipboard */
  url: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant — controls icon and text sizing */
  size?: 'sm' | 'md' | 'lg';
  /** Called after a successful copy */
  onCopy?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CopyLinkButton({
  url,
  className,
  size = 'md',
  onCopy,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers or non-HTTPS (dev)
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      onCopy?.();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [url, onCopy]);

  const iconSize =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const textSize =
    size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300',
        'bg-white font-medium text-gray-700 shadow-sm transition',
        'hover:bg-gray-50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        textSize,
        size === 'sm' ? 'px-3 py-2' : size === 'lg' ? 'px-5 py-3.5' : 'px-4 py-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={copied ? 'Link copied to clipboard' : 'Copy share link'}
      aria-live="polite"
    >
      {copied ? (
        <>
          <CheckIcon className={`${iconSize} text-green-600`} />
          <span className="text-green-700">Copied!</span>
        </>
      ) : (
        <>
          <LinkIcon className={`${iconSize} text-gray-500`} />
          Copy Link
        </>
      )}
    </button>
  );
}
