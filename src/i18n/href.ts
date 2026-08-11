import { i18n } from 'astro:config/client'
import { getRelativeLocaleUrl } from 'astro:i18n'

import { translatePath } from '@/i18n/route-segments'

export function localizedHref(locale: string | undefined, path: string): string {
  /* v8 ignore next -- astro:config/client is injected by Astro on every render; the fallback guards a module that cannot be missing */
  const target = locale ?? i18n?.defaultLocale ?? 'it'
  return getRelativeLocaleUrl(target, translatePath(path, target))
}
