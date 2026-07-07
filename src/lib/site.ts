// Single source of truth for site metadata and chrome content (nav/footer/CTA/legal).
// Replace the placeholders per project — de-branding happens at design time.
// UI copy is NOT here: entries reference i18n dictionary keys (`key`,
// resolved via useTranslations), so the chrome localizes with the site.
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
  // Header navigation. `href` is the default-locale path — components run it
  // through localizedHref(), which localizes prefix and segments per locale.
  nav: [{ key: 'nav.home', href: '/' }],
  // Header primary CTA ('#' placeholder: point it at a real internal path
  // and route it through localizedHref() like the nav entries).
  cta: { key: 'nav.cta', href: '#' },
  // Legal links (universal for EU sites).
  legal: [
    { key: 'legal.privacy', href: '/privacy' },
    { key: 'legal.cookies', href: '/cookie-policy' },
  ],
  // Social profiles (footer). Brand names don't translate — plain labels.
  social: [{ label: 'LinkedIn', href: '#' }],
} as const

/** @public SITE shape: template surface, consumable by child projects. */
export type Site = typeof SITE

/** BCP 47 tag for a locale code, falling back to the code itself. */
export function localeTag(locale: string): string {
  const tags: Record<string, string> = SITE.localeTags
  return tags[locale] ?? locale
}
