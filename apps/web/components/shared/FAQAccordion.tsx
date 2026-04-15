'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQGroup {
  title: string;
  items: FAQItem[];
}

interface FAQAccordionProps {
  groups: FAQGroup[];
}

export function FAQAccordion({ groups }: FAQAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  function toggleItem(key: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.title} aria-labelledby={`faq-group-${slugify(group.title)}`}>
          <h2
            id={`faq-group-${slugify(group.title)}`}
            className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl"
          >
            {group.title}
          </h2>
          <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {group.items.map((item) => {
              const key = `${group.title}-${item.question}`;
              const isOpen = openItems.has(key);
              return (
                <div key={key} className="group">
                  <dt>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between px-4 py-4 text-left sm:px-6"
                      onClick={() => toggleItem(key)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${slugify(key)}`}
                    >
                      <span className="text-sm font-semibold text-gray-900 sm:text-base">
                        {item.question}
                      </span>
                      <span
                        className={`ml-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </button>
                  </dt>
                  {isOpen && (
                    <dd
                      id={`faq-answer-${slugify(key)}`}
                      className="px-4 pb-4 sm:px-6 sm:pb-6"
                    >
                      <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                        {item.answer}
                      </p>
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
