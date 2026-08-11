import { describe, expect, it, vi } from 'vitest'

import { useTranslations } from '@/i18n/translate'

describe('useTranslations', () => {
  it('resolves keys for the default locale', () => {
    const t = useTranslations('it')
    expect(t('nav.home')).toBe('Home')
  })

  it('uses the default locale when none is given (static pages outside i18n routing)', () => {
    const t = useTranslations(undefined)
    expect(t('a11y.skipToContent')).toBe('Salta al contenuto')
  })

  it('falls back to the default dictionary for unregistered locales', () => {
    const t = useTranslations('de')
    expect(t('footer.legalHeading')).toBe('Legale')
  })
})

// A locale routed in astro.config.mjs without a dictionary in ui.ts is a
// misconfiguration the compiler cannot see.
describe('missing dictionaries', () => {
  it('throws when even the default locale has none registered', async () => {
    vi.resetModules()
    vi.doMock('@/i18n/ui', () => ({ dictionaries: {} }))
    const { useTranslations } = await import('@/i18n/translate')

    expect(() => useTranslations()).toThrow(/No dictionary registered for the default locale/)
  })
})
