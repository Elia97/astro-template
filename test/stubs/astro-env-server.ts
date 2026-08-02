import process from 'node:process'

// Stub of `astro:env/server` for tests (mapped via resolve.alias in
// vitest.config.ts). The virtual module only exists in the Astro build; under
// vitest we read from process.env instead, mirroring astro.config.mjs's schema
// — types and defaults included. Values are evaluated at module import, so to
// drive them in a test:
//   1. vi.stubEnv('BOTID_ENFORCE', 'true'),
//   2. vi.resetModules(),
//   3. re-import the module under test.
// (test/helpers/actions.ts wraps that sequence.)
export function getSecret(key: string): string | undefined {
  return process.env[key]
}

export const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'no-reply@example.com'
export const CONTACT_FROM_NAME = process.env.CONTACT_FROM_NAME || '<PROJECT_NAME>'
export const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'info@example.com'
export const BOTID_ENFORCE = process.env.BOTID_ENFORCE === 'true'
