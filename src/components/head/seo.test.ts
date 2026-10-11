import { withOnlyListedPaths } from '@test/helpers/crawl-policy'
import { describe, expect, it, vi } from 'vitest'

import { resolveHeadSeoMeta } from '@/components/head/seo'

import { NOINDEX_PATHS } from '@/lib/seo/crawl-policy'
import { localeTag, SITE } from '@/lib/site'

import { localeSwitchHref } from '@/i18n/path'
import { useTranslations } from '@/i18n/translate'

vi.mock('astro:config/client', () => import('@test/helpers/second-locale').then((m) => m.twoLocaleConfig))
vi.mock('@/i18n/segments-by-locale', () => import('@test/helpers/second-locale').then((m) => m.translatedSegments))

const params = {
  title: 'Page title',
  absoluteTitle: false,
  currentLocale: 'it',
  pathname: '/',
  canonicalPath: '/',
  ogImage: undefined,
  locales: undefined,
}

describe('resolveHeadSeoMeta', () => {
  it('builds an absolute canonical with the trailing slash normalized away', () => {
    const meta = resolveHeadSeoMeta({ ...params, canonicalPath: '/chi-siamo/' })
    expect(meta.canonical).toBe('https://example.com/chi-siamo')
  })

  it('keeps the root canonical as the bare origin', () => {
    const meta = resolveHeadSeoMeta({ ...params, canonicalPath: '/' })
    expect(meta.canonical).toBe('https://example.com')
  })

  it('falls back to the default locale when none is set (prerendered pages)', () => {
    const meta = resolveHeadSeoMeta({ ...params, currentLocale: undefined, canonicalPath: '/privacy' })
    expect(meta.canonical).toBe('https://example.com/privacy')
    expect(meta.currentTag).toBe('it-IT')
  })

  it('emits one alternate per configured locale, agreeing with the canonical', () => {
    const meta = resolveHeadSeoMeta({ ...params, canonicalPath: '/privacy' })
    expect(meta.localeAlternates).toEqual([
      { tag: 'it-IT', href: 'https://example.com/privacy' },
      { tag: 'en', href: 'https://example.com/en/privacy' },
    ])
    expect(meta.defaultHref).toBe('https://example.com/privacy')
  })

  it('resolves the og image against the site origin, defaulting to SITE.defaultOgImage', () => {
    const fallback = resolveHeadSeoMeta(params)
    expect(fallback.socialImage.url).toBe('https://example.com/og-default.png')

    const custom = resolveHeadSeoMeta({ ...params, ogImage: '/covers/home.png' })
    expect(custom.socialImage.url).toBe('https://example.com/covers/home.png')
  })
})

describe("resolveHeadSeoMeta() da una pagina nell'altra lingua", () => {
  it('fa concordare canonical, alternate e x-default sul segmento tradotto', () => {
    const meta = resolveHeadSeoMeta({ ...params, currentLocale: 'en', canonicalPath: '/en/contact' })
    expect(meta.canonical).toBe('https://example.com/en/contact')
    expect(meta.currentTag).toBe('en')
    expect(meta.localeAlternates).toEqual([
      { tag: 'it-IT', href: 'https://example.com/contatti' },
      { tag: 'en', href: 'https://example.com/en/contact' },
    ])
    expect(meta.defaultHref).toBe('https://example.com/contatti')
  })

  it('dà alla home il prefisso come canonical e la radice come x-default', () => {
    const meta = resolveHeadSeoMeta({ ...params, currentLocale: 'en', canonicalPath: '/en' })
    expect(meta.canonical).toBe('https://example.com/en')
    expect(meta.localeAlternates).toEqual([
      { tag: 'it-IT', href: 'https://example.com' },
      { tag: 'en', href: 'https://example.com/en' },
    ])
    expect(meta.defaultHref).toBe('https://example.com')
  })
})

