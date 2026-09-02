import { COMPANY } from '@/lib/company'
import { SITE } from '@/lib/site'

function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).href
}

interface ListEntry {
  name: string
  url: string
}

export function buildOrganization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY.legalName,
    url: SITE.url,
    telephone: COMPANY.phone,
    email: COMPANY.email,
    address: { '@type': 'PostalAddress', ...COMPANY.address },
  }
}

export function buildWebSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
  }
}

interface ArticleEntry {
  headline: string
  description: string
  url: string
  datePublished: string
  image?: string | undefined
}

/** schema.org Article — one per detail URL, alongside its own BreadcrumbList. @public */
export function buildArticle({ headline, description, url, datePublished, image }: ArticleEntry) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    mainEntityOfPage: absoluteUrl(url),
    datePublished,
    ...(image ? { image: absoluteUrl(image) } : {}),
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    publisher: { '@type': 'Organization', name: SITE.name, legalName: COMPANY.legalName, url: SITE.url },
  }
}

/** @public */
export function buildFaqPage(entries: readonly { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
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
