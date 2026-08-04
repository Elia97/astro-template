// The stubs stand in for the Astro runtime, so what they promise about
// themselves is worth pinning: a stub that quietly stops behaving like the thing
// it replaces makes every test that leans on it lie.
import { describe, expect, it } from 'vitest'

import { actions } from './astro-actions'
import { getCollection } from './astro-content'
import { getRelativeLocaleUrl } from './astro-i18n'

describe('astro:actions', () => {
  // The whole point of the rejection: a test that forgets to stub the member it
  // exercises fails loudly instead of passing against a no-op.
  it('rejects when a caller was not stubbed, naming itself in the message', async () => {
    await expect(actions.contact({})).rejects.toThrow(/astro:actions stub: actions.contact/)
  })
})

describe('astro:content', () => {
  it('returns no entries by default, so a test must opt into the data it needs', async () => {
    await expect(getCollection()).resolves.toEqual([])
  })
})

describe('astro:i18n', () => {
  // localizedHref passes bare paths through here; without the leading slash the
  // result would be a relative link that resolves against the current route.
  it('adds the leading slash a bare path is missing', () => {
    expect(getRelativeLocaleUrl('it', 'contatti')).toBe('/contatti')
  })
})
