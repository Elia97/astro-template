// Single source of truth for site metadata and chrome content (nav/footer/CTA/legal).
// Replace the placeholders per project — de-branding happens at design time.
export const SITE = {
  name: '<PROJECT_NAME>',
  // ⚠️ Must be a valid URL: it feeds `site` in astro.config.mjs and every
  // canonical/OG/hreflang absolute URL. Replace with the project's real domain.
  url: 'https://example.com',
  description: '<DESCRIPTION>',
  defaultOgImage: '/og-default.png',
  // BCP 47 tag per locale (lang/hreflang/og:locale). Keys must match the
  // locale *codes* from `i18n.locales` in astro.config.mjs (for object
  // entries that's `codes[0]`, not `path`).
  localeTags: { it: 'it-IT' },
  // Header navigation — add the project's entries.
  nav: [{ label: 'Home', href: '/' }],
  // Header primary CTA.
  cta: { label: 'Call to action', href: '#' },
  // Legal links (universal for EU sites).
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
  ],
  // Single-locale UI microcopy, written in the default locale. If a real i18n
  // dictionary ever lands, it replaces this block.
  strings: {
    skipToContent: 'Salta al contenuto',
    primaryNav: 'Navigazione principale',
    toggleTheme: 'Cambia tema',
    legalNav: 'Link legali',
    legalHeading: 'Legale',
    allRightsReserved: 'Tutti i diritti riservati.',
  },
} as const

/** @public SITE shape: template surface, consumable by child projects. */
export type Site = typeof SITE

/** BCP 47 tag for a locale code, falling back to the code itself. */
export function localeTag(locale: string): string {
  const tags: Record<string, string> = SITE.localeTags
  return tags[locale] ?? locale
}
