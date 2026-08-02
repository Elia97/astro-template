import { defineMiddleware } from 'astro:middleware'

// Non-HTML SSR responses that must stay out of search (a generated feed, a JSON
// endpoint): X-Robots-Tag is the only way to mark those — they have no <head> to
// carry a meta tag. Empty in the template.
//
// ⚠️ Not for pages: `prerender = true` skips this middleware entirely (which is
// every page in the template today), so a page takes the layout's `noindex` prop
// instead. Preview deploys are handled at the edge for the same reason — the
// *.vercel.app rule in vercel.json.
const NOINDEX_PATHS = new Set<string>([])

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()

  if (NOINDEX_PATHS.has(context.url.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})
