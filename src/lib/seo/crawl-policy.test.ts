import { describe, expect, it } from 'vitest'

import {
  crawlPathname,
  isExcludedFromSitemap,
  isNoindexPath,
  matchesSubtree,
  NOINDEX_PATHS,
  ROBOTS_DISALLOWED_PATHS,
  SITEMAP_EXCLUDED_PATHS,
} from '@/lib/seo/crawl-policy'

// The normalizer is the only place in this module where a bug can hide: the
// lists are written as a person writes a path, while @astrojs/sitemap hands over
// absolute URLs with a trailing slash regardless of `trailingSlash: 'never'`.
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

describe('SITEMAP_EXCLUDED_PATHS', () => {
  // The composition is the contract: a path added to either list must stop
  // appearing in the sitemap without a second edit.
  it('is the union of both lists', () => {
    expect(SITEMAP_EXCLUDED_PATHS).toEqual([...ROBOTS_DISALLOWED_PATHS, ...NOINDEX_PATHS])
  })

  // A robots-blocked URL still listed in the sitemap is a Search Console
  // warning: the crawler is told to fetch something it is also told not to read.
  it('covers every robots-disallowed path', () => {
    for (const path of ROBOTS_DISALLOWED_PATHS) expect(SITEMAP_EXCLUDED_PATHS).toContain(path)
  })
})

// Both lists ship empty, so every consumer below is a no-op against the real
// constants — this is where the matching rule itself is pinned, on lists the
// test owns. Without it a fork adding its first path is the one discovering
// whether children are covered.
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

  // A prefix that isn't a path segment: `/area-riservata-pubblica` is a
  // different page, and `startsWith` without the separator would swallow it.
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
    for (const path of SITEMAP_EXCLUDED_PATHS) {
      expect(isExcludedFromSitemap(`https://example.com${path}`), path).toBe(true)
      expect(isExcludedFromSitemap(`https://example.com${path}/`), path).toBe(true)
    }
  })

  // A stray entry landing in either list would silently drop a page out of the
  // sitemap.
  it('lets through anything not listed', () => {
    for (const url of ['https://example.com/', 'https://example.com/contatti', 'https://example.com/privacy/']) {
      expect(isExcludedFromSitemap(url), url).toBe(matchesSubtree(crawlPathname(url), SITEMAP_EXCLUDED_PATHS))
    }
  })
})

// The middleware reads the policy through this, so the subtree rule reaches
// X-Robots-Tag too — not just the sitemap filter.
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
