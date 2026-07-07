import { describe, expect, it } from 'vitest'

import { applySegmentMap, canonicalizePath, translatePath } from '@/i18n/route-segments'

// The template ships with an empty segment registry (single locale), so the
// mechanism is exercised through applySegmentMap with a sample map and the
// public pair is pinned to identity behavior.
const SAMPLE = { contatti: 'contact', preventivo: 'quote' }

describe('applySegmentMap', () => {
  it('translates the first segment only', () => {
    expect(applySegmentMap('/contatti', SAMPLE)).toBe('/contact')
    expect(applySegmentMap('/contatti/vendite', SAMPLE)).toBe('/contact/vendite')
  })

  it('keeps unmapped segments and nested occurrences as authored', () => {
    expect(applySegmentMap('/chi-siamo', SAMPLE)).toBe('/chi-siamo')
    expect(applySegmentMap('/blog/contatti', SAMPLE)).toBe('/blog/contatti')
  })

  it('leaves the root path untouched', () => {
    expect(applySegmentMap('/', SAMPLE)).toBe('/')
  })
})

describe('translatePath / canonicalizePath', () => {
  it('are identity for locales without a registered map', () => {
    expect(translatePath('/contatti', 'it')).toBe('/contatti')
    expect(canonicalizePath('/contact', 'en')).toBe('/contact')
  })
})
