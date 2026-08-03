import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { SITE } from '@/lib/site'

// Guards the two host-level ops settings in vercel.json that nothing else can
// see: `astro dev` never reads that file, and both only take effect at the edge.
//
// The www → apex redirect keeps one canonical origin. Without it both hosts
// serve the whole site, every page has two indexable URLs, and the canonical in
// <head> is the only thing arguing otherwise.

type HasCondition = { type: string; value?: string }
type Redirect = {
  source: string
  has?: HasCondition[]
  destination: string
  permanent?: boolean
}
type VercelConfig = { regions?: string[]; redirects?: Redirect[] }

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'),
) as VercelConfig

const apex = new URL(SITE.url).host
const wwwRedirect = config.redirects?.find((rule) => rule.has?.some((cond) => cond.type === 'host'))

describe('vercel.json www → apex redirect', () => {
  // [HARD] This is the one rule in vercel.json that carries the project's real
  // domain, so it cannot be checked against a literal — it is checked against
  // SITE.url. A fork that rebrands and forgets this file fails here, which is
  // the entire reason the assertion is written this way.
  it('redirects the www host of SITE.url, whatever that is', () => {
    expect(wwwRedirect, 'no host-conditioned redirect in vercel.json').toBeDefined()

    const pattern = wwwRedirect?.has?.find((cond) => cond.type === 'host')?.value
    expect(pattern).toBeDefined()
    const host = new RegExp(`^(?:${pattern ?? ''})$`)

    expect(host.test(`www.${apex}`), `pattern "${pattern ?? ''}" must match www.${apex} — update vercel.json`).toBe(
      true,
    )
    // The apex must not match its own redirect: that is a loop.
    expect(host.test(apex)).toBe(false)
  })

  it('sends every path to the same path on the apex', () => {
    expect(wwwRedirect?.source).toBe('/:path*')
    expect(wwwRedirect?.destination).toBe(`${SITE.url}/:path*`)
  })

  // 308, not 302: the redirect is permanent and must preserve the method.
  // `permanent: true` is how vercel.json spells it.
  it('is permanent', () => {
    expect(wwwRedirect?.permanent).toBe(true)
  })
})

describe('vercel.json function region', () => {
  // Single region on purpose: SSR routes and actions run where the audience is.
  // Left unset, Vercel picks its default (iad1, Washington) and every form
  // submit from Europe crosses the Atlantic twice.
  it('pins functions to fra1', () => {
    expect(config.regions).toEqual(['fra1'])
  })
})
