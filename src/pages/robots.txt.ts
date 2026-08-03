import type { APIRoute } from 'astro'

import { ROBOTS_DISALLOWED_PATHS } from '@/lib/seo/crawl-policy'

// Pairs with the @astrojs/sitemap integration (astro.config.mjs), which emits
// sitemap-index.xml at build time. The disallow list comes from seo/crawl-policy.ts,
// the same module the sitemap filter reads — one edit, both sides.
//
// Preview-deploy noindexing is NOT done here (crawlers cache robots.txt) — the
// *.vercel.app header rule in vercel.json handles it per response, on static and
// SSR routes alike.
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('http://localhost:4321/')
  const sitemapUrl = new URL('sitemap-index.xml', base).href

  const rules = ['User-agent: *', 'Allow: /', ...ROBOTS_DISALLOWED_PATHS.map((path) => `Disallow: ${path}`)]
  const body = `${rules.join('\n')}\n\nSitemap: ${sitemapUrl}\n`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
