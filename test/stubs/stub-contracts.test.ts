// A stub that stops behaving like the thing it replaces makes every test leaning on it lie.
import { describe, expect, it } from 'vitest'

import { actions } from './astro-actions'
import { getCollection } from './astro-content'
import { getRelativeLocaleUrl } from './astro-i18n'

describe('astro:actions', () => {
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
  it('adds the leading slash a bare path is missing', () => {
    expect(getRelativeLocaleUrl('it', 'contatti')).toBe('/contatti')
  })
})
