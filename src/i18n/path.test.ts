import { describe, expect, it } from 'vitest'

import { localizedHref } from '@/i18n/href'
import { localeAgnosticPath } from '@/i18n/path'

// A canonical that disagrees with the page it sits on is ignored by search engines.
describe('localeAgnosticPath', () => {
  it('leaves a default-locale path as it is', () => {
    expect(localeAgnosticPath('/contatti', 'it')).toBe('/contatti')
  })

  it('strips the prefix of a secondary locale', () => {
    expect(localeAgnosticPath('/en/contatti', 'en')).toBe('/contatti')
  })

  it('reduces a bare locale prefix to the root', () => {
    expect(localeAgnosticPath('/en', 'en')).toBe('/')
  })

  it('does not strip a prefix that only looks like one', () => {
    expect(localeAgnosticPath('/enoteca', 'en')).toBe('/enoteca')
  })

  it('keeps the root as the root', () => {
    expect(localeAgnosticPath('/', 'it')).toBe('/')
  })

  // `trailingSlash: 'never'` (astro.config.mjs): a canonical with one competes with
  // the page's own URL for the same content.
  it.each([
    ['/contatti/', '/contatti'],
    ['/contatti///', '/contatti'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(localeAgnosticPath(input, 'it')).toBe(expected)
  })

  it('normalizes a stripped prefix that leaves a trailing slash', () => {
    expect(localeAgnosticPath('/en/', 'en')).toBe('/')
  })

  // An empty canonical resolves against the origin, not against the page.
  it('recovers the root from a path that is only slashes', () => {
    expect(localeAgnosticPath('///', 'it')).toBe('/')
  })
})

describe('localizedHref', () => {
  it('is identity for the default locale', () => {
    expect(localizedHref('it', '/contatti')).toBe('/contatti')
  })

  it('prefixes a secondary locale', () => {
    expect(localizedHref('en', '/contatti')).toBe('/en/contatti')
  })

  // Astro.currentLocale is undefined on a page outside i18n routing.
  it('falls back to the default locale when none is given', () => {
    expect(localizedHref(undefined, '/contatti')).toBe('/contatti')
  })
})
