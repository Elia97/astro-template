// Read by src/pages/robots.txt.ts, the sitemap filter in astro.config.mjs and
// src/middleware.ts.

// [HARD] Import-free: astro.config.mjs loads before Vite resolves the `@/` alias,
// so only modules with no imports are reachable from there.

/** A sitemap entry for a robots-blocked URL is a Search Console warning, so these
 *  stay out of the sitemap too. */
export const ROBOTS_DISALLOWED_PATHS: readonly string[] = []

/** src/middleware.ts reads this too, but only reaches non-HTML SSR responses: on a
 *  prerendered page the layout's `noindex` meta tag is what carries the signal. */
export const NOINDEX_PATHS: readonly string[] = []

/** @astrojs/sitemap drops status-code pages itself, so `/404` and `/500` are absent. */
export const SITEMAP_EXCLUDED_PATHS: readonly string[] = [...ROBOTS_DISALLOWED_PATHS, ...NOINDEX_PATHS]

/** @astrojs/sitemap hands entries over absolute and with a trailing slash despite
 *  `trailingSlash: 'never'`. */
export function crawlPathname(url: string): string {
  const { pathname } = new URL(url, 'https://placeholder.invalid')
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
}

/** [HARD] Subtree, never equality: `/area-riservata` in NOINDEX_PATHS covers
 *  `/area-riservata/documenti`, and nothing fails when it doesn't. */
export function matchesSubtree(pathname: string, roots: readonly string[]): boolean {
  const path = crawlPathname(pathname)
  return roots.some((root) => path === root || path.startsWith(`${root}/`))
}

export function isExcludedFromSitemap(url: string): boolean {
  return matchesSubtree(url, SITEMAP_EXCLUDED_PATHS)
}

export function isNoindexPath(pathname: string): boolean {
  return matchesSubtree(pathname, NOINDEX_PATHS)
}
