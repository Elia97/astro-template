import { defineMiddleware } from 'astro:middleware'

import { isNoindexPath } from '@/lib/seo/crawl-policy'

// X-Robots-Tag for the paths seo/crawl-policy.ts keeps out of the index. In practice
// this only ever reaches a **non-HTML SSR response** — a generated feed, a JSON
// endpoint — where there is no <head> to carry a meta tag.
//
// ⚠️ Not the mechanism for pages: `prerender = true` skips this middleware
// entirely (which is every page in the template today), so a page takes the
// layout's `noindex` prop instead. Preview deploys are handled at the edge for
// the same reason — the *.vercel.app rule in vercel.json.

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()

  // Subtree match, and it has to stay one: a Set of exact paths would cover the
  // section named in the list and none of the routes under it.
  if (isNoindexPath(context.url.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})
