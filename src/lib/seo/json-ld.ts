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
