import { describe, expect, it } from 'vitest'

import { localeTag } from '@/lib/site'

describe('localeTag', () => {
  it('maps a configured locale to its BCP 47 tag', () => {
    expect(localeTag('it')).toBe('it-IT')
  })

  it('falls back to the code itself for a locale with no tag', () => {
    expect(localeTag('en')).toBe('en')
  })
})
