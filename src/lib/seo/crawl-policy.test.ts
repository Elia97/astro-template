import { withOnlyListedPaths } from '@test/helpers/crawl-policy'
import { describe, expect, it } from 'vitest'

import {
  crawlPathname,
  isExcludedFromSitemap,
  isNoindexPath,
  matchesSubtree,
  NOINDEX_PATHS,
  ROBOTS_DISALLOWED_PATHS,
} from '@/lib/seo/crawl-policy'

describe('crawlPathname', () => {
  it('takes the pathname out of an absolute sitemap entry', () => {
    expect(crawlPathname('https://example.com/privacy')).toBe('/privacy')
  })

  it('drops the trailing slash the integration adds', () => {
    expect(crawlPathname('https://example.com/privacy/')).toBe('/privacy')
  })

  it('keeps the root as a bare slash, with or without one', () => {
    expect(crawlPathname('https://example.com/')).toBe('/')
    expect(crawlPathname('https://example.com')).toBe('/')
  })

  it('accepts a bare path, so the lists can be checked directly', () => {
    expect(crawlPathname('/contatti')).toBe('/contatti')
  })

  it('ignores the query string and the hash', () => {
    expect(crawlPathname('https://example.com/contatti?utm_source=x#form')).toBe('/contatti')
  })

  it('leaves a nested path intact', () => {
    expect(crawlPathname('https://example.com/blog/a-post/')).toBe('/blog/a-post')
  })
})

describe('matchesSubtree', () => {
  const roots = ['/area-riservata', '/grazie']

  it('matches the listed path itself', () => {
    expect(matchesSubtree('/area-riservata', roots)).toBe(true)
  })

  it('matches everything below it — the part that leaks under an exact match', () => {
    expect(matchesSubtree('/area-riservata/documenti', roots)).toBe(true)
    expect(matchesSubtree('/area-riservata/documenti/2026', roots)).toBe(true)
  })

  it('matches through the trailing slash the sitemap integration adds', () => {
    expect(matchesSubtree('/area-riservata/', roots)).toBe(true)
    expect(matchesSubtree('https://example.com/area-riservata/documenti/', roots)).toBe(true)
  })

  it('does not match a sibling that merely shares the prefix', () => {
    expect(matchesSubtree('/area-riservata-pubblica', roots)).toBe(false)
    expect(matchesSubtree('/grazie-mille', roots)).toBe(false)
  })

  it('matches nothing against an empty list', () => {
    expect(matchesSubtree('/qualsiasi', [])).toBe(false)
  })
})

describe('isExcludedFromSitemap', () => {
  it('excludes every listed path, in both URL forms', () => {
    for (const path of [...ROBOTS_DISALLOWED_PATHS, ...NOINDEX_PATHS]) {
      expect(isExcludedFromSitemap(`https://example.com${path}`), path).toBe(true)
      expect(isExcludedFromSitemap(`https://example.com${path}/`), path).toBe(true)
    }
  })

  describe('con una voce di prova in ciascuna lista', () => {
    withOnlyListedPaths(ROBOTS_DISALLOWED_PATHS, '/private')
    withOnlyListedPaths(NOINDEX_PATHS, '/en/privacy')

    it('esclude le voci di tutte e due le liste, nelle due forme di URL', () => {
      for (const url of ['https://example.com/private', 'https://example.com/en/privacy/']) {
        expect(isExcludedFromSitemap(url), url).toBe(true)
      }
    })

    it('lascia passare la home e un fratello che ha solo il prefisso in comune', () => {
      for (const url of [
        'https://example.com/',
        'https://example.com/private-notes',
        'https://example.com/en/privacy-notes/',
      ]) {
        expect(isExcludedFromSitemap(url), url).toBe(false)
      }
    })
  })
})

describe('isNoindexPath', () => {
  it('answers for every listed path and its children', () => {
    for (const path of NOINDEX_PATHS) {
      expect(isNoindexPath(path), path).toBe(true)
      expect(isNoindexPath(`${path}/sotto`), path).toBe(true)
    }
  })

  it('leaves the home alone', () => {
    expect(isNoindexPath('/')).toBe(NOINDEX_PATHS.includes('/'))
  })
})
