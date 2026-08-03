import { describe, expect, it } from 'vitest'

import {
  crawlPathname,
  isExcludedFromSitemap,
  NOINDEX_PATHS,
  ROBOTS_DISALLOWED_PATHS,
  SITEMAP_EXCLUDED_PATHS,
} from '@/lib/seo/crawl-policy'

// @astrojs/sitemap hands the filter absolute URLs built from the emitted routes,
// which carry a trailing slash regardless of `trailingSlash: 'never'`. The lists
// are written the way a person writes a path, so the normalizer is where the two
// conventions meet — and the only place in this module a bug can hide.
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

describe('isExcludedFromSitemap', () => {
  it('excludes every listed path, in both URL forms', () => {
    for (const path of SITEMAP_EXCLUDED_PATHS) {
      expect(isExcludedFromSitemap(`https://example.com${path}`), path).toBe(true)
      expect(isExcludedFromSitemap(`https://example.com${path}/`), path).toBe(true)
    }
  })

  // The template ships both lists empty, so this is what the filter does today:
  // nothing. It is still worth pinning — a stray entry landing in either list
  // would silently drop a page out of the sitemap.
  it('lets through anything not listed', () => {
    for (const url of ['https://example.com/', 'https://example.com/contatti', 'https://example.com/privacy/']) {
      expect(isExcludedFromSitemap(url), url).toBe(SITEMAP_EXCLUDED_PATHS.includes(crawlPathname(url)))
    }
  })
})
