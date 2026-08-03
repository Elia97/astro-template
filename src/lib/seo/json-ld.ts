// JSON-LD builders for inner pages (pass the result via the layout's `jsonLd`
// prop). Sitewide Organization/WebSite schemas live on the homepage.
import { SITE } from '@/lib/site'

function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).href
}

interface ListEntry {
  name: string
  url: string
}

/** schema.org BreadcrumbList — pass the trail in order, home first. */
export function buildBreadcrumbList(items: ListEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  }
}

/** schema.org ItemList — for listing pages (catalog, archive, …). */
export function buildItemList(items: ListEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url),
    })),
  }
}
