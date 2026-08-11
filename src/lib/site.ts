export const SITE = {
  name: '<PROJECT_NAME>',
  // Feeds `site` in astro.config.mjs and every canonical/OG/hreflang absolute URL.
  url: 'https://example.com',
  description: '<DESCRIPTION>',
  defaultOgImage: '/og-default.png',
  // TODO: duplicates `--background` in src/styles/light.css / dark.css — add a drift test.
  // Hex, not oklch: `<meta name="theme-color">` is parsed by the browser UI layer, not the CSS engine.
  themeColor: { light: '#fafafa', dark: '#0a0a0a' },
  // Keys must match the locale codes in `i18n.locales` (astro.config.mjs) — `codes[0]`
  // for an object entry, not `path`; held to it by src/i18n/locale-config.test.ts.
  localeTags: { it: 'it-IT' },
  // `href` is the default-locale path: localizedHref() adds the prefix per locale.
  nav: [
    { key: 'nav.home', href: '/' },
    { key: 'nav.contact', href: '/contatti' },
  ],
  cta: { key: 'nav.cta', href: '/contatti' },
  legal: [
    { key: 'legal.terms', href: '/termini' },
    { key: 'legal.privacy', href: '/privacy' },
    { key: 'legal.cookies', href: '/cookie-policy' },
  ],
  social: [{ label: 'LinkedIn', href: '#' }],
} as const

/** @public */
export type Site = typeof SITE

export function localeTag(locale: string): string {
  const tags: Record<string, string> = SITE.localeTags
  return tags[locale] ?? locale
}
