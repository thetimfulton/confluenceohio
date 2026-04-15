import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'How Confluence Ohio collects, uses, and protects your personal information.',
  path: '/privacy',
  noIndex: true,
});

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema('/privacy')!} />
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Last updated: April 2026
      </p>

      <div className="space-y-8 text-base leading-relaxed text-gray-600">
        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            What Data We Collect
          </h2>
          <p>
            Confluence Ohio collects only the information necessary to operate
            the petition campaign and communicate with supporters:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>
              <strong>Petition signatures:</strong> First name, last name, email
              address, and street address (for Ohio residency verification).
            </li>
            <li>
              <strong>Email subscribers:</strong> Email address and optional
              first name.
            </li>
            <li>
              <strong>Volunteer signups:</strong> Name, email, phone (optional),
              neighborhood, role interests, and availability.
            </li>
            <li>
              <strong>Community voices:</strong> Name, email, neighborhood
              (optional), position, title, and story text.
            </li>
            <li>
              <strong>Donations:</strong> Processed entirely by ActBlue. We
              receive donor name, amount, and attribution data via webhook. We
              do not collect or store payment card information.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            How We Use Your Data
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <strong>Ohio residency verification:</strong> Your address is sent
              to Smarty (formerly SmartyStreets) to verify it is a valid Ohio
              address. We hash the normalized address for deduplication and do
              not share raw addresses with other parties.
            </li>
            <li>
              <strong>Campaign communications:</strong> Your email address is
              used to send petition confirmation, campaign updates, and
              volunteer coordination via Brevo (formerly Sendinblue).
            </li>
            <li>
              <strong>Petition submission:</strong> Your signature is part of a
              petition that may be submitted to the Franklin County Board of
              Elections. Your name and address are required by Ohio law for
              petition validation.
            </li>
            <li>
              <strong>Analytics:</strong> We use PostHog for privacy-respecting
              analytics (no PII in events) and Vercel Analytics for web
              performance metrics.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Third-Party Services
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <strong>Supabase:</strong> Database hosting and authentication
              (data stored in the US).
            </li>
            <li>
              <strong>Smarty:</strong> Address verification (US Street API).
              Your address is sent for validation; Smarty&apos;s privacy policy
              governs their handling.
            </li>
            <li>
              <strong>Brevo:</strong> Email delivery. Your email address and
              first name are shared for transactional and marketing emails.
            </li>
            <li>
              <strong>ActBlue:</strong> Donation processing. ActBlue is a
              separate platform with its own privacy policy.
            </li>
            <li>
              <strong>Cloudflare:</strong> Security (Turnstile bot prevention,
              DNS, CDN). Cloudflare processes IP addresses for security
              purposes.
            </li>
            <li>
              <strong>Vercel:</strong> Website hosting and performance
              analytics.
            </li>
            <li>
              <strong>PostHog:</strong> Product analytics (no PII collected in
              events).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Data Retention and Deletion
          </h2>
          <p>
            Petition signature data is retained for the duration of the campaign
            and as required by Ohio election law. You may request deletion of
            your signature and associated data by emailing{' '}
            <a
              href="mailto:privacy@confluenceohio.org"
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              privacy@confluenceohio.org
            </a>
            . We will process deletion requests within 30 days, subject to legal
            retention requirements.
          </p>
          <p className="mt-3">
            Email subscription data is retained until you unsubscribe. Every
            email includes an unsubscribe link.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">Cookies</h2>
          <p>
            We use essential cookies only: Cloudflare Turnstile (bot prevention)
            and session management. PostHog analytics uses cookieless tracking
            by default. We do not use advertising cookies or tracking pixels. If
            Google Analytics (GA4) is enabled, it is consent-gated — analytics
            cookies are only set after you opt in.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            CAN-SPAM Compliance
          </h2>
          <p>
            All campaign emails include our organization name and address, a
            clear unsubscribe mechanism, and accurate subject lines. We honor
            unsubscribe requests within 10 business days.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-gray-900">Contact</h2>
          <p>
            For privacy questions or data requests, contact{' '}
            <a
              href="mailto:privacy@confluenceohio.org"
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              privacy@confluenceohio.org
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
