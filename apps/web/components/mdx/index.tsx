import Image from 'next/image';
import Link from 'next/link';
import type { MDXComponents } from 'mdx/types';

// ---------------------------------------------------------------------------
// Callout — highlighted aside for important information
// ---------------------------------------------------------------------------

function Callout({
  children,
  type = 'info',
}: {
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'source';
}) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    source: 'border-gray-200 bg-gray-50 text-gray-700',
  };

  const labels = {
    info: 'Note',
    warning: 'Important',
    source: 'Source',
  };

  return (
    <aside
      className={`my-6 rounded-lg border-l-4 px-5 py-4 text-sm leading-relaxed ${styles[type]}`}
      role="note"
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-70">
        {labels[type]}
      </p>
      {children}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// SourceCitation — inline citation for historical claims
// ---------------------------------------------------------------------------

function SourceCitation({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <cite className="not-italic">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
      >
        {children}
      </a>
    </cite>
  );
}

// ---------------------------------------------------------------------------
// MDX component overrides
// ---------------------------------------------------------------------------

export const mdxComponents: MDXComponents = {
  // Headings
  h1: ({ children, ...props }) => (
    <h1
      className="mb-4 mt-10 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mb-3 mt-10 text-2xl font-bold text-gray-900"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mb-2 mt-8 text-xl font-semibold text-gray-900"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="mb-2 mt-6 text-lg font-semibold text-gray-900"
      {...props}
    >
      {children}
    </h4>
  ),

  // Paragraphs and inline
  p: ({ children, ...props }) => (
    <p className="mb-5 text-base leading-relaxed text-gray-700" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-gray-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),

  // Links — internal links use Next Link, external open in new tab
  a: ({ href, children, ...props }) => {
    const isInternal =
      href?.startsWith('/') || href?.startsWith('https://confluenceohio.org');

    if (isInternal && href) {
      return (
        <Link
          href={href}
          className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
          {...props}
        >
          {children}
        </Link>
      );
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
        {...props}
      >
        {children}
      </a>
    );
  },

  // Lists
  ul: ({ children, ...props }) => (
    <ul
      className="mb-5 list-disc space-y-1.5 pl-6 text-base text-gray-700"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="mb-5 list-decimal space-y-1.5 pl-6 text-base text-gray-700"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),

  // Blockquote
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-6 border-l-4 border-blue-200 pl-5 text-base italic text-gray-600"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: (props) => <hr className="my-8 border-gray-200" {...props} />,

  // Code
  code: ({ children, ...props }) => (
    <code
      className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800"
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="my-6 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100"
      {...props}
    >
      {children}
    </pre>
  ),

  // Table
  table: ({ children, ...props }) => (
    <div className="my-6 overflow-x-auto">
      <table
        className="w-full border-collapse text-sm text-gray-700"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="border-b-2 border-gray-200" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-b border-gray-100 px-3 py-2" {...props}>
      {children}
    </td>
  ),

  // Image — uses next/image for optimization
  img: ({ src, alt, ...props }) => {
    if (!src) return null;
    return (
      <figure className="my-6">
        <Image
          src={src}
          alt={alt ?? ''}
          width={800}
          height={450}
          className="rounded-lg"
          sizes="(max-width: 768px) 100vw, 800px"
          {...props}
        />
        {alt && (
          <figcaption className="mt-2 text-center text-sm text-gray-500">
            {alt}
          </figcaption>
        )}
      </figure>
    );
  },

  // Custom components available in MDX files
  Callout,
  SourceCitation,
};
