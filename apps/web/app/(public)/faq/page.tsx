import { FAQAccordion } from '@/components/shared/FAQAccordion';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { buildPageMetadata } from '@/lib/seo';
import { faqPageSchema, breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'FAQ',
  description:
    'Answers to common questions about renaming Columbus, Ohio to Confluence — process, cost, legality, timeline, and more.',
  path: '/faq',
  ogImage: '/images/og/faq.png',
});

const FAQ_GROUPS = [
  {
    title: 'The Basics',
    items: [
      {
        question: 'What is Confluence Ohio?',
        answer:
          'Confluence Ohio is a 501(c)(4) civic organization building a movement to rename Columbus, Ohio to Confluence, Ohio \u2014 replacing a name honoring a historical figure with no connection to this place with one rooted in the geography that created the city. The Scioto and Olentangy rivers meet in downtown Columbus; that confluence is why the city exists.',
      },
      {
        question: 'Why "Confluence" specifically?',
        answer:
          'Confluence is the geographic term for the meeting of two rivers \u2014 which is exactly what happens in downtown Columbus. The Scioto and Olentangy converge just northwest of North Bank Park. This is the physical feature that determined the city\u2019s location when the state legislature chose it as the capital in 1812. The word also captures the city\u2019s identity as a place where diverse communities, industries, and ideas come together. No other major American city carries this name.',
      },
      {
        question: 'Is this a joke, like the Flavortown petition?',
        answer:
          'No. The 2020 Flavortown petition \u2014 which collected over 117,000 signatures \u2014 demonstrated that tens of thousands of people were genuinely open to rethinking the city\u2019s name. We channel that energy into a substantive proposal: a name rooted in geography and history, pursued through the legal process Ohio provides.',
      },
      {
        question: 'Who is behind this campaign?',
        answer:
          'Confluence Ohio is a 501(c)(4) civic organization led by Columbus residents. We are transparent about our team, our funding, and our methods. See our About page for details.',
      },
    ],
  },
  {
    title: 'The Process',
    items: [
      {
        question: 'How would this actually happen legally?',
        answer:
          'Under Columbus\u2019s city charter, citizens can propose charter amendments through a petition process. The process requires: (1) a petition committee of five registered electors files with the city; (2) signatures equal to 10% of voters in the last general municipal election are collected within the allowed timeframe; (3) the Franklin County Board of Elections validates the signatures; (4) the amendment appears on a ballot for a simple majority vote.',
      },
      {
        question: 'How many signatures are needed?',
        answer:
          'Based on approximately 220,000 voters in the last general municipal election, we need roughly 22,000 valid signatures. We will confirm the exact threshold when we formalize the petition committee with the Franklin County Board of Elections.',
      },
      {
        question: 'When would the vote happen?',
        answer:
          'Once validated signatures are submitted, the amendment would appear on the next eligible ballot \u2014 either a primary or general election. The goal is to build public support and gather signatures on a timeline that leads to a vote within two to three years.',
      },
      {
        question: 'Does the City Council have to approve this?',
        answer:
          'No. A citizen-initiated charter amendment bypasses City Council entirely. It goes directly from petition signatures to the ballot. Council could separately place a similar measure on the ballot, but our path does not require their cooperation.',
      },
      {
        question: 'What if the vote fails?',
        answer:
          'Then the name stays Columbus, and the democratic process has spoken. We believe in the process regardless of the outcome. A robust public conversation about the city\u2019s identity has value even if the measure does not pass on the first attempt.',
      },
    ],
  },
  {
    title: 'Cost and Logistics',
    items: [
      {
        question: 'How much would renaming cost?',
        answer:
          'Honest answer: we do not have a precise figure yet, and anyone who claims to is guessing. The cost depends on implementation decisions \u2014 phased vs. immediate, which systems change first, how the transition is managed. We are commissioning an independent cost analysis and will publish it. We believe a phased transition significantly reduces the sticker shock.',
      },
      {
        question: 'Who pays for it?',
        answer:
          'City government would bear some costs (signage, official documents, systems). State and federal entities would update their own records on normal cycles. Private businesses would update on their own timelines. A phased approach over 3\u20135 years distributes these costs and allows them to overlap with normal replacement cycles.',
      },
      {
        question: 'What about the sports teams? Ohio State?',
        answer:
          'The Columbus Crew, Columbus Blue Jackets, and other institutions would make their own decisions about branding. History suggests most would adopt the new name. Ohio State University is "The Ohio State University" \u2014 its identity is not dependent on the city\u2019s name. These conversations would happen during the transition period.',
      },
    ],
  },
  {
    title: 'History and Identity',
    items: [
      {
        question: "Wasn't Columbus just a man of his time?",
        answer:
          'Columbus was imprisoned by the Spanish Crown \u2014 his own employers \u2014 for the brutality of his governance. He was extreme even by the standards of his era. But our core argument does not depend on whether Columbus was uniquely bad. Our argument is that he has no connection to this city. Whether you view him as villain or man-of-his-time, he never set foot in Ohio. The name is borrowed, not earned.',
      },
      {
        question: "Isn't this erasing history?",
        answer:
          'Renaming a city is not erasing history \u2014 it is making a different choice about what to honor. The history of Columbus, Ohio, does not disappear. Every book, record, photograph, and memory remains. What changes is the name on the signs, which shifts from honoring a distant historical figure to describing the place itself.',
      },
      {
        question: 'What about Italian American heritage?',
        answer:
          'We take this concern seriously. Columbus Day was in part a recognition of Italian American contributions during an era of anti-Italian discrimination. But Italian American heritage in Columbus is real and specific \u2014 the North End markets, the community institutions, the families who built this city. That heritage deserves its own dedicated recognition, not a borrowed connection to a Genoese explorer.',
      },
      {
        question: 'What do Indigenous communities think?',
        answer:
          'We are actively engaging with Indigenous communities and organizations in central Ohio. We do not speak for them. The Indigenous history at the confluence is a crucial part of this story, and Indigenous voices must be central to how it is told.',
      },
      {
        question: 'Are there other cities named Confluence?',
        answer:
          'There is a small borough called Confluence in Somerset County, Pennsylvania (population roughly 750), also named for a river confluence. No major American city carries the name.',
      },
    ],
  },
  {
    title: 'Getting Involved',
    items: [
      {
        question: 'How can I help?',
        answer:
          'Sign the petition. Share the campaign with friends. Volunteer \u2014 we need signature collectors, social media amplifiers, event organizers, neighborhood captains, and content creators. Donate to fund the campaign\u2019s operations. Every action moves us closer to the ballot.',
      },
      {
        question: "I'm not sure how I feel about this. Is that okay?",
        answer:
          'Absolutely. We built the Voices section of this site specifically for people working through this question. We welcome supporters, opponents, and everyone in between. Read the arguments, explore the history, and share your perspective. This should be a conversation, not a loyalty test.',
      },
      {
        question: 'I oppose renaming. Will my voice be heard here?',
        answer:
          'Yes. Our Voices section publishes perspectives from all positions \u2014 support, oppose, and undecided. We believe the strongest case for renaming is made in the presence of the strongest case against it. If you have a thoughtful perspective, we want to publish it.',
      },
    ],
  },
];

export default function FAQPage() {
  const allFaqItems = FAQ_GROUPS.flatMap((group) => group.items);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={faqPageSchema(allFaqItems)} />
      <JsonLd data={breadcrumbSchema('/faq')!} />

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Frequently Asked Questions
      </h1>
      <p className="mb-10 text-lg text-gray-600">
        Answers to the most common questions about renaming Columbus, Ohio to
        Confluence.
      </p>

      <FAQAccordion groups={FAQ_GROUPS} />

      <div className="mt-12">
        <InlinePetitionBanner />
      </div>
    </main>
  );
}
