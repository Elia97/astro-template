import { defineMiddleware } from 'astro:middleware'

import { isNoindexPath } from '@/lib/seo/crawl-policy'

// [HARD] Header-setting only. Under the adapter's default middlewareMode a prerendered page
// runs this once at build time against a synthetic request: branch on it and use `prerender = false`.

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()

  if (isNoindexPath(context.url.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
})
