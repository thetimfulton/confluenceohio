'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnnouncer } from '@confluenceohio/ui/a11y';

// ---------------------------------------------------------------------------
// Role definitions (Artifact 08 §1.1–§1.7, §2.4)
// ---------------------------------------------------------------------------

interface RoleDef {
  id: string;
  label: string;
  description: string;
  commitment: string;
  mode: string;
}

const ROLES: RoleDef[] = [
  {
    id: 'signature_collector',
    label: 'Signature Collector',
    description:
      'Gather petition signatures at community events, farmers markets, festivals, and door-to-door.',
    commitment: '2\u20135 hrs/week',
    mode: 'In-person',
  },
  {
    id: 'social_amplifier',
    label: 'Social Amplifier',
    description:
      'Share campaign content on your social networks. Help our message reach beyond the people already paying attention.',
    commitment: '1\u20132 hrs/week',
    mode: 'Online',
  },
  {
    id: 'neighborhood_captain',
    label: 'Neighborhood Captain',
    description:
      'Coordinate campaign activity in your neighborhood. Be the point person for your area.',
    commitment: '3\u20135 hrs/week',
    mode: 'In-person + coordination',
  },
  {
    id: 'event_organizer',
    label: 'Event Organizer',
    description:
      'Plan and run community events \u2014 house parties, public forums, neighborhood meetups, info sessions.',
    commitment: '3\u20135 hrs/week',
    mode: 'In-person',
  },
  {
    id: 'story_collector',
    label: 'Story Collector',
    description:
      'Interview community members and help them share their perspectives for our Voices section.',
    commitment: '2\u20134 hrs/week',
    mode: 'In-person + writing',
  },
  {
    id: 'design_content',
    label: 'Design & Content Creator',
    description:
      'Help produce graphics, writing, video, and other campaign materials.',
    commitment: 'Flexible',
    mode: 'Remote',
  },
  {
    id: 'outreach_liaison',
    label: 'Outreach Liaison',
    description:
      'Connect the campaign with local businesses, civic organizations, and community groups. Build coalitions and secure endorsements.',
    commitment: '2\u20134 hrs/week',
    mode: 'In-person + email/phone',
  },
];

// ---------------------------------------------------------------------------
// Columbus neighborhoods (Artifact 08 §2.5)
// ---------------------------------------------------------------------------

const COLUMBUS_NEIGHBORHOODS = [
  'Bexley',
  'Brewery District',
  'Clintonville',
  'Columbus (Downtown)',
  'Driving Park',
  'East Columbus',
  'Eastmoor',
  'Franklinton',
  'Gahanna',
  'German Village',
  'Grandview Heights',
  'Harrison West',
  'Hilliard',
  'Hilltop',
  'Hungarian Village',
  'Italian Village',
  'King-Lincoln Bronzeville',
  'Linden',
  'Merion Village',
  'Near East Side',
  'Near North / Milo-Grogan',
  'North Columbus',
  'North Linden',
  'Northland',
  'Northwest Columbus',
  'Olde Towne East',
  'Old Oaks',
  'Reynoldsburg',
  'Scioto Peninsula',
  'Short North',
  'South Columbus / South Side',
  'Southeast Columbus',
  'Southwest Columbus',
  'The Ohio State University Area',
  'Upper Arlington',
  'Victorian Village',
  'Weinland Park',
  'West Columbus',
  'Westerville',
  'Westgate',
  'Whitehall',
  'Worthington',
] as const;

const AVAILABILITY_OPTIONS = [
  { id: 'weekday_mornings', label: 'Weekday mornings' },
  { id: 'weekday_evenings', label: 'Weekday evenings' },
  { id: 'weekends', label: 'Weekends' },
  { id: 'flexible', label: 'Flexible' },
] as const;

const REFERRAL_SOURCES = [
  { value: 'petition', label: 'Signed the petition' },
  { value: 'social_media', label: 'Social media' },
  { value: 'friend_family', label: 'Friend or family' },
  { value: 'news', label: 'News article' },
  { value: 'community_event', label: 'Community event' },
  { value: 'search', label: 'Search engine' },
  { value: 'other', label: 'Other' },
] as const;

// ---------------------------------------------------------------------------
// Form steps
// ---------------------------------------------------------------------------

type Step = 'info' | 'roles' | 'details';

