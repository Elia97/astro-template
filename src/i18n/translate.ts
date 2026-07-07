import { i18n } from 'astro:config/client'

import { dictionaries, type UIKey } from './ui'

export type { UIKey } from './ui'

/**
 * Returns the `t()` lookup for a locale — pass `Astro.currentLocale`.
 * Locales without a registered dictionary fall back to the default one:
 * rendering the default language beats crashing a page over a missing
 * translation file.
 */
export function useTranslations(locale?: string): (key: UIKey) => string {
  const defaultLocale = i18n?.defaultLocale ?? 'it'
  const dict = dictionaries[locale ?? defaultLocale] ?? dictionaries[defaultLocale]
  if (!dict) {
    throw new Error(
      `No dictionary registered for the default locale "${defaultLocale}" — register it in src/i18n/ui.ts`,
    )
  }
  return (key: UIKey): string => dict[key]
}
