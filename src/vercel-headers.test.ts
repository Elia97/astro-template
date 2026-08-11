import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// `astro dev` never reads vercel.json: CI is the only place these headers run before
// a deploy. Every other CSP directive lives in src/lib/csp/, covered by csp.test.ts.

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

// Assertions are about policy, not the order or spacing of one long string.
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

  // Two years is what HSTS preload submission requires, and lowering it is slow to
  // undo: browsers keep the old max-age until it expires.
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
  it('carries frame-ancestors, the one directive a meta CSP cannot express', () => {
    // Redundant with X-Frame-Options above, and deliberately so: the header is
    // the one older browsers honour, this is the one that is actually specified.
    expect(sources('frame-ancestors')).toEqual(["'none'"])
  })

  it('leaves every other directive to the build-time policy', () => {
    // The CSP spec enforces multiple policies independently, so a copy here would
    // intersect with src/lib/csp/directives.ts rather than replace it.
    for (const directive of ['default-src', 'script-src', 'style-src', 'connect-src', 'img-src']) {
      expect(sources(directive), directive).toEqual([])
    }
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

  // vercel-botid.test.ts pins the rewrites this depends on.
  it('needs no vendor origin for BotID, because the challenge is same-origin', () => {
    expect(config.rewrites.some((rule) => rule.destination.includes('api.vercel.com'))).toBe(true)
    for (const [, values] of directives) {
      expect(values.join(' ')).not.toContain('api.vercel.com')
    }
  })
})