const STEPS: { key: Step; label: string }[] = [
  { key: 'info', label: 'Your Info' },
  { key: 'roles', label: 'Pick Roles' },
  { key: 'details', label: 'Details' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface VolunteerFormProps {
  source: string;
  cameFromPetition: boolean;
}

export function VolunteerForm({ source, cameFromPetition }: VolunteerFormProps) {
  const router = useRouter();
  const { announce } = useAnnouncer();
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<Step>('info');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [neighborhoodOther, setNeighborhoodOther] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [referralSource, setReferralSource] = useState('');
  const [notes, setNotes] = useState('');

  const isOtherNeighborhood = neighborhood === '__other__';

  // Phone masking: (___) ___-____
  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
      if (digits.length === 0) {
        setPhone('');
        return;
      }
      let formatted = '(';
      formatted += digits.slice(0, 3);
      if (digits.length >= 3) formatted += ') ';
      formatted += digits.slice(3, 6);
      if (digits.length >= 6) formatted += '-';
      formatted += digits.slice(6, 10);
      setPhone(formatted);
    },
    [],
  );

  const toggleRole = useCallback((roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  }, []);

  const toggleAvailability = useCallback((optionId: string) => {
    setAvailability((prev) =>
      prev.includes(optionId)
        ? prev.filter((a) => a !== optionId)
        : [...prev, optionId],
    );
  }, []);

  // Step validation
  const canAdvanceFromInfo =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes('@');

  const canAdvanceFromRoles = selectedRoles.length > 0;

  const goNext = useCallback(() => {
    setError(null);
    setFieldErrors({});
    if (step === 'info') {
      if (!canAdvanceFromInfo) {
        const msg = 'Please fill in your name and email to continue.';
        setError(msg);
        announce(msg, 'assertive');
        return;
      }
      setStep('roles');
    } else if (step === 'roles') {
      if (!canAdvanceFromRoles) {
        const msg = 'Please select at least one role.';
        setError(msg);
        announce(msg, 'assertive');
        return;
      }
      setStep('details');
    }
  }, [step, canAdvanceFromInfo, canAdvanceFromRoles, announce]);

  const goBack = useCallback(() => {
    setError(null);
    setFieldErrors({});
    if (step === 'roles') setStep('info');
    else if (step === 'details') setStep('roles');
  }, [step]);

  // Submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);
      setFieldErrors({});

      const resolvedNeighborhood = isOtherNeighborhood
        ? neighborhoodOther.trim()
        : neighborhood === ''
          ? undefined
          : neighborhood;

      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone || undefined,
        neighborhood: resolvedNeighborhood,
        roles: selectedRoles,
        availability,
        referralSource: referralSource || undefined,
        notes: notes.trim() || undefined,
        // Turnstile token would be injected here by the widget
        turnstileToken:
          (document.querySelector<HTMLInputElement>(
            '[name="cf-turnstile-response"]',
          )?.value) || undefined,
        website: '', // Honeypot — must be empty
      };

      try {
        const response = await fetch('/api/volunteer/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!response.ok) {
          if (result.fields) {
            setFieldErrors(result.fields);
          }
          const serverMsg = result.error || 'Something went wrong. Please try again.';
          setError(serverMsg);
          announce(serverMsg, 'assertive');
          setSubmitting(false);
          return;
        }

        // Success — redirect
        router.push(result.redirect || '/volunteer/thank-you');
      } catch {
        const networkMsg = 'Network error. Please check your connection and try again.';
        setError(networkMsg);
        announce(networkMsg, 'assertive');
        setSubmitting(false);
      }
    },
    [
      firstName,
      lastName,
      email,
      phone,
      neighborhood,
      neighborhoodOther,
      isOtherNeighborhood,
      selectedRoles,
      availability,
      referralSource,
      notes,
      router,
      announce,
    ],
  );

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {/* Step indicator */}
      <nav aria-label="Form progress" className="mb-8">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i <= stepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
                aria-current={s.key === step ? 'step' : undefined}
              >
                {i + 1}
              </span>
              <span
                className={`text-sm font-medium ${
                  i <= stepIndex ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mx-1 h-px w-6 bg-gray-300" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* Honeypot — CSS-hidden (Artifact 08 §2.3) */}
      <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* ─── Step 1: Personal Info ─── */}
      {step === 'info' && (
        <fieldset className="space-y-5">
          <legend className="mb-1 text-lg font-semibold text-gray-900">
            Tell us about yourself
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="firstName"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                First name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                autoComplete="given-name"
                required
                maxLength={100}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  fieldErrors.firstName ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName[0]}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Last name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                autoComplete="family-name"
                required
                maxLength={100}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  fieldErrors.lastName ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName[0]}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                fieldErrors.email ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              autoComplete="tel"
              placeholder="(___) ___-____"
              value={phone}
              onChange={handlePhoneChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional. We&apos;ll only text you about shifts you signed up for.
            </p>
          </div>

          <div>
            <label
              htmlFor="neighborhood"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Neighborhood
            </label>
            <select
              id="neighborhood"
              value={neighborhood}
              onChange={(e) => {
                setNeighborhood(e.target.value);
                if (e.target.value !== '__other__') setNeighborhoodOther('');
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select your neighborhood (optional)</option>
              {COLUMBUS_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="__other__">Other (please specify)</option>
            </select>
            {isOtherNeighborhood && (
              <input
                type="text"
                placeholder="Your neighborhood"
                maxLength={100}
                value={neighborhoodOther}
                onChange={(e) => setNeighborhoodOther(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Next: Pick Roles
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </fieldset>
      )}

      {/* ─── Step 2: Role Selection (Artifact 08 §2.4) ─── */}
      {step === 'roles' && (
        <fieldset>
          <legend className="mb-1 text-lg font-semibold text-gray-900">
            Roles I&apos;m interested in
          </legend>
          <p className="mb-4 text-sm text-gray-500">
            Select at least one. You can always change your mind later.
          </p>

          <div
            role="group"
            aria-labelledby="roles-heading"
            className="space-y-3"
          >
            <span id="roles-heading" className="sr-only">
              Volunteer roles
            </span>
            {ROLES.map((role) => {
              const checked = selectedRoles.includes(role.id);
              return (
                <label
                  key={role.id}
                  htmlFor={`role-${role.id}`}
                  aria-label={role.label}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                    checked
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    id={`role-${role.id}`}
                    type="checkbox"
                    name="roles"
                    value={role.id}
                    checked={checked}
                    onChange={() => toggleRole(role.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-describedby={`role-desc-${role.id}`}
                  />
                  <div className="flex-1">
                    <span className="block text-sm font-semibold text-gray-900">
                      {role.label}
                    </span>
                    <span
                      id={`role-desc-${role.id}`}
                      className="mt-0.5 block text-sm text-gray-600"
                    >
                      {role.description}
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">
                      {role.commitment} &middot; {role.mode}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {fieldErrors.roles && (
            <p className="mt-2 text-xs text-red-600">{fieldErrors.roles[0]}</p>
          )}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            >
              <span aria-hidden="true">&larr;</span>
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Next: Details
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </fieldset>
      )}

      {/* ─── Step 3: Availability & Submit ─── */}
      {step === 'details' && (
        <fieldset className="space-y-5">
          <legend className="mb-1 text-lg font-semibold text-gray-900">
            A few more details
          </legend>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">
              When are you available?
            </span>
            <div className="flex flex-wrap gap-3">
              {AVAILABILITY_OPTIONS.map((opt) => {
                const checked = availability.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                      checked
                        ? 'border-blue-600 bg-blue-50 font-medium text-blue-800'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="availability"
                      value={opt.id}
                      checked={checked}
                      onChange={() => toggleAvailability(opt.id)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="referralSource"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              How did you hear about us?
            </label>
            <select
              id="referralSource"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select one (optional)</option>
              {REFERRAL_SOURCES.map((src) => (
                <option key={src.value} value={src.value}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Anything else?
            </label>
            <textarea
              id="notes"
              maxLength={500}
              rows={3}
              placeholder="Anything you'd like us to know — skills, availability, questions, ideas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {notes.length}/500
            </p>
          </div>

          {/* Turnstile widget placeholder */}
          <div
            className="cf-turnstile"
            data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            data-size="invisible"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            >
              <span aria-hidden="true">&larr;</span>
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing you up&hellip;
                </>
              ) : (
                <>Count Me In &rarr;</>
              )}
            </button>
          </div>
        </fieldset>
      )}
    </form>
  );
}
