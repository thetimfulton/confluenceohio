#!/usr/bin/env npx tsx
/**
 * Environment Variable Validation Script
 *
 * Validates that all required environment variables are present, non-empty,
 * and correctly formatted. Warns about test/placeholder values in production.
 *
 * Usage:
 *   npx tsx scripts/validate-env.ts          # reads .env.local + process.env
 *   NODE_ENV=production npx tsx scripts/validate-env.ts  # production checks
 *
 * Exit codes:
 *   0 — all required variables present (warnings are non-fatal)
 *   1 — one or more required variables missing or invalid
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { clientEnvSchema, serverEnvSchema, getProductionWarnings } from '../packages/core/env.js';

// ---------------------------------------------------------------------------
// Load .env.local (if present) into process.env
// In CI, env vars come from the runner environment, so .env.local may not exist.
// ---------------------------------------------------------------------------
function loadDotenvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Don't overwrite existing env vars (CI env takes precedence)
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const projectRoot = resolve(import.meta.dirname ?? '.', '..');
loadDotenvFile(resolve(projectRoot, '.env.local'));
loadDotenvFile(resolve(projectRoot, '.env'));

// ---------------------------------------------------------------------------
// Collect all variable names from both schemas
// ---------------------------------------------------------------------------
const clientKeys = Object.keys(clientEnvSchema.shape) as (keyof z.infer<typeof clientEnvSchema>)[];
const serverKeys = Object.keys(serverEnvSchema.shape) as (keyof z.infer<typeof serverEnvSchema>)[];

type Status = 'present' | 'missing' | 'invalid' | 'test_value';

interface VarResult {
  name: string;
  scope: 'client' | 'server';
  status: Status;
  error?: string;
}

// ---------------------------------------------------------------------------
// Validate each variable individually so we can report per-variable status
// ---------------------------------------------------------------------------
const results: VarResult[] = [];
let hasErrors = false;

function validateVariable(
  name: string,
  scope: 'client' | 'server',
  schema: z.ZodType,
): void {
  const value = process.env[name];

  if (value === undefined || value === '') {
    results.push({ name, scope, status: 'missing', error: 'Missing or empty' });
    hasErrors = true;
    return;
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join('; ');
    results.push({ name, scope, status: 'invalid', error: errorMsg });
    hasErrors = true;
    return;
  }

  results.push({ name, scope, status: 'present' });
}

// Validate client variables
for (const key of clientKeys) {
  const fieldSchema = clientEnvSchema.shape[key];
  validateVariable(key, 'client', fieldSchema);
}

// Validate server variables
for (const key of serverKeys) {
  const fieldSchema = serverEnvSchema.shape[key];
  validateVariable(key, 'server', fieldSchema);
}

// ---------------------------------------------------------------------------
// Production warnings
// ---------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
const envSnapshot: Record<string, string | undefined> = {};
for (const key of [...clientKeys, ...serverKeys]) {
  envSnapshot[key] = process.env[key];
}
const warnings = getProductionWarnings(envSnapshot);

// Apply warning status to results
for (const warning of warnings) {
  const result = results.find((r) => r.name === warning.variable);
  if (result && result.status === 'present') {
    result.status = 'test_value';
    result.error = warning.message;
  }
}

// ---------------------------------------------------------------------------
// Print summary table
// ---------------------------------------------------------------------------
const STATUS_ICONS: Record<Status, string> = {
  present: '\u2705',    // ✅
  missing: '\u274C',    // ❌
  invalid: '\u274C',    // ❌
  test_value: '\u26A0\uFE0F',  // ⚠️
};

const maxNameLen = Math.max(...results.map((r) => r.name.length));
const maxScopeLen = 6; // "server"

console.log('\n' + '='.repeat(70));
console.log('  Confluence Ohio — Environment Variable Validation');
console.log('  ' + (isProduction ? 'MODE: PRODUCTION' : 'MODE: development'));
console.log('='.repeat(70) + '\n');

console.log(
  '  ' +
  'Variable'.padEnd(maxNameLen + 2) +
  'Scope'.padEnd(maxScopeLen + 2) +
  'Status',
);
console.log('  ' + '-'.repeat(maxNameLen + maxScopeLen + 20));

for (const result of results) {
  const icon = STATUS_ICONS[result.status];
  const errorSuffix = result.error ? `  ${result.error}` : '';
  console.log(
    '  ' +
    result.name.padEnd(maxNameLen + 2) +
    result.scope.padEnd(maxScopeLen + 2) +
    icon +
    errorSuffix,
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const presentCount = results.filter((r) => r.status === 'present').length;
const missingCount = results.filter((r) => r.status === 'missing' || r.status === 'invalid').length;
const warningCount = results.filter((r) => r.status === 'test_value').length;

console.log('\n' + '-'.repeat(70));
console.log(`  ${presentCount} present  |  ${missingCount} missing/invalid  |  ${warningCount} warnings`);

if (isProduction && warningCount > 0) {
  console.log('\n  \u26A0\uFE0F  Production deployment detected with test/placeholder values.');
  console.log('  Review warnings above before deploying.\n');
}

if (hasErrors) {
  console.log('\n  \u274C  Validation FAILED. Fix missing/invalid variables above.\n');
  process.exit(1);
} else {
  console.log('\n  \u2705  All required environment variables are present.\n');
  process.exit(0);
}
