import { i18n } from 'astro:config/client'
import { getRelativeLocaleUrl } from 'astro:i18n'

import { translatePath } from '@/i18n/route-segments'

/**
 * Locale-aware internal link: pass the default-locale path (`/contatti`) and
 * the current locale — prefix and localized segments come out right for any
 * locale, including the default (identity).
 */
export function localizedHref(locale: string | undefined, path: string): string {
  const target = locale ?? i18n?.defaultLocale ?? 'it'
  return getRelativeLocaleUrl(target, translatePath(path, target))
}
