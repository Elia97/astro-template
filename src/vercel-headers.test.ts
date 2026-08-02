import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guards the unconditional security headers in vercel.json. `astro dev` never
// reads that file, so nothing exercises them before a deploy — CI is the only
// place the source of truth can be locked. The siblings cover the conditional
// rules: vercel-robots.test.ts the preview noindex, vercel-botid.test.ts the
// proxy paths.
//
// The CSP assertions pin the EXACT source list per directive, not a superset.
// The template ships a self-only policy: a fork adding a vendor (analytics, a
// CMS, an image CDN) has to widen both the policy and this test, which is the
// point — a vendor origin should never slip in as a side effect of pasting a
// snippet.

type HeaderEntry = { key: string; value: string }
type HeaderRule = { source: string; has?: unknown[]; headers: HeaderEntry[] }
type Rewrite = { source: string; destination: string }
type VercelConfig = { headers: HeaderRule[]; rewrites: Rewrite[] }

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'),
) as VercelConfig

const globalRule = config.headers.find((rule) => rule.source === '/(.*)' && !rule.has)
if (!globalRule) throw new Error('vercel.json: no unconditional "/(.*)" header rule')

function header(key: string): string {
  const entry = globalRule?.headers.find((e) => e.key.toLowerCase() === key.toLowerCase())
  if (!entry) throw new Error(`vercel.json: missing "${key}" header`)
  return entry.value
}

// Parsed once: the assertions are about policy, not about the order or the
// spacing of one long string.
const directives = new Map(
  header('Content-Security-Policy')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): [string, string[]] => {
      const [name = '', ...values] = part.split(/\s+/)
      return [name, values]
    }),
)

const sources = (directive: string): string[] => directives.get(directive) ?? []

describe('security headers', () => {
  // A header quietly dropped from the list is a downgrade nothing else would
  // report: the site keeps working, just less safely.
  it('carries the full set on every response', () => {
    expect(globalRule?.headers.map((entry) => entry.key).sort()).toEqual([
      'Content-Security-Policy',
      'Permissions-Policy',
      'Referrer-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ])
  })

  it('refuses framing and MIME sniffing', () => {
    expect(header('X-Frame-Options')).toBe('DENY')
    expect(header('X-Content-Type-Options')).toBe('nosniff')
  })

  it('never leaks a full URL cross-origin in the referrer', () => {
    expect(['strict-origin-when-cross-origin', 'no-referrer', 'same-origin']).toContain(header('Referrer-Policy'))
  })

  // Two years and preload: the value HSTS preload submission requires. Lowering
  // max-age is the one change here that can't be undone quickly — browsers keep
  // the old value until it expires.
  it('pins HSTS at a preload-eligible value', () => {
    const hsts = header('Strict-Transport-Security')
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1])
    expect(maxAge).toBeGreaterThanOrEqual(31536000)
    expect(hsts).toContain('includeSubDomains')
    expect(hsts).toContain('preload')
  })

  it('denies the sensitive browser features', () => {
    const policy = header('Permissions-Policy')
    for (const feature of ['camera', 'microphone', 'geolocation']) {
      expect(policy).toContain(`${feature}=()`)
    }
  })
})

describe('Content-Security-Policy', () => {
  it('locks the directives that stop injection from escalating', () => {
    expect(sources('default-src')).toEqual(["'self'"])
    expect(sources('object-src')).toEqual(["'none'"])
    expect(sources('base-uri')).toEqual(["'self'"])
    expect(sources('form-action')).toEqual(["'self'"])
    // Redundant with X-Frame-Options above, and deliberately so: the header is
    // the one older browsers honour, this is the one that is actually specified.
    expect(sources('frame-ancestors')).toEqual(["'none'"])
  })

  it('serves every script and style from this origin only', () => {
    expect(sources('script-src')).toEqual(["'self'", "'unsafe-inline'"])
    expect(sources('style-src')).toEqual(["'self'", "'unsafe-inline'"])
    expect(sources('connect-src')).toEqual(["'self'"])
  })

  // `'unsafe-inline'` above is load-bearing, not an oversight: the theme script
  // has to run before first paint to avoid a flash, so it cannot be an external
  // module, and Astro emits its own inline block too. The upgrade path is
  // per-page SHA-256 hashes computed at build time, which also lets
  // `'unsafe-inline'` be dropped — until then this test states the trade-off
  // rather than leaving it implicit.
  it('still refuses eval, which no inline script here needs', () => {
    expect(sources('script-src')).not.toContain("'unsafe-eval'")
  })

  it('allows no wildcard and no plaintext origin anywhere', () => {
    for (const [directive, values] of directives) {
      expect(values, directive).not.toContain('*')
      expect(
        values.filter((value) => value.startsWith('http:')),
        directive,
      ).toEqual([])
    }
  })

  // BotID is proxied same-origin (vercel-botid.test.ts pins the rewrites), which
  // is exactly why it needed no CSP entry. If those rewrites ever go away the
  // challenge starts loading cross-origin and this policy blocks it — the two
  // facts belong together.
  it('needs no vendor origin for BotID, because the challenge is same-origin', () => {
    expect(config.rewrites.some((rule) => rule.destination.includes('api.vercel.com'))).toBe(true)
    for (const [, values] of directives) {
      expect(values.join(' ')).not.toContain('api.vercel.com')
    }
  })
})
