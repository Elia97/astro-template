// Letto da src/pages/robots.txt.ts, dal filtro sitemap in astro.config.mjs, da
// src/components/head/seo.ts e da src/middleware.ts.

// [HARD] Senza import: astro.config.mjs si carica prima che Vite risolva l'alias `@/`, quindi
// da lì sono raggiungibili solo i moduli che non importano niente.

/** Una voce di sitemap per un URL bloccato da robots è un avviso in Search Console, quindi
 *  questi restano fuori anche dalla sitemap. */
// biome-ignore format: una voce per riga, così i cherry-pick da vetrina non confliggono
export const ROBOTS_DISALLOWED_PATHS: readonly string[] = [
]

// biome-ignore format: una voce per riga, così i cherry-pick da vetrina non confliggono
export const NOINDEX_PATHS: readonly string[] = [
]

/** @astrojs/sitemap consegna le voci assolute e con lo slash finale nonostante
 *  `trailingSlash: 'never'`. */
export function crawlPathname(url: string): string {
  const { pathname } = new URL(url, 'https://placeholder.invalid')
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
}

/** [HARD] Sottoalbero, mai uguaglianza: `/area-riservata` in NOINDEX_PATHS copre
 *  `/area-riservata/documenti`, e quando non lo fa non fallisce niente. */
export function matchesSubtree(pathname: string, roots: readonly string[]): boolean {
  const path = crawlPathname(pathname)
  return roots.some((root) => path === root || path.startsWith(`${root}/`))
}

/** @astrojs/sitemap scarta da sé le pagine di stato, quindi `/404` e `/500` non ci sono. */
export function isExcludedFromSitemap(url: string): boolean {
  return matchesSubtree(url, ROBOTS_DISALLOWED_PATHS) || isNoindexPath(url)
}

export function isNoindexPath(pathname: string): boolean {
  return matchesSubtree(pathname, NOINDEX_PATHS)
}
