// Localized URL segments. File-system routes are named in the DEFAULT locale
// (src/pages/contatti.astro → /contatti); a secondary locale renames the
// public segment here. `translatePath` localizes an internal href,
// `canonicalizePath` reverses it (canonical/hreflang computation). Unmapped
// locales and segments pass through unchanged — a single-locale site is pure
// identity.
//
// Example once an English locale exists:
//   en: { contatti: 'contact', preventivo: 'quote' }
const SEGMENTS_BY_LOCALE: Record<string, Record<string, string>> = {}

const CANONICAL_BY_LOCALE: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(SEGMENTS_BY_LOCALE).map(([locale, segments]) => [
    locale,
    Object.fromEntries(Object.entries(segments).map(([canonical, localized]) => [localized, canonical])),
  ]),
)

/**
 * Replaces the first path segment through `map`, leaving the rest untouched
 * (only top-level sections are translated, slugs stay as authored).
 */
export function applySegmentMap(pathname: string, map: Record<string, string>): string {
  const parts = pathname.split('/')
  const first = parts[1]
  if (!first) return pathname
  parts[1] = map[first] ?? first
  return parts.join('/')
}

/** Internal (default-locale) path → public path for `locale`. */
export function translatePath(pathname: string, locale: string): string {
  const segments = SEGMENTS_BY_LOCALE[locale]
  if (!segments) return pathname
  return applySegmentMap(pathname, segments)
}

/** Public path for `locale` → internal (default-locale) path. */
export function canonicalizePath(pathname: string, locale: string): string {
  const canonical = CANONICAL_BY_LOCALE[locale]
  if (!canonical) return pathname
  return applySegmentMap(pathname, canonical)
}
