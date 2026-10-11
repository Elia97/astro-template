import { renderToFragment } from '@test/container'
import HeadPage from '@test/fixtures/head-page.astro'
import RewriteToPrivacy from '@test/fixtures/rewrite-to-privacy.astro'
import { withOnlyListedPaths } from '@test/helpers/crawl-policy'
import { twoLocaleManifest } from '@test/helpers/second-locale'
import { describe, expect, it, vi } from 'vitest'

import { isExcludedFromSitemap, NOINDEX_PATHS } from '@/lib/seo/crawl-policy'
import { localeTag, SITE } from '@/lib/site'

import Head from './head.astro'

vi.mock('astro:config/client', () => import('@test/helpers/second-locale').then((m) => m.twoLocaleConfig))
vi.mock('@/i18n/segments-by-locale', () => import('@test/helpers/second-locale').then((m) => m.translatedSegments))

const props = { title: 'Page title', description: 'Page description' }

type Fragment = Awaited<ReturnType<typeof renderToFragment>>

function render(url: string): Promise<Fragment> {
  return renderToFragment(Head, { request: new Request(url), props }, twoLocaleManifest)
}

function hreflangs(document: Fragment): (string | null)[][] {
  return Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'), (link) => [
    link.getAttribute('hreflang'),
    link.getAttribute('href'),
  ])
}

describe('head.astro', () => {
  it('emits no robots meta by default', async () => {
    const document = await renderToFragment(Head, { props })
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('lascia il titolo nudo a og:title e twitter:title', async () => {
    const document = await renderToFragment(Head, { props })
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Page title')
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('Page title')
  })

  it('lascia nudo il titolo del documento con absoluteTitle', async () => {
    const document = await renderToFragment(Head, { props: { ...props, absoluteTitle: true } })
    expect(document.querySelector('title')?.textContent).toBe('Page title')
  })
})

describe('head.astro con una seconda lingua e una pagina in NOINDEX_PATHS', () => {
  withOnlyListedPaths(NOINDEX_PATHS, '/en/privacy')

  it('la pagina esce dalla sitemap e porta il meta noindex, con titolo e canonical', async () => {
    expect(isExcludedFromSitemap('https://example.com/en/privacy')).toBe(true)

    const document = await render('https://example.com/en/privacy')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    expect(document.querySelector('title')?.textContent).toBe(`Page title | ${SITE.name}`)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://example.com/en/privacy')
  })

  it('nessuna lingua la annuncia con un hreflang, nemmeno lei', async () => {
    expect(hreflangs(await render('https://example.com/en/privacy'))).toEqual([])

    const italian = await render('https://example.com/privacy')
    expect(italian.querySelector('meta[name="robots"]')).toBeNull()
    expect(hreflangs(italian)).toEqual([
      [localeTag('it'), 'https://example.com/privacy'],
      ['x-default', 'https://example.com/privacy'],
    ])
  })

  it('la traduzione la tiene fra gli og:locale:alternate', async () => {
    const italian = await render('https://example.com/privacy')
    expect(italian.querySelector('meta[property="og:locale:alternate"]')?.getAttribute('content')).toBe(
      localeTag('en').replace('-', '_'),
    )
  })

  it("guarda l'URL richiesto anche quando la pagina è resa con una rewrite verso l'italiano", async () => {
    const document = await renderToFragment(
      RewriteToPrivacy,
      { request: new Request('https://example.com/en/privacy') },
      twoLocaleManifest,
      { '/privacy': HeadPage },
    )
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    expect(hreflangs(document)).toEqual([])
  })
})
