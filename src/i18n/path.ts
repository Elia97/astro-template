import { i18n } from 'astro:config/client'
import { getPathByLocale } from 'astro:i18n'

import { canonicalizePath } from '@/i18n/route-segments'

function localePrefix(currentLocale: string, defaultLocale: string): string {
  return currentLocale === defaultLocale ? '' : `/${getPathByLocale(currentLocale)}`
}

function hasLocalePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function stripLocalePrefix(pathname: string, prefix: string): string {
  return prefix && hasLocalePrefix(pathname, prefix) ? pathname.slice(prefix.length) : pathname
}

function normalizeTrailingSlash(path: string): string {
  if (path.length <= 1) return path || '/'
  return path.replace(/\/+$/, '') || '/'
}

/**
 * Normalizes a request pathname to its default-locale ("internal") form:
 * locale prefix stripped, localized segments canonicalized, trailing slash
 * normalized. The base for canonical URLs and hreflang alternates.
 */
export function localeAgnosticPath(pathname: string, currentLocale: string): string {
  const defaultLocale = i18n?.defaultLocale ?? 'it'
  const prefix = localePrefix(currentLocale, defaultLocale)
  const unprefixed = stripLocalePrefix(pathname, prefix)
  const canonical = canonicalizePath(unprefixed, currentLocale)
  return normalizeTrailingSlash(canonical)
}
