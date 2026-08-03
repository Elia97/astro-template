import type { APIRoute } from 'astro'

import { buildWebManifest } from '@/lib/seo/manifest'

// Prerendered: the body lands in dist/client/site.webmanifest and production
// serves it as a static file, where the MIME comes from the `.webmanifest`
// extension — this header is what dev and `astro preview` answer with.
export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildWebManifest()), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  })
