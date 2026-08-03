import { defineMiddleware } from 'astro:middleware'

import { NOINDEX_PATHS } from '@/lib/seo/crawl-policy'

// X-Robots-Tag for the paths seo/crawl-policy.ts keeps out of the index. In practice
// this only ever reaches a **non-HTML SSR response** — a generated feed, a JSON
// endpoint — where there is no <head> to carry a meta tag.
//
// ⚠️ Not the mechanism for pages: `prerender = true` skips this middleware
// entirely (which is every page in the template today), so a page takes the
// layout's `noindex` prop instead. Preview deploys are handled at the edge for
// the same reason — the *.vercel.app rule in vercel.json.
const noindex = new Set<string>(NOINDEX_PATHS)

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()

  if (noindex.has(context.url.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})
