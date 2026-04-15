import { z } from 'zod';

// ---------------------------------------------------------------------------
// Cloudflare Turnstile test keys (always-pass)
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
// ---------------------------------------------------------------------------
const TURNSTILE_TEST_SITE_KEYS = new Set([
  '1x00000000000000000000AA', // always passes
  '2x00000000000000000000AB', // always blocks
  '3x00000000000000000000FF', // forces interactive challenge
]);

const TURNSTILE_TEST_SECRET_KEYS = new Set([
  '1x0000000000000000000000000000000AA', // always passes
  '2x0000000000000000000000000000000AA', // always fails
  '3x0000000000000000000000000000000AA', // yields token-already-spent error
]);

// ---------------------------------------------------------------------------
// Client-side environment variables (NEXT_PUBLIC_*)
// Embedded in the client bundle at build time — must contain only non-secrets.
// ---------------------------------------------------------------------------
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_URL is required')
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .refine(
      (v) => v.startsWith('https://') || v.startsWith('http://127.0.0.1') || v.startsWith('http://localhost'),
      'NEXT_PUBLIC_SUPABASE_URL must start with https:// (or http://localhost for local dev)',
    ),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  NEXT_PUBLIC_SMARTY_EMBEDDED_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SMARTY_EMBEDDED_KEY is required'),

  NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN: z
    .string()
    .min(1, 'NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN is required'),

  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY is required'),

  NEXT_PUBLIC_POSTHOG_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_POSTHOG_KEY is required')
    .refine(
      (v) => v.startsWith('phc_'),
      'NEXT_PUBLIC_POSTHOG_KEY should start with phc_',
    ),

  NEXT_PUBLIC_POSTHOG_HOST: z
    .string()
    .min(1, 'NEXT_PUBLIC_POSTHOG_HOST is required')
    .url('NEXT_PUBLIC_POSTHOG_HOST must be a valid URL'),

  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_GA4_MEASUREMENT_ID is required')
    .regex(/^G-[A-Z0-9]+$/, 'NEXT_PUBLIC_GA4_MEASUREMENT_ID must match G-XXXXXXX pattern'),

  NEXT_PUBLIC_SITE_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_SITE_URL is required')
    .url('NEXT_PUBLIC_SITE_URL must be a valid URL'),
});

