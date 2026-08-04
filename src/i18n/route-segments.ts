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

/* v8 ignore next 2 -- dead while SEGMENTS_BY_LOCALE ships empty; it wakes up at locale #2, and applySegmentMap already covers the mapping it delegates to */
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
  /* v8 ignore start -- same: dead while the map ships empty, alive at locale #2 */
  const segments = SEGMENTS_BY_LOCALE[locale]
  if (!segments) return pathname
  return applySegmentMap(pathname, segments)
  /* v8 ignore stop */
}

/** Public path for `locale` → internal (default-locale) path. */
export function canonicalizePath(pathname: string, locale: string): string {
  /* v8 ignore start -- same: dead while the map ships empty, alive at locale #2 */
  const canonical = CANONICAL_BY_LOCALE[locale]
  if (!canonical) return pathname
  return applySegmentMap(pathname, canonical)
  /* v8 ignore stop */
}
