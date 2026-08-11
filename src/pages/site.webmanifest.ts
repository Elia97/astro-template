import type { APIRoute } from 'astro'

import { buildWebManifest } from '@/lib/seo/manifest'

// Production serves this as a static file, MIME from the `.webmanifest` extension;
// the header is what dev and `astro preview` answer with.
export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildWebManifest()), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  })
