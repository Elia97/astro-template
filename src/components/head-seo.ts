// Pure SEO-meta resolution for head.astro — no Astro component context, so
// canonical/hreflang policy is unit-testable (head-seo.test.ts). URL policy
// notes live in docs/guides/seo.md.
import { i18n } from 'astro:config/client'
import { getAbsoluteLocaleUrl } from 'astro:i18n'

import { localeTag, SITE } from '@/lib/site'

import { localeAgnosticPath } from '@/i18n/path'
import { translatePath } from '@/i18n/route-segments'

interface LocaleAlternate {
  tag: string
  href: string
}

interface HeadSeoMeta {
  canonical: string
  ogImageUrl: string
  currentTag: string
  localeAlternates: LocaleAlternate[]
  defaultHref: string
}

interface HeadSeoParams {
  currentLocale: string | undefined
  canonicalPath: string
  ogImage: string | undefined
}

// Locale entries normalized to codes: Astro's i18n APIs and Astro.currentLocale
// speak codes (for object entries that's codes[0]), URLs carry paths.
function configuredLocaleCodes(): string[] {
  return (i18n?.locales ?? []).map((l) => (typeof l === 'string' ? l : (l.codes[0] ?? l.path)))
}

// Canonical and alternates share one locale-agnostic base path, then each
// locale re-localizes it (prefix via getAbsoluteLocaleUrl, segments via
// translatePath) — hreflang that disagrees with the canonical gets ignored.
function resolveLocaleAlternates(canonicalPath: string): LocaleAlternate[] {
  return configuredLocaleCodes().map((code) => ({
    tag: localeTag(code),
    href: getAbsoluteLocaleUrl(code, translatePath(canonicalPath, code)),
  }))
}

export function resolveHeadSeoMeta({ currentLocale, canonicalPath, ogImage }: HeadSeoParams): HeadSeoMeta {
  const defaultLocale = i18n?.defaultLocale ?? 'it'
  const locale = currentLocale ?? defaultLocale
  const canonical = localeAgnosticPath(canonicalPath, locale)

  return {
    canonical: getAbsoluteLocaleUrl(locale, translatePath(canonical, locale)),
    // OG image ALWAYS absolute: social crawlers don't resolve relative paths.
    ogImageUrl: new URL(ogImage ?? SITE.defaultOgImage, SITE.url).href,
    currentTag: localeTag(locale),
    localeAlternates: resolveLocaleAlternates(canonical),
    defaultHref: getAbsoluteLocaleUrl(defaultLocale, translatePath(canonical, defaultLocale)),
  }
}
