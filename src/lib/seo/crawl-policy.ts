// Single source of truth for the paths kept out of search, read by robots.txt,
// the sitemap filter and the middleware. Adding a path here propagates to all
// three; before this module each of them carried its own copy and a comment
// asking you to keep them in sync by hand.
//
// [HARD] Keep it import-free. astro.config.mjs loads before Vite resolves the
// `@/` alias, so only modules with no imports are reachable from there — the
// same constraint that governs lib/site.ts.

/** Blocked at the crawler in robots.txt: thin or duplicate pages with no search
 *  value. A sitemap entry for a robots-blocked URL is a Search Console warning,
 *  so these stay out of both.
 *
 *  Empty on purpose. Whether the legal pages belong in search is the fork's call
 *  — some clients want them findable — and a template that decides it for them
 *  would be making an SEO choice on their behalf, silently. */
export const ROBOTS_DISALLOWED_PATHS: readonly string[] = []

/** Crawlable but noindex: the page passes `noindex` to the layout, which emits
 *  the meta tag — that is what actually carries the signal, and the only thing
 *  that works on a prerendered page. src/middleware.ts also reads this list, but
 *  only reaches non-HTML SSR responses (see the note there).
 *
 *  Typical entry: a thank-you page reachable only after a submit. */
export const NOINDEX_PATHS: readonly string[] = []

/** Neither kind belongs in the sitemap. `/404` and `/500` are absent for a
 *  different reason — @astrojs/sitemap drops status-code pages itself. */
export const SITEMAP_EXCLUDED_PATHS: readonly string[] = [...ROBOTS_DISALLOWED_PATHS, ...NOINDEX_PATHS]

/** Normalizes a sitemap entry to the leading-slash, no-trailing-slash form the
 *  lists use. `trailingSlash: 'never'` governs our own URLs, but the integration
 *  builds entries from the emitted routes, which do carry one — and hands them
 *  over absolute, hence the parse. */
export function crawlPathname(url: string): string {
  const { pathname } = new URL(url, 'https://placeholder.invalid')
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
}

export function isExcludedFromSitemap(url: string): boolean {
  return SITEMAP_EXCLUDED_PATHS.includes(crawlPathname(url))
}
