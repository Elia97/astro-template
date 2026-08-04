import { describe, expect, it } from 'vitest'

import { localizedHref } from '@/i18n/href'
import { localeAgnosticPath } from '@/i18n/path'

// The base every canonical and hreflang is computed from: a request pathname
// reduced to its default-locale form. Getting it wrong publishes a canonical
// that disagrees with the page it sits on, which search engines then ignore.
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

  // A path that merely starts with the same letters is not prefixed by it.
  it('does not strip a prefix that only looks like one', () => {
    expect(localeAgnosticPath('/enoteca', 'en')).toBe('/enoteca')
  })

  it('keeps the root as the root', () => {
    expect(localeAgnosticPath('/', 'it')).toBe('/')
  })

  // trailingSlash is 'never': a canonical with one would compete with the page's
  // own URL for the same content.
  it.each([
    ['/contatti/', '/contatti'],
    ['/contatti///', '/contatti'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(localeAgnosticPath(input, 'it')).toBe(expected)
  })

  it('normalizes a stripped prefix that leaves a trailing slash', () => {
    expect(localeAgnosticPath('/en/', 'en')).toBe('/')
  })

  // Slashes all the way down: stripping them empties the string, and an empty
  // canonical would resolve against the origin rather than the page.
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

  // Astro.currentLocale is undefined on a page outside i18n routing; the link
  // still has to resolve rather than produce "/undefined/…".
  it('falls back to the default locale when none is given', () => {
    expect(localizedHref(undefined, '/contatti')).toBe('/contatti')
  })
})
