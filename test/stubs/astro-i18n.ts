// Minimal model of astro:i18n for unit tests, faithful to this template's
// policy: prefixDefaultLocale false, trailingSlash 'never', absolute URLs on
// SITE.url. Locale paths equal locale codes (string locale entries).
import { SITE } from '@/lib/site'

import { i18n } from './astro-config-client'

export function getPathByLocale(locale: string): string {
  return locale
}

export function getAbsoluteLocaleUrl(locale: string, path = '/'): string {
  const prefix = locale === i18n.defaultLocale ? '' : `/${locale}`
  const joined = `${prefix}${path.startsWith('/') ? path : `/${path}`}`
  const normalized = joined.length > 1 ? joined.replace(/\/+$/, '') : joined
  // Faithful to Astro's rendering under trailingSlash 'never': the root URL
  // comes out as the bare origin, without the trailing slash.
  const url = new URL(normalized, SITE.url)
  return normalized === '/' ? url.origin : url.origin + url.pathname
}
