import process from 'node:process'

// Mirrors the client half of astro.config.mjs's env schema: every key is
// `optional: true`, so unset reads as undefined — the unconfigured state.
export const PUBLIC_GTM_ID: string | undefined = process.env.PUBLIC_GTM_ID
export const PUBLIC_IUBENDA_SITE_ID: string | undefined = process.env.PUBLIC_IUBENDA_SITE_ID
export const PUBLIC_IUBENDA_COOKIE_POLICY_ID: string | undefined = process.env.PUBLIC_IUBENDA_COOKIE_POLICY_ID
