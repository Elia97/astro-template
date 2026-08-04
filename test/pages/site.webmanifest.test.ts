import { describe, expect, it } from 'vitest'

import { buildWebManifest } from '@/lib/seo/manifest'

import { GET } from '@/pages/site.webmanifest'

async function get(): Promise<{ body: unknown; type: string | null }> {
  const response = (await (GET as unknown as () => Response)()) as Response
  return { body: JSON.parse(await response.text()), type: response.headers.get('Content-Type') }
}

describe('site.webmanifest', () => {
  // The extension gives production its MIME; this header is what dev and
  // `astro preview` answer with, and a browser rejects the manifest without it.
  it('answers with the manifest MIME type', async () => {
    const { type } = await get()

    expect(type).toBe('application/manifest+json; charset=utf-8')
  })

  it('serves exactly what buildWebManifest produced', async () => {
    const { body } = await get()

    expect(body).toEqual(buildWebManifest())
  })
})
