import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'Terms of Use',
  description:
    'Terms of use for the Confluence Ohio website and petition.',
  path: '/terms',
  noIndex: true,
});

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema('/terms')!} />
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Terms of Use
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Last updated: April 2026
      </p>

      <div className="space-y-8 text-base leading-relaxed text-gray-600">
        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Acceptance of Terms
          </h2>
          <p>
            By accessing and using confluenceohio.org (the &ldquo;Site&rdquo;),
            you agree to these Terms of Use. If you do not agree, please do not
            use the Site.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            About the Organization
          </h2>
          <p>
            Confluence Ohio is a 501(c)(4) civic organization registered in the
            state of Ohio. The Site is operated by Confluence Ohio to support our
            civic petition campaign to rename Columbus, Ohio.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>
              Submit false, misleading, or fraudulent information through any
              form on the Site.
            </li>
            <li>
              Use automated tools, bots, or scripts to interact with the Site or
              submit forms.
            </li>
            <li>
              Attempt to circumvent security measures, including bot prevention
              (Cloudflare Turnstile) or rate limiting.
            </li>
            <li>
              Submit petition signatures using false identities or addresses.
            </li>
            <li>
              Use the Site to harass, threaten, or abuse any individual or group.
            </li>
            <li>
              Reproduce, distribute, or create derivative works from Site
              content without permission, except for personal, non-commercial
              use or fair use as permitted by law.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Petition Signatures
          </h2>
          <p>
            By signing the petition on this Site, you represent that: (1) you
            are an Ohio resident; (2) the name and address you provide are your
            own; (3) you understand that your signature may be submitted to the
            Franklin County Board of Elections as part of a citizen-initiated
            charter amendment petition.
          </p>
          <p className="mt-3">
            Petition signatures are subject to verification. Fraudulent
            signatures may be reported to the appropriate authorities.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Community Voices
          </h2>
          <p>
            By submitting a perspective through the Community Voices feature,
            you grant Confluence Ohio a non-exclusive, royalty-free license to
            publish, display, and share your submission on the Site and in
            campaign materials. You retain ownership of your content. We reserve
            the right to moderate submissions for respectfulness, relevance, and
            compliance with community guidelines.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Donations
          </h2>
          <p>
            Donations are processed by ActBlue, a third-party platform.
            Donations are subject to ActBlue&apos;s terms of service.
            Contributions to Confluence Ohio are not tax-deductible.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Intellectual Property
          </h2>
          <p>
            The Confluence Ohio name, logo, and original content on this Site
            are the property of Confluence Ohio. Historical facts, public
            records, and government documents referenced on this Site are in the
            public domain.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Disclaimer
          </h2>
          <p>
            The Site is provided &ldquo;as is&rdquo; without warranties of any
            kind. Confluence Ohio does not guarantee the accuracy of signature
            counts, milestone projections, or campaign timelines displayed on the
            Site. Historical information is sourced and cited but is presented
            for educational purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Limitation of Liability
          </h2>
          <p>
            Confluence Ohio shall not be liable for any indirect, incidental, or
            consequential damages arising from your use of the Site.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Changes to These Terms
          </h2>
          <p>
            We may update these Terms of Use from time to time. The
            &ldquo;Last updated&rdquo; date at the top of this page reflects
            the most recent revision. Continued use of the Site after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">Contact</h2>
          <p>
            Questions about these terms? Contact{' '}
            <a
              href="mailto:info@confluenceohio.org"
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              info@confluenceohio.org
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
