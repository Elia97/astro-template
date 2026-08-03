import { defineMiddleware } from 'astro:middleware'

import { isNoindexPath } from '@/lib/seo/crawl-policy'

// X-Robots-Tag for the paths seo/crawl-policy.ts keeps out of the index. In practice
// this only ever reaches a **non-HTML SSR response** — a generated feed, a JSON
// endpoint — where there is no <head> to carry a meta tag.
//
// ⚠️ Not the mechanism for pages, and not because it doesn't run: under the
// adapter's default middlewareMode a prerendered page DOES execute this, once,
// at build time against a synthetic request — only the headers are discarded
// into the static file. So a page takes the layout's `noindex` prop instead,
// and preview deploys are handled at the edge (*.vercel.app in vercel.json).
//
// [HARD] Header-setting only. Anything that branches on the real request — a
// geo redirect, an A/B split, a maintenance flag, an auth check — would bake
// one arbitrary branch into every prerendered page, with no error and no log.
// Put that on a route marked `prerender = false`.

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()

  // Subtree match, and it has to stay one: a Set of exact paths would cover the
  // section named in the list and none of the routes under it.
  if (isNoindexPath(context.url.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})
