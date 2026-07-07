import { describe, expect, it } from 'vitest'

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
