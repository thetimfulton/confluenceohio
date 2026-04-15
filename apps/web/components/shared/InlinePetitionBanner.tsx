import Link from 'next/link';

interface InlinePetitionBannerProps {
  headline?: string;
  description?: string;
  buttonText?: string;
}

export function InlinePetitionBanner({
  headline = 'Ready to add your name?',
  description = '22,000 signatures puts the question on the ballot. Every signature matters.',
  buttonText = 'Sign the Petition',
}: InlinePetitionBannerProps) {
  return (
    <section
      className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-8 text-center sm:px-8 sm:py-10"
      aria-label="Sign the petition"
    >
      <h2 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">
        {headline}
      </h2>
      <p className="mx-auto mb-6 max-w-lg text-sm text-gray-600 sm:text-base">
        {description}
      </p>
      <Link
        href="/sign"
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3.5
          text-base font-semibold text-white shadow-sm transition-colors
          hover:bg-blue-700
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {buttonText} &rarr;
      </Link>
    </section>
  );
}