describe('resolveHeadSeoMeta() con le lingue dichiarate dalla pagina', () => {
  it("emette gli alternate delle sole lingue della pagina, e x-default se c'è la lingua di default", () => {
    const meta = resolveHeadSeoMeta({ ...params, canonicalPath: '/privacy', locales: ['it'] })
    expect(meta.localeAlternates).toEqual([{ tag: 'it-IT', href: 'https://example.com/privacy' }])
    expect(meta.defaultHref).toBe('https://example.com/privacy')
  })

  it('non emette x-default quando la pagina non esiste nella lingua di default', () => {
    const meta = resolveHeadSeoMeta({ ...params, currentLocale: 'en', canonicalPath: '/en/news', locales: ['en'] })
    expect(meta.localeAlternates).toEqual([{ tag: 'en', href: 'https://example.com/en/news' }])
    expect(meta).not.toHaveProperty('defaultHref')
  })

  it.each([
    ['/contatti', 'it'],
    ['/en/contact', 'en'],
    ['/en', 'en'],
  ])("da %s (%s) il selettore porta dove punta l'alternate di ogni lingua", (pathname, current) => {
    const meta = resolveHeadSeoMeta({ ...params, currentLocale: current, canonicalPath: pathname })
    for (const code of ['it', 'en']) {
      const alternate = meta.localeAlternates.find((alt) => alt.tag === localeTag(code))
      expect(new URL(alternate?.href ?? '').pathname).toBe(localeSwitchHref(code, pathname, current))
    }
  })
})

function fromPage(pathname: string, currentLocale: string) {
  return resolveHeadSeoMeta({ ...params, currentLocale, pathname, canonicalPath: pathname })
}

describe('resolveHeadSeoMeta() con una traduzione in NOINDEX_PATHS', () => {
  withOnlyListedPaths(NOINDEX_PATHS, '/en/privacy')

  it('dà noindex alla pagina della lista e non alla sua traduzione', () => {
    expect(fromPage('/en/privacy', 'en').noindex).toBe(true)
    expect(fromPage('/privacy', 'it').noindex).toBe(false)
  })

  it('la toglie dagli hreflang della traduzione, non dai suoi og:locale:alternate', () => {
    const meta = fromPage('/privacy', 'it')
    expect(meta.hreflangAlternates).toEqual([{ tag: localeTag('it'), href: 'https://example.com/privacy' }])
    expect(meta.defaultHref).toBe('https://example.com/privacy')
    expect(meta.localeAlternates.map((alt) => alt.tag)).toEqual([localeTag('it'), localeTag('en')])
  })

  it('non le fa emettere né hreflang né x-default', () => {
    const meta = fromPage('/en/privacy', 'en')
    expect(meta.hreflangAlternates).toEqual([])
    expect(meta).not.toHaveProperty('defaultHref')
  })
})

describe('resolveHeadSeoMeta() con la pagina della lingua di default in NOINDEX_PATHS', () => {
  withOnlyListedPaths(NOINDEX_PATHS, '/privacy')

  it('la traduzione annuncia solo sé stessa, senza x-default', () => {
    const meta = fromPage('/en/privacy', 'en')
    expect(meta.hreflangAlternates).toEqual([{ tag: localeTag('en'), href: 'https://example.com/en/privacy' }])
    expect(meta).not.toHaveProperty('defaultHref')
  })
})

describe('resolveHeadSeoMeta().documentTitle', () => {
  it('aggiunge il nome del sito al titolo di una pagina interna', () => {
    const meta = resolveHeadSeoMeta(params)
    expect(meta.documentTitle).toBe(`Page title | ${SITE.name}`)
  })

  it('separa con | anche un titolo che contiene già un trattino, come quello di 404', () => {
    const meta = resolveHeadSeoMeta({ ...params, title: '404 — Page not found' })
    expect(meta.documentTitle).toBe(`404 — Page not found | ${SITE.name}`)
  })

  it('lascia nudo il titolo della home, che è già il nome del sito', () => {
    const meta = resolveHeadSeoMeta({ ...params, title: SITE.name })
    expect(meta.documentTitle).toBe(SITE.name)
  })

  it('lascia nudo il titolo quando la pagina passa absoluteTitle', () => {
    const meta = resolveHeadSeoMeta({ ...params, absoluteTitle: true })
    expect(meta.documentTitle).toBe('Page title')
  })
})

describe('resolveHeadSeoMeta().socialImage', () => {
  it("porta misure e alt dell'immagine di default", () => {
    expect(resolveHeadSeoMeta(params).socialImage).toEqual({
      url: 'https://example.com/og-default.png',
      ...SITE.defaultOgImageSize,
      alt: useTranslations('it')('seo.defaultOgImageAlt'),
    })
  })

  it('con un ogImage di pagina porta solo il suo URL', () => {
    expect(resolveHeadSeoMeta({ ...params, ogImage: '/covers/home.png' }).socialImage).toEqual({
      url: 'https://example.com/covers/home.png',
    })
  })
})
