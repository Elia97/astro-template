import { describe, expect, it } from 'vitest'

import { COMPANY } from '@/lib/company'
import { buildBreadcrumbList, buildItemList, buildOrganization, buildWebSite } from '@/lib/seo/json-ld'
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
