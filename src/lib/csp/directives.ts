// Every third-party origin goes here, never in `vercel.json`: a policy that blocks the
// CMP raises no error, it just renders no cookie banner in production.

const SCRIPT_HOSTS = ['https://www.googletagmanager.com', 'https://cdn.iubenda.com', 'https://cs.iubenda.com']

const STATIC_DIRECTIVES = [
  "default-src 'self'",
  // Hashing styles instead would make `'unsafe-inline'` inert and break every scoped
  // `<style>` Astro emits.
  "style-src 'self' 'unsafe-inline' https://cdn.iubenda.com",
  "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com https://cdn.iubenda.com",
  "font-src 'self' data:",
  "object-src 'none'",
  "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.iubenda.com",
  'frame-src https://www.googletagmanager.com',
  "base-uri 'self'",
  "form-action 'self'",
]

export function buildCspContent(scriptHashes: readonly string[]): string {
  const scriptSrc = ["script-src 'self'", ...scriptHashes.map((hash) => `'${hash}'`), ...SCRIPT_HOSTS]
  return [scriptSrc.join(' '), ...STATIC_DIRECTIVES].join('; ')
}
