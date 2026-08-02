import type { APIRoute } from 'astro'

export const prerender = true

// Pairs with the @astrojs/sitemap integration (astro.config.mjs), which emits
// sitemap-index.xml at build time. Preview-deploy noindexing is NOT done here
// (crawlers cache robots.txt) — the *.vercel.app header rule in vercel.json
// handles it per response, on static and SSR routes alike.
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('http://localhost:4321/')
  const sitemapUrl = new URL('sitemap-index.xml', base).href

  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
