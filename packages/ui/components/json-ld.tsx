/**
 * Renders JSON-LD structured data as a <script> tag.
 *
 * Used server-side in page components (not in generateMetadata, which
 * cannot output arbitrary <script> tags). Sanitizes output to prevent
 * XSS via closing </script> tags embedded in data values.
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  // Serialize and escape closing script tags to prevent XSS.
  // JSON.stringify alone doesn't escape </script>, which could break
  // out of the script element if user-controlled data is present.
  const json = JSON.stringify(data, null, 0).replace(
    /<\/script/gi,
    '<\\/script',
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
