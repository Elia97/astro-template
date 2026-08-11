import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { SITE } from '@/lib/site'

// vercel.json only takes effect at the edge and `astro dev` never reads it, so CI
// is the only place these two rules are exercised at all.

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
  // [HARD] Checked against SITE.url, never a literal: a fork that rebrands and
  // forgets vercel.json fails here.
  it('redirects the www host of SITE.url, whatever that is', () => {
    expect(wwwRedirect, 'no host-conditioned redirect in vercel.json').toBeDefined()

    const pattern = wwwRedirect?.has?.find((cond) => cond.type === 'host')?.value
    expect(pattern).toBeDefined()
    const host = new RegExp(`^(?:${pattern ?? ''})$`)

    expect(host.test(`www.${apex}`), `pattern "${pattern ?? ''}" must match www.${apex} — update vercel.json`).toBe(
      true,
    )
    expect(host.test(apex)).toBe(false)
  })

  it('sends every path to the same path on the apex', () => {
    expect(wwwRedirect?.source).toBe('/:path*')
    expect(wwwRedirect?.destination).toBe(`${SITE.url}/:path*`)
  })

  // Vercel emits a 308 for `permanent: true` — permanent and method-preserving.
  it('is permanent', () => {
    expect(wwwRedirect?.permanent).toBe(true)
  })
})

describe('vercel.json function region', () => {
  // Left unset, Vercel defaults to iad1 (Washington); the audience is European.
  it('pins functions to fra1', () => {
    expect(config.regions).toEqual(['fra1'])
  })
})
