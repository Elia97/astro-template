import { defineMiddleware } from 'astro:middleware'

// Paths that must stay out of search engines even in production (thank-you
// pages, internal tools, …). Mirror every entry in the sitemap `filter` in
// astro.config.mjs. Empty in the template.
//
// ⚠️ SSR routes only: a page with `export const prerender = true` is served as a
// static file and never reaches this middleware, so listing its path here does
// nothing — that page needs its own <meta name="robots">. Preview deploys are
// not handled here for the same reason: the *.vercel.app noindex is an edge
// header rule in vercel.json, which covers static files too.
const NOINDEX_PATHS = new Set<string>([])

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()

  if (NOINDEX_PATHS.has(context.url.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})
