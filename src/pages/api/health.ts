import type { APIRoute } from 'astro'

// `prerender = false` is what makes `ts` a freshness signal: prerendered, it is stamped once at
// build time and the endpoint answers 200 forever.
export const prerender = false

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ status: 'ok', ts: new Date().toISOString() }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