// ---------------------------------------------------------------------------
// Server-side environment variables (secrets — never exposed to client)
// ---------------------------------------------------------------------------
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  SUPABASE_DB_URL: z
    .string()
    .min(1, 'SUPABASE_DB_URL is required')
    .refine(
      (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      'SUPABASE_DB_URL must be a PostgreSQL connection string',
    ),

  SMARTY_AUTH_ID: z
    .string()
    .min(1, 'SMARTY_AUTH_ID is required'),

  SMARTY_AUTH_TOKEN: z
    .string()
    .min(1, 'SMARTY_AUTH_TOKEN is required'),

  BREVO_API_KEY: z
    .string()
    .min(1, 'BREVO_API_KEY is required')
    .refine(
      (v) => v.startsWith('xkeysib-'),
      'BREVO_API_KEY should start with xkeysib-',
    ),

  BREVO_WEBHOOK_SECRET: z
    .string()
    .min(1, 'BREVO_WEBHOOK_SECRET is required'),

  ACTBLUE_WEBHOOK_USERNAME: z
    .string()
    .min(1, 'ACTBLUE_WEBHOOK_USERNAME is required'),

  ACTBLUE_WEBHOOK_PASSWORD: z
    .string()
    .min(1, 'ACTBLUE_WEBHOOK_PASSWORD is required'),

  TURNSTILE_SECRET_KEY: z
    .string()
    .min(1, 'TURNSTILE_SECRET_KEY is required'),

  INNGEST_EVENT_KEY: z
    .string()
    .min(1, 'INNGEST_EVENT_KEY is required'),

  INNGEST_SIGNING_KEY: z
    .string()
    .min(1, 'INNGEST_SIGNING_KEY is required'),

  EMAIL_VERIFICATION_SECRET: z
    .string()
    .min(1, 'EMAIL_VERIFICATION_SECRET is required')
    .min(32, 'EMAIL_VERIFICATION_SECRET should be at least 32 characters (use `openssl rand -hex 32`)'),

  ADMIN_ALLOWED_EMAILS: z
    .string()
    .min(1, 'ADMIN_ALLOWED_EMAILS is required')
    .refine(
      (v) => v.split(',').every((email) => email.trim().includes('@')),
      'ADMIN_ALLOWED_EMAILS must be a comma-separated list of email addresses',
    ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ---------------------------------------------------------------------------
// Warnings (not failures — issues that should be flagged but don't block)
// ---------------------------------------------------------------------------
export interface EnvWarning {
  variable: string;
  message: string;
}

/**
 * Check for test/placeholder values that shouldn't appear in production.
 * Returns warnings (not errors) — these don't prevent startup but should
 * be addressed before launch.
 */
export function getProductionWarnings(env: Record<string, string | undefined>): EnvWarning[] {
  const warnings: EnvWarning[] = [];

  if (TURNSTILE_TEST_SITE_KEYS.has(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '')) {
    warnings.push({
      variable: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      message: 'Using Turnstile test key — bot protection is disabled',
    });
  }

  if (TURNSTILE_TEST_SECRET_KEYS.has(env.TURNSTILE_SECRET_KEY ?? '')) {
    warnings.push({
      variable: 'TURNSTILE_SECRET_KEY',
      message: 'Using Turnstile test secret key — server-side validation is bypassed',
    });
  }

  const placeholderPatterns = [
    'your-', 'your_', 'placeholder', 'changeme', 'replace-me',
    'xxxxxxxxxx', 'XXXXXXXXXX', 'todo', 'fixme',
  ];
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    for (const pattern of placeholderPatterns) {
      if (value.toLowerCase().includes(pattern)) {
        warnings.push({
          variable: key,
          message: `Appears to contain a placeholder value ("${pattern}")`,
        });
        break;
      }
    }
  }

  if (env.NEXT_PUBLIC_GA4_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    warnings.push({
      variable: 'NEXT_PUBLIC_GA4_MEASUREMENT_ID',
      message: 'Using placeholder GA4 measurement ID',
    });
  }

  if (env.NEXT_PUBLIC_POSTHOG_KEY?.startsWith('phc_your')) {
    warnings.push({
      variable: 'NEXT_PUBLIC_POSTHOG_KEY',
      message: 'Using placeholder PostHog key',
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Runtime validation helpers (for use in apps/web)
// ---------------------------------------------------------------------------

/**
 * Validate and return typed client env vars.
 * Safe to call in both server and client components.
 */
export function validateClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SMARTY_EMBEDDED_KEY: process.env.NEXT_PUBLIC_SMARTY_EMBEDDED_KEY,
    NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN: process.env.NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_GA4_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

/**
 * Validate and return typed server env vars.
 * Must only be called in server-side code (API routes, server components,
 * Edge Functions, Inngest functions). Will throw if called in the browser.
 */
export function validateServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('validateServerEnv() must not be called in client-side code');
  }

  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
    SMARTY_AUTH_ID: process.env.SMARTY_AUTH_ID,
    SMARTY_AUTH_TOKEN: process.env.SMARTY_AUTH_TOKEN,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_WEBHOOK_SECRET: process.env.BREVO_WEBHOOK_SECRET,
    ACTBLUE_WEBHOOK_USERNAME: process.env.ACTBLUE_WEBHOOK_USERNAME,
    ACTBLUE_WEBHOOK_PASSWORD: process.env.ACTBLUE_WEBHOOK_PASSWORD,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    EMAIL_VERIFICATION_SECRET: process.env.EMAIL_VERIFICATION_SECRET,
    ADMIN_ALLOWED_EMAILS: process.env.ADMIN_ALLOWED_EMAILS,
  });
}
