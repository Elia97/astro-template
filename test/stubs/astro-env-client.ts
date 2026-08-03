import process from 'node:process'

// Stub of `astro:env/client` for tests (mapped via resolve.alias in
// vitest.config.ts) — the client-side half of astro-env-server.ts, mirroring the
// same schema in astro.config.mjs. Every key here is `optional: true`, so the
// stub returns undefined rather than a default: that IS the unconfigured state
// the consent/analytics gating is built around.
// Values are read at module import — same stubEnv → resetModules → re-import
// sequence as astro-env-server.ts.
export const PUBLIC_GTM_ID: string | undefined = process.env.PUBLIC_GTM_ID
export const PUBLIC_IUBENDA_SITE_ID: string | undefined = process.env.PUBLIC_IUBENDA_SITE_ID
export const PUBLIC_IUBENDA_COOKIE_POLICY_ID: string | undefined = process.env.PUBLIC_IUBENDA_COOKIE_POLICY_ID
