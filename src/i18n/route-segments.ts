// Routes are file-named in the default locale (src/pages/contatti.astro → /contatti);
// a secondary locale renames only the public segment: `en: { contatti: 'contact' }`.
const SEGMENTS_BY_LOCALE: Record<string, Record<string, string>> = {}

/* v8 ignore next 2 -- dead while SEGMENTS_BY_LOCALE ships empty; it wakes up at locale #2, and applySegmentMap already covers the mapping it delegates to */
const CANONICAL_BY_LOCALE: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(SEGMENTS_BY_LOCALE).map(([locale, segments]) => [
    locale,
    Object.fromEntries(Object.entries(segments).map(([canonical, localized]) => [localized, canonical])),
  ]),
)

export function applySegmentMap(pathname: string, map: Record<string, string>): string {
  const parts = pathname.split('/')
  const first = parts[1]
  if (!first) return pathname
  parts[1] = map[first] ?? first
  return parts.join('/')
}

export function translatePath(pathname: string, locale: string): string {
  /* v8 ignore start -- same: dead while the map ships empty, alive at locale #2 */
  const segments = SEGMENTS_BY_LOCALE[locale]
  if (!segments) return pathname
  return applySegmentMap(pathname, segments)
  /* v8 ignore stop */
}

export function canonicalizePath(pathname: string, locale: string): string {
  /* v8 ignore start -- same: dead while the map ships empty, alive at locale #2 */
  const canonical = CANONICAL_BY_LOCALE[locale]
  if (!canonical) return pathname
  return applySegmentMap(pathname, canonical)
  /* v8 ignore stop */
}
