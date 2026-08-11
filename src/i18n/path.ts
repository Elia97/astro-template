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

export function localeAgnosticPath(pathname: string, currentLocale: string): string {
  /* v8 ignore next -- astro:config/client is injected by Astro on every render; the fallback guards a module that cannot be missing */
  const defaultLocale = i18n?.defaultLocale ?? 'it'
  const prefix = localePrefix(currentLocale, defaultLocale)
  const unprefixed = stripLocalePrefix(pathname, prefix)
  const canonical = canonicalizePath(unprefixed, currentLocale)
  return normalizeTrailingSlash(canonical)
}
