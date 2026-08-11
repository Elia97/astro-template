import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isNoindexPath } from '@/lib/seo/crawl-policy'

// Both lists ship empty, so nothing exercises the positive branch until a fork adds
// its first NOINDEX_PATHS entry.
vi.mock('@/lib/seo/crawl-policy')

async function run(pathname: string, headers: Record<string, string> = {}): Promise<Response> {
  const { onRequest } = await import('@/middleware')
  const context = { url: new URL(`https://example.test${pathname}`) }
  const next = () => Promise.resolve(new Response('body', { headers }))
  // The signature Astro passes; only `url` is read.
  return (await (onRequest as unknown as (c: unknown, n: unknown) => Promise<Response>)(context, next)) as Response
}

beforeEach(() => {
  vi.resetModules()
  vi.mocked(isNoindexPath).mockReset()
})

describe('X-Robots-Tag middleware', () => {
  it('tags a path the crawl policy keeps out of the index', async () => {
    vi.mocked(isNoindexPath).mockReturnValue(true)

    const response = await run('/area-riservata/documenti')

    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })

  it('leaves an indexable path untouched', async () => {
    vi.mocked(isNoindexPath).mockReturnValue(false)

    const response = await run('/contatti')

    expect(response.headers.get('X-Robots-Tag')).toBeNull()
  })

  it('asks the policy about the pathname, never the full URL', async () => {
    vi.mocked(isNoindexPath).mockReturnValue(false)

    await run('/area-riservata?utm=x')

    expect(isNoindexPath).toHaveBeenCalledWith('/area-riservata')
  })

  // It only ever decorates: swallowing or replacing the downstream response
  // would take every other header with it.
  it('passes the downstream response through with its own headers intact', async () => {
    vi.mocked(isNoindexPath).mockReturnValue(true)

    const response = await run('/feed.json', { 'Content-Type': 'application/json' })

    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(await response.text()).toBe('body')
  })
})
