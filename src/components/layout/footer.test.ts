import { afterEach, describe, expect, it, vi } from 'vitest'

import { SITE } from '@/lib/site'

const CMP_ENV = { PUBLIC_GTM_ID: 'GTM-TEST', PUBLIC_IUBENDA_SITE_ID: '1234567' }

/**
 * The env is read at module import, so each case resets and re-imports. The
 * container is re-imported from the SAME fresh registry: taken from the outer
 * one it would render a component compiled by a different module instance.
 */
async function renderFooter(env: Record<string, string> = {}) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  const [{ renderToFragment }, { default: Footer }] = await Promise.all([
    import('@test/container'),
    import('@/components/layout/footer.astro'),
  ])
  return renderToFragment(Footer)
}

const cmpLink = (document: Awaited<ReturnType<typeof renderFooter>>) =>
  document.querySelector('.iubenda-cs-preferences-link')

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('footer.astro', () => {
  it('lists every legal document declared in SITE', async () => {
    const document = await renderFooter()

    const hrefs = [...document.querySelectorAll('nav a')].map((link) => link.getAttribute('href'))
    for (const { href } of SITE.legal) expect(hrefs).toContain(href)
  })

  it('links each social profile SITE declares', async () => {
    const document = await renderFooter()

    const hrefs = [...document.querySelectorAll('ul a')].map((link) => link.getAttribute('href'))
    expect(hrefs).toEqual(SITE.social.map(({ href }) => href))
  })
})

// [HARD] This link is how consent stays revocable — the CMP's own floating badge
// is disabled. It must appear exactly when the CMP does, in both directions: a
// missing link strands the visitor with no way back to their choices, and one
// rendered without a CMP behind it is a dead control opening nothing.
describe('the cookie-preferences link', () => {
  it('is absent when no CMP is configured, which is how the template ships', async () => {
    expect(cmpLink(await renderFooter())).toBeNull()
  })

  it('appears once the CMP is configured', async () => {
    expect(cmpLink(await renderFooter(CMP_ENV))).not.toBeNull()
  })
})
