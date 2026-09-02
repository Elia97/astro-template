import { describe, expect, it } from 'vitest'

import { COMPANY } from '@/lib/company'
import {
  buildArticle,
  buildBreadcrumbList,
  buildFaqPage,
  buildItemList,
  buildOrganization,
  buildWebSite,
} from '@/lib/seo/json-ld'
import { SITE } from '@/lib/site'

const TRAIL = [
  { name: 'Home', url: '/' },
  { name: 'Privacy', url: '/privacy' },
]

describe('buildBreadcrumbList', () => {
  it('numbers positions from 1 and absolutizes URLs', () => {
    const schema = buildBreadcrumbList(TRAIL)
    expect(schema['@type']).toBe('BreadcrumbList')
    expect(schema.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
      { '@type': 'ListItem', position: 2, name: 'Privacy', item: 'https://example.com/privacy' },
    ])
  })
})

describe('buildItemList', () => {
  it('uses the `url` key (ItemList) instead of `item` (BreadcrumbList)', () => {
    const schema = buildItemList([{ name: 'Voce', url: '/sezione/voce' }])
    expect(schema['@type']).toBe('ItemList')
    expect(schema.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Voce', url: 'https://example.com/sezione/voce' },
    ])
  })
})

describe('buildOrganization', () => {
  it('carries the company identity and a PostalAddress', () => {
    const schema = buildOrganization()

    expect(schema).toMatchObject({
      '@type': 'Organization',
      name: COMPANY.legalName,
      url: SITE.url,
      address: { '@type': 'PostalAddress' },
    })
  })
})

describe('buildWebSite', () => {
  it('names the site, not the company', () => {
    expect(buildWebSite()).toMatchObject({ '@type': 'WebSite', name: SITE.name, url: SITE.url })
  })
})

describe('buildArticle', () => {
  const entry = {
    headline: 'Titolo',
    description: 'Sommario',
    url: '/news/titolo',
    datePublished: '2026-09-02',
  }

  it('absolutizes mainEntityOfPage and credits the organization', () => {
    const schema = buildArticle(entry)

    expect(schema).toMatchObject({
      '@type': 'Article',
      mainEntityOfPage: new URL('/news/titolo', SITE.url).href,
      author: { '@type': 'Organization', name: SITE.name },
      publisher: { legalName: COMPANY.legalName },
    })
  })

  it('omits image entirely when there is none, rather than emitting undefined', () => {
    expect(buildArticle(entry)).not.toHaveProperty('image')
    expect(buildArticle({ ...entry, image: '/og/x.jpg' })).toHaveProperty('image', new URL('/og/x.jpg', SITE.url).href)
  })
})

describe('buildFaqPage', () => {
  it('wraps every entry as a Question with its accepted Answer', () => {
    const schema = buildFaqPage([{ question: 'Quanto costa?', answer: 'Dipende.' }])

    expect(schema.mainEntity).toEqual([
      { '@type': 'Question', name: 'Quanto costa?', acceptedAnswer: { '@type': 'Answer', text: 'Dipende.' } },
    ])
  })

  it('emits an empty mainEntity rather than failing on no entries', () => {
    expect(buildFaqPage([]).mainEntity).toEqual([])
  })
})
