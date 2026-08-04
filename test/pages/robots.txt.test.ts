import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ROBOTS_DISALLOWED_PATHS } from '@/lib/seo/crawl-policy'

// The list ships empty, so the Disallow branch has no input as shipped — mocked
// because a fork's first entry is exactly when this has to be right, and the
// contract (one line per path, read from crawl-policy) is the point.
vi.mock('@/lib/seo/crawl-policy', () => ({ ROBOTS_DISALLOWED_PATHS: [] }))

async function get(site?: URL): Promise<{ body: string; type: string | null }> {
  const { GET } = await import('@/pages/robots.txt')
  const response = (await (GET as unknown as (c: { site?: URL | undefined }) => Response)({ site })) as Response
  return { body: await response.text(), type: response.headers.get('Content-Type') }
}

beforeEach(() => {
  vi.resetModules()
  ;(ROBOTS_DISALLOWED_PATHS as unknown as string[]).length = 0
})

describe('robots.txt', () => {
  it('serves plain text', async () => {
    const { type } = await get(new URL('https://example.test'))

    expect(type).toBe('text/plain; charset=utf-8')
  })

  it('allows everything and points at the sitemap on the site URL', async () => {
    const { body } = await get(new URL('https://example.test'))

    expect(body).toContain('User-agent: *')
    expect(body).toContain('Allow: /')
    expect(body).toContain('Sitemap: https://example.test/sitemap-index.xml')
  })

  // `site` is undefined in dev; a crash there would break `astro dev` for a file
  // nobody is looking at until deploy.
  it('falls back to localhost when `site` is unset', async () => {
    const { body } = await get(undefined)

    expect(body).toContain('Sitemap: http://localhost:4321/sitemap-index.xml')
  })

  it('emits one Disallow per crawl-policy entry', async () => {
    ;(ROBOTS_DISALLOWED_PATHS as unknown as string[]).push('/area-riservata', '/tmp')

    const { body } = await get(new URL('https://example.test'))

    expect(body).toContain('Disallow: /area-riservata')
    expect(body).toContain('Disallow: /tmp')
  })
})
