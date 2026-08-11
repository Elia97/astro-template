// Mirrors astro.config.mjs: prefixDefaultLocale false, trailingSlash 'never'.
import { SITE } from '@/lib/site'

import { i18n } from './astro-config-client'

export function getPathByLocale(locale: string): string {
  return locale
}

export function getRelativeLocaleUrl(locale: string, path = '/'): string {
  const prefix = locale === i18n.defaultLocale ? '' : `/${locale}`
  const joined = `${prefix}${path.startsWith('/') ? path : `/${path}`}`
  return joined.length > 1 ? joined.replace(/\/+$/, '') : joined
}

export function getAbsoluteLocaleUrl(locale: string, path = '/'): string {
  const normalized = getRelativeLocaleUrl(locale, path)
  // Under trailingSlash 'never' Astro renders the root URL as the bare origin.
  const url = new URL(normalized, SITE.url)
  return normalized === '/' ? url.origin : url.origin + url.pathname
}
