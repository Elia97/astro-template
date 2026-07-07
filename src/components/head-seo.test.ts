import { describe, expect, it } from 'vitest'

import { resolveHeadSeoMeta } from '@/components/head-seo'

// Exercises the single-locale configuration the template ships (stubs mirror
// astro.config.mjs): canonical/hreflang policy per docs/guides/seo.md.
describe('resolveHeadSeoMeta', () => {
  it('builds an absolute canonical with the trailing slash normalized away', () => {
    const meta = resolveHeadSeoMeta({ currentLocale: 'it', canonicalPath: '/chi-siamo/', ogImage: undefined })
    expect(meta.canonical).toBe('https://example.com/chi-siamo')
  })

  it('keeps the root canonical as the bare origin', () => {
    const meta = resolveHeadSeoMeta({ currentLocale: 'it', canonicalPath: '/', ogImage: undefined })
    expect(meta.canonical).toBe('https://example.com')
  })

  it('falls back to the default locale when none is set (prerendered pages)', () => {
    const meta = resolveHeadSeoMeta({ currentLocale: undefined, canonicalPath: '/privacy', ogImage: undefined })
    expect(meta.canonical).toBe('https://example.com/privacy')
    expect(meta.currentTag).toBe('it-IT')
  })

  it('emits one alternate per configured locale, agreeing with the canonical', () => {
    const meta = resolveHeadSeoMeta({ currentLocale: 'it', canonicalPath: '/privacy', ogImage: undefined })
    expect(meta.localeAlternates).toEqual([{ tag: 'it-IT', href: 'https://example.com/privacy' }])
    expect(meta.defaultHref).toBe('https://example.com/privacy')
  })

  it('resolves the og image against the site origin, defaulting to SITE.defaultOgImage', () => {
    const fallback = resolveHeadSeoMeta({ currentLocale: 'it', canonicalPath: '/', ogImage: undefined })
    expect(fallback.ogImageUrl).toBe('https://example.com/og-default.png')

    const custom = resolveHeadSeoMeta({ currentLocale: 'it', canonicalPath: '/', ogImage: '/covers/home.png' })
    expect(custom.ogImageUrl).toBe('https://example.com/covers/home.png')
  })
})
