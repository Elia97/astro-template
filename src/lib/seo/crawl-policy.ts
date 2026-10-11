// Letto da src/pages/robots.txt.ts, dal filtro sitemap in astro.config.mjs, da
// src/components/head/seo.ts e da src/middleware.ts.

// [HARD] astro.config.mjs carica questo modulo prima che Vite risolva l'alias `@/`: qui e nei
// moduli che importa si importa solo per percorso relativo.
import { NOINDEX_PATHS, ROBOTS_DISALLOWED_PATHS } from './crawl-paths'

export { NOINDEX_PATHS, ROBOTS_DISALLOWED_PATHS }

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

/** Un URL della sitemap bloccato da robots è un avviso in Search Console. @astrojs/sitemap scarta
 *  da sé le pagine di stato, quindi `/404` e `/500` non ci sono. */
export function isExcludedFromSitemap(url: string): boolean {
  return matchesSubtree(url, ROBOTS_DISALLOWED_PATHS) || isNoindexPath(url)
}

export function isNoindexPath(pathname: string): boolean {
  return matchesSubtree(pathname, NOINDEX_PATHS)
}
