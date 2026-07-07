import { defineMiddleware } from 'astro:middleware'

// Paths that must stay out of search engines even in production (thank-you
// pages, internal tools, …). Mirror every entry in the sitemap `filter` in
// astro.config.mjs. Empty in the template.
const NOINDEX_PATHS = new Set<string>([])

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()

  // *.vercel.app hosts are preview/branch deploys: never let them compete
  // with the production domain in search indexes.
  if (context.url.host.endsWith('.vercel.app') || NOINDEX_PATHS.has(context.url.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})
